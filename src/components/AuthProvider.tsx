'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface User {
    id: string
    email: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
    signUp: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
    signUp: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const currentUserIdRef = useRef<string | null>(null)

    // Only update user state if the user ID actually changed
    const updateUser = useCallback((supabaseUser: SupabaseUser | null) => {
        const newId = supabaseUser?.id ?? null
        if (newId === currentUserIdRef.current) return // No change, skip re-render

        currentUserIdRef.current = newId
        if (supabaseUser) {
            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email ?? '',
            })
        } else {
            setUser(null)
        }
    }, [])

    useEffect(() => {
        let mounted = true

        async function initAuth() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.warn('Auth session error:', error.message)
                    // Clear stale tokens to prevent retry loop
                    if (typeof window !== 'undefined') {
                        const keysToRemove: string[] = []
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i)
                            if (key && (key.startsWith('sb-') || key === 'claridoc-auth-token')) {
                                keysToRemove.push(key)
                            }
                        }
                        keysToRemove.forEach(key => localStorage.removeItem(key))
                    }
                    if (mounted) {
                        setUser(null)
                        setLoading(false)
                    }
                    return
                }

                if (mounted) {
                    updateUser(session?.user ?? null)
                    setLoading(false)
                }
            } catch (err) {
                console.error('Failed to initialize auth:', err)
                if (mounted) {
                    setUser(null)
                    setLoading(false)
                }
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!mounted) return

                if (event === 'SIGNED_OUT') {
                    currentUserIdRef.current = null
                    setUser(null)
                } else if (session?.user) {
                    updateUser(session.user)
                }
                setLoading(false)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [updateUser])

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
    }

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        currentUserIdRef.current = null
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
