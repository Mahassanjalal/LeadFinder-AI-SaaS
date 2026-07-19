'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  TrendingUp,
  Mail,
  Star,
  Zap,
  Clock,
  Award,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AnimatedCounter } from '@/components/shared/animated-counter';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  '#10b981',
  '#14b8a6',
  '#f59e0b',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#84cc16',
];

interface KPIs {
  totalLeads: number;
  avgScore: number;
  highScoreLeads: number;
  contactedLeads: number;
  contactRate: number;
  favoriteLeads: number;
}

interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

interface PipelineStage {
  stage: string;
  count: number;
}

interface IndustryItem {
  industry: string;
  count: number;
  avgScore: number;
  maxScore: number;
}

interface SizeItem {
  size: string;
  count: number;
  avgScore: number;
}

interface Recommendation {
  name: string;
  score: number;
  reason: string;
}

interface AIRecommendations {
  bestProspects: Recommendation[];
  quickWins: Recommendation[];
  warmLeads: Recommendation[];
  highUrgency: Recommendation[];
  industryOpportunities: Recommendation[];
}

interface AnalyticsData {
  kpis: KPIs;
  scoreDistribution: ScoreBucket[];
  pipelineStages: PipelineStage[];
  industryBreakdown: IndustryItem[];
  scoreBySize: SizeItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const kpiCards: {
  key: keyof KPIs;
  label: string;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}[] = [
  { key: 'totalLeads', label: 'Total Leads', icon: Users },
  { key: 'avgScore', label: 'Average Score', icon: Target, decimals: 1 },
  { key: 'highScoreLeads', label: 'High-Potential Leads', icon: TrendingUp },
  { key: 'contactRate', label: 'Contact Rate', icon: Mail, suffix: '%' },
];

const recommendationCategories: {
  key: keyof AIRecommendations;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}[] = [
  {
    key: 'bestProspects',
    label: 'Best Prospects',
    icon: Award,
    color: 'text-emerald-400',
    description: 'Highest scoring leads ready for outreach',
  },
  {
    key: 'quickWins',
    label: 'Quick Wins',
    icon: Zap,
    color: 'text-amber-400',
    description: 'Easy conversions with minimal effort',
  },
  {
    key: 'warmLeads',
    label: 'Warm Leads',
    icon: Clock,
    color: 'text-cyan-400',
    description: 'Previously engaged, ready to re-engage',
  },
  {
    key: 'highUrgency',
    label: 'High Urgency',
    icon: TrendingUp,
    color: 'text-rose-400',
    description: 'Time-sensitive opportunities',
  },
  {
    key: 'industryOpportunities',
    label: 'Industry Opportunities',
    icon: Building2,
    color: 'text-violet-400',
    description: 'Emerging trends in your target markets',
  },
];

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="glass-card p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </Card>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-xs mt-0.5">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, recsRes] = await Promise.all([
          fetch('/api/analytics'),
          fetch('/api/ai/recommendations'),
        ]);
        const analyticsData = await analyticsRes.json();
        const recsData = await recsRes.json();
        setAnalytics(analyticsData);
        setRecommendations(recsData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <KPISkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!analytics || !recommendations) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Failed to load analytics data.</p>
      </div>
    );
  }

  const { kpis, scoreDistribution, pipelineStages, industryBreakdown, scoreBySize } = analytics;

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.key} variants={cardVariants}>
              <Card className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <div className="mt-3">
                  <AnimatedCounter
                    value={kpis[kpi.key]}
                    prefix={kpi.prefix}
                    suffix={kpi.suffix}
                    decimals={kpi.decimals ?? 0}
                    className="text-3xl font-bold text-foreground"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kpi.key === 'highScoreLeads' && 'Leads with score ≥ 75'}
                  {kpi.key === 'contactRate' && `${kpis.contactedLeads} of ${kpis.totalLeads} contacted`}
                  {kpi.key === 'totalLeads' && `${kpis.favoriteLeads} favorited`}
                  {kpi.key === 'avgScore' && 'Out of 100'}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Row 2: Score Distribution & Industry Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold">Lead Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                  <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((_, index) => (
                      <Cell key={`score-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold">Industry Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={industryBreakdown.slice(0, 6)}
                    dataKey="count"
                    nameKey="industry"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {industryBreakdown.slice(0, 6).map((_, index) => (
                      <Cell key={`industry-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 text-sm shadow-lg">
                          <p className="font-medium text-foreground">{data.industry}</p>
                          <p className="text-xs text-muted-foreground">
                            Leads: {data.count} · Avg Score: {data.avgScore}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Pipeline Funnel & Score by Company Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineStages}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={80}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                  <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                    {pipelineStages.map((_, index) => (
                      <Cell
                        key={`pipeline-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        opacity={1 - index * 0.12}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold">Score by Company Size</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreBySize} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="size"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: 'Employees', position: 'insideBottom', offset: -2, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: 'Avg Score', angle: -90, position: 'insideLeft', offset: 20, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                  <Bar dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>
                    {scoreBySize.map((_, index) => (
                      <Cell key={`size-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: AI Recommendations */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold">AI Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendationCategories.map((cat) => {
            const Icon = cat.icon;
            const items = recommendations[cat.key] as Recommendation[];
            return (
              <motion.div key={cat.key} variants={cardVariants}>
                <Card className="glass-card p-5 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn('h-5 w-5', cat.color)} />
                    <h3 className="font-semibold text-sm">{cat.label}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{cat.description}</p>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-muted/40 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 ml-2"
                          >
                            {item.score}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}