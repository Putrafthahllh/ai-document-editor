'use client'

import { useMemo, type RefObject } from 'react'
import type { CollaboratorPresence } from '@/hooks/useCollaboration'

interface CursorOverlayProps {
    collaborators: CollaboratorPresence[]
    textareaRef: RefObject<HTMLTextAreaElement | null>
    content: string
    scrollTop: number
    scrollLeft: number
}

interface CursorPixelPosition {
    x: number
    y: number
    collaborator: CollaboratorPresence
}

export function CursorOverlay({ collaborators, content, scrollTop, scrollLeft }: CursorOverlayProps) {
    const cursorPositions = useMemo(() => {
        const positions: CursorPixelPosition[] = []
        const lines = content.split('\n')

        // Use a fixed monospace char width (~7.8px at 13px font size) and line height (19.2px)
        // These match the doc-textarea CSS values
        const charWidth = 7.8
        const lineHeight = 19.2
        const paddingTop = 12
        const paddingLeft = 12

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

    if (cursorPositions.length === 0) return null

    return (
        <div className="cursor-overlay">
            {cursorPositions.map(({ x, y, collaborator }) => (
                <div
                    key={collaborator.userId}
                    className="cursor-remote"
                    style={{ left: x, top: y }}
                >
                    <div
                        className="cursor-line"
                        style={{ backgroundColor: collaborator.color }}
                    />
                    <div
                        className="cursor-label"
                        style={{ backgroundColor: collaborator.color }}
                    >
                        {collaborator.displayName}
                    </div>
                </div>
            ))}
        </div>
    )
}
