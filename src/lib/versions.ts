import { supabase } from './supabase/client'

export interface DocumentVersion {
    id: string
    document_id: string
    content: string
    version_number: number
    label: string | null
    created_by: string | null
    created_at: string
}

// Compact type for timeline list (no full content — saves bandwidth)
export type DocumentVersionSummary = Omit<DocumentVersion, 'content'>

// ─── Get latest version number ────────────────────────────────────────────

export async function getLatestVersionNumber(documentId: string): Promise<number> {
    const { data } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

    return data?.version_number ?? 0
}

// ─── Save snapshot ────────────────────────────────────────────────────────

export async function createSnapshot(
    documentId: string,
    content: string,
    createdBy: string,
    label?: string,
    forceCreate: boolean = false
): Promise<DocumentVersion | null> {
    // Check if a new snapshot is needed
    const { data: lastVersion } = await supabase
        .from('document_versions')
        .select('content, version_number')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

    // Same content? Skip (unless forced by manual save)
    if (!forceCreate && lastVersion && lastVersion.content === content) return null

    const nextVersion = (lastVersion?.version_number ?? 0) + 1

    const { data, error } = await supabase
        .from('document_versions')
        .insert({
            document_id: documentId,
            content,
            version_number: nextVersion,
            label: label ?? null,
            created_by: createdBy,
        })
        .select()
        .single()

    if (error) {
        console.error('createSnapshot error details:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to save version: ${error.message}`)
    }

    return data
}

// ─── Get version list (without content) for timeline ─────────────────────

export async function getVersionList(
    documentId: string,
    page: number = 0,
    pageSize: number = 20
): Promise<{ versions: DocumentVersionSummary[]; hasMore: boolean }> {
    const { data, error } = await supabase
        .from('document_versions')
        .select('id, document_id, version_number, label, created_by, created_at')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize)  // fetch 1 extra to check hasMore

    if (error) {
        console.error('getVersionList error details:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to fetch version history: ${error.message}`)
    }

    const hasMore = data.length > pageSize
    return {
        versions: data.slice(0, pageSize),
        hasMore,
    }
}

// ─── Get a single version's content (for diff and restore) ──────────────────────

export async function getVersionContent(versionId: string): Promise<DocumentVersion> {
    const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single()

    if (error) {
        console.error('getVersionContent error details:', JSON.stringify(error, null, 2))
        throw new Error(`Version not found: ${error.message}`)
    }
    return data
}

// ─── Restore: copy old version content to active document ─────────────────────

export async function restoreVersion(
    documentId: string,
    versionId: string,
    userId: string
): Promise<void> {
    // Get the version content to restore
    const version = await getVersionContent(versionId)

    // Update active document
    const { error: updateError } = await supabase
        .from('documents')
        .update({
            content: version.content,
            updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)

    if (updateError) throw new Error('Failed to restore document')

    // Save new snapshot marked as "Restored from vX"
    await createSnapshot(
        documentId,
        version.content,
        userId,
        `Restored from v${version.version_number}`
    )
}
