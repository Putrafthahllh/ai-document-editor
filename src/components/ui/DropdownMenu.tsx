'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DropdownItem {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    disabled?: boolean
    danger?: boolean
}

interface DropdownProps {
    trigger: React.ReactNode
    items: DropdownItem[]
    align?: 'left' | 'right'
}

export default function DropdownMenu({ trigger, items, align = 'right' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

            {isOpen && (
                <div
                    className="download-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        [align]: 0,
                        zIndex: 50,
                        marginTop: '0.5rem',
                        minWidth: '10rem',
                    }}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            className={`download-dropdown-item ${item.danger ? 'text-red-500 hover:bg-red-50' : ''}`}
                            onClick={() => {
                                item.onClick()
                                setIsOpen(false)
                            }}
                            disabled={item.disabled}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
