import React from 'react';

const RANK_STYLES = {
  'Q1': { backgroundColor: '#0f3d2a', borderColor: '#22c55e', color: '#4ade80' },
  'Q2': { backgroundColor: '#1a3a1a', borderColor: '#84cc16', color: '#a3e635' },
  'Q3': { backgroundColor: '#3a2e0a', borderColor: '#eab308', color: '#fbbf24' },
  'Q4': { backgroundColor: '#3a1a0a', borderColor: '#f97316', color: '#fb923c' },
  'A*': { backgroundColor: '#1a0a3a', borderColor: '#a855f7', color: '#c084fc' },
  'A':  { backgroundColor: '#0d1a3a', borderColor: '#60a5fa', color: '#93c5fd' },
  'B':  { backgroundColor: '#1a1a1a', borderColor: '#9ca3af', color: '#d1d5db' },
  'C':  { backgroundColor: '#2a1a0a', borderColor: '#d97706', color: '#fcd34d' }
};

export default function RankBadge({ rank, className = '' }) {
  if (!rank) return null;
  
  const normalizedRank = rank.trim().toUpperCase();
  const style = RANK_STYLES[normalizedRank] || {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#94a3b8'
  };

  return (
    <span 
      className={`rank-badge ${className}`}
      style={style}
    >
      {normalizedRank}
    </span>
  );
}
