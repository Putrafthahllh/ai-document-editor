'use client'

import { useState, useEffect, useCallback } from 'react'
import { getVersionList, restoreVersion, type DocumentVersionSummary } from '@/lib/versions'

interface VersionTimelineProps {
    documentId: string
    userId: string
    onCompare: (versionIdA: string, versionIdB: string) => void
    onContentRestore: (newContent: string) => void
}

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
}

export function VersionTimeline({
    documentId,
    userId,
    onCompare,
    onContentRestore,
}: VersionTimelineProps) {
    const [versions, setVersions] = useState<DocumentVersionSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [page, setPage] = useState(0)

    // State for selecting 2 arbitrary versions
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isRestoring, setIsRestoring] = useState<string | null>(null)

    const loadVersions = useCallback(async (pageNum: number, append = false) => {
        try {
            setIsLoading(true)
            const result = await getVersionList(documentId, pageNum)
            setVersions(prev => append ? [...prev, ...result.versions] : result.versions)
            setHasMore(result.hasMore)
        } catch (err) {
            console.error('Failed to load versions:', err)
        } finally {
            setIsLoading(false)
        }
    }, [documentId])

    useEffect(() => {
        loadVersions(0)
    }, [loadVersions])

    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id)
            if (prev.length >= 2) return [prev[1], id]  // shift: drop the first one
            return [...prev, id]
        })
    }

    async function handleRestore(version: DocumentVersionSummary) {
        if (!confirm(`Restore to v${version.version_number}? The current version will be auto-saved before restoring.`)) return
        try {
            setIsRestoring(version.id)
            await restoreVersion(documentId, version.id, userId)
            // Reload versions after restore
            await loadVersions(0)
            onContentRestore(version.id)  // notify parent to reload content
        } catch (err) {
            alert('Failed to restore version')
            console.error(err)
        } finally {
            setIsRestoring(null)
        }
    }

    function handleLoadMore() {
        const nextPage = page + 1
        setPage(nextPage)
        loadVersions(nextPage, true)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#050505', minWidth: '300px' }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white', margin: 0 }}>Version History</h2>
                </div>

                {/* Quick compare: last vs second-to-last */}
                {versions.length >= 2 && (
                    <button
                        onClick={() => onCompare(versions[1].id, versions[0].id)}
                        style={{
                            width: '100%',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--ed-accent-dim)',
                            color: 'var(--ed-accent)',
                            border: '1px solid var(--ed-accent)',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontFamily: 'var(--ed-font-sans)',
                        }}
                    >
                        ⚡ Compare: v{versions[1].version_number} vs v{versions[0].version_number}
                    </button>
                )}

                {/* Arbitrary compare: select 2 versions */}
                {selectedIds.length === 2 && (
                    <button
                        onClick={() => onCompare(selectedIds[0], selectedIds[1])}
                        style={{
                            width: '100%',
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            color: '#4ade80',
                            border: '1px solid #22c55e',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontFamily: 'var(--ed-font-sans)',
                        }}
                    >
                        🔍 Compare {selectedIds.length} selected versions
                    </button>
                )}
                {selectedIds.length === 1 && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--ed-muted)', textAlign: 'center', margin: '0.5rem 0 0' }}>
                        Select 1 more version to compare
                    </p>
                )}
                {selectedIds.length === 0 && versions.length >= 2 && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--ed-muted)', textAlign: 'center', margin: '0.5rem 0 0' }}>
                        Check 2 versions to compare freely
                    </p>
                )}
            </div>

            {/* Version list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {isLoading && versions.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ed-muted)', fontSize: '0.8rem' }}>Loading history...</div>
                ) : versions.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ed-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                        No version history yet. Edit the document and wait for auto-save, or click "Save Version".
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {versions.map((version, index) => {
                            const isSelected = selectedIds.includes(version.id)
                            const isLatest = index === 0

                            return (
                                <div
                                    key={version.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        borderBottom: '1px solid #1a1a1a',
                                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                                        transition: 'background-color 0.2s',
                                    }}
                                    className="version-item-hover"
                                >
                                    {/* Checkbox for arbitrary compare */}
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(version.id)}
                                        style={{ marginTop: '0.2rem', accentColor: 'var(--ed-accent)', cursor: 'pointer' }}
                                    />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Version number + label */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ed-accent)' }}>
                                                v{version.version_number}
                                            </span>
                                            {isLatest && (
                                                <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 600 }}>
                                                    Latest
                                                </span>
                                            )}
                                            {version.label && (
                                                <span style={{ fontSize: '0.75rem', color: '#e5e5e5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    — {version.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* Timestamp */}
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ed-muted)' }}>
                                            {formatRelativeTime(version.created_at)}
                                            {' · '}
                                            {new Date(version.created_at).toLocaleString('en-US', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>

                                    {/* Restore button */}
                                    {!isLatest && (
                                        <button
                                            onClick={() => handleRestore(version)}
                                            disabled={isRestoring === version.id}
                                            style={{
                                                fontSize: '0.7rem',
                                                color: '#f59e0b',
                                                background: 'none',
                                                border: 'none',
                                                cursor: isRestoring === version.id ? 'not-allowed' : 'pointer',
                                                opacity: isRestoring === version.id ? 0.5 : 1,
                                                padding: '0.2rem',
                                                fontWeight: 600,
                                            }}
                                            className="version-restore-btn"
                                        >
                                            {isRestoring === version.id ? 'Restoring...' : 'Restore'}
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        {/* Load more */}
                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    fontSize: '0.7rem',
                                    color: 'var(--ed-muted)',
                                    background: 'none',
                                    border: 'none',
                                    borderTop: '1px solid #1a1a1a',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isLoading ? 'Loading...' : 'Load more'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .version-item-hover:hover {
          background-color: rgba(255, 255, 255, 0.03) !important;
        }
        .version-item-hover .version-restore-btn {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .version-item-hover:hover .version-restore-btn {
          opacity: 1;
        }
        .version-restore-btn:hover {
          color: #fbbf24 !important;
          text-decoration: underline;
        }
      `}} />
        </div>
    )
}
