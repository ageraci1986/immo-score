import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'advanced', 'user_basic', 'viewer']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const data: Record<string, string> = {};
    if (validation.data.name !== undefined) data['name'] = validation.data.name;
    if (validation.data.email !== undefined) data['email'] = validation.data.email;
    if (validation.data.role !== undefined) data['role'] = validation.data.role;

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const admin = await requireAdmin();

    // Prevent self-deletion
    if (admin.id === params.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    // Get supabaseId before deleting from Prisma
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { supabaseId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Delete from Prisma (cascade will remove shares, etc.)
    await prisma.user.delete({ where: { id: params.id } });

    // Delete from Supabase auth
    const supabase = createAdminClient();
    await supabase.auth.admin.deleteUser(user.supabaseId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
