import React from 'react';

interface LiquidOrbProps {
  primaryColor?: string;
  secondaryColor?: string;
  faintColor?: string;
  size?: number;
  className?: string;
}

export const LIGHT_ORB_PRESETS: Array<{ primary: string; secondary: string; faint: string; label: string }> = [
  { primary: '#ff2a7a', secondary: '#ff7043', faint: '#ffd8cc', label: 'Sunset Lava' },
  { primary: '#0077ff', secondary: '#7000ff', faint: '#b8e2ff', label: 'Azure Cosmic' },
  { primary: '#ffaa00', secondary: '#70e000', faint: '#fff5cc', label: 'Solar Amber' },
  { primary: '#a040ff', secondary: '#ff3b80', faint: '#f2d8ff', label: 'Purple Nebula' },
  { primary: '#00d2ff', secondary: '#00f5a0', faint: '#d4fcff', label: 'Cyan Aqua' },
  { primary: '#99aab5', secondary: '#334455', faint: '#eef4f8', label: 'Mono Liquid' },
];

export const EXTRA_LIGHT_ORB_PAIRS: Array<{ primary: string; secondary: string; faint: string }> = [
  { primary: '#ff9ebb', secondary: '#ffd3b6', faint: '#fff5f8' },
  { primary: '#80ef80', secondary: '#ffea00', faint: '#f7ffe5' },
  { primary: '#84dcc6', secondary: '#a5def1', faint: '#f0fbff' },
  { primary: '#ffbf69', secondary: '#cbf3f0', faint: '#fffbf5' },
  { primary: '#f15bb5', secondary: '#fee440', faint: '#fffbe6' },
  { primary: '#00f5d4', secondary: '#7b2cbf', faint: '#eef2ff' },
  { primary: '#ff99c8', secondary: '#fcf6bd', faint: '#fffdf0' },
  { primary: '#d0f4de', secondary: '#a9def9', faint: '#f5fcff' },
  { primary: '#e4c1f9', secondary: '#f694c1', faint: '#fff0f8' },
];

export const getRandomOrbColorPair = (): { primary: string; secondary: string } => {
  const all = [...LIGHT_ORB_PRESETS, ...EXTRA_LIGHT_ORB_PAIRS];

  return all[Math.floor(Math.random() * all.length)];
};

export const getSecondaryColor = (primary?: string): string => {
  if (!primary) {
    return '#ff7043';
  }
  const p = primary.toLowerCase();
  if (p.includes('ff3b80') || p.includes('ef4444') || p.includes('ff2a7a')) {
    return '#ffaa00';
  }
  if (p.includes('3b82f6') || p.includes('2563eb') || p.includes('0077ff')) {
    return '#7000ff';
  }
  if (p.includes('10b981') || p.includes('059669') || p.includes('00d2ff')) {
    return '#00f5a0';
  }
  if (p.includes('8b5cf6') || p.includes('a855f7') || p.includes('a040ff')) {
    return '#ff3b80';
  }
  if (p.includes('f59e0b') || p.includes('eab308') || p.includes('ffaa00')) {
    return '#70e000';
  }

  return '#ff3b80';
};

export const getFaintColor = (primary?: string): string => {
  if (!primary) {
    return '#ffffff';
  }
  const p = primary.toLowerCase();
  if (p.includes('ff3b80') || p.includes('ef4444') || p.includes('ff2a7a')) {
    return '#ffe5ec';
  }
  if (p.includes('3b82f6') || p.includes('2563eb') || p.includes('0077ff')) {
    return '#e0f2fe';
  }
  if (p.includes('10b981') || p.includes('059669') || p.includes('00d2ff')) {
    return '#e6fffa';
  }
  if (p.includes('8b5cf6') || p.includes('a855f7') || p.includes('a040ff')) {
    return '#f3e8ff';
  }
  if (p.includes('f59e0b') || p.includes('eab308') || p.includes('ffaa00')) {
    return '#fefce8';
  }

  return '#ffffff';
};

export function LiquidOrb({
  primaryColor = '#ff2a7a',
  secondaryColor,
  faintColor,
  size = 18,
  className = '',
}: LiquidOrbProps) {
  const c1 = primaryColor;
  const c2 = secondaryColor || getSecondaryColor(primaryColor);
  const faintC = faintColor || getFaintColor(primaryColor);
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
        borderRadius: '50%',
      }}
    >
      <defs>
        <radialGradient id={`orb-base-${idSuffix}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={faintC} stopOpacity="0.9" />
          <stop offset="40%" stopColor={c1} stopOpacity="0.95" />
          <stop offset="85%" stopColor={c2} stopOpacity="0.98" />
          <stop offset="100%" stopColor={c2} stopOpacity="1" />
        </radialGradient>

        <linearGradient id={`orb-wave1-${idSuffix}`} x1="10%" y1="20%" x2="90%" y2="80%">
          <stop offset="0%" stopColor={faintC} stopOpacity="0.8" />
          <stop offset="60%" stopColor={c1} stopOpacity="0.5" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id={`orb-wave2-${idSuffix}`} x1="80%" y1="90%" x2="20%" y2="10%">
          <stop offset="0%" stopColor={c2} stopOpacity="0.95" />
          <stop offset="50%" stopColor={c1} stopOpacity="0.6" />
          <stop offset="100%" stopColor={faintC} stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id={`orb-stroke-${idSuffix}`} x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="50%" stopColor={faintC} stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>

        <radialGradient id={`orb-rim-${idSuffix}`} cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="50%" stopColor={faintC} stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <clipPath id={`orb-clip-${idSuffix}`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="46" fill={`url(#orb-base-${idSuffix})`} />

      <g clipPath={`url(#orb-clip-${idSuffix})`}>
        <path
          d="M 4,45 C 22,24 56,22 96,44 C 74,26 48,16 12,38 Z"
          fill={`url(#orb-wave1-${idSuffix})`}
        />
        <path
          d="M 6,45 C 24,25 54,23 94,44"
          stroke={`url(#orb-stroke-${idSuffix})`}
          strokeWidth="1.5"
          fill="none"
          opacity="0.8"
        />

        <path
          d="M 6,58 C 26,78 68,84 94,56 C 82,76 52,94 14,88 Z"
          fill={`url(#orb-wave2-${idSuffix})`}
        />
        <path
          d="M 8,58 C 28,78 66,84 92,56"
          stroke={`url(#orb-stroke-${idSuffix})`}
          strokeWidth="1.5"
          fill="none"
          opacity="0.75"
        />

        <path
          d="M 16,36 C 42,54 74,48 86,28 C 68,48 38,58 16,36 Z"
          fill={faintC}
          fillOpacity="0.25"
        />
      </g>

      <circle cx="50" cy="50" r="46" fill={`url(#orb-rim-${idSuffix})`} />
      <circle
        cx="50"
        cy="50"
        r="45.5"
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.2"
        fill="none"
      />
    </svg>
  );
}
