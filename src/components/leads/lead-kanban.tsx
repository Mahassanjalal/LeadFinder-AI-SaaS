'use client';

import { useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeadStore } from '@/stores/lead-store';
import { LeadScoreBadge } from './lead-score-badge';
import { PIPELINE_STAGES, type Lead } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, { bg: string; border: string; header: string; dot: string }> = {
  'New': { bg: 'bg-slate-50/80', border: 'border-slate-200/60', header: 'text-slate-700', dot: 'bg-slate-400' },
  'Contacted': { bg: 'bg-sky-50/80', border: 'border-sky-200/60', header: 'text-sky-700', dot: 'bg-sky-400' },
  'Replied': { bg: 'bg-emerald-50/80', border: 'border-emerald-200/60', header: 'text-emerald-700', dot: 'bg-emerald-400' },
  'Meeting Set': { bg: 'bg-violet-50/80', border: 'border-violet-200/60', header: 'text-violet-700', dot: 'bg-violet-400' },
  'Proposal Sent': { bg: 'bg-amber-50/80', border: 'border-amber-200/60', header: 'text-amber-700', dot: 'bg-amber-400' },
  'Won': { bg: 'bg-emerald-50/80', border: 'border-emerald-200/60', header: 'text-emerald-700', dot: 'bg-emerald-400' },
  'Lost': { bg: 'bg-red-50/80', border: 'border-red-200/60', header: 'text-red-700', dot: 'bg-red-400' },
};

function KanbanCard({ lead, onSelect }: { lead: Lead; onSelect: (lead: Lead) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          'cursor-pointer border shadow-sm hover:shadow-md transition-shadow',
          isDragging && 'shadow-lg'
        )}
        onClick={() => onSelect(lead)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                {...listeners}
              >
                <GripVertical className="size-3.5" />
              </button>
              <div className="min-w-0">
                <div className="font-medium text-xs truncate">{lead.companyName}</div>
                <div className="text-[10px] text-muted-foreground">{lead.industry}</div>
              </div>
            </div>
            <LeadScoreBadge score={lead.leadScore} size="sm" />
          </div>
          {lead.city && (
            <div className="text-[10px] text-muted-foreground truncate pl-5">
              {lead.city}{lead.state ? `, ${lead.state}` : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  onSelect,
}: {
  stage: string;
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  const colors = STAGE_COLORS[stage] || STAGE_COLORS['New'];
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage}` });

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border min-w-[260px] max-w-[300px] flex-shrink-0',
        colors.bg,
        colors.border,
        isOver && 'ring-2 ring-emerald-400/50 ring-offset-2'
      )}
    >
      {/* Column Header */}
      <div className={cn('flex items-center justify-between px-3 py-2.5 border-b', colors.border)}>
        <div className="flex items-center gap-2">
          <div className={cn('size-2 rounded-full', colors.dot)} />
          <span className={cn('text-sm font-semibold', colors.header)}>{stage}</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] px-1.5">
          {leads.length}
        </Badge>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-240px)]"
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onSelect={onSelect} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No leads
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadKanban({ onSelectLead }: { onSelectLead: (lead: Lead) => void }) {
  const { filteredLeads, updateLead } = useLeadStore();

  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const stage of PIPELINE_STAGES) {
      map.set(stage, []);
    }
    for (const lead of filteredLeads) {
      const stage = map.get(lead.pipelineStage) || map.get('New')!;
      stage.push(lead);
    }
    return map;
  }, [filteredLeads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    let targetStage: string | undefined;

    // Check if dropped on a column
    if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      targetStage = over.id.replace('column-', '');
    }

    // Check if dropped on another card
    if (!targetStage && typeof over.id === 'string') {
      const targetLead = filteredLeads.find((l) => l.id === over.id);
      if (targetLead) {
        targetStage = targetLead.pipelineStage;
      }
    }

    if (targetStage && PIPELINE_STAGES.includes(targetStage as typeof PIPELINE_STAGES[number])) {
      const currentLead = filteredLeads.find((l) => l.id === leadId);
      if (currentLead && currentLead.pipelineStage !== targetStage) {
        updateLead(leadId, { pipelineStage: targetStage });
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={leadsByStage.get(stage) || []}
            onSelect={onSelectLead}
          />
        ))}
      </div>
    </DndContext>
  );
}