'use client';

import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/components/AuthProvider";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ThemeProvider>
                {children}
            </ThemeProvider>
        </AuthProvider>
    );
}
