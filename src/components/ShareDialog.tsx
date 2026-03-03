'use client'

import { useState, useEffect } from 'react'
import {
    createShareLink,
    getDocumentShares,
    revokeShareLink,
    type Permission,
    type ShareRecord
} from '@/lib/sharing'

interface ShareDialogProps {
    documentId: string
    ownerId: string
    onClose: () => void
}

export function ShareDialog({ documentId, ownerId, onClose }: ShareDialogProps) {
    const [shares, setShares] = useState<ShareRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [permission, setPermission] = useState<Permission>('view')
    const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
    const [isCreating, setIsCreating] = useState(false)
    const [copiedToken, setCopiedToken] = useState<string | null>(null)
    const [revokeTarget, setRevokeTarget] = useState<string | null>(null) // for confirm modal

    useEffect(() => {
        loadShares()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId])

    async function loadShares() {
        try {
            const data = await getDocumentShares(documentId)
            setShares(data)
        } catch {
            console.error('Failed to load shares')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCreate() {
        setIsCreating(true)
        try {
            const url = await createShareLink(documentId, ownerId, permission, expiresInDays)
            await navigator.clipboard.writeText(url)
            await loadShares()
        } catch {
            alert('Failed to create share link')
        } finally {
            setIsCreating(false)
        }
    }

    async function handleCopy(token: string) {
        const url = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${token}`
        await navigator.clipboard.writeText(url)
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), 2000)
    }

    async function confirmRevoke() {
        if (!revokeTarget) return
        try {
            await revokeShareLink(revokeTarget)
            setShares(prev => prev.filter(s => s.id !== revokeTarget))
        } catch {
            alert('Failed to revoke share link')
        } finally {
            setRevokeTarget(null)
        }
    }

    return (
        <div className="chat-modal-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
            <div className="chat-modal" style={{ maxWidth: '420px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Share Document</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--ed-muted)', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Create link form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {/* Permission selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ed-muted)', marginBottom: '0.35rem' }}>
                            Permission
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setPermission('view')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${permission === 'view' ? 'var(--ed-accent)' : 'var(--ed-border)'}`,
                                    background: permission === 'view' ? 'var(--ed-accent-dim)' : 'var(--ed-input-bg)',
                                    color: permission === 'view' ? 'var(--ed-fg)' : 'var(--ed-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    fontFamily: 'var(--ed-font-sans)',
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}>
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                View Only
                            </button>
                            <button
                                onClick={() => setPermission('edit')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${permission === 'edit' ? 'var(--ed-accent)' : 'var(--ed-border)'}`,
                                    background: permission === 'edit' ? 'var(--ed-accent-dim)' : 'var(--ed-input-bg)',
                                    color: permission === 'edit' ? 'var(--ed-fg)' : 'var(--ed-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    fontFamily: 'var(--ed-font-sans)',
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}>
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                                Can Edit
                            </button>
                        </div>
                    </div>

                    {/* Expiry selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ed-muted)', marginBottom: '0.35rem' }}>
                            Expires
                        </label>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Never', value: undefined },
                                { label: '1 day', value: 1 },
                                { label: '7 days', value: 7 },
                                { label: '30 days', value: 30 },
                            ].map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => setExpiresInDays(opt.value)}
                                    style={{
                                        padding: '0.35rem 0.65rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        border: `1px solid ${expiresInDays === opt.value ? 'var(--ed-accent)' : 'var(--ed-border)'}`,
                                        background: expiresInDays === opt.value ? 'var(--ed-accent-dim)' : 'var(--ed-input-bg)',
                                        color: expiresInDays === opt.value ? 'var(--ed-fg)' : 'var(--ed-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        fontFamily: 'var(--ed-font-sans)',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Create button */}
                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        style={{
                            padding: '0.6rem',
                            background: 'var(--ed-fg)',
                            color: 'var(--ed-bg)',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: isCreating ? 'not-allowed' : 'pointer',
                            opacity: isCreating ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                            fontFamily: 'var(--ed-font-sans)',
                        }}
                    >
                        {isCreating ? 'Creating...' : 'Create & Copy Link'}
                    </button>
                </div>

                {/* Active share links */}
                <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ed-muted)', marginBottom: '0.5rem' }}>
                        Active Links
                    </h4>
                    {isLoading ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--ed-muted)' }}>Loading...</p>
                    ) : shares.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--ed-muted)' }}>No active share links.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                            {shares.map(share => (
                                <div
                                    key={share.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 0.65rem',
                                        background: 'var(--ed-input-bg)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--ed-border)',
                                    }}
                                >
                                    {/* Permission badge */}
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '4px',
                                        background: share.permission === 'edit'
                                            ? 'rgba(234, 179, 8, 0.15)'
                                            : 'var(--ed-accent-dim)',
                                        color: share.permission === 'edit'
                                            ? '#eab308'
                                            : 'var(--ed-muted)',
                                        textTransform: 'uppercase',
                                    }}>
                                        {share.permission}
                                    </span>

                                    {/* Expiry info */}
                                    <span style={{ flex: 1, fontSize: '0.7rem', color: 'var(--ed-muted)' }}>
                                        {share.expires_at
                                            ? `Exp: ${new Date(share.expires_at).toLocaleDateString()}`
                                            : 'No expiry'}
                                    </span>

                                    {/* Copy button */}
                                    <button
                                        onClick={() => handleCopy(share.share_token)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: copiedToken === share.share_token ? 'var(--ed-fg)' : 'var(--ed-accent)',
                                            cursor: 'pointer',
                                            padding: '0.2rem',
                                            fontSize: '0.75rem',
                                            fontFamily: 'var(--ed-font-sans)',
                                        }}
                                    >
                                        {copiedToken === share.share_token ? '✓ Copied' : 'Copy'}
                                    </button>

                                    {/* Revoke button */}
                                    <button
                                        onClick={() => setRevokeTarget(share.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--ed-danger)',
                                            cursor: 'pointer',
                                            padding: '0.2rem',
                                            fontSize: '0.75rem',
                                            fontFamily: 'var(--ed-font-sans)',
                                        }}
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Revoke confirmation modal */}
            {revokeTarget && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 1100,
                    }}
                    onClick={() => setRevokeTarget(null)}
                >
                    <div
                        className="chat-modal"
                        style={{
                            maxWidth: '340px',
                            width: '85%',
                            textAlign: 'center',
                            padding: '1.5rem',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: '0.75rem' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ed-danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.5rem' }}>
                                <circle cx="12" cy="12" r="10" />
                                <path d="m15 9-6 6" />
                                <path d="m9 9 6 6" />
                            </svg>
                            <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 600 }}>Revoke Share Link?</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ed-muted)', lineHeight: 1.5 }}>
                                Anyone with this link will immediately lose access to this document. This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button
                                onClick={() => setRevokeTarget(null)}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: 'var(--ed-input-bg)',
                                    border: '1px solid var(--ed-border)',
                                    borderRadius: '8px',
                                    color: 'var(--ed-fg)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontFamily: 'var(--ed-font-sans)',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRevoke}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: 'var(--ed-danger)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    fontFamily: 'var(--ed-font-sans)',
                                }}
                            >
                                Revoke
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
