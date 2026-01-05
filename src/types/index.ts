// Core type definitions for Immo-Score

export type PropertyStatus = 'PENDING' | 'SCRAPING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type PropertyCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type Recommendation = 'excellent' | 'good' | 'average' | 'poor';

export type TaxRegime = 'normal' | 'reel';

export type ServiceType =
  | 'supermarket'
  | 'school'
  | 'transport'
  | 'hospital'
  | 'pharmacy'
  | 'park';

export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface PropertyPhoto {
  readonly url: string;
  readonly storageKey: string;
  readonly publicUrl: string;
  readonly analysis?: string;
}

export interface RoofEstimate {
  readonly estimatedSurface: number;
  readonly condition: PropertyCondition;
  readonly material: string;
  readonly estimatedAge: number;
  readonly workNeeded: readonly string[];
  readonly confidence: number;
  readonly calculationNote?: string;
}

export interface FacadeEstimate {
  readonly count: number;
  readonly totalSurface: number;
  readonly condition: PropertyCondition;
  readonly materials: readonly string[];
  readonly workNeeded: readonly string[];
  readonly confidence: number;
  readonly facadeHeight?: number;
  readonly facadeWidth?: number;
  readonly calculationNote?: string;
}

export interface InteriorCondition {
  readonly overall: PropertyCondition;
  readonly flooring: string;
  readonly walls: string;
  readonly ceilings: string;
  readonly kitchen: string;
  readonly bathrooms: string;
  readonly workEstimate: string;
}

export interface VisionAnalysis {
  readonly roofEstimate: RoofEstimate;
  readonly facadeEstimate: FacadeEstimate;
  readonly interiorCondition?: InteriorCondition;
}

export interface WorkEstimate {
  readonly total: number;
  readonly breakdown: {
    readonly roof: number;
    readonly facade: number;
    readonly interior: number;
    readonly kitchen: number;
    readonly bathroom: number;
    readonly flooring: number;
    readonly painting: number;
    readonly other: number;
  };
}

export type RentCalculationMode = 'global' | 'per_room';

export interface RentabilityParams {
  // Acquisition costs
  readonly purchasePrice: number;
  readonly notaryFeesPercent: number;
  readonly agencyFeesPercent: number;

  // Work costs
  readonly estimatedWorkCost: number;
  readonly contingencyPercent: number;

  // Rental income
  readonly monthlyRent: number;
  readonly rentPerSqm?: number;
  readonly vacancyRate: number;

  // Annual costs
  readonly propertyTaxYearly: number;
  readonly insuranceYearly: number;
  readonly maintenancePercent: number;
  readonly managementFeesPercent: number;

  // Financing (optional)
  readonly loanAmount?: number;
  readonly interestRate?: number;
  readonly loanDurationYears?: number;

  // Tax
  readonly taxRegime: TaxRegime;
  readonly marginalTaxRate?: number;
}

/**
 * Extended rentability parameters matching the Excel calculation model
 * Used for Belgian real estate investment analysis
 */
export interface RentabilityParamsExtended {
  // Rent calculation mode
  readonly rentCalculationMode: RentCalculationMode;
  readonly rentPerRoom: number;        // 350€ default
  readonly monthlyRent: number;        // Calculated or manual input
  readonly numberOfRooms: number;      // From scraping (bedrooms)

  // Acquisition fees (separated for Belgium)
  readonly registrationFeesPercent: number;  // 12.5% droits d'enregistrement
  readonly notaryFeesPercent: number;        // 2.5% frais de notaire
  readonly agencyFeesPercent: number;        // 0% or 3% frais d'agence

  // Work costs
  readonly estimatedWorkCost: number;  // AI estimated or manual

  // Occupation rate
  readonly occupancyMonths: number;    // 11 months out of 12 default

  // Financing
  readonly downPaymentPercent: number; // 30% default (modifiable)
  readonly loanInterestRate: number;   // 3.5%
  readonly loanDurationMonths: number; // 240 (20 years)

  // Annual charges
  readonly cadastralIncome: number;    // From scraping (revenu cadastral)
  readonly insuranceYearly: number;    // AI estimated or manual
}

/**
 * AI-generated cost estimations
 */
export interface AICostEstimation {
  readonly estimatedWorkCost: number;
  readonly workBreakdown: WorkEstimate['breakdown'];
  readonly estimatedInsurance: number;
  readonly estimatedMonthlyRent: number;
  readonly rentPerRoom: number;
  readonly confidence: number;
  readonly reasoning: string;
}

/**
 * Extended breakdown including Belgian-specific fees
 */
export interface RentabilityBreakdownExtended {
  readonly purchasePrice: number;
  readonly registrationFees: number;   // Droits d'enregistrement
  readonly notaryFees: number;
  readonly agencyFees: number;
  readonly workCost: number;
  readonly totalAcquisitionFees: number;
  readonly totalInvestment: number;
}

/**
 * Financing details
 */
export interface FinancingDetails {
  readonly downPayment: number;        // Apport personnel
  readonly loanAmount: number;         // Montant emprunté
  readonly monthlyPayment: number;     // Mensualité
  readonly totalInterest: number;      // Intérêts totaux
  readonly ltvRatio: number;           // Loan-to-value
}

/**
 * Extended rentability results matching Excel model
 */
export interface RentabilityResultsExtended {
  // Investment breakdown
  readonly breakdown: RentabilityBreakdownExtended;
  readonly totalInvestment: number;

  // Rental income
  readonly monthlyRent: number;
  readonly annualGrossRent: number;
  readonly annualNetRent: number;      // After vacancy (11/12 months)
  readonly occupancyRate: number;

  // Annual charges
  readonly cadastralIncome: number;
  readonly insuranceYearly: number;
  readonly totalAnnualCharges: number;

  // Yields
  readonly grossYield: number;         // Rendement brut
  readonly netYield: number;           // Rendement net

  // Financing
  readonly financing: FinancingDetails;

  // Cash flow
  readonly monthlyCashFlow: number;    // Cash flow mensuel net
  readonly annualCashFlow: number;     // Cash flow annuel net

  // Parameters used (for display/edit)
  readonly params: RentabilityParamsExtended;
}

export interface RentabilityBreakdown {
  readonly purchasePrice: number;
  readonly notaryFees: number;
  readonly agencyFees: number;
  readonly workCost: number;
  readonly contingency: number;
}

export interface AnnualCharges {
  readonly propertyTax: number;
  readonly insurance: number;
  readonly maintenance: number;
  readonly managementFees: number;
  readonly loanPayment?: number;
  readonly total: number;
}

export interface LoanDetails {
  readonly monthlyPayment: number;
  readonly totalInterest: number;
  readonly ltv: number;
}

export interface RentabilityResults {
  readonly totalInvestment: number;
  readonly breakdown: RentabilityBreakdown;
  readonly annualGrossRent: number;
  readonly annualNetRent: number;
  readonly annualCharges: AnnualCharges;
  readonly grossYield: number;
  readonly netYield: number;
  readonly cashFlow: number;
  readonly roi: number;
  readonly loanDetails?: LoanDetails;
}

export interface ScoringWeights {
  readonly location: number;
  readonly condition: number;
  readonly rentability: number;
  readonly potential: number;
  readonly workComplexity: number;
}

export interface ScoreBreakdown {
  readonly location: number;
  readonly condition: number;
  readonly rentability: number;
  readonly potential: number;
  readonly workComplexity: number;
}

export interface PropertyScore {
  readonly totalScore: number;
  readonly breakdown: ScoreBreakdown;
  readonly recommendation: Recommendation;
  readonly narrative: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly keyInsights: readonly string[];
}

export interface NearbyService {
  readonly type: ServiceType;
  readonly name: string;
  readonly distance: number;
  readonly walkTime: number;
  readonly coordinates: Coordinates;
}

export interface Property {
  readonly id: string;
  readonly userId: string;
  readonly sourceUrl: string;
  readonly scrapedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // Basic data
  readonly title: string | null;
  readonly description: string | null;
  readonly price: number | null;
  readonly location: string | null;
  readonly address: string | null;
  readonly coordinates: Coordinates | null;

  // Characteristics
  readonly surface: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly peb: string | null;
  readonly constructionYear: number | null;
  readonly landSurface: number | null;
  readonly facadeCount: number | null;
  readonly facadeWidth: number | null;
  readonly hasGarden: boolean | null;
  readonly hasTerrace: boolean | null;
  readonly hasParking: boolean | null;
  readonly propertyType: string | null;

  // Photos and analysis
  readonly photos: readonly PropertyPhoto[];
  readonly roofEstimate: RoofEstimate | null;
  readonly facadeEstimate: FacadeEstimate | null;
  readonly interiorAnalysis: InteriorCondition | null;
  readonly workEstimate: WorkEstimate | null;
  readonly aiScore: number | null;
  readonly aiAnalysis: PropertyScore | null;

  // Profitability
  readonly rentabilityData: RentabilityResults | null;
  readonly rentabilityDataExtended: RentabilityResultsExtended | null;
  readonly rentabilityRate: number | null;
  readonly aiEstimations: AICostEstimation | null;
  readonly cadastralIncome: number | null;

  // Location
  readonly nearbyServices: readonly NearbyService[] | null;

  // Status
  readonly status: PropertyStatus;

  // User customizations
  readonly customParams: Record<string, unknown> | null;
  readonly isFavorite: boolean;
  readonly userNotes: string | null;
}

export interface ScrapedData {
  readonly title: string;
  readonly price: number;
  readonly location: string;
  readonly surface?: number;
  readonly bedrooms?: number;
  readonly bathrooms?: number;
  readonly peb?: string;
  readonly constructionYear?: number;
  readonly description: string;
  readonly photos: readonly string[];
  readonly rawData: Record<string, unknown>;
}

export interface CreatePropertyInput {
  readonly urls: readonly string[];
  readonly customParams?: Record<string, unknown>;
}

export interface CalculationParamsData {
  readonly notaryFeesPercent: number;
  readonly agencyFeesPercent: number;
  readonly contingencyPercent: number;
  readonly defaultRentPerSqm?: number;
  readonly vacancyRate: number;
  readonly propertyTaxYearly: number;
  readonly insuranceYearly: number;
  readonly maintenancePercent: number;
  readonly managementFeesPercent: number;
  readonly renovationCostPerSqm?: number;
  readonly defaultInterestRate?: number;
  readonly defaultLoanDuration?: number;
  readonly taxRegime: TaxRegime;
  readonly marginalTaxRate: number;
  readonly scoreWeights?: ScoringWeights;
}

export interface ApiError extends Error {
  readonly status: number;
  readonly code?: string;
}

export interface ApiResponse<T> {
  readonly data?: T;
  readonly error?: {
    readonly message: string;
    readonly code?: string;
    readonly details?: unknown;
  };
}
