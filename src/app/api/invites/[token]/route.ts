import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: validate an invite token and return org/role info (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await db.invite.findUnique({
      where: { token },
      include: { organization: { select: { name: true } } },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      orgName: invite.organization.name,
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    return NextResponse.json({ error: 'Failed to load invite' }, { status: 500 });
  }
}

// POST: accept an invite — creates/updates the user and membership
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { name, password } = body;

    const invite = await db.invite.findUnique({ where: { token } });
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    // Find or create the user by invite email
    let user = await db.user.findUnique({ where: { email: invite.email } });
    if (!user) {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await db.user.create({
        data: {
          name: name || invite.email.split('@')[0],
          email: invite.email,
          password: hashedPassword,
        },
      });
    }

    // Create membership if not already a member
    const existing = await db.membership.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
    });
    if (!existing) {
      await db.membership.create({
        data: { userId: user.id, orgId: invite.orgId, role: invite.role, invitedBy: invite.invitedBy },
      });
    }

    // Mark invite accepted
    await db.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({ success: true, email: user.email });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
