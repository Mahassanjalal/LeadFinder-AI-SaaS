'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Target, Users, Star, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AnalyticsResponse {
  kpis: {
    totalLeads: number;
    avgScore: number;
    highScoreLeads: number;
    contactedLeads: number;
    contactRate: number;
    favoriteLeads: number;
    scoredLeads: number;
    avgEmployeeCount: number;
    topIndustry: { industry: string; count: number; avgScore: number } | null;
  };
  scoreDistribution: { label: string; min: number; max: number; count: number }[];
  pipelineStages: { stage: string; count: number }[];
  industryBreakdown: { industry: string; count: number; avgScore: number }[];
  outreachStatus: { status: string; count: number }[];
  scoreBySize: { size: string; count: number; avgScore: number }[];
  monthlyTrend: { month: string; count: number }[];
}

const PIE_COLORS = [
  '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#e11d48', '#a855f7', '#eab308', '#22c55e',
];

const BAR_COLORS = ['#9ca3af', '#0ea5e9', '#eab308', '#10b981', '#f59e0b'];

const PIPELINE_ORDER = ['New', 'Contacted', 'Replied', 'Meeting Set', 'Proposal Sent', 'Won', 'Lost'];
const PIPELINE_COLORS: Record<string, string> = {
  'New': '#94a3b8',
  'Contacted': '#0ea5e9',
  'Replied': '#10b981',
  'Meeting Set': '#8b5cf6',
  'Proposal Sent': '#f59e0b',
  'Won': '#10b981',
  'Lost': '#ef4444',
};

function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionVal, value, { duration });
    return controls.stop;
  }, [value, motionVal, duration]);

  return (
    <motion.span className="tabular-nums">{display}</motion.span>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  suffix,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  suffix?: string;
}) {
  return (
    <Card className=" backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={cn('text-2xl font-bold', color)}>
                <AnimatedCounter value={value} />
              </span>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
          </div>
          <div className={cn('size-10 rounded-lg flex items-center justify-center', color.replace('text-', 'bg-').replace(/-600$/, '-50').replace(/-500$/, '-50'))}>
            <Icon className={cn('size-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineFunnel({ data }: { data: { stage: string; count: number }[] }) {
  const ordered = PIPELINE_ORDER
    .map((stage) => data.find((d) => d.stage === stage))
    .filter(Boolean) as { stage: string; count: number }[];
  const maxCount = Math.max(...ordered.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {ordered.map((item) => {
        const widthPct = Math.max((item.count / maxCount) * 100, 8);
        const color = PIPELINE_COLORS[item.stage] || '#9ca3af';
        return (
          <div key={item.stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{item.stage}</span>
              <span className="text-muted-foreground tabular-nums">{item.count}</span>
            </div>
            <div className="relative h-7 bg-muted/30 rounded-md overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-md"
                style={{ backgroundColor: color, opacity: 0.85 }}
              />
              <div className="absolute inset-0 flex items-center px-2">
                <span className="text-[10px] font-medium text-white mix-blend-difference">
                  {item.stage}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopOpportunities({
  leads,
}: {
  leads: { name: string; score: number; value: string; industry: string }[];
}) {
  if (!leads || leads.length === 0) return null;
  return (
    <div className="space-y-2">
      {leads.slice(0, 5).map((item, i) => (
        <div
          key={item.name}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
        >
          <div className={cn(
            'size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
            i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-muted-foreground/30'
          )}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{item.name}</div>
            <div className="text-xs text-muted-foreground">{item.industry}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-emerald-600">{item.score}</div>
            {item.value && <div className="text-[10px] text-muted-foreground">{item.value}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeadAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Failed to load analytics data.
      </div>
    );
  }

  const { kpis, scoreDistribution, pipelineStages, industryBreakdown } = data;

  // Build top opportunities from industry breakdown
  const topOpps = industryBreakdown
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)
    .map((ind) => ({
      name: ind.industry,
      score: ind.avgScore,
      value: `${ind.count} leads`,
      industry: ind.industry,
    }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Leads"
          value={kpis.totalLeads}
          icon={Users}
          color="text-emerald-600"
        />
        <KpiCard
          title="Avg. Score"
          value={kpis.avgScore}
          icon={Target}
          color="text-amber-600"
          suffix="/100"
        />
        <KpiCard
          title="High Score Leads"
          value={kpis.highScoreLeads}
          icon={Zap}
          color="text-violet-600"
          suffix="70+"
        />
        <KpiCard
          title="Contact Rate"
          value={kpis.contactRate}
          icon={TrendingUp}
          color="text-sky-600"
          suffix="%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <Card className=" backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Industry Breakdown Pie */}
        <Card className=" backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Industry Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={industryBreakdown}
                  dataKey="count"
                  nameKey="industry"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {industryBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} leads`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {industryBreakdown.slice(0, 7).map((item, i) => (
                <div key={item.industry} className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {item.industry} ({item.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <Card className=" backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PipelineFunnel data={pipelineStages} />
          </CardContent>
        </Card>

        {/* Top Opportunities */}
        <Card className=" backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Industries by Score</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopOpportunities leads={topOpps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}