export const getBrandLogoPath = (modelName: string) => {
    const lower = (modelName || "").toLowerCase();
    // Heuristic Brand Mapping
    if (lower.includes('mclaren')) return '/logos/mclaren.png';
    if (lower.includes('ferrari')) return '/logos/ferrari.png';
    if (lower.includes('porsche')) return '/logos/porsche.png';
    if (lower.includes('lamborghini')) return '/logos/lamborghini.png';
    if (lower.includes('bmw')) return '/logos/bmw.png';
    if (lower.includes('aston')) return '/logos/aston_martin.png';
    if (lower.includes('mercedes') || lower.includes('amg')) return '/logos/mercedes.png';
    if (lower.includes('corvette')) return '/logos/corvette.png';
    if (lower.includes('toyota')) return '/logos/toyota.png';
    if (lower.includes('cadillac')) return '/logos/cadillac.png';
    if (lower.includes('peugeot')) return '/logos/peugeot.png';
    if (lower.includes('alpine')) return '/logos/alpine.png';
    if (lower.includes('lexus')) return '/logos/lexus.png';
    if (lower.includes('genesis')) return '/logos/genesis.png';
    if (lower.includes('ford') || lower.includes('mustang')) return '/logos/ford.png';
    if (lower.includes('isotta')) return '/logos/isotta_fraschini.png';
    if (lower.includes('glickenhaus')) return '/logos/glickenhaus.png';
    if (lower.includes('vanwall')) return '/logos/vanwall.png';
    if (lower.includes('chevrolet')) return '/logos/corvette.png';
    if (lower.includes('oreca')) return '/logos/oreca.png';
    if (lower.includes('ginetta')) return '/logos/ginetta.png';
    if (lower.includes('ligier')) return '/logos/ligier.png';

    // Fallback: use first word
    const brand = lower.split(' ')[0];
    return `/logos/${brand}.png`;
};

export const getClassColor = (cls: string = '') => {
    const c = (cls || "").toUpperCase();
    if (c.includes('HYPER')) return 'border-amber-500/20 text-amber-400 bg-amber-500/10 shadow-[0_0_10px_rgba(251,191,36,0.1)]';
    if (c.includes('LMP2')) return 'border-sky-500/20 text-sky-400 bg-sky-500/10 shadow-[0_0_10px_rgba(56,189,248,0.1)]';
    if (c.includes('LMP3')) return 'border-indigo-500/20 text-indigo-400 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.1)]';
    if (c.includes('GT3') || c.includes('GTE')) return 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(52,211,153,0.1)]';
    return 'border-gray-500/50 text-gray-400 bg-gray-500/10';
};
