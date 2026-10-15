'use client';

import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/app-shell';
import { AuthPage } from '@/components/auth/auth-page';
import { SettingsView } from '@/components/settings/settings-view';
import { useAppStore } from '@/stores/app-store';
import { LeadDashboard } from '@/components/leads/lead-dashboard';
import { OutreachAssistant } from '@/components/outreach/outreach-assistant';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';
import { CrmView } from '@/components/crm/crm-view';
import type { AuthView } from '@/lib/types';

function AppContent() {
  const { data: session, status } = useSession();
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const authView = useAppStore((s) => s.authView);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setAuthView = useAppStore((s) => s.setAuthView);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setUserPlan = useAppStore((s) => s.setUserPlan);
  const [settingsTab] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'billing' || tab === 'team' || tab === 'profile' ? tab : undefined;
  });

  const user = session?.user as Record<string, unknown> | undefined;
  const role = (user?.role as string) || 'analyst';
  const plan = (user?.orgPlan as string) || 'free';

  // Auth is derived directly from the session status, so a successful sign-in
  // or sign-out switches views without extra state that has to be synced in an
  // effect (the previous `showAuth` state could also get out of sync).
  const isAuthenticated = status === 'authenticated' && !!session;

  // Sync session state to the store (external store, not component state)
  useEffect(() => {
    if (status === 'authenticated' && session) {
      setAuthenticated(true);
      setUserRole(role);
      setUserPlan(plan);
    } else if (status === 'unauthenticated') {
      setAuthenticated(false);
    }
  }, [status, session, role, plan, setAuthenticated, setUserRole, setUserPlan]);

  // Deep links, e.g. the Stripe checkout return URL:
  // /?view=settings&tab=billing&status=success
  // (`settingsTab` is read from the URL during the initial render instead.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'settings') setActiveView('settings');
  }, [setActiveView]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-emerald-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l5.813-1.912a2 2 0 0 1 1.275 1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Loading LeadFinder AI...</p>
        </div>
      </div>
    );
  }

  // Auth pages (landing, login, register)
  if (!isAuthenticated) {
    return (
      <AuthPage
        authView={authView}
        setAuthView={(v: AuthView) => setAuthView(v)}
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
      {activeView === 'settings' && <SettingsView initialTab={settingsTab} />}
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
