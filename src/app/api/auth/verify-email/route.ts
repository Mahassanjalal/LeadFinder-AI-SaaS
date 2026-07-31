import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/verify-email?token=<token>
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const record = await db.verificationToken.findUnique({ where: { token } });
    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }
    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: 'Verification link has expired. Please register again.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: record.identifier } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({ where: { token } });

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/?verified=true', request.url));
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}
