'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface User {
    id: string
    email: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    signIn: (email: string) => Promise<void>
    signOut: () => Promise<void>
    signUp: (email: string) => Promise<void>
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

    useEffect(() => {
        // Check for existing "session" in localStorage
        const savedUser = localStorage.getItem('claridoc-mock-user')
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser))
            } catch (e) {
                console.error('Failed to parse mock user', e)
                localStorage.removeItem('claridoc-mock-user')
            }
        }
        setLoading(false)
    }, [])

    const signIn = async (email: string) => {
        // Mock Sign In - Immediate success
        const mockUser = {
            id: 'mock-user-123', // Static ID for simplicity in offline mode
            email: email
        }
        localStorage.setItem('claridoc-mock-user', JSON.stringify(mockUser))
        setUser(mockUser)
    }

    const signUp = async (email: string) => {
        // Mock Sign Up - Same as Sign In
        await signIn(email)
    }

    const signOut = async () => {
        localStorage.removeItem('claridoc-mock-user')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
