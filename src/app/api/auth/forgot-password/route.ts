import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// POST /api/auth/forgot-password — generate a reset token and return the link (dev mode)
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been generated.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store in VerificationToken (delete existing ones for this identifier first)
    await db.verificationToken.deleteMany({ where: { identifier: user.email } });
    await db.verificationToken.create({
      data: { identifier: user.email, token, expires },
    });

    const resetLink = `${new URL(request.url).origin}/auth/reset-password?token=${token}`;

    // In dev, return the link. In production this would be sent via email.
    return NextResponse.json({
      success: true,
      message: 'If that email exists, a reset link has been generated.',
      // Only include in dev / non-production
      ...(process.env.NODE_ENV !== 'production' ? { resetLink } : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
