import { z } from 'zod';

/**
 * Validates that a URL is an Immoweb search page.
 * Accepts both French (/recherche/) and Dutch (/zoeken/) URLs.
 */
const immowebSearchUrlSchema = z
  .string()
  .url({ message: "L'URL doit être valide" })
  .refine(
    (url) =>
      url.includes('immoweb.be') &&
      (url.includes('/recherche/') || url.includes('/zoeken/')),
    {
      message:
        "L'URL doit être une page de recherche Immoweb (contenant /recherche/ ou /zoeken/)",
    }
  );

/**
 * Schema for creating a new search project
 */
export const createSearchProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom du projet est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  searchUrl: immowebSearchUrlSchema,
  scoreThreshold: z
    .number()
    .int()
    .min(0, 'Le score minimum est 0')
    .max(100, 'Le score maximum est 100')
    .default(70),
  checkIntervalHours: z
    .number()
    .int()
    .min(1, "L'intervalle minimum est de 1 heure")
    .max(168, "L'intervalle maximum est de 168 heures (7 jours)")
    .default(24),
  notificationEmail: z
    .string()
    .min(1, 'Au moins une adresse email est requise')
    .refine(
      (val) => {
        const emails = val.split(',').map((e) => e.trim()).filter(Boolean);
        return emails.length > 0 && emails.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      },
      { message: 'Une ou plusieurs adresses email sont invalides' }
    ),
  emailNotificationsEnabled: z.boolean().default(true),
  propertyType: z
    .enum(['colocation', 'logement_seul', 'appartement', 'immeuble_rapport'])
    .default('colocation'),
  rentPerUnit: z
    .number()
    .min(50, 'Le loyer minimum est de 50€')
    .max(5000, 'Le loyer maximum est de 5000€')
    .default(350),
  colocPreFilterEnabled: z.boolean().default(false),
});

/**
 * Schema for updating an existing search project.
 * Note: searchUrl is intentionally NOT updatable (immutable).
 */
export const updateSearchProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom du projet est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .optional(),
  scoreThreshold: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),
  checkIntervalHours: z
    .number()
    .int()
    .min(1)
    .max(168)
    .optional(),
  notificationEmail: z
    .string()
    .refine(
      (val) => {
        const emails = val.split(',').map((e) => e.trim()).filter(Boolean);
        return emails.length > 0 && emails.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      },
      { message: 'Une ou plusieurs adresses email sont invalides' }
    )
    .optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  propertyType: z
    .enum(['colocation', 'logement_seul', 'appartement', 'immeuble_rapport'])
    .optional(),
  rentPerUnit: z
    .number()
    .min(50)
    .max(5000)
    .optional(),
  colocPreFilterEnabled: z.boolean().optional(),
  status: z.enum(['active', 'paused']).optional(),
});

/**
 * Schema for the run check trigger
 */
export const runCheckSchema = z.object({
  triggeredBy: z.enum(['cron', 'manual', 'initial']).default('manual'),
});

export type CreateSearchProjectSchemaType = z.infer<typeof createSearchProjectSchema>;
export type UpdateSearchProjectSchemaType = z.infer<typeof updateSearchProjectSchema>;
export type RunCheckSchemaType = z.infer<typeof runCheckSchema>;
