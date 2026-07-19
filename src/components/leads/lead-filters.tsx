'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, RotateCcw, ChevronDown, Star, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLeadStore } from '@/stores/lead-store';
import {
  INDUSTRIES,
  COMPANY_SIZES,
  PIPELINE_STAGES,
  OUTREACH_STATUSES,
  defaultFilters,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'leadScore', label: 'Score' },
  { value: 'companyName', label: 'Name' },
  { value: 'estimatedRevenue', label: 'Revenue' },
  { value: 'employeeCount', label: 'Employees' },
  { value: 'googleRating', label: 'Rating' },
  { value: 'createdAt', label: 'Date Added' },
];

function countActiveFilters(filters: typeof defaultFilters): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.industry) count++;
  if (filters.companySize) count++;
  if (filters.minScore > 0) count++;
  if (filters.maxScore < 100) count++;
  if (filters.pipelineStage) count++;
  if (filters.outreachStatus) count++;
  if (filters.isFavorite !== null) count++;
  if (filters.minEmployees > 0) count++;
  if (filters.maxEmployees < 99999) count++;
  if (filters.minRating > 0) count++;
  return count;
}

export function LeadFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const { filters, setFilters, resetFilters } = useLeadStore();
  const activeCount = countActiveFilters(filters);

  const handleScoreRange = (value: number[]) => {
    setFilters({ minScore: value[0], maxScore: value[1] });
  };

  const handleEmployeeRange = (value: number[]) => {
    setFilters({ minEmployees: value[0], maxEmployees: value[1] });
  };

  const toggleFavorite = () => {
    setFilters({
      isFavorite: filters.isFavorite === null ? true : filters.isFavorite === true ? false : null,
    });
  };

  const toggleSortOrder = () => {
    setFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="space-y-2">
      {/* Top search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Select
            value={filters.sortBy}
            onValueChange={(v) => setFilters({ sortBy: v })}
          >
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={toggleSortOrder}
            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filters.sortOrder === 'asc' ? (
              <ArrowUp className="size-4" />
            ) : (
              <ArrowDown className="size-4" />
            )}
          </Button>
        </div>

        <Button
          variant={isOpen ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 && (
            <Badge
              variant="default"
              className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700"
            >
              {activeCount}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </Button>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* Expandable filter panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border bg-card p-4 mt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Industry */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Industry</Label>
                  <Select
                    value={filters.industry}
                    onValueChange={(v) => setFilters({ industry: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Industries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Industries</SelectItem>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Size */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Company Size</Label>
                  <Select
                    value={filters.companySize}
                    onValueChange={(v) => setFilters({ companySize: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Sizes</SelectItem>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size} employees
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pipeline Stage */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Pipeline Stage</Label>
                  <Select
                    value={filters.pipelineStage}
                    onValueChange={(v) => setFilters({ pipelineStage: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Stages</SelectItem>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Outreach Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Outreach Status</Label>
                  <Select
                    value={filters.outreachStatus}
                    onValueChange={(v) => setFilters({ outreachStatus: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      {OUTREACH_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Range sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {/* Score Range */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Lead Score</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {filters.minScore} — {filters.maxScore}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[filters.minScore, filters.maxScore]}
                    onValueChange={handleScoreRange}
                    className="py-1"
                  />
                </div>

                {/* Employee Count Range */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Employees</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {filters.minEmployees} — {filters.maxEmployees >= 99999 ? '∞' : filters.maxEmployees}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1000}
                    step={10}
                    value={[filters.minEmployees, Math.min(filters.maxEmployees, 1000)]}
                    onValueChange={(v) => handleEmployeeRange([v[0], v[1] >= 1000 ? 99999 : v[1]])}
                    className="py-1"
                  />
                </div>

                {/* Min Google Rating + Favorite Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Min. Google Rating</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      min={0}
                      max={5}
                      step={0.5}
                      value={[filters.minRating]}
                      onValueChange={(v) => setFilters({ minRating: v[0] })}
                      className="flex-1 py-1"
                    />
                    <span className="text-sm font-medium tabular-nums min-w-[2rem] text-right">
                      {filters.minRating > 0 ? `${filters.minRating}+` : 'Any'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Favorite toggle */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                <Button
                  variant={filters.isFavorite === true ? 'default' : filters.isFavorite === false ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={toggleFavorite}
                  className={cn(
                    'gap-1.5 transition-colors',
                    filters.isFavorite === true && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                    filters.isFavorite === false && 'text-red-500 border-red-200 hover:bg-red-50'
                  )}
                >
                  <Star
                    className={cn(
                      'size-3.5',
                      filters.isFavorite === true && 'fill-current'
                    )}
                  />
                  {filters.isFavorite === null
                    ? 'All'
                    : filters.isFavorite === true
                      ? 'Favorites Only'
                      : 'Non-Favorites'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}