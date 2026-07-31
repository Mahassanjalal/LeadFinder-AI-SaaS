import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/session';

// DELETE /api/saved-searches/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only delete if it belongs to the current org
    const search = await db.savedSearch.findFirst({ where: { id, orgId: org.id } });
    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    await db.savedSearch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 });
  }
}
