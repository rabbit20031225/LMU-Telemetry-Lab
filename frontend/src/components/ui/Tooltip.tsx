import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export const Tooltip = ({ text, children, position = 'top', delay = 300 }: TooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        let left = rect.left + rect.width / 2 + scrollLeft;
        let top = rect.top + scrollTop;

        if (position === 'top') {
            top -= 8;
        } else if (position === 'bottom') {
            top += rect.height + 8;
        } else if (position === 'left') {
            left -= rect.width / 2 + 8;
            top += rect.height / 2;
        } else if (position === 'right') {
            left += rect.width / 2 + 8;
            top += rect.height / 2;
        }

        setCoords({ top, left });
    };

    const handleMouseEnter = () => {
        timerRef.current = setTimeout(() => {
            updatePosition();
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    return (
        <div 
            ref={triggerRef} 
            className="inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleMouseLeave}
        >
            {children}
            {isVisible && createPortal(
                <div 
                    className={`fixed z-[9999] pointer-events-none transition-all duration-200 ease-out transform pointer-events-none ${
                        isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
                    }`}
                    style={{
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        transform: `translate(-50%, ${position === 'top' ? '-100%' : '0px'})`
                    }}
                >
                    <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg shadow-2xl flex items-center justify-center">
                        <span className="text-white text-[10px] font-mono font-black uppercase tracking-[0.15em] whitespace-nowrap drop-shadow-md">
                            {text}
                        </span>
                    </div>
                    {/* Tiny Arrow Pointer */}
                    <div 
                        className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900/95 border-b border-r border-white/10 rotate-45 ${
                            position === 'top' ? 'bottom-[-4px] border-l-0 border-t-0' : 'top-[-4px] border-r-0 border-b-0 border-l border-t'
                        }`}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};
