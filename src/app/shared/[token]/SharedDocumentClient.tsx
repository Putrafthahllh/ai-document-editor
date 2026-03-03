'use client'

import { useState, useEffect } from 'react'
import { getDocumentByToken, type SharedDocumentResult } from '@/lib/sharing'
import { SharedDocumentView } from './SharedDocumentView'

interface Props {
    token: string
}

export function SharedDocumentClient({ token }: Props) {
    const [result, setResult] = useState<SharedDocumentResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        async function fetchShared() {
            try {
                const data = await getDocumentByToken(token)
                if (data) {
                    setResult(data)
                } else {
                    setError(true)
                }
            } catch (e) {
                console.error('Failed to fetch shared document:', e)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        fetchShared()
    }, [token])

    if (loading) {
        return (
            <div className="shared-invalid">
                <p style={{ fontSize: '0.9rem', color: '#888' }}>Loading shared document...</p>
            </div>
        )
    }

    if (error || !result) {
        return (
            <div className="shared-invalid">
                <div className="shared-invalid-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="m15 9-6 6" />
                        <path d="m9 9 6 6" />
                    </svg>
                </div>
                <h1>Link Not Valid</h1>
                <p>This link has expired, been revoked, or the document has been deleted.</p>
            </div>
        )
    }

    return (
        <SharedDocumentView
            document={result.document}
            permission={result.permission}
            token={token}
        />
    )
}
