import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkLimit, trackUsage } from '@/lib/usage';
import { PLANS } from '@/lib/plans';
import { resolveOrg } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();

    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const planConfig = PLANS[org.plan as keyof typeof PLANS];

    // Enforce JSON export gating server-side (Free plan has no JSON export)
    if (format === 'json' && !planConfig?.features.exportJson) {
      return NextResponse.json(
        { error: 'JSON export requires a paid plan. Upgrade to export as JSON.' },
        { status: 403 }
      );
    }

    // Enforce per-plan export limit
    const limit = await checkLimit(org.id, 'export');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Monthly export limit reached. Upgrade your plan for more exports.' },
        { status: 403 }
      );
    }

    const leads = await db.lead.findMany({
      where: { orgId: org.id },
      orderBy: { leadScore: 'desc' },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    const industry = searchParams.get('industry');
    const filteredLeads = industry ? leads.filter((l) => l.industry === industry) : leads;

    if (format === 'json') {
      await trackUsage(org.id, 'system', 'export', `Exported ${filteredLeads.length} leads as JSON`);
      return new NextResponse(JSON.stringify(filteredLeads, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    const headers = [
      'Company Name', 'Industry', 'Website', 'Email', 'Phone', 'City', 'State',
      'Country', 'Postal Code', 'Employee Count', 'Estimated Revenue',
      'Google Rating', 'Review Count', 'Years in Business', 'Business Category',
      'Decision Maker', 'Decision Maker Title', 'Lead Score', 'Digital Maturity',
      'Growth Potential', 'Operational Complexity', 'Data Volume Indicators',
      'Marketing Sophistication', 'Confidence Score', 'Urgency Score',
      'Estimated Project Value', 'Pipeline Stage', 'Outreach Status',
      'Is Favorite', 'Tags', 'Created At', 'Updated At',
      'Notes Count', 'Activities Count',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredLeads.map((lead) => [
      lead.companyName, lead.industry, lead.website || '', lead.email || '',
      lead.phone || '', lead.city || '', lead.state || '', lead.country || '',
      lead.postalCode || '', lead.employeeCount || '', lead.estimatedRevenue || '',
      lead.googleRating || '', lead.reviewCount || '', lead.yearsInBusiness || '',
      lead.businessCategory || '', lead.decisionMaker || '', lead.decisionMakerTitle || '',
      lead.leadScore, lead.digitalMaturity || '', lead.growthPotential || '',
      lead.operationalComplexity || '', lead.dataVolumeIndicators || '',
      lead.marketingSophistication || '', lead.confidenceScore || '',
      lead.urgencyScore || '', lead.estimatedProjectValue || '',
      lead.pipelineStage, lead.outreachStatus, lead.isFavorite, lead.tags || '',
      lead.createdAt.toISOString(), lead.updatedAt.toISOString(),
      lead.notes.length, lead.activities.length,
    ].map(escapeCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting leads:', error);
    return NextResponse.json({ error: 'Failed to export leads' }, { status: 500 });
  }
}
