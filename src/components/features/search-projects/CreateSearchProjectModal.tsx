'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { createSearchProjectSchema, type CreateSearchProjectSchemaType } from '@/lib/validation/search-project-schemas';

interface CreateSearchProjectModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (data: CreateSearchProjectSchemaType) => void;
  readonly isLoading: boolean;
  readonly userEmail: string;
}

const PROPERTY_TYPE_OPTIONS = [
  { value: 'colocation', label: 'Colocation', rentLabel: 'Loyer par chambre', hint: 'Le loyer est multiplié par le nombre de chambres' },
  { value: 'logement_seul', label: 'Logement seul', rentLabel: 'Loyer mensuel total', hint: 'Loyer global pour le bien entier' },
  { value: 'appartement', label: 'Appartement', rentLabel: 'Loyer mensuel total', hint: 'Loyer global pour l\'appartement' },
  { value: 'immeuble_rapport', label: 'Immeuble de rapport', rentLabel: 'Loyer par appartement', hint: 'Le loyer est multiplié par le nombre d\'unités' },
];

const INTERVAL_OPTIONS = [
  { value: '6', label: 'Toutes les 6 heures' },
  { value: '12', label: 'Toutes les 12 heures' },
  { value: '24', label: 'Tous les jours (24h)' },
  { value: '48', label: 'Tous les 2 jours' },
  { value: '72', label: 'Tous les 3 jours' },
];

export function CreateSearchProjectModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  userEmail,
}: CreateSearchProjectModalProps): JSX.Element {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateSearchProjectSchemaType>({
    resolver: zodResolver(createSearchProjectSchema),
    defaultValues: {
      name: '',
      searchUrl: '',
      scoreThreshold: 70,
      checkIntervalHours: 24,
      notificationEmail: userEmail,
      emailNotificationsEnabled: true,
      propertyType: 'colocation',
      rentPerUnit: 350,
    },
  });

  // Update email field when userEmail becomes available (async)
  useEffect(() => {
    if (userEmail) {
      setValue('notificationEmail', userEmail);
    }
  }, [userEmail, setValue]);

  const scoreThreshold = watch('scoreThreshold');
  const emailEnabled = watch('emailNotificationsEnabled');
  const propertyType = watch('propertyType');

  const selectedTypeOption = PROPERTY_TYPE_OPTIONS.find((opt) => opt.value === propertyType);

  const handleFormSubmit = (data: CreateSearchProjectSchemaType): void => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nouveau projet de recherche</DialogTitle>
          <DialogDescription>
            Collez une URL de recherche Immoweb pour automatiser votre veille immobilière.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2 overflow-y-auto flex-1 pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom du projet</Label>
            <Input
              id="name"
              placeholder="Ex: Appartements Bruxelles >200k"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label htmlFor="searchUrl">URL de recherche Immoweb</Label>
            <Input
              id="searchUrl"
              placeholder="https://www.immoweb.be/fr/recherche/..."
              {...register('searchUrl')}
            />
            {errors.searchUrl && (
              <p className="text-sm text-red-500">{errors.searchUrl.message}</p>
            )}
            <p className="text-xs text-slate-400">
              Allez sur Immoweb, configurez vos filtres, puis copiez l&apos;URL de la page de résultats.
            </p>
          </div>

          {/* Property Type + Rent per unit — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type d&apos;investissement</Label>
              <Select
                defaultValue="colocation"
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

            <div className="space-y-1.5">
              <Label htmlFor="rentPerUnit">{selectedTypeOption?.rentLabel ?? 'Loyer par unité'} (€)</Label>
              <Input
                id="rentPerUnit"
                type="number"
                min={50}
                max={5000}
                step={10}
                {...register('rentPerUnit', { valueAsNumber: true })}
              />
              {errors.rentPerUnit && (
                <p className="text-sm text-red-500">{errors.rentPerUnit.message}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 -mt-2">
            {selectedTypeOption?.hint ?? 'Montant du loyer par unité'}
          </p>

          {/* Score threshold */}
          <div className="space-y-1.5">
            <Label>Score minimum pour alerte: {scoreThreshold}/100</Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[scoreThreshold ?? 70]}
              onValueChange={(values: number[]) => setValue('scoreThreshold', values[0] ?? 70)}
            />
          </div>

          {/* Interval + Email — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fréquence de vérification</Label>
              <Select
                defaultValue="24"
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

            <div className="space-y-1.5">
              <Label htmlFor="notificationEmail">Email(s) de notification</Label>
              <Input
                id="notificationEmail"
                type="text"
                placeholder="email@exemple.com"
                {...register('notificationEmail')}
              />
              {errors.notificationEmail && (
                <p className="text-sm text-red-500">{errors.notificationEmail.message}</p>
              )}
            </div>
          </div>

          {/* Email toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Alertes email</Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Recevoir un email quand une annonce dépasse le seuil
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={(val) => setValue('emailNotificationsEnabled', val)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le projet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
