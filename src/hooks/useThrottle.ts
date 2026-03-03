'use client'

import { useRef, useCallback, useEffect } from 'react'

export function useThrottle<T extends unknown[]>(
    fn: (...args: T) => void,
    limitMs: number
): (...args: T) => void {
    const lastRun = useRef<number>(0)
    const fnRef = useRef(fn)

    useEffect(() => {
        fnRef.current = fn
    }, [fn])

    return useCallback((...args: T) => {
        const now = Date.now()
        if (now - lastRun.current >= limitMs) {
            lastRun.current = now
            fnRef.current(...args)
        }
    }, [limitMs])
}
