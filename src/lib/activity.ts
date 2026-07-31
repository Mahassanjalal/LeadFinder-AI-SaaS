import { db } from '@/lib/db';

export async function logActivity(
  leadId: string,
  type: string,
  title: string,
  description?: string | null,
  userId?: string | null
): Promise<void> {
  try {
    await db.activity.create({
      data: { leadId, type, title, description: description ?? null, userId: userId ?? null },
    });
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
}
