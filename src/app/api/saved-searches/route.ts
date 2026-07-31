import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/session';

// GET /api/saved-searches — list saved searches for the current org
export async function GET() {
  try {
    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searches = await db.savedSearch.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(searches);
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 });
  }
}

// POST /api/saved-searches — create a saved search
export async function POST(request: NextRequest) {
  try {
    const org = await resolveOrg();
    if (!org) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, params } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!params || typeof params !== 'object') {
      return NextResponse.json({ error: 'Params are required' }, { status: 400 });
    }

    const search = await db.savedSearch.create({
      data: {
        orgId: org.id,
        name: name.trim(),
        params: JSON.stringify(params),
      },
    });

    return NextResponse.json(search, { status: 201 });
  } catch (error) {
    console.error('Error creating saved search:', error);
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 });
  }
}
