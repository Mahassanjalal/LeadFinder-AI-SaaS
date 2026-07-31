import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { PLANS, type PlanKey } from '@/lib/plans';
import { getSessionOrg } from '@/lib/session';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Price IDs per plan (set in Stripe dashboard). Keyed by plan.
// For per-seat plans this is the unit price; quantity is set from current member count.
const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.' },
        { status: 503 }
      );
    }

    const sessionOrg = await getSessionOrg();
    if (!sessionOrg) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as PlanKey;
    if (!plan || !PLANS[plan] || plan === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured for this plan.' },
        { status: 503 }
      );
    }

    const org = await db.organization.findUnique({ where: { id: sessionOrg.orgId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const memberCount = await db.membership.count({ where: { orgId: org.id } });
    const quantity = Math.max(1, memberCount);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: sessionOrg.email || org.billingEmail || undefined,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      client_reference_id: org.id,
      metadata: { orgId: org.id, plan },
      success_url: `${new URL(request.url).origin}/settings?tab=billing&status=success`,
      cancel_url: `${new URL(request.url).origin}/settings?tab=billing&status=canceled`,
      subscription_data: {
        metadata: { orgId: org.id, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 });
  }
}
