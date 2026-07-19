'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className,
  decimals = 0,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (decimals > 0) {
      return `${prefix}${v.toFixed(decimals)}${suffix}`;
    }
    return `${prefix}${Math.round(v).toLocaleString()}${suffix}`;
  });

  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: duration / 1000,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, duration, count]);

  return (
    <motion.span ref={nodeRef} className={className}>
      {rounded}
    </motion.span>
  );
}