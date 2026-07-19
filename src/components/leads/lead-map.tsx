'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Building2, Filter, Layers, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLeadStore } from '@/stores/lead-store';
import { getScoreColor, type Lead } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LeadMapProps {
  onSelectLead: (lead: Lead) => void;
}

const US_BOUNDS = {
  minLat: 24.5,
  maxLat: 49.5,
  minLon: -125,
  maxLon: -66.5,
};

const SVG_W = 800;
const SVG_H = 500;

function project(lat: number, lon: number) {
  const x = ((lon - US_BOUNDS.minLon) / (US_BOUNDS.maxLon - US_BOUNDS.minLon)) * SVG_W;
  const y = ((US_BOUNDS.maxLat - lat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * SVG_H;
  return { x, y };
}

function getMarkerColor(score: number): string {
  if (score >= 90) return '#f59e0b';
  if (score >= 75) return '#10b981';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#0ea5e9';
  return '#9ca3af';
}

function getMarkerGlow(score: number): string {
  if (score >= 90) return 'rgba(245,158,11,0.5)';
  if (score >= 75) return 'rgba(16,185,129,0.5)';
  if (score >= 60) return 'rgba(234,179,8,0.4)';
  if (score >= 40) return 'rgba(14,165,233,0.4)';
  return 'rgba(156,163,175,0.3)';
}

function getMarkerRadius(score: number): number {
  if (score >= 90) return 10;
  if (score >= 75) return 8;
  if (score >= 60) return 7;
  if (score >= 40) return 6;
  return 5;
}

interface CityCluster {
  city: string;
  state: string | null;
  lat: number;
  lon: number;
  leads: Lead[];
  avgScore: number;
}

const SCORE_LEGEND = [
  { label: 'Excellent', range: '90+', color: '#f59e0b' },
  { label: 'High', range: '75-89', color: '#10b981' },
  { label: 'Moderate', range: '60-74', color: '#eab308' },
  { label: 'Low', range: '40-59', color: '#0ea5e9' },
  { label: 'Poor', range: '<40', color: '#9ca3af' },
];

export function LeadMap({ onSelectLead }: LeadMapProps) {
  const { filteredLeads } = useLeadStore();
  const [grouped, setGrouped] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<[number, number]>([0, 100]);

  const geoLeads = useMemo(() => {
    return filteredLeads.filter(
      (l) => l.latitude != null && l.longitude != null && l.leadScore >= scoreFilter[0] && l.leadScore <= scoreFilter[1]
    );
  }, [filteredLeads, scoreFilter]);

  const clusters = useMemo((): CityCluster[] => {
    if (!grouped) return [];
    const map = new Map<string, CityCluster>();
    for (const lead of geoLeads) {
      const key = [lead.city, lead.state].filter(Boolean).join(', ');
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.leads.push(lead);
        existing.avgScore = existing.leads.reduce((s, l) => s + l.leadScore, 0) / existing.leads.length;
      } else {
        map.set(key, {
          city: lead.city!,
          state: lead.state,
          lat: lead.latitude!,
          lon: lead.longitude!,
          leads: [lead],
          avgScore: lead.leadScore,
        });
      }
    }
    return Array.from(map.values());
  }, [geoLeads, grouped]);

  const stats = useMemo(() => {
    const total = geoLeads.length;
    const avgScore = total ? geoLeads.reduce((s, l) => s + l.leadScore, 0) / total : 0;
    const cityCounts = new Map<string, number>();
    for (const l of geoLeads) {
      const c = l.city ?? 'Unknown';
      cityCounts.set(c, (cityCounts.get(c) ?? 0) + 1);
    }
    const topCity = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    return { total, avgScore: Math.round(avgScore), topCity: topCity ? `${topCity[0]} (${topCity[1]})` : '—' };
  }, [geoLeads]);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let lat = 25; lat <= 49; lat += 8) {
      const p1 = project(lat, US_BOUNDS.minLon);
      const p2 = project(lat, US_BOUNDS.maxLon);
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    for (let lon = -124; lon <= -67; lon += 10) {
      const p1 = project(US_BOUNDS.maxLat, lon);
      const p2 = project(US_BOUNDS.minLat, lon);
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    return lines;
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-full">
      {/* Map Area */}
      <Card className="glass-card overflow-hidden flex flex-col">
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-emerald-500" />
            <span className="text-muted-foreground">On Map:</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="size-4 text-emerald-500" />
            <span className="text-muted-foreground">Avg Score:</span>
            <span className={cn('font-semibold', getScoreColor(stats.avgScore))}>{stats.avgScore}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="size-4 text-emerald-500" />
            <span className="text-muted-foreground">Top City:</span>
            <span className="font-semibold">{stats.topCity}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={grouped ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGrouped(!grouped)}
                    className="h-8 gap-1.5"
                  >
                    <Layers className="size-3.5" />
                    Group by City
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle city clustering</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Score:</span>
          {SCORE_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full inline-block"
                style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}60` }}
              />
              <span className="text-xs text-muted-foreground">{item.range}</span>
            </div>
          ))}
        </div>

        {/* SVG Map */}
        <div className="flex-1 relative min-h-[400px]">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="mapBg" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#0f1a2e" />
                <stop offset="100%" stopColor="#070d18" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width={SVG_W} height={SVG_H} fill="url(#mapBg)" rx="8" />

            {/* Grid lines */}
            {gridLines.map((line, i) => (
              <line
                key={i}
                x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            ))}

            {/* Border */}
            <rect
              x={1} y={1} width={SVG_W - 2} height={SVG_H - 2}
              rx="8"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />

            {/* City Clusters */}
            <AnimatePresence>
              {grouped &&
                clusters.map((cluster, i) => {
                  const { x, y } = project(cluster.lat, cluster.lon);
                  const color = getMarkerColor(cluster.avgScore);
                  const r = Math.min(12 + cluster.leads.length * 1.5, 28);
                  return (
                    <motion.g
                      key={`cluster-${cluster.city}-${cluster.state}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.03, ease: 'easeOut' }}
                      style={{ transformOrigin: `${x}px ${y}px` }}
                      className="cursor-pointer"
                      onClick={() => onSelectLead(cluster.leads[0])}
                    >
                      <circle cx={x} cy={y} r={r + 4} fill={color} opacity={0.1} />
                      <circle cx={x} cy={y} r={r} fill={color} opacity={0.25} filter="url(#glow)" />
                      <circle cx={x} cy={y} r={r - 2} fill={color} opacity={0.6} />
                      <text
                        x={x} y={y + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {cluster.leads.length}
                      </text>
                      <text
                        x={x} y={y - r - 6}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.8)"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {cluster.city}
                      </text>
                    </motion.g>
                  );
                })}
            </AnimatePresence>

            {/* Individual Lead Markers */}
            <AnimatePresence>
              {!grouped &&
                geoLeads.map((lead, i) => {
                  const { x, y } = project(lead.latitude!, lead.longitude!);
                  const color = getMarkerColor(lead.leadScore);
                  const glow = getMarkerGlow(lead.leadScore);
                  const r = getMarkerRadius(lead.leadScore);
                  const isHovered = hoveredId === lead.id;
                  return (
                    <motion.g
                      key={lead.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.02, 1.5), ease: 'easeOut' }}
                      style={{ transformOrigin: `${x}px ${y}px` }}
                      className="cursor-pointer"
                      onClick={() => onSelectLead(lead)}
                      onMouseEnter={() => setHoveredId(lead.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Outer glow ring */}
                      <circle
                        cx={x} cy={y}
                        r={r + (isHovered ? 8 : 5)}
                        fill={glow}
                        opacity={isHovered ? 0.6 : 0.3}
                        className="transition-all duration-200"
                      />
                      {/* Main dot */}
                      <circle
                        cx={x} cy={y}
                        r={isHovered ? r + 2 : r}
                        fill={color}
                        filter="url(#glow)"
                        className="transition-all duration-200"
                      />
                      {/* Inner highlight */}
                      <circle
                        cx={x - r * 0.2} cy={y - r * 0.2}
                        r={r * 0.35}
                        fill="white"
                        opacity={0.3}
                      />
                      {/* Hover label */}
                      {isHovered && (
                        <text
                          x={x} y={y - r - 8}
                          textAnchor="middle"
                          fill="white"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {lead.companyName}
                        </text>
                      )}
                      {/* SVG native title for basic accessibility */}
                      <title>
                        {lead.companyName} — {lead.city ?? ''}{lead.state ? `, ${lead.state}` : ''} | {lead.industry} | Score: {lead.leadScore}
                      </title>
                    </motion.g>
                  );
                })}
            </AnimatePresence>
          </svg>

          {/* Empty state */}
          {geoLeads.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <MapPin className="size-10 mb-2 opacity-30" />
              <p className="text-sm">No leads with location data found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Lead List Panel */}
      <Card className="glass-card flex flex-col overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="size-4 text-emerald-500" />
            Leads on Map
            <Badge variant="secondary" className="ml-auto text-xs">
              {geoLeads.length}
            </Badge>
          </CardTitle>

          {/* Score filter slider */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Min Score: {scoreFilter[0]}</span>
              <span>Max: {scoreFilter[1]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={scoreFilter[0]}
              onChange={(e) => setScoreFilter([Number(e.target.value), scoreFilter[1]])}
              className="w-full h-1.5 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500 cursor-pointer"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={scoreFilter[1]}
              onChange={(e) => setScoreFilter([scoreFilter[0], Number(e.target.value)])}
              className="w-full h-1.5 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500 cursor-pointer"
            />
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 max-h-[520px]">
          <div className="px-4 pb-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {geoLeads.map((lead, i) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 1) }}
                >
                  <div
                    className={cn(
                      'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                      'hover:bg-white/5 border border-transparent hover:border-border/40',
                      hoveredId === lead.id && 'bg-white/5 border-emerald-500/30'
                    )}
                    onClick={() => onSelectLead(lead)}
                    onMouseEnter={() => setHoveredId(lead.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div
                      className="mt-0.5 size-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: getMarkerColor(lead.leadScore),
                        boxShadow: `0 0 8px ${getMarkerGlow(lead.leadScore)}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-emerald-400 transition-colors">
                        {lead.companyName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[lead.city, lead.state].filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          {lead.industry}
                        </Badge>
                        <span
                          className={cn('text-[11px] font-semibold', getScoreColor(lead.leadScore))}
                        >
                          {lead.leadScore}
                        </span>
                      </div>
                    </div>
                    <MapPin className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {geoLeads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MapPin className="size-8 mb-2 opacity-30" />
                <p className="text-sm">Adjust score filter to see leads</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}