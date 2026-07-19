'use client';

import { motion } from 'framer-motion';
import { Star, MapPin, Users, DollarSign, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLeadStore } from '@/stores/lead-store';
import { LeadScoreBadge } from './lead-score-badge';
import { parseJsonField, type Lead } from '@/lib/types';
import { cn } from '@/lib/utils';

function getPipelineStageColor(stage: string) {
  switch (stage) {
    case 'New': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Contacted': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'Replied': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Meeting Set': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Proposal Sent': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Won': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Lost': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function LeadCard({ lead, index, onSelect }: { lead: Lead; index: number; onSelect: (lead: Lead) => void }) {
  const { updateLead } = useLeadStore();
  const tags = parseJsonField<string[]>(lead.tags, []);
  const location = [lead.city, lead.state].filter(Boolean).join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
      layout
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-300',
          'hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5',
          'bg-white/70 backdrop-blur-sm border-border/60',
          'hover:border-emerald-200'
        )}
        onClick={() => onSelect(lead)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header: Logo + Name + Fav */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Building2 className="size-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-emerald-700 transition-colors">
                  {lead.companyName}
                </h3>
                <Badge variant="outline" className="text-[10px] font-normal mt-0.5">
                  {lead.industry}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <LeadScoreBadge score={lead.leadScore} size="sm" />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLead(lead.id, { isFavorite: !lead.isFavorite });
                }}
              >
                <Star
                  className={cn(
                    'size-3.5 transition-colors',
                    lead.isFavorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground hover:text-amber-400'
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {/* Key Metrics */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lead.employeeCount && (
              <div className="flex items-center gap-1">
                <Users className="size-3" />
                <span className="tabular-nums">{lead.employeeCount.toLocaleString()}</span>
              </div>
            )}
            {lead.estimatedRevenue && (
              <div className="flex items-center gap-1">
                <DollarSign className="size-3" />
                <span>{lead.estimatedRevenue}</span>
              </div>
            )}
            {lead.googleRating && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-amber-500 text-xs">★</span>
                <span className="tabular-nums font-medium">{lead.googleRating}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Pipeline Stage */}
          <div className="flex items-center justify-between pt-1">
            <Badge
              variant="outline"
              className={cn('text-[11px]', getPipelineStageColor(lead.pipelineStage))}
            >
              {lead.pipelineStage}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(lead.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function LeadCards({ onSelectLead }: { onSelectLead: (lead: Lead) => void }) {
  const { filteredLeads } = useLeadStore();

  if (filteredLeads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No leads found. Try adjusting your filters or discover new leads.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredLeads.map((lead, index) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          index={index}
          onSelect={onSelectLead}
        />
      ))}
    </div>
  );
}