import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { addPropertiesSchema } from '@/lib/validation/schemas';
import { getAuthUser } from '@/lib/supabase/auth';
import type { PropertyStatus } from '@/types';

/**
 * GET /api/properties
 * Récupère toutes les propriétés de l'utilisateur authentifié
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PropertyStatus | null;

    const properties = await prisma.property.findMany({
      where: {
        userId: user.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Failed to fetch properties:', error);

    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Ajoute une ou plusieurs propriétés à analyser
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = addPropertiesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { urls, customParams } = validation.data;

    const properties = await Promise.all(
      urls.map(async (url) => {
        const property = await prisma.property.create({
          data: {
            userId: user.id,
            sourceUrl: url,
            status: 'PENDING',
            customParams: customParams ? JSON.parse(JSON.stringify(customParams)) : undefined,
          },
        });

        await prisma.scrapingJob.create({
          data: {
            propertyId: property.id,
            url,
            status: 'PENDING',
          },
        });

        return property;
      })
    );

    // Trigger scraping in the background (don't wait)
    fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/scraping/process`, {
      method: 'POST',
    }).catch((err) => {
      console.error('Failed to trigger scraping:', err);
    });

    return NextResponse.json(
      {
        properties,
        message: `${properties.length} propriété(s) ajoutée(s)`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create properties:', error);

    return NextResponse.json(
      { error: 'Failed to create properties' },
      { status: 500 }
    );
  }
}
