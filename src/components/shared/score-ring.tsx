'use client';

import { motion } from 'framer-motion';
import { getScoreColor, getScoreCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const colorMap: Record<string, string> = {
    excellent: '#f59e0b',
    high: '#10b981',
    moderate: '#eab308',
    low: '#0ea5e9',
    poor: '#9ca3af',
  };

  const category = getScoreCategory(score);
  const strokeColor = colorMap[category] || '#9ca3af';
  const textColor = getScoreColor(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold leading-none', textColor, size < 60 ? 'text-sm' : 'text-lg')}>
          {score}
        </span>
        {size >= 60 && (
          <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">{category}</span>
        )}
      </div>
    </div>
  );
}