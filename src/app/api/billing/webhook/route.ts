import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { PLANS, type PlanKey } from '@/lib/plans';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return new NextResponse('Stripe not configured', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new NextResponse('Missing stripe-signature or webhook secret', { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id || session.metadata?.orgId;
        const plan = (session.metadata?.plan || '') as PlanKey;
        if (orgId && plan && PLANS[plan]) {
          await applyPlan(orgId, plan);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;
        const plan = subscription.metadata?.plan as PlanKey | undefined;
        if (orgId && plan && PLANS[plan]) {
          const status = subscription.status === 'active' ? 'active' : 'canceled';
          await db.subscription.updateMany({
            where: { orgId },
            data: { status },
          });
          if (status === 'canceled') {
            // Downgrade to free on cancellation
            await applyPlan(orgId, 'free');
          }
        }
        break;
      }
      default:
        break;
    }
    return new NextResponse('ok', { status: 200 });
  } catch (err) {
    console.error('Stripe webhook handling error:', err);
    return new NextResponse('Webhook handling error', { status: 500 });
  }
}

async function applyPlan(orgId: string, plan: PlanKey) {
  const planConfig = PLANS[plan];
  const now = new Date();
  const periodEnd = new Date(now);
  if (plan === 'free') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  await db.subscription.updateMany({
    where: { orgId, status: 'active' },
    data: { status: 'canceled' },
  });

  await db.subscription.create({
    data: {
      orgId,
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      creditsPerMonth: planConfig.creditsPerMonth,
      creditsUsed: 0,
      maxMembers: planConfig.maxMembers,
      pricePerMonth: planConfig.price * 100,
    },
  });

  await db.organization.update({
    where: { id: orgId },
    data: { plan },
  });
}
