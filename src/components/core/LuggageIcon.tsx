import React from 'react';

interface LuggageIconProps {
  type: string;
  color?: string;
  size?: number;
  className?: string;
}

export const LuggageIcon: React.FC<LuggageIconProps> = ({ type, color = 'currentColor', size = 16, className = '' }) => {
  const renderIcon = () => {
    switch (type) {
      case 'backpack':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            <path d="M8 10v12" />
            <path d="M16 10v12" />
            <path d="M8 14h8" />
          </svg>
        );
      case 'duffel':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="2" y="8" width="20" height="10" rx="3" />
            <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            <path d="M9 8v10" />
            <path d="M15 8v10" />
            <path d="M2 13h20" />
          </svg>
        );
      case 'on_person':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="6" r="3" />
            <path d="M12 14v7" />
            <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
            <path d="M6 11l4 2v-1" />
            <path d="M18 11l-4 2v-1" />
          </svg>
        );
      case 'briefcase':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        );
      default:
        // Generic bag
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        );
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {renderIcon()}
    </span>
  );
};