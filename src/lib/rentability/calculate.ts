import type {
  RentabilityParams,
  RentabilityResults,
  RentabilityParamsExtended,
  RentabilityResultsExtended,
  RentabilityBreakdownExtended,
  FinancingDetails,
  VisionAnalysis,
  Property,
} from '@/types';
import { ValidationError } from '@/lib/errors';
import { estimateWorkFromAI } from './work-estimation';

interface CalculateRentabilityInput {
  readonly property: Pick<Property, 'price' | 'surface'>;
  readonly params: RentabilityParams;
  readonly aiAnalysis: VisionAnalysis;
}

/**
 * Calculates comprehensive profitability metrics for a real estate property
 *
 * @param input - Property data, calculation parameters, and AI analysis
 * @returns Complete profitability analysis with yields, cash flow, and breakdowns
 * @throws {ValidationError} When property data is invalid
 */
export function calculateRentability(input: CalculateRentabilityInput): RentabilityResults {
  const { property, params, aiAnalysis } = input;

  // Validation
  if (!property.price || property.price <= 0) {
    throw new ValidationError('Invalid property price', { price: property.price });
  }

  if (!property.surface || property.surface <= 0) {
    throw new ValidationError('Invalid property surface', { surface: property.surface });
  }

  // 1. Calculate total investment
  const notaryFees = property.price * (params.notaryFeesPercent / 100);
  const agencyFees = property.price * (params.agencyFeesPercent / 100);

  const workCost = params.estimatedWorkCost || estimateWorkFromAI(aiAnalysis);
  const contingency = workCost * (params.contingencyPercent / 100);

  const totalInvestment = property.price + notaryFees + agencyFees + workCost + contingency;

  // 2. Calculate rental income
  const monthlyRent = params.monthlyRent || (property.surface * (params.rentPerSqm || 0));

  if (monthlyRent <= 0) {
    throw new ValidationError('Invalid monthly rent', {
      monthlyRent,
      surface: property.surface,
      rentPerSqm: params.rentPerSqm,
    });
  }

  const annualGrossRent = monthlyRent * 12;
  const annualNetRent = annualGrossRent * (1 - params.vacancyRate / 100);

  // 3. Calculate annual charges
  const maintenance = annualNetRent * (params.maintenancePercent / 100);
  const managementFees = annualNetRent * (params.managementFeesPercent / 100);

  const totalCharges =
    params.propertyTaxYearly + params.insuranceYearly + maintenance + managementFees;

  // 4. Calculate yields and cash flow
  const grossYield = (annualGrossRent / property.price) * 100;
  const netYield = ((annualNetRent - totalCharges) / totalInvestment) * 100;
  const monthlyCashFlow = (annualNetRent - totalCharges) / 12;

  // 5. Calculate loan details if applicable
  let loanDetails;
  if (params.loanAmount && params.interestRate && params.loanDurationYears) {
    const monthlyRate = params.interestRate / 100 / 12;
    const numPayments = params.loanDurationYears * 12;

    const monthlyPayment =
      (params.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalInterest = monthlyPayment * numPayments - params.loanAmount;
    const ltv = (params.loanAmount / property.price) * 100;

    loanDetails = {
      monthlyPayment: Number(monthlyPayment.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
    };
  }

  return {
    totalInvestment: Number(totalInvestment.toFixed(2)),
    breakdown: {
      purchasePrice: property.price,
      notaryFees: Number(notaryFees.toFixed(2)),
      agencyFees: Number(agencyFees.toFixed(2)),
      workCost: Number(workCost.toFixed(2)),
      contingency: Number(contingency.toFixed(2)),
    },
    annualGrossRent: Number(annualGrossRent.toFixed(2)),
    annualNetRent: Number(annualNetRent.toFixed(2)),
    annualCharges: {
      propertyTax: params.propertyTaxYearly,
      insurance: params.insuranceYearly,
      maintenance: Number(maintenance.toFixed(2)),
      managementFees: Number(managementFees.toFixed(2)),
      loanPayment: loanDetails ? loanDetails.monthlyPayment * 12 : undefined,
      total: Number(totalCharges.toFixed(2)),
    },
    grossYield: Number(grossYield.toFixed(2)),
    netYield: Number(netYield.toFixed(2)),
    cashFlow: Number(monthlyCashFlow.toFixed(2)),
    roi: Number(netYield.toFixed(2)),
    loanDetails,
  };
}

/**
 * Get default calculation parameters
 */
export function getDefaultRentabilityParams(): Omit<
  RentabilityParams,
  'purchasePrice' | 'monthlyRent' | 'estimatedWorkCost'
> {
  return {
    notaryFeesPercent: 12.5,
    agencyFeesPercent: 3.0,
    contingencyPercent: 10.0,
    vacancyRate: 5.0,
    propertyTaxYearly: 800,
    insuranceYearly: 400,
    maintenancePercent: 10.0,
    managementFeesPercent: 7.0,
    taxRegime: 'normal',
    marginalTaxRate: 25.0,
  };
}

// ============================================================================
// EXTENDED CALCULATION - Matches Excel "Projet TLM étude renta.xlsx"
// ============================================================================

/**
 * Default values for extended Belgian rentability calculation
 */
export const DEFAULT_EXTENDED_PARAMS: Omit<
  RentabilityParamsExtended,
  'monthlyRent' | 'numberOfRooms' | 'estimatedWorkCost' | 'cadastralIncome' | 'insuranceYearly'
> = {
  rentCalculationMode: 'per_room',
  rentPerRoom: 350,                    // 350€ per room default
  registrationFeesPercent: 12.5,       // Droits d'enregistrement belgique
  notaryFeesPercent: 2.5,              // Frais de notaire
  agencyFeesPercent: 0,                // 0% if included in price, 3% otherwise
  occupancyMonths: 11,                 // 11 months out of 12
  downPaymentPercent: 30,              // 30% apport personnel
  loanInterestRate: 3.5,               // 3.5% taux d'intérêt
  loanDurationMonths: 240,             // 20 years = 240 months
};

/**
 * Extended calculation input with price included in params
 */
interface CalculateRentabilityExtendedInput extends RentabilityParamsExtended {
  readonly purchasePrice: number;
}

/**
 * Calculates comprehensive profitability metrics matching the Excel model
 * "Projet TLM étude renta.xlsx"
 *
 * Key formulas:
 * - Invest Total = PA + Frais + Travaux
 * - Loyer net = Loyer annuel × (occupancyMonths/12)
 * - Rendement Brut = (Loyer annuel / PA) × 100
 * - Rendement Net = ((Loyer net - Charges) / Invest Total) × 100
 * - Cash Flow = (Loyer net - Charges - Mensualités×12) / 12
 *
 * @param input - Calculation parameters including purchase price
 * @returns Complete profitability analysis matching Excel model
 * @throws {ValidationError} When input data is invalid
 */
export function calculateRentabilityExtended(
  input: CalculateRentabilityExtendedInput
): RentabilityResultsExtended {
  const { purchasePrice, ...params } = input;

  // Validation
  if (!purchasePrice || purchasePrice <= 0) {
    throw new ValidationError('Invalid purchase price', { purchasePrice });
  }

  // 1. Calculate monthly rent based on mode
  let monthlyRent: number;
  if (params.rentCalculationMode === 'per_room') {
    if (!params.numberOfRooms || params.numberOfRooms <= 0) {
      throw new ValidationError('Invalid number of rooms for per_room calculation', {
        numberOfRooms: params.numberOfRooms,
      });
    }
    monthlyRent = params.rentPerRoom * params.numberOfRooms;
  } else {
    monthlyRent = params.monthlyRent;
  }

  if (monthlyRent <= 0) {
    throw new ValidationError('Invalid monthly rent', { monthlyRent });
  }

  // 2. Calculate acquisition fees (Belgian model - separated)
  const registrationFees = purchasePrice * (params.registrationFeesPercent / 100);
  const notaryFees = purchasePrice * (params.notaryFeesPercent / 100);
  const agencyFees = purchasePrice * (params.agencyFeesPercent / 100);
  const totalAcquisitionFees = registrationFees + notaryFees + agencyFees;

  // 3. Calculate total investment
  const workCost = params.estimatedWorkCost || 0;
  const totalInvestment = purchasePrice + totalAcquisitionFees + workCost;

  // 4. Create breakdown
  const breakdown: RentabilityBreakdownExtended = {
    purchasePrice,
    registrationFees: round(registrationFees),
    notaryFees: round(notaryFees),
    agencyFees: round(agencyFees),
    workCost: round(workCost),
    totalAcquisitionFees: round(totalAcquisitionFees),
    totalInvestment: round(totalInvestment),
  };

  // 5. Calculate rental income with occupancy
  const annualGrossRent = monthlyRent * 12;
  const occupancyRate = params.occupancyMonths / 12;
  const annualNetRent = annualGrossRent * occupancyRate;

  // 6. Calculate annual charges
  const cadastralIncome = params.cadastralIncome || 0;
  const insuranceYearly = params.insuranceYearly || 0;
  const totalAnnualCharges = cadastralIncome + insuranceYearly;

  // 7. Calculate yields
  // Rendement Brut = (Loyer annuel / Prix d'achat) × 100
  const grossYield = (annualGrossRent / purchasePrice) * 100;

  // Rendement Net = ((Loyer net - Charges) / Invest Total) × 100
  const netYield = ((annualNetRent - totalAnnualCharges) / totalInvestment) * 100;

  // 8. Calculate financing
  const downPayment = totalInvestment * (params.downPaymentPercent / 100);
  const loanAmount = totalInvestment - downPayment;

  let monthlyPayment = 0;
  let totalInterest = 0;

  if (loanAmount > 0 && params.loanInterestRate > 0 && params.loanDurationMonths > 0) {
    const monthlyRate = params.loanInterestRate / 100 / 12;
    const numPayments = params.loanDurationMonths;

    // Standard amortization formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
    monthlyPayment =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    totalInterest = monthlyPayment * numPayments - loanAmount;
  }

  const financing: FinancingDetails = {
    downPayment: round(downPayment),
    loanAmount: round(loanAmount),
    monthlyPayment: round(monthlyPayment),
    totalInterest: round(totalInterest),
    ltvRatio: round((loanAmount / purchasePrice) * 100),
  };

  // 9. Calculate cash flow
  // Cash Flow annuel = Loyer net - Charges - (Mensualité × 12)
  const annualLoanPayment = monthlyPayment * 12;
  const annualCashFlow = annualNetRent - totalAnnualCharges - annualLoanPayment;
  const monthlyCashFlow = annualCashFlow / 12;

  return {
    breakdown,
    totalInvestment: round(totalInvestment),

    monthlyRent: round(monthlyRent),
    annualGrossRent: round(annualGrossRent),
    annualNetRent: round(annualNetRent),
    occupancyRate: round(occupancyRate * 100),

    cadastralIncome: round(cadastralIncome),
    insuranceYearly: round(insuranceYearly),
    totalAnnualCharges: round(totalAnnualCharges),

    grossYield: round(grossYield),
    netYield: round(netYield),

    financing,

    monthlyCashFlow: round(monthlyCashFlow),
    annualCashFlow: round(annualCashFlow),

    params,
  };
}

/**
 * Input for building extended params
 */
interface BuildExtendedParamsInput {
  readonly price?: number;
  readonly bedrooms?: number;
  readonly cadastralIncome?: number;
  readonly estimatedWorkCost?: number;
  readonly insuranceYearly?: number;
  readonly rentPerRoom?: number;
  readonly monthlyRent?: number;
  readonly rentCalculationMode?: 'global' | 'per_room';
  readonly registrationFeesPercent?: number;
  readonly notaryFeesPercent?: number;
  readonly agencyFeesPercent?: number;
  readonly occupancyMonths?: number;
  readonly downPaymentPercent?: number;
  readonly loanInterestRate?: number;
  readonly loanDurationMonths?: number;
  readonly numberOfRooms?: number;
}

/**
 * Build extended params from property data and AI estimations
 */
export function buildExtendedParams(
  input: BuildExtendedParamsInput
): RentabilityParamsExtended {
  const numberOfRooms = input.numberOfRooms ?? input.bedrooms ?? 1;
  const cadastralIncome = input.cadastralIncome ?? 0;
  const rentPerRoom = input.rentPerRoom ?? DEFAULT_EXTENDED_PARAMS.rentPerRoom;
  const rentCalculationMode = input.rentCalculationMode ?? DEFAULT_EXTENDED_PARAMS.rentCalculationMode;

  // Calculate monthly rent based on mode
  const monthlyRent = rentCalculationMode === 'per_room'
    ? rentPerRoom * numberOfRooms
    : input.monthlyRent ?? rentPerRoom * numberOfRooms;

  return {
    ...DEFAULT_EXTENDED_PARAMS,
    numberOfRooms,
    cadastralIncome,
    rentPerRoom,
    monthlyRent,
    estimatedWorkCost: input.estimatedWorkCost ?? 0,
    insuranceYearly: input.insuranceYearly ?? 400,
    rentCalculationMode: input.rentCalculationMode ?? DEFAULT_EXTENDED_PARAMS.rentCalculationMode,
    registrationFeesPercent: input.registrationFeesPercent ?? DEFAULT_EXTENDED_PARAMS.registrationFeesPercent,
    notaryFeesPercent: input.notaryFeesPercent ?? DEFAULT_EXTENDED_PARAMS.notaryFeesPercent,
    agencyFeesPercent: input.agencyFeesPercent ?? DEFAULT_EXTENDED_PARAMS.agencyFeesPercent,
    occupancyMonths: input.occupancyMonths ?? DEFAULT_EXTENDED_PARAMS.occupancyMonths,
    downPaymentPercent: input.downPaymentPercent ?? DEFAULT_EXTENDED_PARAMS.downPaymentPercent,
    loanInterestRate: input.loanInterestRate ?? DEFAULT_EXTENDED_PARAMS.loanInterestRate,
    loanDurationMonths: input.loanDurationMonths ?? DEFAULT_EXTENDED_PARAMS.loanDurationMonths,
  };
}

/**
 * Round to 2 decimal places
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
