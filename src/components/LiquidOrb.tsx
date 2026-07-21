import React from 'react';

interface LiquidOrbProps {
  primaryColor?: string;
  secondaryColor?: string;
  size?: number;
  className?: string;
}

export const LIGHT_ORB_PRESETS: Array<{ primary: string; secondary: string; label: string }> = [
  { primary: '#ff70a6', secondary: '#ff9770', label: 'Sunset Rose' },
  { primary: '#70d6ff', secondary: '#ff70a6', label: 'Sky Pink' },
  { primary: '#ffd670', secondary: '#ff70a6', label: 'Peach Sunrise' },
  { primary: '#e9ff70', secondary: '#70d6ff', label: 'Lime Cyan' },
  { primary: '#a594f9', secondary: '#f5d7db', label: 'Lavender Blossom' },
];

export const EXTRA_LIGHT_ORB_PAIRS: Array<{ primary: string; secondary: string }> = [
  { primary: '#ff9ebb', secondary: '#ffd3b6' },
  { primary: '#80ef80', secondary: '#ffea00' },
  { primary: '#84dcc6', secondary: '#a5def1' },
  { primary: '#ffbf69', secondary: '#cbf3f0' },
  { primary: '#f15bb5', secondary: '#fee440' },
  { primary: '#00f5d4', secondary: '#7b2cbf' },
  { primary: '#ff99c8', secondary: '#fcf6bd' },
  { primary: '#d0f4de', secondary: '#a9def9' },
  { primary: '#e4c1f9', secondary: '#f694c1' },
];

export const getRandomOrbColorPair = (): { primary: string; secondary: string } => {
  const all = [...LIGHT_ORB_PRESETS, ...EXTRA_LIGHT_ORB_PAIRS];
  return all[Math.floor(Math.random() * all.length)];
};

// Preset vibrant secondary color pairings if none provided
export const getSecondaryColor = (primary?: string): string => {
  if (!primary) return '#ff8c00';
  const p = primary.toLowerCase();
  if (p.includes('ff3b80') || p.includes('ef4444') || p.includes('ff4d4d')) return '#ffaa00'; // pink/red -> orange/gold
  if (p.includes('3b82f6') || p.includes('2563eb') || p.includes('4f46e5')) return '#ec4899'; // blue -> magenta
  if (p.includes('10b981') || p.includes('059669')) return '#06b6d4'; // green -> cyan
  if (p.includes('8b5cf6') || p.includes('a855f7')) return '#ff3b80'; // purple -> pink
  if (p.includes('f59e0b') || p.includes('eab308')) return '#ff0055'; // amber -> bright pink
  return '#ec4899'; // default secondary
};

export function LiquidOrb({
  primaryColor = '#ff2a7a',
  secondaryColor,
  size = 18,
  className = '',
}: LiquidOrbProps) {
  const c1 = primaryColor;
  const c2 = secondaryColor || getSecondaryColor(primaryColor);
  const idSuffix = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`liquid-orb ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flex: `0 0 ${size}px`,
      }}
    >
      <defs>
        <radialGradient id={`orb-grad-${idSuffix}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor={c1} stopOpacity="0.95" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id={`orb-spec-${idSuffix}`} x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="46" fill={`url(#orb-grad-${idSuffix})`} />
      <ellipse cx="44" cy="32" rx="24" ry="12" fill={`url(#orb-spec-${idSuffix})`} />
    </svg>
  );
}
