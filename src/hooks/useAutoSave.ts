'use client'

import { useEffect, useRef } from 'react'


export function useAutoSave(documentId: string | null, content: string) {
    const savedContentRef = useRef(content)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!documentId) return
        if (content === savedContentRef.current) return

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            // LocalStorage Save
            try {
                // Get existing docs to update them
                const savedDocs = localStorage.getItem('claridoc-documents')
                if (savedDocs) {
                    const docs = JSON.parse(savedDocs)
                    const updatedDocs = docs.map((doc: any) =>
                        doc.id === documentId
                            ? { ...doc, content, updated_at: new Date().toISOString() }
                            : doc
                    )
                    localStorage.setItem('claridoc-documents', JSON.stringify(updatedDocs))
                }
                savedContentRef.current = content
                console.log('Auto-saved to LocalStorage')
            } catch (e) {
                console.error('Failed to auto-save to LocalStorage', e)
            }
        }, 1000)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [documentId, content])
}
