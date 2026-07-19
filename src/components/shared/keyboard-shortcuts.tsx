'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useLeadStore } from '@/stores/lead-store';
import type { ViewMode, AppView } from '@/lib/types';

const VIEW_SHORTCUTS: Record<string, ViewMode> = {
  '1': 'table',
  '2': 'cards',
  '3': 'kanban',
  '4': 'map',
  '5': 'analytics',
};

const NAV_SHORTCUTS: Record<string, AppView> = {
  'd': 'discovery',
  'l': 'leads',
  'o': 'outreach',
  'a': 'analytics',
  'c': 'crm',
};

export function KeyboardShortcuts() {
  const { activeView, setActiveView, toggleSidebar } = useAppStore();
  const { setViewMode } = useLeadStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // Ctrl/Cmd + key combos
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
          case 'K':
            e.preventDefault();
            // Focus search input
            const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
            searchInput?.focus();
            break;
          case 'b':
          case 'B':
            e.preventDefault();
            toggleSidebar();
            break;
          case '1': case '2': case '3': case '4': case '5':
            e.preventDefault();
            const vm = VIEW_SHORTCUTS[e.key];
            if (vm && activeView === 'leads') setViewMode(vm);
            break;
        }
        return;
      }

      // Plain key shortcuts (only when no modifier)
      if (e.altKey || e.shiftKey) return;

      // Number keys for view switching (when in leads view)
      if (activeView === 'leads' && VIEW_SHORTCUTS[e.key]) {
        e.preventDefault();
        setViewMode(VIEW_SHORTCUTS[e.key]);
        return;
      }

      // Navigation shortcuts
      if (NAV_SHORTCUTS[e.key]) {
        e.preventDefault();
        setActiveView(NAV_SHORTCUTS[e.key]);
        return;
      }

      // Escape to close modals/sheets
      if (e.key === 'Escape') {
        const sheetClose = document.querySelector<HTMLButtonElement>('[data-state="open"] button[aria-label="Close"]');
        if (sheetClose) sheetClose.click();
        const dialogClose = document.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="Close"]');
        if (dialogClose) dialogClose.click();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, setActiveView, toggleSidebar, setViewMode]);

  return null; // No UI rendered
}