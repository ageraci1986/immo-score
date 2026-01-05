import { z } from 'zod';

/**
 * Property URL validation schema
 */
export const propertyUrlSchema = z.string().url().min(10).max(500);

/**
 * Add properties input schema
 */
export const addPropertiesSchema = z.object({
  urls: z.array(propertyUrlSchema).min(1).max(10),
  customParams: z.record(z.unknown()).optional(),
});

/**
 * Update property schema
 */
export const updatePropertySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  customParams: z.record(z.unknown()).optional(),
  isFavorite: z.boolean().optional(),
  userNotes: z.string().max(5000).optional(),
});

/**
 * Calculation parameters schema
 */
export const calculationParamsSchema = z.object({
  notaryFeesPercent: z.number().min(0).max(20).default(12.5),
  agencyFeesPercent: z.number().min(0).max(10).default(3.0),
  contingencyPercent: z.number().min(0).max(30).default(10.0),
  defaultRentPerSqm: z.number().min(0).optional(),
  vacancyRate: z.number().min(0).max(50).default(5.0),
  propertyTaxYearly: z.number().min(0).default(800),
  insuranceYearly: z.number().min(0).default(400),
  maintenancePercent: z.number().min(0).max(30).default(10.0),
  managementFeesPercent: z.number().min(0).max(20).default(7.0),
  renovationCostPerSqm: z.number().min(0).optional(),
  defaultInterestRate: z.number().min(0).max(10).optional(),
  defaultLoanDuration: z.number().int().min(1).max(30).optional(),
  taxRegime: z.enum(['normal', 'reel']).default('normal'),
  marginalTaxRate: z.number().min(0).max(60).default(25.0),
  scoreWeights: z
    .object({
      location: z.number().min(0).max(1).default(0.25),
      condition: z.number().min(0).max(1).default(0.2),
      rentability: z.number().min(0).max(1).default(0.3),
      potential: z.number().min(0).max(1).default(0.15),
      workComplexity: z.number().min(0).max(1).default(0.1),
    })
    .optional(),
});

/**
 * Rentability calculation input schema
 */
export const rentabilityInputSchema = z.object({
  propertyId: z.string().cuid(),
  monthlyRent: z.number().min(0).optional(),
  estimatedWorkCost: z.number().min(0).optional(),
  loanAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(10).optional(),
  loanDurationYears: z.number().int().min(1).max(30).optional(),
});

/**
 * Extended rentability parameters schema (Belgian model)
 */
export const rentabilityParamsExtendedSchema = z.object({
  // Rent calculation
  rentCalculationMode: z.enum(['global', 'per_room']).default('per_room'),
  rentPerRoom: z.number().min(0).max(2000).default(350),
  monthlyRent: z.number().min(0).max(50000).optional(),
  numberOfRooms: z.number().int().min(0).max(20).optional(),

  // Acquisition fees (percentages)
  registrationFeesPercent: z.number().min(0).max(20).default(12.5),
  notaryFeesPercent: z.number().min(0).max(10).default(2.5),
  agencyFeesPercent: z.number().min(0).max(10).default(0),

  // Work costs
  estimatedWorkCost: z.number().min(0).default(0),

  // Occupancy
  occupancyMonths: z.number().min(1).max(12).default(11),

  // Financing
  downPaymentPercent: z.number().min(0).max(100).default(30),
  loanInterestRate: z.number().min(0).max(15).default(3.5),
  loanDurationMonths: z.number().int().min(12).max(360).default(240),

  // Annual charges
  cadastralIncome: z.number().min(0).default(800),
  insuranceYearly: z.number().min(0).default(300),
});

/**
 * Update rentability parameters schema for PATCH requests
 */
export const updateRentabilityParamsSchema = z.object({
  rentabilityParams: rentabilityParamsExtendedSchema.partial(),
});

/**
 * Property filter schema
 */
export const propertyFilterSchema = z.object({
  status: z.enum(['PENDING', 'SCRAPING', 'ANALYZING', 'COMPLETED', 'ERROR']).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minSurface: z.number().min(0).optional(),
  maxSurface: z.number().min(0).optional(),
  location: z.string().optional(),
  isFavorite: z.boolean().optional(),
  sortBy: z.enum(['score', 'price', 'surface', 'rentability', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/**
 * Geocoding request schema
 */
export const geocodeSchema = z.object({
  address: z.string().min(5).max(200),
});

/**
 * Nearby services request schema
 */
export const nearbyServicesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().int().min(100).max(5000).default(1000),
});

/**
 * Pagination response schema
 */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
    }),
  });
}

/**
 * API error response schema
 */
export const apiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

/**
 * Success response schema
 */
export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  });
}

/**
 * Validate and parse data with a schema
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated and parsed data
 * @throws {z.ZodError} If validation fails
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validate data with a schema
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Success result with data or error result
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(data);
}
