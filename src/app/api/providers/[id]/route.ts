import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAuthUser } from '@/lib/supabase/auth';

/**
 * DELETE /api/providers/[id]
 * Deactivate a provider
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.aiProvider.update({
      where: { id: params.id },
      data: { isActive: false, apiKey: '' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    );
  }
}
