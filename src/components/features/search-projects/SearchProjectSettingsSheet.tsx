'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { updateSearchProjectSchema, type UpdateSearchProjectSchemaType } from '@/lib/validation/search-project-schemas';
import type { SearchProject } from '@/types/search-projects';

interface SearchProjectSettingsSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly project: SearchProject;
  readonly onSubmit: (data: UpdateSearchProjectSchemaType) => void;
  readonly isLoading: boolean;
}

const PROPERTY_TYPE_OPTIONS = [
  { value: 'colocation', label: 'Colocation', rentLabel: 'Loyer par chambre', hint: 'Le loyer est multiplié par le nombre de chambres' },
  { value: 'logement_seul', label: 'Logement seul', rentLabel: 'Loyer mensuel total', hint: 'Loyer global pour le bien entier' },
  { value: 'appartement', label: 'Appartement', rentLabel: 'Loyer mensuel total', hint: "Loyer global pour l'appartement" },
  { value: 'immeuble_rapport', label: 'Immeuble de rapport', rentLabel: 'Loyer par appartement', hint: "Le loyer est multiplié par le nombre d'unités" },
];

const INTERVAL_OPTIONS = [
  { value: '6', label: 'Toutes les 6 heures' },
  { value: '12', label: 'Toutes les 12 heures' },
  { value: '24', label: 'Tous les jours (24h)' },
  { value: '48', label: 'Tous les 2 jours' },
  { value: '72', label: 'Tous les 3 jours' },
];

export function SearchProjectSettingsSheet({
  open,
  onOpenChange,
  project,
  onSubmit,
  isLoading,
}: SearchProjectSettingsSheetProps): JSX.Element {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateSearchProjectSchemaType>({
    resolver: zodResolver(updateSearchProjectSchema),
    defaultValues: {
      name: project.name,
      scoreThreshold: project.scoreThreshold,
      checkIntervalHours: project.checkIntervalHours,
      notificationEmail: project.notificationEmail,
      emailNotificationsEnabled: project.emailNotificationsEnabled,
      propertyType: project.propertyType,
      rentPerUnit: project.rentPerUnit,
    },
  });

  const scoreThreshold = watch('scoreThreshold');
  const emailEnabled = watch('emailNotificationsEnabled');
  const propertyType = watch('propertyType');

  const selectedTypeOption = PROPERTY_TYPE_OPTIONS.find((opt) => opt.value === propertyType);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle>Paramètres du projet</SheetTitle>
          <SheetDescription>
            Modifiez les paramètres de veille. L&apos;URL de recherche ne peut pas être changée.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          {/* URL (read-only) */}
          <div className="space-y-2">
            <Label className="text-slate-400">URL de recherche (non modifiable)</Label>
            <Input value={project.searchUrl} disabled className="text-xs" />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="settings-name">Nom du projet</Label>
            <Input id="settings-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label>Type d&apos;investissement</Label>
            <Select
              defaultValue={project.propertyType}
              onValueChange={(val) => setValue('propertyType', val as 'colocation' | 'logement_seul' | 'appartement' | 'immeuble_rapport')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rent per unit */}
          <div className="space-y-2">
            <Label htmlFor="settings-rentPerUnit">{selectedTypeOption?.rentLabel ?? 'Loyer par unité'} (€)</Label>
            <Input
              id="settings-rentPerUnit"
              type="number"
              min={50}
              max={5000}
              step={10}
              {...register('rentPerUnit', { valueAsNumber: true })}
            />
            {errors.rentPerUnit && (
              <p className="text-sm text-red-500">{errors.rentPerUnit.message}</p>
            )}
            <p className="text-xs text-slate-400">
              {selectedTypeOption?.hint ?? 'Montant du loyer par unité'}
            </p>
          </div>

          {/* Score threshold */}
          <div className="space-y-2">
            <Label>Score minimum: {scoreThreshold ?? project.scoreThreshold}/100</Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[scoreThreshold ?? project.scoreThreshold]}
              onValueChange={([val]) => setValue('scoreThreshold', val)}
            />
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label>Fréquence de vérification</Label>
            <Select
              defaultValue={String(project.checkIntervalHours)}
              onValueChange={(val) => setValue('checkIntervalHours', parseInt(val, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email(s) de notification</Label>
            <Input
              id="settings-email"
              type="text"
              placeholder="email@exemple.com, autre@exemple.com"
              {...register('notificationEmail')}
            />
            {errors.notificationEmail && (
              <p className="text-sm text-red-500">{errors.notificationEmail.message}</p>
            )}
            <p className="text-xs text-slate-400">
              Plusieurs adresses possibles, séparées par des virgules.
            </p>
          </div>

          {/* Toggle email */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Alertes email</Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Recevoir un email pour les nouvelles annonces
              </p>
            </div>
            <Switch
              checked={emailEnabled ?? project.emailNotificationsEnabled}
              onCheckedChange={(val) => setValue('emailNotificationsEnabled', val)}
            />
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
