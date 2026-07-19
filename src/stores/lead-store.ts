import { create } from 'zustand';
import type { Lead, ViewMode, LeadFilters } from '@/lib/types';
import { defaultFilters } from '@/lib/types';

interface LeadState {
  leads: Lead[];
  filteredLeads: Lead[];
  selectedLead: Lead | null;
  viewMode: ViewMode;
  filters: LeadFilters;
  isLoading: boolean;
  setLeads: (leads: Lead[]) => void;
  setSelectedLead: (lead: Lead | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<LeadFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  return leads.filter((lead) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = lead.companyName.toLowerCase().includes(q) ||
        lead.industry.toLowerCase().includes(q) ||
        (lead.city?.toLowerCase().includes(q) ?? false) ||
        (lead.businessCategory?.toLowerCase().includes(q) ?? false);
      if (!match) return false;
    }
    if (filters.industry && lead.industry !== filters.industry) return false;
    if (filters.companySize && lead.companySize !== filters.companySize) return false;
    if (lead.leadScore < filters.minScore || lead.leadScore > filters.maxScore) return false;
    if (filters.pipelineStage && lead.pipelineStage !== filters.pipelineStage) return false;
    if (filters.outreachStatus && lead.outreachStatus !== filters.outreachStatus) return false;
    if (filters.isFavorite !== null && lead.isFavorite !== filters.isFavorite) return false;
    if (lead.employeeCount && lead.employeeCount < filters.minEmployees) return false;
    if (lead.employeeCount && lead.employeeCount > filters.maxEmployees) return false;
    if (lead.googleRating && lead.googleRating < filters.minRating) return false;
    return true;
  }).sort((a, b) => {
    const key = filters.sortBy as keyof Lead;
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return filters.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });
}

export const useLeadStore = create<LeadState>((set, get) => ({
  leads: [],
  filteredLeads: [],
  selectedLead: null,
  viewMode: 'table',
  filters: defaultFilters,
  isLoading: false,
  setLeads: (leads) => {
    set({ leads });
    get().applyFilters();
  },
  setSelectedLead: (lead) => set({ selectedLead: lead }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilters: (partial) => {
    set((s) => ({ filters: { ...s.filters, ...partial } }));
    get().applyFilters();
  },
  resetFilters: () => {
    set({ filters: defaultFilters });
    get().applyFilters();
  },
  applyFilters: () => {
    const { leads, filters } = get();
    set({ filteredLeads: filterLeads(leads, filters) });
  },
  updateLead: (id, updates) => {
    set((s) => {
      const leads = s.leads.map((l) => l.id === id ? { ...l, ...updates } : l);
      return { leads, filteredLeads: filterLeads(leads, s.filters) };
    });
  },
  removeLead: (id) => {
    set((s) => {
      const leads = s.leads.filter((l) => l.id !== id);
      return { leads, filteredLeads: filterLeads(leads, s.filters) };
    });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));