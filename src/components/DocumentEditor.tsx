'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

interface Props {
    content: string
    onChange: (content: string) => void
    searchTerm?: string
    activeMatch?: number
}

export default function DocumentEditor({ content, onChange, searchTerm, activeMatch }: Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const lineNumbersRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const [lines, setLines] = useState<string[]>([])

    useEffect(() => {
        setLines(content.split('\n'))
    }, [content])

    const lineCount = Math.max(lines.length, 1)

    // Sync scroll between textarea, line numbers, and backdrop
    const syncScroll = useCallback(() => {
        const textarea = textareaRef.current
        const lineNumbers = lineNumbersRef.current
        const backdrop = backdropRef.current

        if (!textarea) return

        if (lineNumbers) lineNumbers.scrollTop = textarea.scrollTop
        if (backdrop) {
            backdrop.scrollTop = textarea.scrollTop
            backdrop.scrollLeft = textarea.scrollLeft
        }
    }, [])

    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.addEventListener('scroll', syncScroll)
        return () => textarea.removeEventListener('scroll', syncScroll)
    }, [syncScroll])

    // Detect if a line looks like code (simple heuristic)
    function isCodeLine(line: string): boolean {
        const trimmed = line.trim()
        return (
            trimmed.startsWith('//') ||
            trimmed.startsWith('#') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('*/') ||
            trimmed.startsWith('*') ||
            /^(const|let|var|function|class|import|export|if|for|while|return|def|print)\b/.test(trimmed) ||
            /[{};]$/.test(trimmed)
        )
    }

    // Scroll active match into view
    useEffect(() => {
        if (!searchTerm || activeMatch === -1 || !textareaRef.current) return

        try {
            const lowerContent = content.toLowerCase()
            const lowerTerm = searchTerm.toLowerCase()
            let count = 0
            let pos = lowerContent.indexOf(lowerTerm)

            while (pos !== -1) {
                if (count === activeMatch) {
                    // Found the active match position
                    const val = textareaRef.current.value
                    const linesBefore = val.substring(0, pos).split('\n')
                    const lineNum = linesBefore.length
                    const lineHeight = 19.2 // approx 1.2rem

                    // Scroll to keep match in view
                    const scrollPos = (lineNum - 1) * lineHeight - (textareaRef.current.clientHeight / 2)
                    textareaRef.current.scrollTo({
                        top: Math.max(0, scrollPos),
                        behavior: 'smooth'
                    })
                    break
                }
                count++
                pos = lowerContent.indexOf(lowerTerm, pos + 1)
            }
        } catch {
            // ignore
        }
    }, [activeMatch, searchTerm, content])

    // Generate highlight HTML 
    // We render text transparently but background marks visibly
    function getBackdropHTML() {
        if (!searchTerm) {
            return content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n ' // extra space for height match
        }

        try {
            const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`(${escapedTerm})`, 'gi')

            let matchIndex = 0
            return content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(regex, (match) => {
                    const cls = matchIndex === activeMatch ? 'search-highlight-active' : 'search-highlight'
                    matchIndex++
                    // Important: The text inside mark must be present for spacing, but visibility hidden is inherited?
                    // No, we want the MARK background to be visible.
                    // The text content itself is hidden by parent color: transparent.
                    return `<mark class="${cls}">${match}</mark>`
                }) + '\n '
        } catch {
            return content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n '
        }
    }

    return (
        <div className="doc-editor">
            <div className="doc-editor-header">
                <span>Document Editor</span>
                <span>{lineCount} lines</span>
            </div>
            <div className="doc-editor-body">
                <div className="doc-line-numbers" ref={lineNumbersRef}>
                    {lines.map((line, i) => (
                        <div
                            key={i + 1}
                            className={isCodeLine(line) ? 'line-code' : ''}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>

                <div className="doc-textarea-container" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                    <div
                        ref={backdropRef}
                        className="doc-backdrop"
                        dangerouslySetInnerHTML={{ __html: getBackdropHTML() }}
                    />
                    <textarea
                        ref={textareaRef}
                        className="doc-textarea"
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Start typing or ask AI to help you write..."
                        spellCheck={false}
                        onScroll={syncScroll}
                    />
                </div>
            </div>
        </div>
    )
}
