import { describe, it, expect } from 'vitest';
import { calculateRentability, getDefaultRentabilityParams } from '../calculate';
import type { VisionAnalysis } from '@/types';

const mockProperty = {
  price: 200000,
  surface: 100,
} as const;

const mockVisionAnalysis: VisionAnalysis = {
  roofEstimate: {
    estimatedSurface: 85,
    condition: 'good',
    material: 'tuiles en terre cuite',
    estimatedAge: 25,
    workNeeded: ['Nettoyage gouttières'],
    confidence: 0.75,
  },
  facadeEstimate: {
    count: 2,
    totalSurface: 120,
    condition: 'fair',
    materials: ['briques', 'crépi'],
    workNeeded: ['Isolation façade arrière'],
    confidence: 0.8,
  },
  interiorCondition: {
    overall: 'good',
    flooring: 'Carrelage salon, parquet chambres',
    walls: 'Bon état général',
    ceilings: 'Bon état',
    kitchen: 'Cuisine fonctionnelle',
    bathrooms: 'Salle de bain correcte',
    workEstimate: 'Rafraîchissement général (5k€)',
  },
} as const;

describe('calculateRentability', () => {
  it('should calculate correct profitability metrics with default parameters', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 1200,
      estimatedWorkCost: 10000,
    };

    const result = calculateRentability({
      property: mockProperty,
      params,
      aiAnalysis: mockVisionAnalysis,
    });

    // Basic checks
    expect(result.totalInvestment).toBeGreaterThan(mockProperty.price);
    expect(result.breakdown.purchasePrice).toBe(mockProperty.price);
    expect(result.breakdown.workCost).toBe(10000);
    expect(result.annualGrossRent).toBe(14400); // 1200 * 12
    expect(result.grossYield).toBeGreaterThan(0);
    expect(result.netYield).toBeGreaterThan(0);
  });

  it('should calculate correct fees', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 1200,
      estimatedWorkCost: 10000,
      notaryFeesPercent: 12.5,
      agencyFeesPercent: 3,
    };

    const result = calculateRentability({
      property: mockProperty,
      params,
      aiAnalysis: mockVisionAnalysis,
    });

    expect(result.breakdown.notaryFees).toBe(25000); // 200k * 12.5%
    expect(result.breakdown.agencyFees).toBe(6000); // 200k * 3%
  });

  it('should calculate loan details when provided', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 1200,
      estimatedWorkCost: 10000,
      loanAmount: 150000,
      interestRate: 3.5,
      loanDurationYears: 20,
    };

    const result = calculateRentability({
      property: mockProperty,
      params,
      aiAnalysis: mockVisionAnalysis,
    });

    expect(result.loanDetails).toBeDefined();
    expect(result.loanDetails?.monthlyPayment).toBeGreaterThan(0);
    expect(result.loanDetails?.ltv).toBe(75); // 150k / 200k = 75%
  });

  it('should throw error for invalid property price', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: -100,
      monthlyRent: 1200,
      estimatedWorkCost: 10000,
    };

    expect(() =>
      calculateRentability({
        property: { price: -100, surface: 100 },
        params,
        aiAnalysis: mockVisionAnalysis,
      })
    ).toThrow('Invalid property price');
  });

  it('should throw error for invalid surface', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 1200,
      estimatedWorkCost: 10000,
    };

    expect(() =>
      calculateRentability({
        property: { price: 200000, surface: 0 },
        params,
        aiAnalysis: mockVisionAnalysis,
      })
    ).toThrow('Invalid property surface');
  });

  it('should calculate rent from rentPerSqm when monthlyRent not provided', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 0,
      rentPerSqm: 15,
      estimatedWorkCost: 10000,
    };

    // Override to not provide monthlyRent
    const paramsWithoutRent = {
      ...params,
      monthlyRent: undefined as unknown as number,
    };

    const result = calculateRentability({
      property: mockProperty,
      params: { ...paramsWithoutRent, rentPerSqm: 15 },
      aiAnalysis: mockVisionAnalysis,
    });

    // 100m² * 15€/m² * 12 months = 18000€
    expect(result.annualGrossRent).toBe(18000);
  });

  it('should use AI work estimation when not provided', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 1200,
      estimatedWorkCost: 0,
    };

    // Override to not provide estimatedWorkCost
    const paramsWithoutWork = {
      ...params,
      estimatedWorkCost: undefined as unknown as number,
    };

    const result = calculateRentability({
      property: mockProperty,
      params: paramsWithoutWork,
      aiAnalysis: mockVisionAnalysis,
    });

    // Should have calculated work cost from AI
    expect(result.breakdown.workCost).toBeGreaterThan(0);
  });

  it('should calculate correct net yield considering all charges', () => {
    const params = {
      ...getDefaultRentabilityParams(),
      purchasePrice: mockProperty.price,
      monthlyRent: 1200,
      estimatedWorkCost: 10000,
      propertyTaxYearly: 800,
      insuranceYearly: 400,
      maintenancePercent: 10,
      managementFeesPercent: 7,
      vacancyRate: 5,
    };

    const result = calculateRentability({
      property: mockProperty,
      params,
      aiAnalysis: mockVisionAnalysis,
    });

    const annualGross = 14400; // 1200 * 12
    const annualNet = annualGross * 0.95; // Minus 5% vacancy

    // Check charges are calculated
    expect(result.annualCharges.propertyTax).toBe(800);
    expect(result.annualCharges.insurance).toBe(400);
    expect(result.annualCharges.maintenance).toBeGreaterThan(0);
    expect(result.annualCharges.managementFees).toBeGreaterThan(0);

    // Net yield should be positive but less than gross yield
    expect(result.netYield).toBeGreaterThan(0);
    expect(result.netYield).toBeLessThan(result.grossYield);
  });
});

describe('getDefaultRentabilityParams', () => {
  it('should return valid default parameters', () => {
    const defaults = getDefaultRentabilityParams();

    expect(defaults.notaryFeesPercent).toBe(12.5);
    expect(defaults.agencyFeesPercent).toBe(3);
    expect(defaults.contingencyPercent).toBe(10);
    expect(defaults.vacancyRate).toBe(5);
    expect(defaults.maintenancePercent).toBe(10);
    expect(defaults.managementFeesPercent).toBe(7);
    expect(defaults.taxRegime).toBe('normal');
  });
});
