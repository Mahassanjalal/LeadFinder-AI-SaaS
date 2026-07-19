'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Send, BarChart3, ClipboardList, Settings, Sparkles, PanelLeftClose, PanelLeft, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { useSession } from 'next-auth/react';
import { canUseFeature } from '@/lib/auth-helpers';
import type { AppView } from '@/lib/types';

interface NavItem {
  label: string;
  view: AppView;
  icon: React.ElementType;
  feature?: string;
}

const navItems: NavItem[] = [
  { label: 'Discovery', view: 'discovery', icon: Search, feature: 'discovery' },
  { label: 'Leads', view: 'leads', icon: Users },
  { label: 'Outreach', view: 'outreach', icon: Send, feature: 'aiOutreach' },
  { label: 'Analytics', view: 'analytics', icon: BarChart3, feature: 'analyticsView' },
  { label: 'CRM', view: 'crm', icon: ClipboardList, feature: 'crmFeatures' },
];

const settingsItem: NavItem = { label: 'Settings', view: 'settings', icon: Settings };

function NavButton({ item, collapsed, isActive, onClick, isLocked }: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onClick: () => void;
  isLocked?: boolean;
}) {
  const Icon = item.icon;

  const btn = (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'relative w-full justify-start gap-3 rounded-lg h-10 px-3 font-normal transition-all duration-200',
        collapsed ? 'justify-center px-0' : '',
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-400'
          : isLocked
          ? 'text-muted-foreground/50 cursor-not-allowed'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      disabled={isLocked}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-emerald-400' : '')} />
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && isLocked && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">PRO</Badge>
      )}
    </Button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="font-medium">
          {isLocked ? `${item.label} (Upgrade)` : item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const userPlan = useAppStore((s) => s.userPlan);
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const plan = (user?.orgPlan as string) || userPlan;

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 68 : 240 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'fixed top-0 left-0 z-40 flex h-screen flex-col border-r border-border',
          'bg-background/80 backdrop-blur-xl'
        )}
      >
        {/* Brand / Logo */}
        <div className="flex h-14 items-center gap-2.5 px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Sparkles className="h-[18px] w-[18px] text-emerald-400" />
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden flex items-center gap-1.5"
              >
                <h1 className="text-sm font-semibold tracking-tight whitespace-nowrap">
                  <span className="gradient-text">LeadFinder</span>
                  <span className="ml-1 text-muted-foreground">AI</span>
                </h1>
                {plan && plan !== 'free' && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                    {plan.toUpperCase()}
                  </Badge>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator className="opacity-50" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-1">
          {navItems.map((item) => {
            const isLocked = item.feature ? !canUseFeature(plan, item.feature) : false;
            return (
              <NavButton
                key={item.view}
                item={item}
                collapsed={sidebarCollapsed}
                isActive={activeView === item.view}
                onClick={() => !isLocked && setActiveView(item.view)}
                isLocked={isLocked}
              />
            );
          })}
        </nav>

        <Separator className="opacity-50" />

        {/* Settings + Collapse toggle */}
        <div className="p-2 space-y-1">
          <NavButton
            item={settingsItem}
            collapsed={sidebarCollapsed}
            isActive={activeView === 'settings'}
            onClick={() => setActiveView('settings')}
          />

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  'w-full rounded-lg h-9 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                  sidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3'
                )}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <>
                    <PanelLeftClose className="h-4 w-4 shrink-0" />
                    <span>Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right" sideOffset={12}>Expand sidebar</TooltipContent>
            )}
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}