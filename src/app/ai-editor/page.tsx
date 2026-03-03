'use client'

import './ai-editor.css'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import DocumentEditor from '@/components/DocumentEditor'
import AIChat from '@/components/AIChat'
import { useAuth } from '@/components/AuthProvider'
import { useAutoSave } from '@/hooks/useAutoSave'
import DropdownMenu from '@/components/ui/DropdownMenu'
import { ShareDialog } from '@/components/ShareDialog'
import { useCollaboration } from '@/hooks/useCollaboration'
import { useThrottle } from '@/hooks/useThrottle'
import { PresenceIndicator } from '@/components/PresenceIndicator'
import { VersionTimeline } from '@/components/VersionTimeline'
import { DiffModal } from '@/components/DiffModal'
import { useAutoSnapshot } from '@/hooks/useAutoSnapshot'
import {
    getUserDocuments,
    getDocument,
    createDocument as createDoc,
    renameDocument as renameDoc,
    deleteDocument as deleteDoc,
    saveDocumentContent,
    getDocumentsPaginated,
    type SortOption,
    type DocumentSummary,
    type Document,
} from '@/lib/documents'
import { useDebounce } from '@/hooks/useDebounce'

// ======== Login Form ========
function LoginForm({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
    const { signIn, signUp, loading: authLoading } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isSignUp) {
                await signUp(email, password)
            } else {
                await signIn(email, password)
            }
        } catch (err) {
            setError('An unexpected error occurred')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h1>ClariDoc</h1>
                    <p>Edit documents with intelligent AI assistance.</p>
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                        minLength={6}
                    />
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" className="login-btn" disabled={loading || authLoading}>
                        {loading || authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                    <button
                        type="button"
                        className="login-toggle"
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setError('')
                        }}
                    >
                        {isSignUp
                            ? 'Already have an account? Sign In'
                            : "Don't have an account? Sign Up"}
                    </button>
                </form>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <button
                        onClick={toggleTheme}
                        className="editor-topbar-btn"
                        title="Toggle theme"
                    >
                        {isDark ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ======== Editor App ========
function EditorApp({ onSignOut, isDark, toggleTheme }: { onSignOut: () => void; isDark: boolean; toggleTheme: () => void }) {
    const { user } = useAuth()
    const [documentContent, setDocumentContent] = useState('')
    const [currentDoc, setCurrentDoc] = useState<Document | null>(null)
    const [documents, setDocuments] = useState<DocumentSummary[]>([])
    const [showSidebar, setShowSidebar] = useState(false)
    const [newDocTitle, setNewDocTitle] = useState('')
    const [undoStack, setUndoStack] = useState<string[]>([])
    const [redoStack, setRedoStack] = useState<string[]>([])
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

    // Phase 2: Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedQuery = useDebounce(searchQuery, 300)
    const [sortOption, setSortOption] = useState<SortOption>('updated_desc')
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [totalDocs, setTotalDocs] = useState(0)
    const [isSearching, setIsSearching] = useState(false)
    const [showShareDialog, setShowShareDialog] = useState(false)

    // Phase 4: Version History
    const [showHistory, setShowHistory] = useState(false)
    const [compareVersions, setCompareVersions] = useState<{ a: string; b: string } | null>(null)
    const [showSaveVersionModal, setShowSaveVersionModal] = useState(false)
    const [saveVersionLabel, setSaveVersionLabel] = useState('')

    // ── Collaboration State ──────────────────────────────────────────────────
    const isReceivingRemoteChange = useRef(false)

    // Rename state
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    // Mobile state
    const [isMobile, setIsMobile] = useState(false)
    const [mobileTab, setMobileTab] = useState<'editor' | 'chat'>('editor')

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Search state
    const [showSearch, setShowSearch] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeMatchIndex, setActiveMatchIndex] = useState(0)

    // Calculate search matches
    const searchMatches = useMemo(() => {
        if (!searchTerm || searchTerm.length === 0) return 0
        try {
            const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const matches = documentContent.match(new RegExp(escaped, 'gi'))
            return matches ? matches.length : 0
        } catch { return 0 }
    }, [searchTerm, documentContent])

    // Load documents from Supabase
    const docsLoadedRef = useRef(false)
    const hasLoadedFullDocsRef = useRef(false)
    useEffect(() => {
        if (!user) {
            docsLoadedRef.current = false
            return
        }
        if (docsLoadedRef.current && page === 0 && !debouncedQuery && sortOption === 'updated_desc') {
            // allow it to run on initial deps
        }

        async function fetchDocs() {
            try {
                setIsSearching(true)
                const result = await getDocumentsPaginated(
                    user!.id,
                    sortOption,
                    page,
                    8, // pageSize
                    debouncedQuery
                )

                setTotalPages(result.totalPages)
                setTotalDocs(result.total)
                setDocuments(result.documents)

                // On first ever load, also fetch the first document's content
                if (result.documents.length > 0 && !currentDoc && !hasLoadedFullDocsRef.current) {
                    const firstFull = await getDocument(result.documents[0].id)
                    setCurrentDoc(firstFull)
                    setDocumentContent(firstFull.content || '')
                    hasLoadedFullDocsRef.current = true
                } else if (result.documents.length === 0 && !hasLoadedFullDocsRef.current) {
                    hasLoadedFullDocsRef.current = true
                }
            } catch (e) {
                console.error('Failed to load documents from Supabase:', e)
                docsLoadedRef.current = false // Allow retry on error
            } finally {
                setIsSearching(false)
            }
        }

        fetchDocs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, debouncedQuery, sortOption, page])

    // Auto-save using hook
    const { saveStatus } = useAutoSave(currentDoc?.id ?? null, documentContent)

    // Phase 4: Auto-snapshot hook
    const { saveNamedVersion } = useAutoSnapshot({
        documentId: currentDoc?.id ?? '',
        content: documentContent,
        userId: user?.id ?? '',
    })

    // ── Collaboration Hook ───────────────────────────────────────────────────
    const handleRemoteContentChange = useCallback((newContent: string) => {
        isReceivingRemoteChange.current = true
        setDocumentContent(newContent)
        setTimeout(() => { isReceivingRemoteChange.current = false }, 0)
    }, [])

    const { collaborators, typingUsers, isConnected, broadcastContentChange, updateCursor } = useCollaboration({
        documentId: currentDoc?.id ?? '',
        userId: user?.id ?? '',
        displayName: user?.email?.split('@')[0] ?? 'Anonymous',
        onContentChange: handleRemoteContentChange,
    })

    const throttledUpdateCursor = useThrottle(updateCursor, 100)

    // Debounced broadcast of content changes
    const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const debouncedBroadcast = useCallback((content: string) => {
        clearTimeout(broadcastTimerRef.current)
        broadcastTimerRef.current = setTimeout(() => {
            broadcastContentChange(content)
        }, 300)
    }, [broadcastContentChange])

    async function handleCreateDocument() {
        console.log('handleCreateDocument called, title:', JSON.stringify(newDocTitle), 'user:', user?.id)
        if (!newDocTitle.trim()) {
            alert('Please enter a document title')
            return
        }
        if (!user) {
            alert('Please log in first')
            return
        }

        try {
            const newDoc = await createDoc(user.id, newDocTitle.trim())
            console.log('Created document in Supabase:', newDoc.title)

            setDocuments(prev => [newDoc, ...prev])
            setCurrentDoc(newDoc)
            setDocumentContent('')
            setNewDocTitle('')
            setUndoStack([])
            setRedoStack([])
        } catch (error) {
            console.error('Error creating document:', error)
            alert('Failed to create document')
        }
    }

    async function handleDeleteDocument(docId: string) {
        try {
            await deleteDoc(docId)

            const remaining = documents.filter(d => d.id !== docId)
            setDocuments(remaining)

            // If we deleted the active document, switch to another
            if (currentDoc?.id === docId) {
                if (remaining.length > 0) {
                    const nextFull = await getDocument(remaining[0].id)
                    setCurrentDoc(nextFull)
                    setDocumentContent(nextFull.content || '')
                } else {
                    setCurrentDoc(null)
                    setDocumentContent('')
                }
            }
            setShowDeleteConfirm(null)
        } catch (error) {
            console.error('Error deleting document:', error)
            alert('Failed to delete document')
        }
    }

    // ── Inline Rename ────────────────────────────────────────────────────────
    function startRename(doc: DocumentSummary) {
        setRenamingId(doc.id)
        setRenameValue(doc.title)
    }

    async function submitRename(docId: string) {
        if (!renameValue.trim()) {
            setRenamingId(null)
            return
        }
        try {
            await renameDoc(docId, renameValue)
            // Update local state
            setDocuments(prev =>
                prev.map(d => d.id === docId ? { ...d, title: renameValue.trim() } : d)
            )
            if (currentDoc?.id === docId) {
                setCurrentDoc(prev => prev ? { ...prev, title: renameValue.trim() } : prev)
            }
        } catch (error) {
            console.error('Error renaming document:', error)
            alert('Failed to rename document')
        } finally {
            setRenamingId(null)
        }
    }

    async function selectDocument(doc: DocumentSummary | Document) {
        if ('content' in doc && doc.content !== undefined) {
            setCurrentDoc(doc as Document)
            setDocumentContent(doc.content)
        } else {
            try {
                const fullDoc = await getDocument(doc.id)
                setCurrentDoc(fullDoc)
                setDocumentContent(fullDoc.content || '')
            } catch (e) {
                console.error('Failed to load full document:', e)
                return
            }
        }
        setShowSidebar(false)
        setUndoStack([])
        setRedoStack([])
    }

    const handleDocumentChange = useCallback(
        (newContent: string) => {
            setUndoStack((prev) => [...prev.slice(-49), documentContent])
            setRedoStack([])
            setDocumentContent(newContent)
            // Broadcast only if it's a local change (not a remote one)
            if (!isReceivingRemoteChange.current) {
                debouncedBroadcast(newContent)
            }
        },
        [documentContent, debouncedBroadcast]
    )

    const handleAIUpdate = useCallback(
        (newContent: string) => {
            setUndoStack((prev) => [...prev.slice(-49), documentContent])
            setRedoStack([])
            setDocumentContent(newContent)
        },
        [documentContent]
    )

    // Switch to editor tab when opening a document on mobile
    useEffect(() => {
        if (currentDoc && isMobile) {
            setMobileTab('editor')
            setShowSidebar(false)
        }
    }, [currentDoc, isMobile])

    function undo() {
        if (undoStack.length === 0) return
        const prev = undoStack[undoStack.length - 1]
        setRedoStack((r) => [...r, documentContent])
        setUndoStack((u) => u.slice(0, -1))
        setDocumentContent(prev)
    }

    function redo() {
        if (redoStack.length === 0) return
        const next = redoStack[redoStack.length - 1]
        setUndoStack((u) => [...u, documentContent])
        setRedoStack((r) => r.slice(0, -1))
        setDocumentContent(next)
    }

    // Manual Save
    const manualSave = useCallback(async () => {
        if (!currentDoc) return

        try {
            await saveDocumentContent(currentDoc.id, documentContent)
            console.log('Manual save successful')
        } catch (e) {
            console.error('Failed to save:', e)
            alert('Failed to save document')
        }
    }, [currentDoc, documentContent])

    const [showDownloadMenu, setShowDownloadMenu] = useState(false)

    function handleDownload(format: 'txt' | 'md' | 'pdf' | 'doc') {
        if (!currentDoc) return
        setShowDownloadMenu(false)

        if (format === 'pdf') {
            window.print()
            return
        }

        let content = documentContent
        let mimeType = 'text/plain'
        let extension = 'txt'

        if (format === 'md') {
            extension = 'md'
        } else if (format === 'doc') {
            mimeType = 'application/msword'
            extension = 'doc'
            // Basic HTML wrapper for Word to recognize paragraphs
            content = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>${currentDoc.title}</title></head>
                <body>
                    <pre style="font-family: monospace; white-space: pre-wrap;">${documentContent}</pre>
                </body>
                </html>
            `
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentDoc.title}.${extension}`
        a.click()
        URL.revokeObjectURL(url)
    }

    function nextMatch() {
        if (searchMatches === 0) return
        setActiveMatchIndex((prev) => (prev + 1) % searchMatches)
    }

    function prevMatch() {
        if (searchMatches === 0) return
        setActiveMatchIndex((prev) => (prev - 1 + searchMatches) % searchMatches)
    }

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                undo()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault()
                redo()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                manualSave()
            }
            // Ctrl+F for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                setShowSearch((prev) => !prev)
                if (!showSearch) {
                    setSearchTerm('')
                    setActiveMatchIndex(0)
                }
            }
            // Escape to close search
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false)
                setSearchTerm('')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [undoStack, redoStack, documentContent, showSearch, manualSave])

    // Dismiss keyboard when clicking outside inputs
    const handleGlobalClick = (e: React.MouseEvent) => {
        if (!isMobile) return
        const target = e.target as HTMLElement
        // If clicking on background (not input, button, or specific interactive elements)
        if (!target.closest('input, textarea, button, .interactive, .ReactModal__Content')) {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }
        }
    }

    return (
        <div className="editor-page" style={{ height: isMobile ? '100dvh' : '100vh' }} onClick={handleGlobalClick}>
            {/* Top Bar */}
            <header className="editor-topbar">
                <div className="editor-topbar-left">
                    <button
                        className="editor-topbar-btn"
                        onClick={() => setShowSidebar(!showSidebar)}
                        title="Documents"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>
                    </button>
                    <span className="editor-topbar-title">
                        {currentDoc?.title || 'No document selected'}
                    </span>
                    {currentDoc && (
                        <PresenceIndicator collaborators={collaborators} isConnected={isConnected} />
                    )}
                </div>
                <div className="editor-topbar-right">
                    {!isMobile && user && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--ed-muted)', marginRight: '0.5rem' }}>
                            {user.email}
                        </span>
                    )}
                    <button
                        className="editor-topbar-btn"
                        onClick={manualSave}
                        disabled={!currentDoc}
                        title="Save (Ctrl+S)"
                        style={{ color: saveStatus === 'saved' ? 'var(--ed-accent)' : saveStatus === 'error' ? 'var(--ed-danger)' : 'currentColor' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    </button>
                    {saveStatus === 'saving' && <span style={{ fontSize: '0.7rem', color: 'var(--ed-muted)' }}>Saving...</span>}
                    {saveStatus === 'saved' && <span style={{ fontSize: '0.7rem', color: 'var(--ed-accent)' }}>✓ Saved</span>}
                    {saveStatus === 'error' && <span style={{ fontSize: '0.7rem', color: 'var(--ed-danger)' }}>⚠ Save failed</span>}
                    <button
                        className="editor-topbar-btn"
                        onClick={() => setShowSearch(!showSearch)}
                        title="Search (Ctrl+F)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </button>
                    <button
                        className="editor-topbar-btn"
                        onClick={undo}
                        disabled={undoStack.length === 0}
                        title="Undo (Ctrl+Z)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                    </button>
                    <button
                        className="editor-topbar-btn"
                        onClick={redo}
                        disabled={redoStack.length === 0}
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
                    </button>
                    <DropdownMenu
                        align="right"
                        trigger={
                            <button
                                className="editor-topbar-btn"
                                disabled={!currentDoc}
                                title="Download Options"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </button>
                        }
                        items={[
                            {
                                label: 'Text (.txt)',
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
                                onClick: () => handleDownload('txt')
                            },
                            {
                                label: 'Markdown (.md)',
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13h-4" /><path d="M12 13v4" /></svg>,
                                onClick: () => handleDownload('md')
                            },
                            {
                                label: 'PDF (Print)',
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>,
                                onClick: () => handleDownload('pdf')
                            },
                            {
                                label: 'Word (.doc)',
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
                                onClick: () => handleDownload('doc')
                            }
                        ]}
                    />

                    {/* Phase 4: Save Version Button */}
                    <button
                        className="editor-topbar-btn"
                        onClick={() => {
                            setSaveVersionLabel('')
                            setShowSaveVersionModal(true)
                        }}
                        disabled={!currentDoc}
                        title="Save Version (Snapshot)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline><circle cx="12" cy="17" r="1.5" fill="currentColor"></circle></svg>
                    </button>

                    {/* Phase 4: History Button */}
                    <button
                        className={`editor-topbar-btn ${showHistory ? 'active' : ''}`}
                        onClick={() => setShowHistory(!showHistory)}
                        disabled={!currentDoc}
                        title="Version History"
                        style={{ color: showHistory ? 'var(--ed-accent)' : 'currentColor' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
                    </button>

                    <button
                        className="editor-topbar-btn"
                        onClick={() => setShowShareDialog(true)}
                        disabled={!currentDoc}
                        title="Share Document"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    </button>
                    <button
                        className="editor-topbar-btn"
                        onClick={toggleTheme}
                        title="Toggle Theme"
                    >
                        {isDark ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>}
                    </button>
                    <button
                        className={`editor-topbar-btn ${isMobile ? '' : 'sign-out'}`}
                        onClick={() => setShowSignOutConfirm(true)}
                        title="Sign Out"
                    >
                        {isMobile ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        ) : 'Sign Out'}
                    </button>
                    {showSignOutConfirm && (
                        <div className="chat-modal-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
                            <div className="chat-modal">
                                <h3>Sign Out?</h3>
                                <p>Are you sure you want to sign out?</p>
                                <div className="chat-modal-actions">
                                    <button
                                        className="chat-modal-btn cancel"
                                        onClick={() => setShowSignOutConfirm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="chat-modal-btn confirm"
                                        onClick={() => {
                                            setShowSignOutConfirm(false)
                                            onSignOut()
                                        }}
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Search Bar */}
            {
                showSearch && (
                    <div className="search-bar">
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg></span>
                        <input
                            type="text"
                            placeholder="Search in document..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setActiveMatchIndex(0)
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') nextMatch()
                                if (e.key === 'Escape') {
                                    setShowSearch(false)
                                    setSearchTerm('')
                                }
                            }}
                        />
                        {searchTerm && (
                            <span className="search-bar-info">
                                {searchMatches > 0
                                    ? `${activeMatchIndex + 1}/${searchMatches}`
                                    : 'No results'}
                            </span>
                        )}
                        <button className="search-bar-btn" onClick={prevMatch} title="Previous">▲</button>
                        <button className="search-bar-btn" onClick={nextMatch} title="Next">▼</button>
                        <button
                            className="search-bar-btn"
                            onClick={() => { setShowSearch(false); setSearchTerm('') }}
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                )
            }

            {/* Sidebar */}
            {
                showSidebar && (
                    <div className="editor-sidebar">
                        <div className="editor-sidebar-header">
                            <h3>Documents</h3>
                            <button onClick={() => setShowSidebar(false)}>✕</button>
                        </div>

                        {/* Search & Sort Panel */}
                        <div className="editor-sidebar-controls" style={{ padding: '0 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value)
                                    setPage(0) // reset page on new search
                                }}
                                className="editor-sidebar-search"
                                style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-color)' }}
                            />
                            <div style={{ width: '100%' }}>
                                <DropdownMenu
                                    align="left"
                                    trigger={
                                        <button
                                            className="editor-sidebar-search"
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem 0.6rem',
                                                fontSize: '0.85rem',
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '4px',
                                                color: 'var(--text-color)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer'
                                            }}
                                            title="Sort documents"
                                        >
                                            <span>
                                                {sortOption === 'updated_desc' && 'Latest Update'}
                                                {sortOption === 'updated_asc' && 'Oldest Update'}
                                                {sortOption === 'title_asc' && 'Title (A-Z)'}
                                                {sortOption === 'title_desc' && 'Title (Z-A)'}
                                            </span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><path d="m6 9 6 6 6-6" /></svg>
                                        </button>
                                    }
                                    items={[
                                        { label: 'Latest Update', onClick: () => { setSortOption('updated_desc'); setPage(0); } },
                                        { label: 'Oldest Update', onClick: () => { setSortOption('updated_asc'); setPage(0); } },
                                        { label: 'Title (A-Z)', onClick: () => { setSortOption('title_asc'); setPage(0); } },
                                        { label: 'Title (Z-A)', onClick: () => { setSortOption('title_desc'); setPage(0); } }
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="editor-sidebar-new">
                            <input
                                type="text"
                                placeholder="New document title..."
                                value={newDocTitle}
                                onChange={(e) => setNewDocTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateDocument()
                                }}
                            />
                            <button onClick={handleCreateDocument} disabled={!newDocTitle.trim()}>
                                +
                            </button>
                        </div>
                        <div className="editor-sidebar-list">
                            {isSearching ? (
                                <div className="editor-sidebar-empty">Searching...</div>
                            ) : documents.length === 0 ? (
                                searchQuery ? (
                                    <div className="editor-sidebar-empty">
                                        No documents matching "{searchQuery}"
                                    </div>
                                ) : (
                                    <div className="editor-sidebar-empty" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No documents yet</div>
                                )
                            ) : (
                                documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className={`editor-sidebar-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                        onClick={() => renamingId !== doc.id && selectDocument(doc)}
                                        onDoubleClick={() => renamingId !== doc.id && startRename(doc)}
                                    >
                                        {renamingId === doc.id ? (
                                            /* Inline rename input */
                                            <input
                                                type="text"
                                                value={renameValue}
                                                autoFocus
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={() => submitRename(doc.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') submitRename(doc.id)
                                                    if (e.key === 'Escape') setRenamingId(null)
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ flex: 1, background: 'var(--ed-surface)', color: 'var(--ed-text)', border: '1px solid var(--ed-accent)', borderRadius: '4px', padding: '0.35rem 0.5rem', fontSize: '0.85rem', outline: 'none' }}
                                            />
                                        ) : (
                                            /* Normal view */
                                            <>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="editor-sidebar-item-title">
                                                        {doc.title}
                                                    </div>
                                                    <div className="editor-sidebar-item-date">
                                                        {new Date(doc.updated_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="editor-sidebar-item-actions">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startRename(doc) }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--ed-muted)', cursor: 'pointer', padding: '0.2rem' }}
                                                        title="Rename document"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(doc.id) }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--ed-danger)', cursor: 'pointer', padding: '0.2rem' }}
                                                        title="Delete document"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Delete Confirmation Modal */}
                        {showDeleteConfirm && (
                            <div className="chat-modal-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
                                <div className="chat-modal">
                                    <h3>Delete Document?</h3>
                                    <p>This action cannot be undone.</p>
                                    <div className="chat-modal-actions">
                                        <button className="chat-modal-btn cancel" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                                        <button className="chat-modal-btn confirm" onClick={() => handleDeleteDocument(showDeleteConfirm)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Main Editor Area */}
            <div className="editor-main">
                {currentDoc ? (
                    isMobile ? (
                        /* Mobile View: Tabs */
                        <div key={currentDoc.id} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Typing indicator */}
                            {typingUsers.length > 0 && (
                                <div className="typing-indicator">
                                    <span className="typing-dots"><span /><span /><span /></span>
                                    {typingUsers
                                        .map((uid) => collaborators.find((c) => c.userId === uid)?.displayName ?? 'Someone')
                                        .join(', ')} is typing...
                                </div>
                            )}
                            <div style={{ flex: 1, overflow: 'hidden', display: mobileTab === 'editor' ? 'block' : 'none', height: '100%' }}>
                                <DocumentEditor
                                    content={documentContent}
                                    onChange={handleDocumentChange}
                                    searchTerm={searchTerm}
                                    activeMatch={activeMatchIndex}
                                    onCursorMove={throttledUpdateCursor}
                                    collaborators={collaborators}
                                />
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', display: mobileTab === 'chat' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
                                <AIChat
                                    documentContent={documentContent}
                                    onDocumentUpdate={handleAIUpdate}
                                    documentId={currentDoc.id}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Desktop View: Split Pane */
                        <Group key={currentDoc.id} orientation="horizontal">

                            <Panel defaultSize={50} minSize={30}>
                                {/* Typing indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="typing-indicator">
                                        <span className="typing-dots"><span /><span /><span /></span>
                                        {typingUsers
                                            .map((uid) => collaborators.find((c) => c.userId === uid)?.displayName ?? 'Someone')
                                            .join(', ')} is typing...
                                    </div>
                                )}
                                <DocumentEditor
                                    content={documentContent}
                                    onChange={handleDocumentChange}
                                    searchTerm={searchTerm}
                                    activeMatch={activeMatchIndex}
                                    onCursorMove={throttledUpdateCursor}
                                    collaborators={collaborators}
                                />
                            </Panel>

                            <Separator className="editor-resize-handle" />

                            <Panel defaultSize={50} minSize={30}>
                                <AIChat
                                    documentContent={documentContent}
                                    onDocumentUpdate={handleAIUpdate}
                                    documentId={currentDoc.id}
                                />
                            </Panel>
                        </Group>
                    )
                ) : (
                    <div className="editor-empty-state">
                        <div className="editor-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg></div>
                        <h2>Welcome to AI Document Editor</h2>
                        <p>
                            Click the folder icon to create or open a document, then start editing with AI
                            assistance!
                        </p>
                        <button
                            className="editor-empty-btn"
                            onClick={() => setShowSidebar(true)}
                        >
                            Open Documents
                        </button>
                    </div>
                )}

                {/* Share Dialog */}
                {showShareDialog && currentDoc && user && (
                    <ShareDialog
                        documentId={currentDoc.id}
                        ownerId={user.id}
                        onClose={() => setShowShareDialog(false)}
                    />
                )}

                {/* Phase 4: Diff Modal */}
                {compareVersions && (
                    <DiffModal
                        versionIdA={compareVersions.a}
                        versionIdB={compareVersions.b}
                        onClose={() => setCompareVersions(null)}
                    />
                )}

            </div>

            {/* Mobile Bottom Navigation */}
            <div className="mobile-nav-bar">
                <button
                    className={`mobile-nav-item ${mobileTab === 'editor' ? 'active' : ''}`}
                    onClick={() => setMobileTab('editor')}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                    <span>Editor</span>
                </button>
                <button
                    className={`mobile-nav-item ${mobileTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setMobileTab('chat')}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    <span>Chat AI</span>
                </button>
            </div>

            {/* ───── Phase 4: History Overlay Sidebar ───── */}
            {showHistory && currentDoc && user && (
                <>
                    <div
                        onClick={() => setShowHistory(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(2px)',
                        }}
                    />
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0,
                        width: '320px', zIndex: 101,
                        backgroundColor: '#050505',
                        borderRight: '1px solid #222',
                        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
                        animation: 'slideInLeft 0.25s ease-out',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', borderBottom: '1px solid #222',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
                                Version History
                            </h2>
                            <button
                                onClick={() => setShowHistory(false)}
                                style={{
                                    background: 'none', border: 'none', color: '#a1a1aa',
                                    cursor: 'pointer', padding: '4px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center',
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <VersionTimeline
                                documentId={currentDoc.id}
                                userId={user.id}
                                onCompare={(a, b) => {
                                    setCompareVersions({ a, b })
                                    setShowHistory(false)
                                }}
                                onContentRestore={async () => {
                                    const fresh = await getDocument(currentDoc.id)
                                    setCurrentDoc(fresh)
                                    setDocumentContent(fresh.content || '')
                                }}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* ───── Phase 4: Save Version Modal ───── */}
            {showSaveVersionModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                }}>
                    <div style={{
                        backgroundColor: '#111', border: '1px solid #333',
                        borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '400px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    }}>
                        <h3 style={{ margin: '0 0 0.25rem', color: 'white', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            Save Version
                        </h3>
                        <p style={{ margin: '0 0 1rem', color: '#a1a1aa', fontSize: '0.8rem' }}>
                            Give this version a name (optional).
                        </p>
                        <input
                            type="text"
                            value={saveVersionLabel}
                            onChange={(e) => setSaveVersionLabel(e.target.value)}
                            placeholder="e.g. Final draft, Before revision..."
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    saveNamedVersion(saveVersionLabel.trim())
                                    setShowSaveVersionModal(false)
                                } else if (e.key === 'Escape') {
                                    setShowSaveVersionModal(false)
                                }
                            }}
                            style={{
                                width: '100%', padding: '0.625rem 0.75rem',
                                backgroundColor: '#1a1a1a', border: '1px solid #333',
                                borderRadius: '8px', color: 'white', fontSize: '0.85rem',
                                outline: 'none', boxSizing: 'border-box',
                                marginBottom: '1rem',
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowSaveVersionModal(false)}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                    border: '1px solid #333', backgroundColor: 'transparent',
                                    color: '#a1a1aa', cursor: 'pointer', fontSize: '0.8rem',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await saveNamedVersion(saveVersionLabel.trim())
                                    setShowSaveVersionModal(false)
                                }}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                    border: 'none', backgroundColor: '#c71f1fff',
                                    color: 'white', cursor: 'pointer', fontSize: '0.8rem',
                                    fontWeight: 600,
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── Phase 4: Diff Modal ───── */}
            {compareVersions && (
                <DiffModal
                    versionIdA={compareVersions.a}
                    versionIdB={compareVersions.b}
                    onClose={() => setCompareVersions(null)}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `@keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }`}} />
        </div>
    )
}


// ======== Main Page ========
export default function EditorPage() {
    const { user, loading, signOut } = useAuth()
    const [isDark, setIsDark] = useState(true)

    useEffect(() => {
        // Load saved theme
        const savedTheme = localStorage.getItem('ai-editor-theme')
        if (savedTheme === 'light') {
            setIsDark(false)
        }
    }, [])

    function toggleTheme() {
        setIsDark((prev) => {
            const next = !prev
            localStorage.setItem('ai-editor-theme', next ? 'dark' : 'light')
            return next
        })
    }

    if (loading) {
        return (
            <div className={`ai-editor-root ${isDark ? '' : 'light-mode'}`}>
                <div className="login-page">
                    <div className="chat-loading">
                        <span className="chat-loading-dot" />
                        <span className="chat-loading-dot" />
                        <span className="chat-loading-dot" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`ai-editor-root ${isDark ? '' : 'light-mode'}`}>
            {user
                ? <EditorApp onSignOut={signOut} isDark={isDark} toggleTheme={toggleTheme} />
                : <LoginForm isDark={isDark} toggleTheme={toggleTheme} />
            }
        </div>
    )
}
