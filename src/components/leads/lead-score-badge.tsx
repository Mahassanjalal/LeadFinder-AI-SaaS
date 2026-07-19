'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getScoreCategory, getScoreColor } from '@/lib/types';

interface LeadScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { svg: 36, strokeWidth: 3, fontSize: 'text-xs' },
  md: { svg: 48, strokeWidth: 3.5, fontSize: 'text-sm' },
  lg: { svg: 80, strokeWidth: 4, fontSize: 'text-xl' },
};

function getRingColor(score: number): string {
  if (score >= 90) return '#f59e0b';
  if (score >= 75) return '#10b981';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#0ea5e9';
  return '#9ca3af';
}

export function LeadScoreBadge({
  score,
  size = 'sm',
  showLabel = false,
  className,
}: LeadScoreBadgeProps) {
  const config = sizeConfig[size];
  const radius = (config.svg - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const category = getScoreCategory(score);
  const ringColor = getRingColor(score);

  const categoryLabels: Record<string, string> = {
    excellent: 'Excellent',
    high: 'High',
    moderate: 'Moderate',
    low: 'Low',
    poor: 'Poor',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={config.svg}
          height={config.svg}
          className={cn('transform -rotate-90')}
        >
          {/* Background ring */}
          <circle
            cx={config.svg / 2}
            cy={config.svg / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
          />
          {/* Score ring */}
          <motion.circle
            cx={config.svg / 2}
            cy={config.svg / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <span
          className={cn(
            'absolute font-bold tabular-nums',
            config.fontSize,
            getScoreColor(score)
          )}
        >
          {score}
        </span>
      </div>
      {showLabel && (
        <span
          className={cn(
            'text-xs font-medium',
            getScoreColor(score)
          )}
        >
          {categoryLabels[category]}
        </span>
      )}
    </div>
  );
}