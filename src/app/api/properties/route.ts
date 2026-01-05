import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { addPropertiesSchema } from '@/lib/validation/schemas';
// import { logInfo, logError } from '@/lib/logger';
// import { captureException } from '@/lib/monitoring';
import type { PropertyStatus } from '@/types';

/**
 * GET /api/properties
 * Récupère toutes les propriétés de l'utilisateur
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Pour l'instant, pas d'authentification (à implémenter avec Clerk)
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PropertyStatus | null;

    const properties = await prisma.property.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    console.log('Properties fetched:', properties.length);

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
    // Pour l'instant, pas d'authentification
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

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

    // Créer les propriétés avec un userId fictif pour le développement
    const userId = 'dev-user-1';

    const properties = await Promise.all(
      urls.map(async (url) => {
        const property = await prisma.property.create({
          data: {
            userId,
            sourceUrl: url,
            status: 'PENDING',
            customParams: customParams as Record<string, unknown> | undefined,
          },
        });

        // Créer un job de scraping
        await prisma.scrapingJob.create({
          data: {
            propertyId: property.id,
            url,
            status: 'PENDING',
          },
        });

        console.log('Property created:', property.id, url);

        return property;
      })
    );

    // Trigger scraping in the background (don't wait)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scraping/process`, {
      method: 'POST',
    }).catch((error) => {
      console.error('Failed to trigger scraping:', error);
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
