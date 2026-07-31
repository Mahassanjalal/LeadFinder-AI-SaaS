import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, orgName } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    const slug = (orgName || `${normalizedEmail.split('@')[0]}-team`).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const org = await db.organization.create({
      data: {
        name: orgName || `${user.name}'s Organization`,
        slug: uniqueSlug,
        ownerId: user.id,
        billingEmail: normalizedEmail,
        plan: 'free',
      },
    });

    await db.membership.create({
      data: { userId: user.id, orgId: org.id, role: 'owner' },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);

    await db.subscription.create({
      data: {
        orgId: org.id,
        plan: 'free',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        creditsPerMonth: 50,
        creditsUsed: 0,
        maxMembers: 1,
        pricePerMonth: 0,
      },
    });

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.verificationToken.create({
      data: { identifier: normalizedEmail, token: verifyToken, expires: verifyExpires },
    });

    const verifyLink = `${new URL(request.url).origin}/api/auth/verify-email?token=${verifyToken}`;

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      organization: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
      // Only include in dev
      ...(process.env.NODE_ENV !== 'production' ? { verifyLink } : {}),
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
