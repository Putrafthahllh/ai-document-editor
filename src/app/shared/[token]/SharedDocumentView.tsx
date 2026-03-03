'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { type Document } from '@/lib/documents'
import { type Permission } from '@/lib/sharing'
import { supabase } from '@/lib/supabase/client'
import { useCollaboration, type CollaboratorPresence } from '@/hooks/useCollaboration'
import { useThrottle } from '@/hooks/useThrottle'
import { PresenceIndicator } from '@/components/PresenceIndicator'
import './shared.css'

interface SharedDocumentViewProps {
    document: Document
    permission: Permission
    token: string
}

function getAnonymousId(): string {
    if (typeof window === 'undefined') return 'anon'
    let id = sessionStorage.getItem('collab-anon-id')
    if (!id) {
        id = 'anon-' + Math.random().toString(36).substring(2, 10)
        sessionStorage.setItem('collab-anon-id', id)
    }
    return id
}

export function SharedDocumentView({ document: initialDoc, permission }: SharedDocumentViewProps) {
    const isViewOnly = permission === 'view'
    const [content, setContent] = useState(initialDoc.content || '')
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const isReceivingRemoteChange = useRef(false)
    const [scrollTop, setScrollTop] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)

    const [userId, setUserId] = useState<string>('')
    const [displayName, setDisplayName] = useState<string>('Guest')

    useEffect(() => {
        async function getUser() {
            const { data } = await supabase.auth.getUser()
            if (data.user) {
                setUserId(data.user.id)
                setDisplayName(data.user.email?.split('@')[0] ?? 'User')
            } else {
                setUserId(getAnonymousId())
                setDisplayName('Guest')
            }
        }
        getUser()
    }, [])

    // Collaboration
    const handleRemoteContentChange = useCallback((newContent: string) => {
        isReceivingRemoteChange.current = true
        setContent(newContent)
        setTimeout(() => { isReceivingRemoteChange.current = false }, 0)
    }, [])

    const { collaborators, typingUsers, isConnected, broadcastContentChange, updateCursor } = useCollaboration({
        documentId: initialDoc.id,
        userId,
        displayName,
        onContentChange: handleRemoteContentChange,
    })

    const throttledUpdateCursor = useThrottle(updateCursor, 100)

    const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const debouncedBroadcast = useCallback((text: string) => {
        clearTimeout(broadcastTimerRef.current)
        broadcastTimerRef.current = setTimeout(() => {
            broadcastContentChange(text)
        }, 300)
    }, [broadcastContentChange])

    // Auto-save
    useEffect(() => {
        if (isViewOnly) return
        if (content === initialDoc.content) return

        setSaveStatus('saving')
        const timer = setTimeout(async () => {
            try {
                await supabase
                    .from('documents')
                    .update({ content, updated_at: new Date().toISOString() })
                    .eq('id', initialDoc.id)
                setSaveStatus('saved')
            } catch {
                console.error('Failed to save shared document')
            }
        }, 1500)

        return () => clearTimeout(timer)
    }, [content, initialDoc.id, initialDoc.content, isViewOnly])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        setContent(newContent)
        if (!isReceivingRemoteChange.current) {
            debouncedBroadcast(newContent)
        }
    }, [debouncedBroadcast])

    function getCursorPosition(textarea: HTMLTextAreaElement): { line: number; col: number } {
        const selectionStart = textarea.selectionStart ?? 0
        const textBeforeCursor = textarea.value.substring(0, selectionStart)
        const cursorLines = textBeforeCursor.split('\n')
        return { line: cursorLines.length, col: cursorLines[cursorLines.length - 1].length }
    }

    function handleCursorMove() {
        if (!textareaRef.current) return
        const pos = getCursorPosition(textareaRef.current)
        throttledUpdateCursor(pos.line, pos.col)
    }

    function handleScroll() {
        if (!textareaRef.current) return
        setScrollTop(textareaRef.current.scrollTop)
        setScrollLeft(textareaRef.current.scrollLeft)
    }

    const cursorPositions = useMemo(() => {
        const positions: { x: number; y: number; collaborator: CollaboratorPresence }[] = []
        const lines = content.split('\n')
        const charWidth = 7.8
        const lineHeight = 19.2
        const paddingTop = 20
        const paddingLeft = 32

        for (const collaborator of collaborators) {
            if (!collaborator.cursor) continue
            const { line, col } = collaborator.cursor
            if (line < 1 || line > lines.length + 1) continue
            positions.push({
                x: paddingLeft + col * charWidth - scrollLeft,
                y: paddingTop + (line - 1) * lineHeight - scrollTop,
                collaborator,
            })
        }
        return positions
    }, [collaborators, content, scrollTop, scrollLeft])

    return (
        <div className="shared-page">
            {/* ── Topbar ── */}
            <div className="shared-topbar">
                <div className="shared-topbar-left">
                    <div className="shared-topbar-logo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>ClariDoc</span>
                    </div>
                    <div className="shared-topbar-divider" />
                    <span className="shared-topbar-title">{initialDoc.title}</span>
                </div>

                <div className="shared-topbar-right">
                    <PresenceIndicator collaborators={collaborators} isConnected={isConnected} />

                    <div className={`shared-badge ${isViewOnly ? 'shared-badge--view' : 'shared-badge--edit'}`}>
                        {isViewOnly ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                        )}
                        {isViewOnly ? 'View Only' : 'Editing'}
                    </div>

                    {!isViewOnly && saveStatus !== 'idle' && (
                        <span className={`shared-save-status ${saveStatus === 'saved' ? 'shared-save-status--saved' : ''}`}>
                            {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
                        </span>
                    )}
                </div>
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <div className="shared-typing-indicator">
                    <span className="shared-typing-dots"><span /><span /><span /></span>
                    {typingUsers
                        .map((uid) => collaborators.find((c) => c.userId === uid)?.displayName ?? 'Someone')
                        .join(', ')} sedang mengetik...
                </div>
            )}

            {/* ── Editor ── */}
            <div className="shared-editor">
                <div className="shared-editor-meta">
                    <h1 className="shared-doc-title">{initialDoc.title}</h1>
                    <span className="shared-doc-date">
                        Last updated: {new Date(initialDoc.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <div className="shared-editor-body">
                    <textarea
                        ref={textareaRef}
                        className="shared-textarea"
                        value={content}
                        onChange={handleChange}
                        onMouseUp={handleCursorMove}
                        onKeyUp={handleCursorMove}
                        onSelect={handleCursorMove}
                        onScroll={handleScroll}
                        readOnly={isViewOnly}
                        placeholder={isViewOnly ? 'This document is empty.' : 'Start typing...'}
                        spellCheck={false}
                    />
                    {cursorPositions.length > 0 && (
                        <div className="cursor-overlay">
                            {cursorPositions.map(({ x, y, collaborator }) => (
                                <div
                                    key={collaborator.userId}
                                    className="cursor-remote"
                                    style={{ left: x, top: y }}
                                >
                                    <div className="cursor-line" style={{ backgroundColor: collaborator.color }} />
                                    <div className="cursor-label" style={{ backgroundColor: collaborator.color }}>
                                        {collaborator.displayName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
