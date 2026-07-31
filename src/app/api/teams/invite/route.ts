import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const VALID_ROLES = ['owner', 'admin', 'analyst', 'viewer'];

// POST: create an invite for the demo organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string) || '';
    const role = (body.role as string) || 'analyst';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await db.invite.create({
      data: {
        orgId: org.id,
        email,
        role,
        token,
        invitedBy: org.ownerId,
        expiresAt,
      },
    });

    const inviteLink = `${new URL(request.url).origin}/invite/${invite.token}`;

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      inviteLink,
      expiresAt: invite.expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
