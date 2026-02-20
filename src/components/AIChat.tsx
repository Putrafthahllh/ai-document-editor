'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
    role: 'user' | 'assistant'
    content: string
    functionCall?: { name: string; args: Record<string, unknown> }
}

interface Props {
    documentContent: string
    onDocumentUpdate: (newContent: string) => void
    documentId: string
}

export default function AIChat({ documentContent, onDocumentUpdate, documentId }: Props) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [selectedFile, setSelectedFile] = useState<{
        data: string
        type: string
        name: string
    } | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Load messages from localStorage on mount or when documentId changes
    useEffect(() => {
        if (!documentId) return
        try {
            const saved = localStorage.getItem(`ai-editor-chat-${documentId}`)
            if (saved) {
                setMessages(JSON.parse(saved))
            } else {
                setMessages([])
            }
        } catch (e) {
            console.error('Failed to load chat history', e)
        }
    }, [documentId])

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (!documentId) return
        try {
            localStorage.setItem(`ai-editor-chat-${documentId}`, JSON.stringify(messages))
        } catch (e) {
            console.error('Failed to save chat history', e)
        }
    }, [messages, documentId])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            alert('File must be less than 10MB')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            setSelectedFile({
                data: reader.result as string,
                type: file.type,
                name: file.name,
            })
        }
        reader.readAsDataURL(file)
    }

    async function sendMessage() {
        if (!input.trim() || isLoading) return

        setIsLoading(true)
        const userMessage: Message = { role: 'user', content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput('')

        try {
            const response = await fetch('/api/ai-editor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    documentContent,
                    file: selectedFile
                        ? { data: selectedFile.data, type: selectedFile.type }
                        : null,
                }),
            })

            if (!response.ok) throw new Error('Chat API failed')

            const data = await response.json()

            if (data.newDocumentContent !== undefined && data.newDocumentContent !== null) {
                onDocumentUpdate(data.newDocumentContent)
            }

            setMessages((prev) => [...prev, data.message])
            setSelectedFile(null)
        } catch (error) {
            console.error('Chat error:', error)
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="chat-container">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg></div>
                <div style={{ flex: 1 }}>
                    <h2 className="chat-header-title">ClariDoc</h2>
                    <p className="chat-header-subtitle">Ask me to edit your document</p>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="chat-header-btn"
                        style={{ marginLeft: 'auto', color: 'var(--ed-danger)', opacity: 0.8 }}
                        title="Clear Chat"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                )}
            </div>

            {/* Clear Chat Confirmation Modal */}
            {showClearConfirm && (
                <div className="chat-modal-overlay">
                    <div className="chat-modal">
                        <h3>Clear Chat History?</h3>
                        <p>This action cannot be undone.</p>
                        <div className="chat-modal-actions">
                            <button
                                className="chat-modal-btn cancel"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="chat-modal-btn confirm"
                                onClick={() => {
                                    setMessages([])
                                    setShowClearConfirm(false)
                                }}
                            >
                                Clear Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <div className="chat-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg></div>
                        <h3>AI Document Assistant</h3>
                        <p>
                            I can help you edit your document. Try asking me to:
                        </p>
                        <ul className="chat-suggestions">
                            <li>"Improve the selected paragraph"</li>
                            <li>"Summarize this document"</li>
                            <li>"Make this more professional"</li>
                            <li>"Fix grammar and clarity"</li>
                            <li>"Rewrite this in a simpler tone"</li>
                            <li>"Generate a conclusion for this article"</li>
                            <li>"Turn this into bullet points"</li>
                            <li>"Continue writing from here"</li>
                        </ul>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`chat-message ${msg.role === 'user' ? 'chat-message--user' : 'chat-message--ai'
                            }`}
                    >
                        <div
                            className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--ai'
                                }`}
                        >
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </ReactMarkdown>
                            ) : (
                                <p>{msg.content}</p>
                            )}
                            {msg.functionCall && (
                                <div className="chat-function-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> {msg.functionCall.name}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-message chat-message--ai">
                        <div className="chat-bubble chat-bubble--ai">
                            <div className="chat-loading">
                                <span className="chat-loading-dot" />
                                <span className="chat-loading-dot" />
                                <span className="chat-loading-dot" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* File Preview */}
            {selectedFile && (
                <div className="chat-file-preview">
                    <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg> {selectedFile.name}</span>
                    <button
                        onClick={() => setSelectedFile(null)}
                        className="chat-file-remove"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="chat-input-area">
                <div className="chat-input-row">
                    <label className="chat-attach-btn" title="Attach file">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*,.pdf,.txt,.md,.doc,.docx"
                        />
                    </label>
                    <textarea
                        className="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        placeholder="Ask AI to edit the document..."
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="chat-send-btn"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
