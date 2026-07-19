import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const leads = await db.lead.findMany({
      where: { orgId: org.id },
      orderBy: { leadScore: 'desc' },
    });

    // === Score Distribution ===
    const scoreRanges = [
      { label: '0-20', min: 0, max: 20, count: 0 },
      { label: '21-40', min: 21, max: 40, count: 0 },
      { label: '41-60', min: 41, max: 60, count: 0 },
      { label: '61-80', min: 61, max: 80, count: 0 },
      { label: '81-100', min: 81, max: 100, count: 0 },
    ];
    for (const lead of leads) {
      const range = scoreRanges.find((r) => lead.leadScore >= r.min && lead.leadScore <= r.max);
      if (range) range.count++;
    }

    // === Pipeline Stage Distribution ===
    const pipelineMap = new Map<string, number>();
    for (const lead of leads) {
      const stage = lead.pipelineStage || 'New';
      pipelineMap.set(stage, (pipelineMap.get(stage) || 0) + 1);
    }
    const pipelineStages = Array.from(pipelineMap.entries()).map(([stage, count]) => ({ stage, count }));

    // === Industry Breakdown ===
    const industryMap = new Map<string, { count: number; totalScore: number; scores: number[] }>();
    for (const lead of leads) {
      const ind = lead.industry || 'Unknown';
      const existing = industryMap.get(ind);
      if (existing) {
        existing.count += 1;
        existing.totalScore += lead.leadScore;
        existing.scores.push(lead.leadScore);
      } else {
        industryMap.set(ind, { count: 1, totalScore: lead.leadScore, scores: [lead.leadScore] });
      }
    }
    const industryBreakdown = Array.from(industryMap.entries())
      .map(([industry, data]) => ({
        industry,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
        maxScore: Math.max(...data.scores),
      }))
      .sort((a, b) => b.count - a.count);

    // === Outreach Status ===
    const outreachMap = new Map<string, number>();
    for (const lead of leads) {
      const status = lead.outreachStatus || 'Not Contacted';
      outreachMap.set(status, (outreachMap.get(status) || 0) + 1);
    }
    const outreachStatus = Array.from(outreachMap.entries()).map(([status, count]) => ({ status, count }));

    // === KPIs ===
    const totalLeads = leads.length;
    const avgScore = totalLeads > 0 ? Math.round(leads.reduce((s, l) => s + l.leadScore, 0) / totalLeads) : 0;
    const highScoreLeads = leads.filter((l) => l.leadScore >= 70).length;
    const contactedLeads = leads.filter((l) => l.outreachStatus && l.outreachStatus !== 'Not Contacted').length;
    const favoriteLeads = leads.filter((l) => l.isFavorite).length;
    const scoredLeads = leads.filter((l) => l.leadScore > 0).length;
    const avgEmployeeCount = totalLeads > 0
      ? Math.round(leads.filter((l) => l.employeeCount).reduce((s, l) => s + (l.employeeCount || 0), 0) / Math.max(1, leads.filter((l) => l.employeeCount).length))
      : 0;
    const topIndustry = industryBreakdown.length > 0 ? industryBreakdown[0] : null;

    // === Score by Company Size ===
    const sizeBuckets = new Map<string, { count: number; totalScore: number }>();
    for (const lead of leads) {
      let bucket: string;
      const ec = lead.employeeCount || 0;
      if (ec === 0) bucket = 'Unknown';
      else if (ec <= 10) bucket = '1-10';
      else if (ec <= 50) bucket = '11-50';
      else if (ec <= 200) bucket = '51-200';
      else if (ec <= 500) bucket = '201-500';
      else bucket = '500+';
      const existing = sizeBuckets.get(bucket);
      if (existing) { existing.count += 1; existing.totalScore += lead.leadScore; }
      else { sizeBuckets.set(bucket, { count: 1, totalScore: lead.leadScore }); }
    }
    const scoreBySize = Array.from(sizeBuckets.entries())
      .map(([size, data]) => ({ size, count: data.count, avgScore: Math.round(data.totalScore / data.count) }))
      .sort((a, b) => { const order = ['1-10', '11-50', '51-200', '201-500', '500+', 'Unknown']; return order.indexOf(a.size) - order.indexOf(b.size); });

    // === Monthly Trend ===
    const monthlyMap = new Map<string, number>();
    for (const lead of leads) {
      const key = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    }
    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      kpis: {
        totalLeads, avgScore, highScoreLeads, contactedLeads,
        contactRate: totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0,
        favoriteLeads, scoredLeads, avgEmployeeCount, topIndustry,
      },
      scoreDistribution: scoreRanges,
      pipelineStages,
      industryBreakdown,
      outreachStatus,
      scoreBySize,
      monthlyTrend,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}