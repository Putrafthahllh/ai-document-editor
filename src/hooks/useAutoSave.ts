'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useAutoSave(documentId: string | null, content: string) {
    const savedContentRef = useRef(content)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

    useEffect(() => {
        if (!documentId) return
        if (content === savedContentRef.current) return

        setSaveStatus('saving')

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('documents')
                    .update({
                        content,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', documentId)

                if (error) throw error

                savedContentRef.current = content
                setSaveStatus('saved')
                console.log('Auto-saved to Supabase')
            } catch (err) {
                console.error('Auto-save failed:', err)
                setSaveStatus('error')
            }
        }, 2000)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [documentId, content])

    return { saveStatus }
}
