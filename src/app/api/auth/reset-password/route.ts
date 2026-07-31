import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// POST /api/auth/reset-password — verify token and update password
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const record = await db.verificationToken.findUnique({ where: { token } });
    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }
    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: record.identifier } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
