import { create } from 'zustand';
import type { AppView, AuthView } from '@/lib/types';

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  authView: AuthView;
  userRole: string;
  userPlan: string;
  setAuthenticated: (authed: boolean) => void;
  setAuthView: (view: AuthView) => void;
  setUserRole: (role: string) => void;
  setUserPlan: (plan: string) => void;

  // App state
  activeView: AppView;
  sidebarCollapsed: boolean;
  selectedLeadId: string | null;
  searchQuery: string;
  setActiveView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSelectedLeadId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth defaults
  isAuthenticated: false,
  authView: 'landing',
  userRole: 'analyst',
  userPlan: 'free',
  setAuthenticated: (authed) => set({ isAuthenticated: authed }),
  setAuthView: (view) => set({ authView: view }),
  setUserRole: (role) => set({ userRole: role }),
  setUserPlan: (plan) => set({ userPlan: plan }),

  // App defaults
  activeView: 'leads',
  sidebarCollapsed: false,
  selectedLeadId: null,
  searchQuery: '',
  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));