'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Star, ArrowUpDown, ArrowUp, ArrowDown, Building2, MoreHorizontal, Globe } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLeadStore } from '@/stores/lead-store';
import { LeadScoreBadge } from './lead-score-badge';
import { PIPELINE_STAGES, type Lead } from '@/lib/types';
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

function getOutreachStatusColor(status: string) {
  switch (status) {
    case 'Not Contacted': return 'bg-gray-100 text-gray-600';
    case 'Contacted': return 'bg-sky-100 text-sky-700';
    case 'Replied': return 'bg-emerald-100 text-emerald-700';
    case 'Meeting Set': return 'bg-violet-100 text-violet-700';
    case 'Proposal Sent': return 'bg-amber-100 text-amber-700';
    case 'Won': return 'bg-emerald-100 text-emerald-700';
    case 'Lost': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function LeadTable({ onSelectLead }: { onSelectLead: (lead: Lead) => void }) {
  const { filteredLeads, updateLead } = useLeadStore();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: 'company',
        accessorKey: 'companyName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Company
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-[180px]">
            <div className="size-8 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{row.original.companyName}</div>
              {row.original.website && (
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Globe className="size-3 shrink-0" />
                  {row.original.website.replace(/^https?:\/\//, '')}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'industry',
        header: 'Industry',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal">
            {row.original.industry}
          </Badge>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => {
          const city = row.original.city;
          const state = row.original.state;
          if (!city && !state) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm">
              {city}{city && state ? ', ' : ''}{state}
            </span>
          );
        },
      },
      {
        accessorKey: 'companySize',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.companySize || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'employeeCount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Employees
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.employeeCount?.toLocaleString() || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'leadScore',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Score
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <LeadScoreBadge score={row.original.leadScore} size="sm" />
        ),
      },
      {
        accessorKey: 'googleRating',
        header: 'Rating',
        cell: ({ row }) => {
          const rating = row.original.googleRating;
          if (!rating) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-1">
              <span className="text-amber-500 text-xs">★</span>
              <span className="text-sm font-medium tabular-nums">{rating}</span>
              {row.original.reviewCount != null && row.original.reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">({row.original.reviewCount})</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'pipelineStage',
        header: 'Stage',
        cell: ({ row }) => (
          <Select
            value={row.original.pipelineStage}
            onValueChange={(v) => updateLead(row.original.id, { pipelineStage: v })}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectTrigger
              size="sm"
              className={cn('h-7 w-[130px] text-xs border', getPipelineStageColor(row.original.pipelineStage))}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage} className="text-xs">
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'outreachStatus',
        header: 'Outreach',
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className={cn('text-[11px]', getOutreachStatusColor(row.original.outreachStatus))}
          >
            {row.original.outreachStatus}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation();
                updateLead(row.original.id, { isFavorite: !row.original.isFavorite });
              }}
            >
              <Star
                className={cn(
                  'size-3.5',
                  row.original.isFavorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectLead(row.original); }}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLead(row.original.id, { isFavorite: !row.original.isFavorite });
                  }}
                >
                  {row.original.isFavorite ? 'Unfavorite' : 'Favorite'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [updateLead, onSelectLead]
  );

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                No leads found. Try adjusting your filters or discover new leads.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onSelectLead(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}