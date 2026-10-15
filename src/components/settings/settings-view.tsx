'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, CreditCard, Users, Shield, Crown, Check,
  Zap, Star, Building2, Mail, LogOut, Loader2, ChevronRight,
  AlertCircle, ArrowRight, Sparkles, BarChart3, Globe,
  Phone, Key, Calendar, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PLANS, type PlanKey } from '@/lib/plans';
import { useSession, signOut } from 'next-auth/react';
import type { Organization, UsageData } from '@/lib/types';
import { toast } from 'sonner';
import { canUseFeature } from '@/lib/auth-helpers';

export function SettingsView({ initialTab }: { initialTab?: string } = {}) {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [tab, setTab] = useState<string>(initialTab === 'billing' || initialTab === 'team' || initialTab === 'profile' ? initialTab : 'profile');

  // Deep links: Stripe returns to /?view=settings&tab=billing&status=success|canceled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') toast.success('Subscription updated — welcome to your new plan!');
    if (status === 'canceled') toast.info('Checkout canceled — your plan was not changed.');
    if (params.toString()) {
      params.delete('view');
      params.delete('tab');
      params.delete('status');
      const query = params.toString();
      window.history.replaceState({}, '', query ? `/?${query}` : '/');
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, usageRes] = await Promise.all([
          fetch('/api/organizations'),
          fetch('/api/billing'),
        ]);
        if (orgRes.ok) setOrgData(await orgRes.json());
        if (usageRes.ok) setUsageData(await usageRes.json());
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSwitchPlan = async (newPlan: string) => {
    setIsSwitching(true);
    try {
      // Free plan is still simulated (no checkout). Paid plans go through Stripe.
      if (newPlan === 'free') {
        const res = await fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: newPlan }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Switched to ${PLANS[newPlan as PlanKey]?.name} plan!`);
          await refreshData();
        } else {
          toast.error(data.error || 'Failed to switch plan');
        }
        return;
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
      } else {
        toast.error(data.error || 'Failed to start checkout');
      }
    } catch {
      toast.error('Failed to switch plan');
    } finally {
      setIsSwitching(false);
    }
  };

  const refreshData = async () => {
    const [orgRes, usageRes] = await Promise.all([
      fetch('/api/organizations'),
      fetch('/api/billing'),
    ]);
    if (orgRes.ok) setOrgData(await orgRes.json());
    if (usageRes.ok) setUsageData(await usageRes.json());
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleSaveProfile = async () => {
    const nameInput = document.getElementById('profile-name') as HTMLInputElement | null;
    const newName = nameInput?.value?.trim();
    if (!newName) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        toast.success('Organization name updated');
        setOrgData((prev) => (prev ? { ...prev, name: newName } : prev));
      } else {
        toast.error('Failed to update organization');
      }
    } catch {
      toast.error('Failed to update organization');
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success('Member role updated');
        setOrgData((prev) =>
          prev
            ? {
                ...prev,
                members: prev.members.map((m) =>
                  m.id === memberId ? { ...m, role } : m
                ),
              }
            : prev
        );
      } else {
        toast.error('Failed to update role');
      }
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleInvite = async () => {
    const email = window.prompt('Invite by email');
    if (!email) return;
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'analyst' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.inviteLink).catch(() => {});
        }
        toast.success(`Invite created for ${data.email}. Link copied to clipboard.`);
      } else {
        toast.error(data.error || 'Failed to create invite');
      }
    } catch {
      toast.error('Failed to create invite');
    }
  };

  const currentPlan = (user?.orgPlan as string) || 'free';
  const role = (user?.role as string) || 'analyst';
  // README permission matrix: Billing & plans → Owner only; team → Owner/Admin.
  const canManageBilling = role === 'owner';
  const canManageTeam = role === 'owner' || role === 'admin';
  const currentPlanConfig = PLANS[currentPlan as PlanKey];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="glass-card"><CardContent className="p-6"><div className="h-32 shimmer rounded-lg" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, team, and subscription</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
          {canManageTeam && <TabsTrigger value="team" className="gap-1.5"><Users className="h-4 w-4" /> Team</TabsTrigger>}
        </TabsList>

        {/* ============ PROFILE TAB ============ */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xl font-semibold">
                    {user?.name ? String(user.name).split(' ').map((n: string) => n[0]).join('') : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{String(user?.name || 'User')}</h3>
                  <p className="text-muted-foreground">{String(user?.email || '')}</p>
                  <Badge variant="secondary" className="mt-1 capitalize">{role}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input id="profile-name" defaultValue={String(user?.name || '')} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input defaultValue={String(user?.email || '')} disabled />
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleSaveProfile}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Organization</CardTitle>
              <CardDescription>Your workspace details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Input defaultValue={orgData?.name || ''} disabled={!canManageTeam} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current Plan</Label>
                  <div className="flex items-center gap-2">
                    <Crown className={`h-4 w-4 ${currentPlan === 'free' ? 'text-muted-foreground' : 'text-amber-400'}`} />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 w-full">
                      <span className="font-medium capitalize">{currentPlanConfig?.name}</span>
                      {currentPlan !== 'free' && <Badge variant="secondary" className="ml-auto text-xs">{currentPlanConfig?.priceLabel}{currentPlanConfig?.period}</Badge>}
                      {currentPlan === 'free' && <Badge variant="secondary" className="ml-auto text-xs">Free</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ BILLING TAB ============ */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan & Usage */}
          {usageData && (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Current Plan: {usageData.planDetails?.name}</CardTitle>
                    <CardDescription>
                      {usageData.subscription.plan === 'free'
                        ? 'You are on the free plan. Upgrade for more credits and features.'
                        : `Billed at $${currentPlanConfig?.price || 0}/month`}
                    </CardDescription>
                  </div>
                  {usageData.subscription.plan !== 'free' && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{usageData.subscription.status}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Credits */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Credits Used</span>
                    <span className="text-sm text-muted-foreground">{usageData.subscription.creditsUsed} / {usageData.subscription.creditsPerMonth}</span>
                  </div>
                  <Progress
                    value={(usageData.subscription.creditsUsed / usageData.subscription.creditsPerMonth) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {usageData.subscription.creditsRemaining} credits remaining this month
                  </p>
                </div>

                {/* Usage Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { type: 'discovery', label: 'Discovery', icon: Globe, limit: usageData.limits.discovery },
                    { type: 'ai_score', label: 'AI Scoring', icon: Brain, limit: usageData.limits.aiScoring },
                    { type: 'ai_outreach', label: 'AI Outreach', icon: Sparkles, limit: usageData.limits.aiOutreach },
                    { type: 'export', label: 'Exports', icon: BarChart3, limit: usageData.limits.exports },
                  ].map((item) => (
                    <div key={item.type} className="rounded-lg border border-border/50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                      <p className="text-lg font-bold">{usageData.usage[item.type] || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.limit === -1 ? 'Unlimited' : `/ ${item.limit} /mo`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Cards */}
          {canManageBilling && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-4">Switch Plan</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan]) => (
                    <Card
                      key={key}
                      className={`glass-card relative cursor-pointer transition-all duration-200 ${
                        currentPlan === key
                          ? 'ring-2 ring-emerald-500 glow-emerald'
                          : 'hover:ring-1 hover:ring-emerald-500/50'
                      } ${plan.highlight ? 'md:-translate-y-1' : ''}`}
                      onClick={() => currentPlan !== key && handleSwitchPlan(key)}
                    >
                      {plan.highlight && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-emerald-600 text-white text-xs px-2.5">Most Popular</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <div>
                          <span className="text-3xl font-bold">{plan.priceLabel}</span>
                          <span className="text-muted-foreground text-sm">{plan.period}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{plan.creditsPerMonth.toLocaleString()} credits/mo</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Up to {plan.maxMembers} member{plan.maxMembers !== 1 ? 's' : ''}</span>
                        </div>
                        <Separator className="my-2" />
                        <ul className="space-y-1.5">
                          {[
                            { f: 'tableview', l: 'Table view' },
                            { f: 'cardview', l: 'Card view' },
                            { f: 'kanbanview', l: 'Kanban board' },
                            { f: 'crmFeatures', l: 'CRM features' },
                            { f: 'advancedFilters', l: 'Advanced filters' },
                            { f: 'apiAccess', l: 'API access' },
                            { f: 'customAiScoring', l: 'Custom AI scoring' },
                            { f: 'sso', l: 'SSO' },
                          ].filter(item => plan.features[item.f]).slice(0, 5).map((item) => (
                            <li key={item.l} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                              {item.l}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className={`w-full text-sm ${currentPlan === key ? 'bg-muted text-foreground' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                          variant={currentPlan === key ? 'secondary' : 'default'}
                          disabled={currentPlan === key || isSwitching}
                        >
                          {isSwitching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                          {currentPlan === key ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Usage History */}
              {usageData && usageData.recentRecords.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Usage</CardTitle>
                    <CardDescription>Your recent credit usage history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {usageData.recentRecords.slice(0, 10).map((record) => (
                        <div key={record.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium capitalize">{record.type.replace('_', ' ')}</p>
                              <p className="text-xs text-muted-foreground">
                                {record.description || 'Credit usage'}
                                {record.user && <span className="ml-1">by {record.user.name || record.user.email}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">-{record.creditsUsed} credit{record.creditsUsed > 1 ? 's' : ''}</p>
                            <p className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!canManageBilling && (
            <Card className="glass-card">
              <CardContent className="py-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Only organization owners and admins can manage billing</p>
                <p className="text-sm text-muted-foreground mt-1">Contact your organization admin to change plans</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============ TEAM TAB ============ */}
        <TabsContent value="team" className="space-y-6">
          {orgData && (
            <>
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Team Members ({orgData.members.length}/{usageData?.subscription.maxMembers || 1})</CardTitle>
                      <CardDescription>Manage who has access to your workspace</CardDescription>
                    </div>
                    {orgData.members.length < (usageData?.subscription.maxMembers || 1) && (
                      <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm" onClick={handleInvite}>
                        <Users className="mr-1.5 h-4 w-4" /> Invite Member
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {orgData.members.length >= (usageData?.subscription.maxMembers || 1) && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-4">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <p className="text-sm text-amber-200">
                        You&apos;ve reached your member limit. <button className="underline font-medium" onClick={() => {}}>Upgrade your plan</button> to add more members.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {orgData.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                              {member.user.name ? member.user.name.split(' ').map(n => n[0]).join('') : member.user.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.user.name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select
                            value={member.role}
                            disabled={member.role === 'owner' || !canManageTeam}
                            onValueChange={(role) => handleChangeRole(member.id, role)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="analyst">Analyst</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="secondary" className="text-xs capitalize">{member.role}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Role Permissions Reference */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Role Permissions</CardTitle>
                  <CardDescription>What each role can do</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-medium">Permission</th>
                          <th className="text-center py-2 px-3 font-medium">Owner</th>
                          <th className="text-center py-2 px-3 font-medium">Admin</th>
                          <th className="text-center py-2 px-3 font-medium">Analyst</th>
                          <th className="text-center py-2 px-3 font-medium">Viewer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { perm: 'View leads', o: true, a: true, an: true, v: true },
                          { perm: 'Create / Edit leads', o: true, a: true, an: true, v: false },
                          { perm: 'Delete leads', o: true, a: true, an: false, v: false },
                          { perm: 'AI scoring & outreach', o: true, a: true, an: true, v: false },
                          { perm: 'Export data', o: true, a: true, an: true, v: false },
                          { perm: 'Manage team', o: true, a: true, an: false, v: false },
                          { perm: 'Billing & plans', o: true, a: false, an: false, v: false },
                          { perm: 'Analytics & reports', o: true, a: true, an: true, v: true },
                        ].map((row) => (
                          <tr key={row.perm} className="border-b border-border/30 last:border-0">
                            <td className="py-2 pr-4 text-muted-foreground">{row.perm}</td>
                            <td className="text-center py-2 px-3">{row.o ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                            <td className="text-center py-2 px-3">{row.a ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                            <td className="text-center py-2 px-3">{row.an ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                            <td className="text-center py-2 px-3">{row.v ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Brain(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}