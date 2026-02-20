'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedTheme = localStorage.getItem('theme') as Theme | null;

        if (savedTheme) {
            setTheme(savedTheme);
            applyTheme(savedTheme);
        } else {
            setTheme('dark');
            applyTheme('dark');
        }
    }, []);

    const applyTheme = (newTheme: Theme) => {
        if (typeof document === 'undefined') return;

        const html = document.documentElement;
        if (newTheme === 'dark') {
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    if (!isMounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
