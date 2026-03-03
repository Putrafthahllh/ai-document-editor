'use client'

import type { CollaboratorPresence } from '@/hooks/useCollaboration'

interface PresenceIndicatorProps {
    collaborators: CollaboratorPresence[]
    isConnected: boolean
}

function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function PresenceIndicator({ collaborators, isConnected }: PresenceIndicatorProps) {
    if (!isConnected) {
        return (
            <div className="presence-container">
                <span className="presence-dot presence-dot--connecting" />
                <span className="presence-label">Connecting...</span>
            </div>
        )
    }

    return (
        <div className="presence-container">
            {collaborators.length > 0 && (
                <>
                    <div className="presence-avatars">
                        {collaborators.map((user) => (
                            <div
                                key={user.userId}
                                className="presence-avatar"
                                title={user.displayName}
                                style={{ backgroundColor: user.color }}
                            >
                                {getInitials(user.displayName)}
                            </div>
                        ))}
                    </div>
                    <span className="presence-label">
                        {collaborators.length === 1
                            ? '1 orang lagi di sini'
                            : `${collaborators.length} orang lagi di sini`}
                    </span>
                </>
            )}
            <div className="presence-live">
                <span className="presence-dot presence-dot--live" />
                <span className="presence-label">Live</span>
            </div>
        </div>
    )
}
