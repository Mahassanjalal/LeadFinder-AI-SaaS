'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { KeyboardShortcuts } from '@/components/shared/keyboard-shortcuts';

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background animated-gradient-bg">
      <KeyboardShortcuts />
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-[240px]'}`}>
        <Header />
        <main className="p-4 md:p-6">
          <motion.div
            key={useAppStore((s) => s.activeView)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}