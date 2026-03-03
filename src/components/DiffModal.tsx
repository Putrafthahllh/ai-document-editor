'use client'

import { useState, useEffect } from 'react'
import { getVersionContent, type DocumentVersion } from '@/lib/versions'
import { computeDiff, type DiffLine, type DiffResult } from '@/lib/diff'

interface DiffModalProps {
    versionIdA: string  // versi LAMA
    versionIdB: string  // versi BARU
    onClose: () => void
}

type ViewMode = 'split' | 'unified'

export function DiffModal({ versionIdA, versionIdB, onClose }: DiffModalProps) {
    const [versionA, setVersionA] = useState<DocumentVersion | null>(null)
    const [versionB, setVersionB] = useState<DocumentVersion | null>(null)
    const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('split')
    const [currentChangeIndex, setCurrentChangeIndex] = useState(0)

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true)
                const [a, b] = await Promise.all([
                    getVersionContent(versionIdA),
                    getVersionContent(versionIdB),
                ])

                const [older, newer] = a.version_number < b.version_number ? [a, b] : [b, a]

                setVersionA(older)
                setVersionB(newer)
                setDiffResult(computeDiff(older.content, newer.content))
            } catch (err) {
                console.error('Failed to load diff:', err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [versionIdA, versionIdB])

    const changeLineIndices = diffResult?.lines
        .map((line, i) => line.type !== 'unchanged' ? i : -1)
        .filter(i => i !== -1) ?? []

    function goToNextChange() {
        setCurrentChangeIndex(prev => Math.min(prev + 1, changeLineIndices.length - 1))
    }

    function goToPrevChange() {
        setCurrentChangeIndex(prev => Math.max(prev - 1, 0))
    }

    function getLineBg(type: DiffLine['type']) {
        switch (type) {
            case 'added': return 'rgba(16, 185, 129, 0.1)'
            case 'removed': return 'rgba(239, 68, 68, 0.1)'
            default: return 'transparent'
        }
    }

    function getLineBorderColors(type: DiffLine['type']) {
        switch (type) {
            case 'added': return '#10b981'
            case 'removed': return '#ef4444'
            default: return 'transparent'
        }
    }

    function getLineTextColor(type: DiffLine['type']) {
        switch (type) {
            case 'added': return '#6ee7b7'
            case 'removed': return '#fca5a5'
            default: return '#d4d4d8'
        }
    }

    function getLinePrefix(type: DiffLine['type']) {
        switch (type) {
            case 'added': return '+'
            case 'removed': return '-'
            default: return ' '
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}>
            <div style={{
                backgroundColor: '#050505',
                borderRadius: '0.75rem',
                width: '100%', maxWidth: '1152px',
                height: '100%', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #222'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem 1.25rem', borderBottom: '1px solid #222', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontWeight: 600, color: 'white', fontSize: '1.125rem', margin: 0 }}>
                            {versionA && versionB
                                ? `Compare: v${versionA.version_number} → v${versionB.version_number}`
                                : 'Loading diff...'}
                        </h2>

                        {diffResult && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                <span style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.625rem', borderRadius: '9999px' }}>+{diffResult.stats.added}</span>
                                <span style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.625rem', borderRadius: '9999px' }}>-{diffResult.stats.removed}</span>
                                <span style={{ color: '#71717a' }}>{diffResult.stats.unchanged} unchanged</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {changeLineIndices.length > 0 && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#a1a1aa',
                                backgroundColor: '#111', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #333'
                            }}>
                                <button
                                    onClick={goToPrevChange}
                                    disabled={currentChangeIndex === 0}
                                    style={{ background: 'none', border: 'none', color: currentChangeIndex === 0 ? '#555' : '#a1a1aa', cursor: currentChangeIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
                                >↑</button>
                                <span style={{ minWidth: '3rem', textAlign: 'center', fontFamily: 'monospace' }}>
                                    {currentChangeIndex + 1} / {changeLineIndices.length}
                                </span>
                                <button
                                    onClick={goToNextChange}
                                    disabled={currentChangeIndex === changeLineIndices.length - 1}
                                    style={{ background: 'none', border: 'none', color: currentChangeIndex === changeLineIndices.length - 1 ? '#555' : '#a1a1aa', cursor: currentChangeIndex === changeLineIndices.length - 1 ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
                                >↓</button>
                            </div>
                        )}

                        <div style={{
                            display: 'flex', backgroundColor: '#111', borderRadius: '0.5rem', overflow: 'hidden',
                            fontSize: '0.875rem', border: '1px solid #333', padding: '0.125rem'
                        }}>
                            <button
                                onClick={() => setViewMode('split')}
                                style={{
                                    padding: '0.375rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', outline: 'none',
                                    backgroundColor: viewMode === 'split' ? '#333' : 'transparent',
                                    color: viewMode === 'split' ? 'white' : '#a1a1aa',
                                    boxShadow: viewMode === 'split' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >Split</button>
                            <button
                                onClick={() => setViewMode('unified')}
                                style={{
                                    padding: '0.375rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', outline: 'none',
                                    backgroundColor: viewMode === 'unified' ? '#333' : 'transparent',
                                    color: viewMode === 'unified' ? 'white' : '#a1a1aa',
                                    boxShadow: viewMode === 'unified' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >Unified</button>
                        </div>

                        <div style={{ width: '1px', height: '24px', backgroundColor: '#333', margin: '0 0.25rem' }}></div>

                        <button
                            onClick={onClose}
                            style={{
                                color: '#a1a1aa', background: 'transparent', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '9999px',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#222'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#0A0A0A', borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem', position: 'relative' }}>
                    {isLoading ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem', color: '#71717a' }}>
                            <svg style={{ animation: 'spin 1s linear infinite', height: '2rem', width: '2rem', color: '#555' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Analyzing document structure differences...
                        </div>
                    ) : !diffResult ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                            Failed to load Diff Analysis
                        </div>
                    ) : viewMode === 'unified' ? (

                        // ── UNIFIED VIEW ──────────────────────────────────────────────
                        <div style={{ height: '100%', overflow: 'auto', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}>
                            <div style={{ minWidth: 'max-content' }}>
                                <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'grid', gridTemplateColumns: '4rem 4rem 1fr', backgroundColor: '#1a1a1a', color: '#71717a', fontSize: '0.75rem', padding: '0.5rem', borderBottom: '1px solid #222' }}>
                                    <span style={{ textAlign: 'right', paddingRight: '0.5rem' }}>Old</span>
                                    <span style={{ textAlign: 'right', paddingRight: '0.5rem' }}>New</span>
                                    <span style={{ paddingLeft: '1.5rem' }}>Content</span>
                                </div>

                                {diffResult.lines.map((line, i) => (
                                    <div
                                        key={i}
                                        style={{ display: 'grid', gridTemplateColumns: '4rem 4rem 1fr', backgroundColor: getLineBg(line.type), borderLeft: `2px solid ${getLineBorderColors(line.type)}` }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = getLineBg(line.type)}
                                    >
                                        <span style={{ color: '#555', fontSize: '0.75rem', padding: '0.25rem 0.5rem', userSelect: 'none', textAlign: 'right', borderRight: '1px solid #222' }}>
                                            {line.lineNumberOld ?? ''}
                                        </span>
                                        <span style={{ color: '#555', fontSize: '0.75rem', padding: '0.25rem 0.5rem', userSelect: 'none', textAlign: 'right', borderRight: '1px solid #222' }}>
                                            {line.lineNumberNew ?? ''}
                                        </span>
                                        <span style={{ padding: '0.25rem 1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: getLineTextColor(line.type), textDecoration: line.type === 'removed' ? 'line-through' : 'none' }}>
                                            <span style={{ userSelect: 'none', display: 'inline-block', width: '1.5rem', opacity: 0.6, fontWeight: 'bold' }}>{getLinePrefix(line.type)}</span>
                                            {line.content || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>{"<Baris Kosong>"}</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (

                        // ── SPLIT VIEW ────────────────────────────────────────────────
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6, position: 'relative' }}>
                            {/* Panel kiri: versi LAMA */}
                            <div style={{ overflow: 'auto', backgroundColor: '#0A0A0A', height: '100%', position: 'relative', borderRight: '1px solid #222' }}>
                                <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(26, 26, 26, 0.95)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#ef4444', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                        v{versionA?.version_number} — {versionA?.label ?? 'Old Version'}
                                    </span>
                                    {versionA && <span style={{ color: '#71717a', backgroundColor: '#111', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>
                                        {new Date(versionA.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>}
                                </div>
                                <div style={{ paddingBottom: '2rem' }}>
                                    {diffResult.lines.filter(l => l.type !== 'added').map((line, i) => (
                                        <div key={i} style={{ display: 'flex', backgroundColor: getLineBg(line.type), borderLeft: `2px solid ${getLineBorderColors(line.type)}` }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = getLineBg(line.type)}
                                        >
                                            <span style={{ color: '#555', fontSize: '11px', padding: '0.25rem 0.5rem', userSelect: 'none', width: '3rem', textAlign: 'right', flexShrink: 0, borderRight: '1px solid #222' }}>
                                                {line.lineNumberOld}
                                            </span>
                                            <span style={{ padding: '0.25rem 1rem', flex: 1, wordBreak: 'break-word', color: getLineTextColor(line.type), textDecoration: line.type === 'removed' ? 'line-through' : 'none' }}>
                                                {line.content || <span style={{ opacity: 0 }}>{"<empty>"}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right panel: NEW version */}
                            <div style={{ overflow: 'auto', backgroundColor: '#0A0A0A', height: '100%', position: 'relative' }}>
                                <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(26, 26, 26, 0.95)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#10b981', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        v{versionB?.version_number} — {versionB?.label ?? 'Current Version'}
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                    </span>
                                    {versionB && <span style={{ color: '#71717a', backgroundColor: '#111', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>
                                        {new Date(versionB.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>}
                                </div>
                                <div style={{ paddingBottom: '2rem' }}>
                                    {diffResult.lines.filter(l => l.type !== 'removed').map((line, i) => (
                                        <div key={i} style={{ display: 'flex', backgroundColor: getLineBg(line.type), borderLeft: `2px solid ${getLineBorderColors(line.type)}` }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = getLineBg(line.type)}
                                        >
                                            <span style={{ color: '#555', fontSize: '11px', padding: '0.25rem 0.5rem', userSelect: 'none', width: '3rem', textAlign: 'right', flexShrink: 0, borderRight: '1px solid #222' }}>
                                                {line.lineNumberNew}
                                            </span>
                                            <span style={{ padding: '0.25rem 1rem', flex: 1, wordBreak: 'break-word', color: getLineTextColor(line.type) }}>
                                                {line.content || <span style={{ opacity: 0 }}>{"<empty>"}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
        </div>
    )
}
