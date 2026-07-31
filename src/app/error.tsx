'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertTriangle className="size-8 text-red-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
            <RotateCcw className="size-4" /> Try again
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
