import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/db/client';
import { sendInvitationEmail } from '@/lib/email/resend';
import type { UserRole } from '@/lib/permissions';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'advanced', 'user_basic', 'viewer']),
});

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: users });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.errors }, { status: 400 });
    }

    const { email, name, role } = validation.data;
    const supabase = createAdminClient();
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://immo-score-flame.vercel.app';

    // 1. Create user in Supabase without sending their default email
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 2. Generate a magic link for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    // 3. Create the Prisma user with the correct role
    await prisma.user.upsert({
      where: { email },
      update: { name, role, supabaseId: userData.user.id },
      create: {
        supabaseId: userData.user.id,
        email,
        name,
        role,
      },
    });

    // 4. Send styled invitation email via Resend
    const inviteLink = linkData.properties?.action_link || `${appUrl}/login`;
    await sendInvitationEmail({
      to: email,
      name,
      role: role as UserRole,
      inviteLink,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
