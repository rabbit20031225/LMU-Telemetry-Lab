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
    if (c.includes('HYPERCAR')) return 'border-blue-500/50 text-blue-400 bg-blue-500/10';
    if (c.includes('LMGT3') || c.includes('GT3')) return 'border-orange-500/50 text-orange-400 bg-orange-500/10';
    if (c.includes('LMP2')) return 'border-red-500/50 text-red-400 bg-red-500/10';
    if (c.includes('LMP1')) return 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10';
    return 'border-gray-500/50 text-gray-400 bg-gray-500/10';
};
