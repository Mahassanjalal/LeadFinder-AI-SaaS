'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AppShell } from '@/components/layout/app-shell';
import { AuthPage } from '@/components/auth/auth-page';
import { SettingsView } from '@/components/settings/settings-view';
import { useAppStore } from '@/stores/app-store';
import { LeadDashboard } from '@/components/leads/lead-dashboard';
import { OutreachAssistant } from '@/components/outreach/outreach-assistant';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';
import { CrmView } from '@/components/crm/crm-view';
import { useSession } from 'next-auth/react';
import type { AppView, AuthView } from '@/lib/types';

function AppContent() {
  const { data: session, status } = useSession();
  const activeView = useAppStore((s) => s.activeView);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authView = useAppStore((s) => s.authView);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setAuthView = useAppStore((s) => s.setAuthView);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setUserPlan = useAppStore((s) => s.setUserPlan);
  const [showAuth, setShowAuth] = useState(true);

  const user = session?.user as Record<string, unknown> | undefined;
  const role = (user?.role as string) || 'analyst';
  const plan = (user?.orgPlan as string) || 'free';

  // Sync session state to store
  useEffect(() => {
    if (status === 'authenticated' && session) {
      setAuthenticated(true);
      setUserRole(role);
      setUserPlan(plan);
      setShowAuth(false);
    } else if (status === 'unauthenticated') {
      setAuthenticated(false);
      setShowAuth(true);
    }
  }, [status, session, role, plan, setAuthenticated, setUserRole, setUserPlan]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-emerald-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Loading LeadFinder AI...</p>
        </div>
      </div>
    );
  }

  // Auth pages (landing, login, register)
  if (showAuth && !isAuthenticated) {
    return (
      <AuthPage
        authView={authView}
        setAuthView={(v: AuthView) => setAuthView(v)}
        onAuthSuccess={() => setShowAuth(false)}
      />
    );
  }

  // Main app
  return (
    <AppShell>
      {(activeView === 'leads' || activeView === 'discovery') && <LeadDashboard />}
      {activeView === 'outreach' && <OutreachAssistant />}
      {activeView === 'analytics' && <AnalyticsDashboard />}
      {activeView === 'crm' && <CrmView />}
      {activeView === 'settings' && <SettingsView />}
    </AppShell>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}