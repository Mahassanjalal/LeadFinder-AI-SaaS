import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { deterministicScore } from '@/lib/scoring';

// Lightweight CSV parser that handles quoted fields, commas, and newlines.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field); field = '';
        if (current.some((c) => c.trim() !== '')) rows.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  current.push(field);
  if (current.some((c) => c.trim() !== '')) rows.push(current);
  return rows;
}

// Map CSV headers to Prisma field names
const HEADER_MAP: Record<string, string> = {
  'Company Name': 'companyName',
  Industry: 'industry',
  Website: 'website',
  Email: 'email',
  Phone: 'phone',
  City: 'city',
  State: 'state',
  Country: 'country',
  'Postal Code': 'postalCode',
  'Employee Count': 'employeeCount',
  'Estimated Revenue': 'estimatedRevenue',
  'Google Rating': 'googleRating',
  'Review Count': 'reviewCount',
  'Years in Business': 'yearsInBusiness',
  'Business Category': 'businessCategory',
  'Decision Maker': 'decisionMaker',
  'Decision Maker Title': 'decisionMakerTitle',
  'Lead Score': 'leadScore',
  'Digital Maturity': 'digitalMaturity',
  'Growth Potential': 'growthPotential',
  'Operational Complexity': 'operationalComplexity',
  'Data Volume Indicators': 'dataVolumeIndicators',
  'Marketing Sophistication': 'marketingSophistication',
  'Confidence Score': 'confidenceScore',
  'Urgency Score': 'urgencyScore',
  'Estimated Project Value': 'estimatedProjectValue',
  'Pipeline Stage': 'pipelineStage',
  'Outreach Status': 'outreachStatus',
  'Is Favorite': 'isFavorite',
  Tags: 'tags',
};

const INT_FIELDS = new Set([
  'employeeCount', 'reviewCount', 'yearsInBusiness',
  'leadScore', 'digitalMaturity', 'growthPotential',
  'operationalComplexity', 'dataVolumeIndicators',
  'marketingSophistication', 'urgencyScore',
]);
const FLOAT_FIELDS = new Set(['googleRating', 'confidenceScore']);

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('leads:write');
    if (!guard.ok) return guard.response;
    const { org, session } = guard.auth;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'Only CSV files are accepted' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.trim());
    const colMap = headers.map((h) => HEADER_MAP[h] || null);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const data: Record<string, unknown> = { orgId: org.id, createdBy: session.userId };

      for (let c = 0; c < colMap.length; c++) {
        const field = colMap[c];
        if (!field) continue;
        const raw = (row[c] ?? '').trim();
        if (!raw) continue;

        if (field === 'isFavorite') {
          data[field] = raw.toLowerCase() === 'true';
        } else if (INT_FIELDS.has(field)) {
          const n = parseInt(raw, 10);
          if (!isNaN(n)) data[field] = n;
        } else if (FLOAT_FIELDS.has(field)) {
          const n = parseFloat(raw);
          if (!isNaN(n)) data[field] = n;
        } else {
          data[field] = raw;
        }
      }

      // Require at least companyName
      if (!data.companyName) {
        errors.push(`Row ${i + 1}: missing Company Name`);
        continue;
      }

      // Set defaults for CRM fields if not in CSV
      if (!data.pipelineStage) data.pipelineStage = 'New';
      if (data.isFavorite === undefined) data.isFavorite = false;
      if (!data.outreachStatus) data.outreachStatus = 'Not Contacted';

      // If no score was provided, compute it deterministically
      if (data.leadScore == null) {
        const scores = deterministicScore(data);
        Object.assign(data, scores);
      }

      try {
        await db.lead.create({ data: data as any });
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${(err as Error).message || 'create failed'}`);
      }
    }

    return NextResponse.json({ imported, skipped: rows.length - 1 - imported, errors: errors.slice(0, 20) });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}
