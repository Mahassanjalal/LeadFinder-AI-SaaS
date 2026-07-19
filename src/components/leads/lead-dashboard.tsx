'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table, LayoutGrid, Columns3, BarChart3, Database,
  Search, Compass, Loader2, Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadStore } from '@/stores/lead-store';
import { useAppStore } from '@/stores/app-store';
import { LeadFilters } from './lead-filters';
import { LeadTable } from './lead-table';
import { LeadCards } from './lead-cards';
import { LeadKanban } from './lead-kanban';
import { LeadAnalytics } from './lead-analytics';
import { LeadDetail } from './lead-detail';
import { LeadDiscovery } from './lead-discovery';
import { LeadMap } from './lead-map';
import type { Lead, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';

const VIEW_TABS: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: 'table', label: 'Table', icon: Table },
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'kanban', label: 'Kanban', icon: Columns3 },
  { value: 'map', label: 'Map', icon: Map },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function LeadDashboard() {
  const { activeView, setActiveView } = useAppStore();
  const { viewMode, setViewMode, filteredLeads, leads, setLeads, isLoading, setLoading } = useLeadStore();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch leads on mount
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const json = await res.json();
      setLeads(json);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [setLeads, setLoading]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLeadId(lead.id);
    setDetailOpen(true);
  }, []);

  const isDiscovery = activeView === 'discovery';

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* App-level tabs: Discovery vs Leads */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Compass className="size-4 text-white" />
              </div>
              <h1 className="font-bold text-lg hidden sm:block">LeadFinder</h1>
            </div>
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
            <Tabs
              value={activeView}
              onValueChange={(v) => setActiveView(v as typeof activeView)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="discovery" className="text-xs gap-1.5 px-3 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Search className="size-3.5" />
                  <span className="hidden sm:inline">Discovery</span>
                </TabsTrigger>
                <TabsTrigger value="leads" className="text-xs gap-1.5 px-3 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Database className="size-3.5" />
                  <span className="hidden sm:inline">Pipeline</span>
                  {leads.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-[18px] px-1 text-[10px] bg-emerald-100 text-emerald-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                      {leads.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* View mode tabs (only in leads view) */}
          {!isDiscovery && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                {VIEW_TABS.map((tab) => (
                  <Button
                    key={tab.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 px-2.5 gap-1.5 text-xs',
                      viewMode === tab.value
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setViewMode(tab.value)}
                  >
                    <tab.icon className="size-3.5" />
                    <span className="hidden md:inline">{tab.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {isDiscovery ? (
          <div className="p-4 sm:p-6">
            <LeadDiscovery />
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Filters */}
            <LeadFilters />

            {/* Results count */}
            {!isLoading && viewMode !== 'analytics' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground">{filteredLeads.length}</strong> of{' '}
                  <strong className="text-foreground">{leads.length}</strong> leads
                </span>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="text-sm">Loading leads...</span>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            )}

            {/* Views */}
            {!isLoading && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {viewMode === 'table' && (
                    <LeadTable onSelectLead={handleSelectLead} />
                  )}
                  {viewMode === 'cards' && (
                    <LeadCards onSelectLead={handleSelectLead} />
                  )}
                  {viewMode === 'kanban' && (
                    <LeadKanban onSelectLead={handleSelectLead} />
                  )}
                  {viewMode === 'map' && (
                    <LeadMap onSelectLead={handleSelectLead} />
                  )}
                  {viewMode === 'analytics' && (
                    <LeadAnalytics />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetail
        leadId={selectedLeadId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedLeadId(null);
        }}
      />
    </div>
  );
}