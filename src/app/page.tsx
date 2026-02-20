'use client'

import './ai-editor.css'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import DocumentEditor from '@/components/DocumentEditor'
import AIChat from '@/components/AIChat'
import { useAuth } from '@/components/AuthProvider'
import { useAutoSave } from '@/hooks/useAutoSave'
import DropdownMenu from '@/components/ui/DropdownMenu'

interface Document {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    user_id: string
}

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
                await signUp(email)
            } else {
                await signIn(email)
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
    const [documents, setDocuments] = useState<Document[]>([])
    const [showSidebar, setShowSidebar] = useState(false)
    const [newDocTitle, setNewDocTitle] = useState('')
    const [undoStack, setUndoStack] = useState<string[]>([])
    const [redoStack, setRedoStack] = useState<string[]>([])
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

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

    // Load documents from LocalStorage
    useEffect(() => {
        if (!user) return

        function fetchDocs() {
            try {
                const savedDocs = localStorage.getItem('claridoc-documents')
                if (savedDocs) {
                    const parsedDocs = JSON.parse(savedDocs)
                    setDocuments(parsedDocs)
                    // If we have documents but none selected, select the first one
                    if (parsedDocs.length > 0 && !currentDoc) {
                        setCurrentDoc(parsedDocs[0])
                        setDocumentContent(parsedDocs[0].content)
                    }
                }
            } catch (e) {
                console.error('Failed to load documents', e)
            }
        }

        fetchDocs()
    }, [user, currentDoc])

    // Auto-save using hook
    useAutoSave(currentDoc?.id ?? null, documentContent)

    async function createDocument() {
        if (!newDocTitle.trim()) {
            alert('Please enter a document title')
            return
        }
        if (!user) {
            alert('Please log in first')
            return
        }

        try {
            const newDoc: Document = {
                id: crypto.randomUUID(),
                title: newDocTitle.trim(),
                content: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: user.id
            }

            console.log('Creating document locally:', newDoc.title)

            const updatedDocs = [newDoc, ...documents]
            localStorage.setItem('claridoc-documents', JSON.stringify(updatedDocs))

            setDocuments(updatedDocs)
            setCurrentDoc(newDoc)
            setDocumentContent('')
            setNewDocTitle('')
            setUndoStack([])
            setRedoStack([])

        } catch (error) {
            console.error('Error creating document:', error)
            alert(`Failed to create document`)
        }
    }

    function selectDocument(doc: Document) {
        setCurrentDoc(doc)
        setDocumentContent(doc.content)
        setShowSidebar(false)
        setUndoStack([])
        setRedoStack([])
    }

    const handleDocumentChange = useCallback(
        (newContent: string) => {
            setUndoStack((prev) => [...prev.slice(-49), documentContent])
            setRedoStack([])
            setDocumentContent(newContent)
        },
        [documentContent]
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

    // Manual Save now just updates timestamp essentially, since auto-save handles content
    const manualSave = useCallback(async () => {
        if (!currentDoc) return

        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)

        // Force update timestamp in LocalStorage
        try {
            const savedDocs = localStorage.getItem('claridoc-documents')
            if (savedDocs) {
                const docs = JSON.parse(savedDocs)
                const updatedDocs = docs.map((doc: any) =>
                    doc.id === currentDoc.id
                        ? { ...doc, content: documentContent, updated_at: new Date().toISOString() }
                        : doc
                )
                localStorage.setItem('claridoc-documents', JSON.stringify(updatedDocs))
            }
        } catch (e) {
            console.error('Failed to save', e)
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
                        style={{ color: isSaved ? 'var(--ed-accent)' : 'currentColor' }}
                    >
                        {isSaved ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>Saved!</span>
                            </div>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        )}
                    </button>
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
                        <div className="editor-sidebar-new">
                            <input
                                type="text"
                                placeholder="New document title..."
                                value={newDocTitle}
                                onChange={(e) => setNewDocTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') createDocument()
                                }}
                            />
                            <button onClick={createDocument} disabled={!newDocTitle.trim()}>
                                +
                            </button>
                        </div>
                        <div className="editor-sidebar-list">
                            {documents.map((doc) => (
                                <button
                                    key={doc.id}
                                    className={`editor-sidebar-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
                                    onClick={() => selectDocument(doc)}
                                >
                                    <span className="editor-sidebar-item-title">{doc.title}</span>
                                    <span className="editor-sidebar-item-date">
                                        {new Date(doc.updated_at).toLocaleDateString()}
                                    </span>
                                </button>
                            ))}
                            {documents.length === 0 && (
                                <p className="editor-sidebar-empty">
                                    No documents yet. Create one above!
                                </p>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Main Editor Area */}
            <div className="editor-main">
                {currentDoc ? (
                    isMobile ? (
                        /* Mobile View: Tabs */
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, overflow: 'hidden', display: mobileTab === 'editor' ? 'block' : 'none', height: '100%' }}>
                                <DocumentEditor
                                    content={documentContent}
                                    onChange={handleDocumentChange}
                                    searchTerm={searchTerm}
                                    activeMatch={activeMatchIndex}
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
                        <Group orientation="horizontal">
                            <Panel defaultSize={50} minSize={30}>
                                <DocumentEditor
                                    content={documentContent}
                                    onChange={handleDocumentChange}
                                    searchTerm={searchTerm}
                                    activeMatch={activeMatchIndex}
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
        </div >
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
