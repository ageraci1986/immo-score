import { Resend } from 'resend';
import { prisma } from '@/lib/db/client';

const resend = new Resend(process.env['RESEND_API_KEY']);

interface SendAlertParams {
  readonly to: string;
  readonly projectName: string;
  readonly projectId: string;
  readonly qualifiedListings: ReadonlyArray<{
    readonly listingId: string;
    readonly propertyId: string;
  }>;
  readonly batchInfo?: {
    readonly current: number;
    readonly total: number;
  };
}

/**
 * Formats a number with FR locale (space as thousands separator)
 */
function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

/**
 * Sends a grouped email alert for new listings.
 * AI summaries and PDF attachments are optional — email is sent even if they fail.
 */
export async function sendNewListingAlert({
  to,
  projectName,
  projectId,
  qualifiedListings,
  batchInfo,
}: SendAlertParams): Promise<void> {
  if (qualifiedListings.length === 0) return;

  console.log(`[Email] Starting email preparation for ${qualifiedListings.length} listings`);

  // Use onboarding@resend.dev for testing until a custom domain is verified in Resend
  const envFrom = process.env['RESEND_FROM_EMAIL'] || '';
  const fromEmail = envFrom.endsWith('@gmail.com') || !envFrom
    ? 'onboarding@resend.dev'
    : envFrom;
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://immo-score.com';

  // Fetch property details for each qualified listing
  console.log('[Email] Fetching property details...');
  const properties = await Promise.all(
    qualifiedListings.map(async (ql) => {
      const property = await prisma.property.findUnique({
        where: { id: ql.propertyId },
        select: {
          id: true,
          title: true,
          price: true,
          location: true,
          surface: true,
          bedrooms: true,
          peb: true,
          aiScore: true,
          aiAnalysis: true,
          aiEstimations: true,
          rentabilityData: true,
          photos: true,
          sourceUrl: true,
        },
      });
      return property;
    })
  );

  const validProperties = properties.filter(
    (p): p is NonNullable<typeof p> => p !== null
  );

  console.log(`[Email] Found ${validProperties.length} valid properties`);

  if (validProperties.length === 0) {
    console.warn('[Email] No valid properties found, skipping email');
    return;
  }

  // Generate AI summaries — optional, don't block email if this fails
  const summaries = new Map<string, string>();
  try {
    const { generateEmailSummary } = await import('@/lib/ai/claude-client');
    console.log('[Email] Generating AI summaries...');
    await Promise.all(
      validProperties.map(async (property) => {
        try {
          const analysis = property.aiAnalysis as { pros?: string[]; cons?: string[] } | null;
          const rentability = property.rentabilityData as { netYield?: number; monthlyCashFlow?: number } | null;
          const estimations = property.aiEstimations as { estimatedWorkCost?: number } | null;

          const summary = await generateEmailSummary({
            title: property.title ?? undefined,
            location: property.location ?? undefined,
            price: property.price ?? undefined,
            surface: property.surface ?? undefined,
            bedrooms: property.bedrooms ?? undefined,
            peb: property.peb ?? undefined,
            aiScore: property.aiScore ?? undefined,
            aiAnalysis: analysis ?? undefined,
            rentabilityData: rentability ?? undefined,
            aiEstimations: estimations ?? undefined,
          });

          if (summary) {
            summaries.set(property.id, summary);
          }
        } catch (summaryError) {
          console.warn(`[Email] AI summary failed for property ${property.id}, continuing without:`, summaryError);
        }
      })
    );
    console.log(`[Email] Generated ${summaries.size} AI summaries`);
  } catch (summaryImportError) {
    console.warn('[Email] Failed to import/generate AI summaries, continuing without:', summaryImportError);
  }

  // Generate PDF attachments — optional, don't block email if this fails
  const attachments: Array<{
    filename: string;
    content: Buffer;
  }> = [];

  try {
    const { generatePropertyReportBuffer } = await import('@/lib/pdf/generate-report');
    console.log('[Email] Generating PDF reports...');
    for (const property of validProperties) {
      try {
        const pdfBuffer = generatePropertyReportBuffer(property as unknown as Parameters<typeof generatePropertyReportBuffer>[0]);
        if (pdfBuffer) {
          const slug = (property.location || property.title || 'bien')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 30);
          attachments.push({
            filename: `analyse-${slug}-${property.price || 0}€.pdf`,
            content: pdfBuffer,
          });
        }
      } catch (pdfError) {
        console.warn(`[Email] PDF generation failed for property ${property.id}, continuing without:`, pdfError);
      }
    }
    console.log(`[Email] Generated ${attachments.length} PDF attachments`);
  } catch (pdfImportError) {
    console.warn('[Email] Failed to import PDF generator, continuing without attachments:', pdfImportError);
  }

  // Build HTML email — property cards
  const listingsHtml = validProperties
    .map((property) => {
      const score = property.aiScore ? Math.round(property.aiScore) : null;
      const scoreDisplay = score !== null ? `${score}` : '—';

      let scoreColor = '#6b7280';
      let scoreBg = '#f3f4f6';
      if (score !== null) {
        if (score >= 70) { scoreColor = '#10B981'; scoreBg = '#ecfdf5'; }
        else if (score >= 50) { scoreColor = '#F59E0B'; scoreBg = '#fffbeb'; }
        else { scoreColor = '#EF4444'; scoreBg = '#fef2f2'; }
      }

      const thumbnail =
        (property.photos as Array<{ url: string; publicUrl?: string }> | null)?.[0]?.publicUrl
        || (property.photos as Array<{ url: string }> | null)?.[0]?.url
        || '';

      const aiSummary = summaries.get(property.id) || '';
      const rentability = property.rentabilityData as {
        netYield?: number;
        grossYield?: number;
        monthlyCashFlow?: number;
        totalInvestment?: number;
      } | null;
      const estimations = property.aiEstimations as { estimatedWorkCost?: number; estimatedMonthlyRent?: number } | null;

      const netYield = rentability?.netYield;
      const cashFlow = rentability?.monthlyCashFlow;
      const workCost = estimations?.estimatedWorkCost;
      const monthlyRent = estimations?.estimatedMonthlyRent;

      const cashFlowColor = cashFlow !== undefined && cashFlow !== null
        ? cashFlow >= 0 ? '#10B981' : '#EF4444'
        : '#6b7280';

      const pebColors: Record<string, string> = {
        A: '#10B981', 'A+': '#10B981', 'A++': '#10B981',
        B: '#10B981', C: '#84cc16', D: '#F59E0B',
        E: '#f97316', F: '#EF4444', G: '#EF4444',
      };
      const pebColor = property.peb ? pebColors[property.peb.toUpperCase()] || '#6b7280' : '#6b7280';

      return `
        <!-- Property Card -->
        <tr>
          <td style="padding: 0 20px 20px 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">

              <!-- Image + Score overlay -->
              ${thumbnail ? `
              <tr>
                <td style="position: relative;">
                  <img src="${thumbnail}" width="100%" height="200" style="display: block; object-fit: cover; border-radius: 12px 12px 0 0;" alt="${property.title || ''}" />
                </td>
              </tr>
              ` : ''}

              <!-- Content -->
              <tr>
                <td style="padding: 20px;">

                  <!-- Title + Location row -->
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td>
                        <div style="font-size: 18px; font-weight: 700; color: #1e293b; line-height: 1.3;">
                          ${property.title || 'Bien immobilier'}
                        </div>
                        <div style="font-size: 14px; color: #64748b; margin-top: 4px;">
                          ${property.location || ''}${property.surface ? ` · ${property.surface} m²` : ''}${property.bedrooms ? ` · ${property.bedrooms} ch.` : ''}${property.peb ? ` · PEB <span style="font-weight:600;color:${pebColor};">${property.peb}</span>` : ''}
                        </div>
                      </td>
                      <td width="70" style="vertical-align: top; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: ${scoreBg}; border: 3px solid ${scoreColor}; display: inline-block; text-align: center; line-height: 54px;">
                          <span style="font-size: 20px; font-weight: 800; color: ${scoreColor};">${scoreDisplay}</span>
                        </div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 2px; text-align: center;">Score</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Price -->
                  <div style="margin-top: 12px; font-size: 24px; font-weight: 800; color: #064E3B;">
                    ${property.price ? formatNumber(property.price) + ' €' : 'Prix non disponible'}
                  </div>

                  <!-- KPI Cards Row -->
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                    <tr>
                      <!-- Rendement net -->
                      <td width="33%" style="padding-right: 6px;">
                        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; text-align: center;">
                          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Rendement net</div>
                          <div style="font-size: 20px; font-weight: 800; color: #10B981; margin-top: 2px;">
                            ${netYield !== undefined && netYield !== null ? netYield.toFixed(1) + '%' : '—'}
                          </div>
                        </div>
                      </td>
                      <!-- Cash flow -->
                      <td width="33%" style="padding: 0 3px;">
                        <div style="background: ${cashFlow !== undefined && cashFlow !== null && cashFlow >= 0 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${cashFlow !== undefined && cashFlow !== null && cashFlow >= 0 ? '#a7f3d0' : '#fecaca'}; border-radius: 8px; padding: 10px; text-align: center;">
                          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Cash flow</div>
                          <div style="font-size: 20px; font-weight: 800; color: ${cashFlowColor}; margin-top: 2px;">
                            ${cashFlow !== undefined && cashFlow !== null ? (cashFlow >= 0 ? '+' : '') + formatNumber(Math.round(cashFlow)) + '€' : '—'}
                          </div>
                          <div style="font-size: 10px; color: #9ca3af;">/mois</div>
                        </div>
                      </td>
                      <!-- Travaux -->
                      <td width="33%" style="padding-left: 6px;">
                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; text-align: center;">
                          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Travaux</div>
                          <div style="font-size: 20px; font-weight: 800; color: #F59E0B; margin-top: 2px;">
                            ${workCost !== undefined && workCost !== null ? formatNumber(Math.round(workCost)) + '€' : '—'}
                          </div>
                          ${monthlyRent ? `<div style="font-size: 10px; color: #9ca3af;">Loyer: ${formatNumber(monthlyRent)}€/m</div>` : ''}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- AI Summary -->
                  ${aiSummary ? `
                  <div style="margin-top: 16px; padding: 14px 16px; background: #eef2ff; border-left: 4px solid #6366f1; border-radius: 0 8px 8px 0;">
                    <div style="font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Analyse AI</div>
                    <div style="font-size: 13px; color: #1e293b; line-height: 1.6;">${aiSummary}</div>
                  </div>
                  ` : ''}

                  <!-- CTA Buttons -->
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                    <tr>
                      <td>
                        <a href="${appUrl}/properties/${property.id}" style="display: inline-block; padding: 10px 20px; background: #064E3B; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                          Voir l'analyse complète
                        </a>
                      </td>
                      ${property.sourceUrl ? `
                      <td style="text-align: right;">
                        <a href="${property.sourceUrl}" style="display: inline-block; padding: 10px 20px; background: white; color: #064E3B; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; border: 1px solid #064E3B;">
                          Voir sur Immoweb
                        </a>
                      </td>
                      ` : ''}
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join('');

  const count = validProperties.length;

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #f1f5f9; -webkit-font-smoothing: antialiased;">

      <!-- Wrapper -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f1f5f9;">
        <tr>
          <td align="center" style="padding: 20px 0;">

            <!-- Main Container -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background: #f1f5f9;">

              <!-- Header -->
              <tr>
                <td style="padding: 0 20px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #064E3B; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 28px 24px;">
                        <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Immo-Score</div>
                        <div style="font-size: 14px; color: #a7f3d0; margin-top: 6px;">
                          Alerte veille immobilière
                        </div>
                        <div style="margin-top: 16px; padding: 10px 16px; background: #10B981; border-radius: 8px; display: inline-block;">
                          <span style="font-size: 28px; font-weight: 800; color: #ffffff;">${count}</span>
                          <span style="font-size: 14px; color: #ffffff; margin-left: 8px;">
                            nouvelle${count > 1 ? 's' : ''} annonce${count > 1 ? 's' : ''} · ${projectName}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Intro text -->
              <tr>
                <td style="padding: 16px 20px 4px 20px;">
                  <div style="font-size: 14px; color: #64748b; line-height: 1.5;">
                    ${count > 1 ? 'Voici les nouvelles annonces détectées et analysées' : 'Voici la nouvelle annonce détectée et analysée'} pour votre projet de veille.
                    ${attachments.length > 0 ? 'Les rapports PDF détaillés sont joints à cet email.' : ''}
                  </div>
                </td>
              </tr>

              <!-- Property Cards -->
              ${listingsHtml}

              <!-- Footer -->
              <tr>
                <td style="padding: 8px 20px 30px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
                    <tr>
                      <td style="padding: 16px 20px; text-align: center;">
                        <a href="${appUrl}/search-projects/${projectId}" style="color: #064E3B; text-decoration: none; font-size: 14px; font-weight: 600;">
                          Voir le projet complet →
                        </a>
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
                          Envoyé automatiquement par Immo-Score ·
                          <a href="${appUrl}/search-projects/${projectId}" style="color: #94a3b8;">Gérer les notifications</a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

  const batchSuffix = batchInfo ? ` (${batchInfo.current}/${batchInfo.total})` : '';
  const subject =
    validProperties.length === 1
      ? `📊 [${projectName}] Nouvelle annonce : ${validProperties[0]!.title || 'Bien immobilier'} (score ${validProperties[0]!.aiScore ? Math.round(validProperties[0]!.aiScore) : '?'}/100)${batchSuffix}`
      : `📊 [${projectName}] ${validProperties.length} nouvelles annonces${batchSuffix}`;

  // Support comma-separated email addresses
  const recipients = to
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  console.log(`[Email] Sending via Resend: from=${fromEmail}, to=${recipients.join(', ')}, subject="${subject}", attachments=${attachments.length}`);

  const result = await resend.emails.send({
    from: `Immo-Score <${fromEmail}>`,
    to: recipients,
    subject,
    html,
    attachments: attachments.length > 0
      ? attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
        }))
      : undefined,
  });

  console.log(`[Email] Resend API response:`, JSON.stringify(result));
  console.log(`[Email] Alert sent to ${recipients.join(', ')} for project "${projectName}" (${validProperties.length} listings)`);
}
