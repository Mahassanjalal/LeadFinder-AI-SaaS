// Whitelist of Lead fields that API clients are allowed to write.
// Previously routes passed `request.json()` straight into Prisma, which allowed
// mass assignment of tenant/identity fields (orgId, id, createdBy, timestamps).

import type { Prisma } from '@prisma/client';

export const LEAD_WRITABLE_FIELDS = [
  // Identity / core
  'companyName',
  'industry',
  'website',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'phone',
  'email',
  'linkedinUrl',
  'companySize',
  'estimatedRevenue',
  'employeeCount',
  'googleRating',
  'reviewCount',
  'yearsInBusiness',
  'businessCategory',
  'decisionMaker',
  'decisionMakerTitle',
  'latitude',
  'longitude',
  // AI fields
  'leadScore',
  'digitalMaturity',
  'growthPotential',
  'operationalComplexity',
  'dataVolumeIndicators',
  'marketingSophistication',
  'confidenceScore',
  'urgencyScore',
  'estimatedProjectValue',
  'businessSummary',
  'painPoints',
  'analyticsOpportunities',
  'recommendedServices',
  'potentialROI',
  'outreachRecommendations',
  'aiInsights',
  'aiExplanations',
  // CRM fields
  'pipelineStage',
  'isFavorite',
  'outreachStatus',
  'tags',
  'assignedTo',
] as const;

export type LeadWritableField = (typeof LEAD_WRITABLE_FIELDS)[number];

const INT_FIELDS = new Set<LeadWritableField>([
  'employeeCount',
  'reviewCount',
  'yearsInBusiness',
  'leadScore',
  'digitalMaturity',
  'growthPotential',
  'operationalComplexity',
  'dataVolumeIndicators',
  'marketingSophistication',
  'urgencyScore',
]);

const FLOAT_FIELDS = new Set<LeadWritableField>([
  'googleRating',
  'confidenceScore',
  'latitude',
  'longitude',
]);

const BOOL_FIELDS = new Set<LeadWritableField>(['isFavorite']);

function coerce(field: LeadWritableField, value: unknown): unknown {
  if (value === null) return null;

  if (BOOL_FIELDS.has(field)) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return undefined;
  }

  if (INT_FIELDS.has(field)) {
    const n = typeof value === 'number' ? Math.trunc(value) : parseInt(String(value), 10);
    return Number.isFinite(n) ? n : undefined;
  }

  if (FLOAT_FIELDS.has(field)) {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
}

/**
 * Copies only whitelisted lead fields from an untrusted request body, coercing
 * numeric/boolean strings to their schema types. Unknown keys (orgId, id,
 * createdBy, createdAt, relation objects, ...) are dropped, and values that
 * cannot be coerced are skipped instead of throwing inside Prisma.
 */
export function pickLeadFields(body: unknown): Prisma.LeadUncheckedCreateInput {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out as Prisma.LeadUncheckedCreateInput;

  const source = body as Record<string, unknown>;
  for (const field of LEAD_WRITABLE_FIELDS) {
    if (source[field] === undefined) continue;
    const value = coerce(field, source[field]);
    if (value !== undefined) out[field] = value;
  }
  return out as Prisma.LeadUncheckedCreateInput;
}
