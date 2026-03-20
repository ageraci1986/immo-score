import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { prisma } from '@/lib/db/client';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
    });

    return NextResponse.json({ data: dbUser });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
