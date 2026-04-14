import React from 'react';

export const handleGlassMouseMove = (e: React.MouseEvent<HTMLElement>, multiplier: number = 0.15) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xInv = rect.width - x;
    const yInv = rect.height - y;

    // Calculate proportional glow size (based on perimeter)
    const perimeter = 2 * (rect.width + rect.height);
    const glowSize = perimeter * multiplier;

    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    e.currentTarget.style.setProperty('--mouse-x-inv', `${xInv}px`);
    e.currentTarget.style.setProperty('--mouse-y-inv', `${yInv}px`);
    e.currentTarget.style.setProperty('--glass-glow-size', `${glowSize}px`);
};
