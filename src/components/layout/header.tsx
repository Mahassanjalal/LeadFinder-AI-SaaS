'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Download,
  Bell,
  User,
  Settings,
  LogOut,
  FileJson,
  FileSpreadsheet,
  Crown,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/app-store';
import { canUseFeature } from '@/lib/auth-helpers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function Header() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const userPlan = useAppStore((s) => s.userPlan);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const plan = (user?.orgPlan as string) || userPlan;
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    if (format === 'json' && !canUseFeature(plan, 'exportJson')) {
      toast.error('JSON export requires a paid plan. Upgrade to Starter or higher.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Leads exported as ${format.toUpperCase()} successfully`);
    } catch {
      toast.error('Failed to export leads');
    } finally {
      setIsExporting(false);
    }
  };

  const userName = user?.name ? String(user.name) : 'User';
  const userEmail = user?.email ? String(user.email) : '';
  const role = (user?.role as string) || 'analyst';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 px-4 md:px-6',
        'border-b border-border bg-background/80 backdrop-blur-xl'
      )}
    >
      {/* Mobile / Hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden h-8 w-8"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search leads, companies, industries..."
          className="pl-9 pr-12 h-9 bg-muted/50 border-transparent focus:border-border transition-colors text-sm"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground pointer-events-none">
          Ctrl K
        </kbd>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Plan Badge */}
        {plan !== 'free' && (
          <Badge className="hidden sm:flex items-center gap-1 bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs mr-1">
            <Crown className="h-3 w-3" /> {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Badge>
        )}

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Export">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport('json')}
              disabled={isExporting || !canUseFeature(plan, 'exportJson')}
            >
              <FileJson className="mr-2 h-4 w-4 text-amber-400" />
              Export JSON
              {!canUseFeature(plan, 'exportJson') && <Badge variant="secondary" className="ml-auto text-[9px]">PRO</Badge>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white border-0 pulse-dot">
            3
          </Badge>
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] capitalize">{role}</Badge>
                <Badge variant="secondary" className="text-[10px] capitalize">{plan}</Badge>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setActiveView('settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView('settings')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            {plan === 'free' && (
              <DropdownMenuItem onClick={() => setActiveView('settings')}>
                <Crown className="mr-2 h-4 w-4 text-amber-400" />
                <span className="text-amber-400">Upgrade Plan</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}