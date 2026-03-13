import { jsPDF } from 'jspdf';
import type { Property, RentabilityResultsExtended } from '@/types';

interface WorkBreakdownItem {
  readonly label: string;
  readonly value: number;
}

const WORK_BREAKDOWN_LABELS: Record<string, string> = {
  roofInsulation: 'Isolation toiture',
  facadeInsulation: 'Isolation façades',
  windowsReplacement: 'Remplacement châssis',
  heatingSystem: 'Système de chauffage',
  kitchen: 'Cuisine',
  bathroom: 'Salle de bain',
  flooring: 'Revêtements sol',
  painting: 'Peinture',
  electrical: 'Électricité',
  plumbing: 'Plomberie',
  other: 'Autres travaux',
  roof: 'Toiture',
  facade: 'Façade',
  interior: 'Travaux intérieurs',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR') + ' €';
}

function formatPercent(value: number): string {
  return value.toFixed(2) + ' %';
}

export function generatePropertyReport(property: Property): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Helper functions
  const addTitle = (text: string, size: number = 16): void => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(text, margin, yPosition);
    yPosition += size * 0.5;
  };

  const addSubtitle = (text: string): void => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(text, margin, yPosition);
    yPosition += 8;
  };

  const addText = (text: string, indent: number = 0): void => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, yPosition);
    yPosition += lines.length * 5;
  };

  const addKeyValue = (key: string, value: string, indent: number = 0): void => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(key + ':', margin + indent, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(value, margin + 80 + indent, yPosition);
    yPosition += 6;
  };

  const addSpacer = (height: number = 10): void => {
    yPosition += height;
  };

  const addLine = (): void => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
  };

  const checkPageBreak = (requiredHeight: number): void => {
    if (yPosition + requiredHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // === HEADER ===
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Rapport d\'Analyse Immobilière', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Généré par Immo-Score', margin, 30);

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(today, pageWidth - margin - doc.getTextWidth(today), 30);

  yPosition = 55;

  // === PROPERTY TITLE & INFO ===
  addTitle(property.title || 'Bien immobilier', 18);
  addSpacer(5);

  if (property.address || property.location) {
    addText(`📍 ${property.address || property.location}`);
  }
  addSpacer(10);

  // === SCORE SECTION ===
  if (property.aiScore) {
    doc.setFillColor(property.aiScore >= 70 ? 16 : property.aiScore >= 50 ? 234 : 239,
                     property.aiScore >= 70 ? 185 : property.aiScore >= 50 ? 179 : 68,
                     property.aiScore >= 70 ? 129 : property.aiScore >= 50 ? 8 : 68);
    doc.roundedRect(pageWidth - margin - 50, yPosition - 15, 50, 25, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Score: ${property.aiScore}`, pageWidth - margin - 45, yPosition);
  }

  addLine();
  addSpacer(5);

  // === MAIN CHARACTERISTICS ===
  checkPageBreak(60);
  addSubtitle('Caractéristiques principales');
  addSpacer(3);

  if (property.price) {
    addKeyValue('Prix demandé', formatCurrency(property.price));
  }
  if (property.surface) {
    addKeyValue('Surface habitable', `${property.surface} m²`);
    if (property.price) {
      addKeyValue('Prix au m²', formatCurrency(Math.round(property.price / property.surface)));
    }
  }
  if (property.bedrooms) {
    addKeyValue('Chambres', String(property.bedrooms));
  }
  if (property.bathrooms) {
    addKeyValue('Salles de bain', String(property.bathrooms));
  }
  if (property.peb) {
    addKeyValue('PEB', property.peb);
  }
  if (property.constructionYear) {
    addKeyValue('Année de construction', String(property.constructionYear));
  }
  if (property.facadeCount) {
    addKeyValue('Nombre de façades', String(property.facadeCount));
  }
  if (property.propertyType) {
    addKeyValue('Type de bien', property.propertyType);
  }

  addSpacer(10);
  addLine();

  // === AI ANALYSIS ===
  if (property.aiAnalysis) {
    checkPageBreak(80);
    addSubtitle('Analyse AI');
    addSpacer(3);

    if (property.aiAnalysis.narrative) {
      addText(property.aiAnalysis.narrative);
      addSpacer(8);
    }

    // Points forts
    if (property.aiAnalysis.pros && property.aiAnalysis.pros.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text('✓ Points Forts', margin, yPosition);
      yPosition += 6;

      property.aiAnalysis.pros.forEach((pro) => {
        checkPageBreak(8);
        addText(`• ${pro}`, 5);
      });
      addSpacer(5);
    }

    // Points de vigilance
    if (property.aiAnalysis.cons && property.aiAnalysis.cons.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12); // orange-600
      doc.text('⚠ Points de Vigilance', margin, yPosition);
      yPosition += 6;

      property.aiAnalysis.cons.forEach((con) => {
        checkPageBreak(8);
        addText(`• ${con}`, 5);
      });
      addSpacer(5);
    }

    // Key insights
    if (property.aiAnalysis.keyInsights && property.aiAnalysis.keyInsights.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text('💡 Insights Clés', margin, yPosition);
      yPosition += 6;

      property.aiAnalysis.keyInsights.forEach((insight) => {
        checkPageBreak(8);
        addText(`• ${insight}`, 5);
      });
    }

    addSpacer(10);
    addLine();
  }

  // === WORK ESTIMATE ===
  if (property.aiEstimations) {
    checkPageBreak(80);
    addSubtitle('Estimation des Travaux');
    addSpacer(3);

    addKeyValue('Coût total estimé', formatCurrency(property.aiEstimations.estimatedWorkCost));
    addSpacer(5);

    if (property.aiEstimations.workBreakdown) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Détail des travaux:', margin, yPosition);
      yPosition += 6;

      const breakdown = property.aiEstimations.workBreakdown;
      const items: WorkBreakdownItem[] = Object.entries(breakdown)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({
          label: WORK_BREAKDOWN_LABELS[key] || key,
          value: value as number,
        }));

      items.forEach((item) => {
        checkPageBreak(8);
        addKeyValue(item.label, formatCurrency(item.value), 5);
      });
    }

    if (property.aiEstimations.reasoning) {
      addSpacer(5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      const reasoningLines = doc.splitTextToSize(property.aiEstimations.reasoning, contentWidth - 10);
      doc.text(reasoningLines, margin + 5, yPosition);
      yPosition += reasoningLines.length * 4;
    }

    addSpacer(10);
    addLine();
  }

  // === RENTABILITY ANALYSIS ===
  const rentabilityData = property.rentabilityDataExtended || property.rentabilityData;

  if (rentabilityData) {
    checkPageBreak(100);
    addSubtitle('Analyse de Rentabilité');
    addSpacer(3);

    // Investment breakdown
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Investissement Total:', margin, yPosition);
    yPosition += 6;

    if (property.price) {
      addKeyValue('Prix d\'achat', formatCurrency(property.price), 5);
    }

    if ('breakdown' in rentabilityData && rentabilityData.breakdown) {
      const breakdown = rentabilityData.breakdown as RentabilityResultsExtended['breakdown'];
      if ('registrationFees' in breakdown) {
        addKeyValue('Droits d\'enregistrement', formatCurrency(breakdown.registrationFees), 5);
      }
      if ('notaryFees' in breakdown) {
        addKeyValue('Frais de notaire', formatCurrency(breakdown.notaryFees), 5);
      }
      if ('agencyFees' in breakdown && breakdown.agencyFees > 0) {
        addKeyValue('Frais d\'agence', formatCurrency(breakdown.agencyFees), 5);
      }
      if ('workCost' in breakdown) {
        addKeyValue('Travaux estimés', formatCurrency(breakdown.workCost), 5);
      }
    }

    addKeyValue('Total Investissement', formatCurrency(rentabilityData.totalInvestment), 5);
    addSpacer(8);

    // Rental income
    checkPageBreak(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Revenus Locatifs:', margin, yPosition);
    yPosition += 6;

    if ('monthlyRent' in rentabilityData) {
      addKeyValue('Loyer mensuel', formatCurrency(rentabilityData.monthlyRent as number), 5);
    }
    if ('annualGrossRent' in rentabilityData) {
      addKeyValue('Loyer annuel brut', formatCurrency(rentabilityData.annualGrossRent), 5);
    }
    if ('annualNetRent' in rentabilityData) {
      addKeyValue('Loyer annuel net', formatCurrency(rentabilityData.annualNetRent), 5);
    }
    if ('occupancyRate' in rentabilityData) {
      const occupancyRate = rentabilityData.occupancyRate as number;
      addKeyValue('Taux d\'occupation', formatPercent(occupancyRate), 5);
    }
    addSpacer(8);

    // Yields
    checkPageBreak(40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Rendements:', margin, yPosition);
    yPosition += 6;

    addKeyValue('Rendement brut', formatPercent(rentabilityData.grossYield), 5);
    addKeyValue('Rendement net', formatPercent(rentabilityData.netYield), 5);
    addSpacer(8);

    // Financing
    if ('financing' in rentabilityData && rentabilityData.financing) {
      checkPageBreak(50);
      const financing = rentabilityData.financing;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Financement:', margin, yPosition);
      yPosition += 6;

      addKeyValue('Apport personnel', formatCurrency(financing.downPayment), 5);
      addKeyValue('Montant emprunté', formatCurrency(financing.loanAmount), 5);
      addKeyValue('Mensualité', formatCurrency(financing.monthlyPayment), 5);
      addKeyValue('Ratio LTV', formatPercent(financing.ltvRatio), 5);
      addSpacer(8);
    }

    // Cash flow
    checkPageBreak(30);
    const cashFlowValue = 'monthlyCashFlow' in rentabilityData
      ? rentabilityData.monthlyCashFlow
      : ('cashFlow' in rentabilityData ? rentabilityData.cashFlow : 0);

    doc.setFillColor(cashFlowValue >= 0 ? 220 : 254,
                     cashFlowValue >= 0 ? 252 : 226,
                     cashFlowValue >= 0 ? 231 : 226);
    doc.roundedRect(margin, yPosition - 5, contentWidth, 20, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Cash Flow Mensuel:', margin + 5, yPosition + 5);

    const cashFlow = cashFlowValue;
    const cashFlowText = (cashFlow >= 0 ? '+' : '') + formatCurrency(Math.round(cashFlow));
    doc.setTextColor(cashFlow >= 0 ? 16 : 220, cashFlow >= 0 ? 185 : 38, cashFlow >= 0 ? 129 : 38);
    doc.text(cashFlowText, pageWidth - margin - doc.getTextWidth(cashFlowText) - 5, yPosition + 5);

    yPosition += 20;
    addSpacer(10);
    addLine();
  }

  // === PROPERTY CONDITION ===
  if (property.roofEstimate || property.facadeEstimate || property.interiorAnalysis) {
    checkPageBreak(80);
    addSubtitle('État du Bien');
    addSpacer(3);

    if (property.roofEstimate) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Toiture:', margin, yPosition);
      yPosition += 6;

      addKeyValue('État', property.roofEstimate.condition, 5);
      addKeyValue('Matériau', property.roofEstimate.material, 5);
      addKeyValue('Surface estimée', `${property.roofEstimate.estimatedSurface} m²`, 5);
      if (property.roofEstimate.estimatedAge) {
        addKeyValue('Âge estimé', `${property.roofEstimate.estimatedAge} ans`, 5);
      }
      if (property.roofEstimate.workNeeded && property.roofEstimate.workNeeded.length > 0) {
        addText(`Travaux: ${property.roofEstimate.workNeeded.join(', ')}`, 5);
      }
      addSpacer(5);
    }

    if (property.facadeEstimate) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Façades:', margin, yPosition);
      yPosition += 6;

      addKeyValue('État', property.facadeEstimate.condition, 5);
      addKeyValue('Nombre', String(property.facadeEstimate.count), 5);
      addKeyValue('Surface totale', `${property.facadeEstimate.totalSurface} m²`, 5);
      if (property.facadeEstimate.materials && property.facadeEstimate.materials.length > 0) {
        addKeyValue('Matériaux', property.facadeEstimate.materials.join(', '), 5);
      }
      if (property.facadeEstimate.workNeeded && property.facadeEstimate.workNeeded.length > 0) {
        addText(`Travaux: ${property.facadeEstimate.workNeeded.join(', ')}`, 5);
      }
      addSpacer(5);
    }

    if (property.interiorAnalysis) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Intérieur:', margin, yPosition);
      yPosition += 6;

      addKeyValue('État général', property.interiorAnalysis.overall, 5);
      addKeyValue('Sols', property.interiorAnalysis.flooring, 5);
      addKeyValue('Murs', property.interiorAnalysis.walls, 5);
      addKeyValue('Cuisine', property.interiorAnalysis.kitchen, 5);
      addKeyValue('Salle de bain', property.interiorAnalysis.bathrooms, 5);
    }
  }

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Généré par Immo-Score - Analyse AI pour investissement immobilier',
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `rapport-${property.title?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-') || property.id}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Generates a property report PDF and returns it as a Buffer (for email attachments).
 * Uses the same rendering logic as generatePropertyReport.
 */
export function generatePropertyReportBuffer(
  property: Pick<Property, 'id' | 'title' | 'price' | 'location' | 'surface' | 'bedrooms' | 'aiScore' | 'aiAnalysis' | 'photos'>
): Buffer | null {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Simplified PDF — header + key info + score
    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Immo-Score', margin, 25);
    doc.setFontSize(10);
    doc.text('Rapport d\'analyse immobilière', margin, 34);

    yPosition = 55;
    doc.setTextColor(0, 0, 0);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = property.title || 'Bien immobilier';
    doc.text(title, margin, yPosition);
    yPosition += 10;

    // Location & Price
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (property.location) {
      doc.text(property.location, margin, yPosition);
      yPosition += 7;
    }
    if (property.price) {
      doc.text(`Prix: ${property.price.toLocaleString('fr-FR')} €`, margin, yPosition);
      yPosition += 7;
    }
    if (property.surface) {
      doc.text(`Surface: ${property.surface} m²`, margin, yPosition);
      yPosition += 7;
    }

    // Score
    yPosition += 10;
    const score = property.aiScore ? Math.round(property.aiScore) : null;
    if (score !== null) {
      const scoreColor: [number, number, number] = score >= 70 ? [34, 197, 94] : score >= 50 ? [234, 179, 8] : [239, 68, 68];
      doc.setFillColor(...scoreColor);
      doc.roundedRect(margin, yPosition - 6, 80, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Score: ${score}/100`, margin + 10, yPosition + 7);
      doc.setTextColor(0, 0, 0);
      yPosition += 25;
    }

    // AI Analysis
    const analysis = property.aiAnalysis as {
      pros?: string[];
      cons?: string[];
      narrative?: string;
    } | null;

    if (analysis) {
      if (analysis.narrative) {
        yPosition += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(analysis.narrative, pageWidth - margin * 2);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * 5 + 10;
      }

      if (analysis.pros && analysis.pros.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Points forts', margin, yPosition);
        yPosition += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        for (const pro of analysis.pros.slice(0, 5)) {
          doc.text(`• ${pro}`, margin + 5, yPosition);
          yPosition += 6;
        }
        yPosition += 5;
      }

      if (analysis.cons && analysis.cons.length > 0) {
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Points faibles', margin, yPosition);
        yPosition += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        for (const con of analysis.cons.slice(0, 5)) {
          doc.text(`• ${con}`, margin + 5, yPosition);
          yPosition += 6;
        }
      }
    }

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(
      `Généré par Immo-Score le ${new Date().toLocaleDateString('fr-FR')}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[PDF] Failed to generate report buffer:', error);
    return null;
  }
}
