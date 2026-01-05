'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  Wallet,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  PiggyBank,
  Percent,
  Building2,
  Coins,
  Banknote,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUpdateRentability } from '@/hooks/use-rentability';
import {
  calculateRentabilityExtended,
  buildExtendedParams,
} from '@/lib/rentability/calculate';
import type {
  Property,
  RentabilityParamsExtended,
  RentabilityResultsExtended,
  AICostEstimation,
} from '@/types';

interface RentabilitySectionProps {
  property: Property;
}

export function RentabilitySection({ property }: RentabilitySectionProps): JSX.Element {
  const updateRentability = useUpdateRentability();

  // Get initial values from property or AI estimations
  const aiEstimations = property.aiEstimations as AICostEstimation | null;
  const savedParams = property.customParams as Partial<RentabilityParamsExtended> | null;

  // Initialize editable params
  const [params, setParams] = useState<RentabilityParamsExtended>(() => {
    return buildExtendedParams({
      price: property.price ?? 0,
      bedrooms: property.bedrooms ?? 2,
      cadastralIncome: property.cadastralIncome ?? 800,
      estimatedWorkCost: aiEstimations?.estimatedWorkCost ?? 0,
      insuranceYearly: aiEstimations?.estimatedInsurance ?? 300,
      rentPerRoom: aiEstimations?.rentPerRoom ?? 350,
      ...savedParams,
    });
  });

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    investment: false,
    income: false,
    charges: false,
    financing: false,
  });

  // Get purchase price from property
  const purchasePrice = property.price ?? 0;

  // Calculate rentability in real-time
  const rentabilityData = useMemo<RentabilityResultsExtended>(() => {
    return calculateRentabilityExtended({ ...params, purchasePrice });
  }, [params, purchasePrice]);

  // Track if params have changed (compare without price since it's fixed)
  const hasChanges = useMemo(() => {
    const existingParams = (property.rentabilityData as RentabilityResultsExtended | null)?.params;
    if (!existingParams) return true;
    return JSON.stringify(params) !== JSON.stringify(existingParams);
  }, [params, property.rentabilityData]);

  // Update a single param
  const updateParam = <K extends keyof RentabilityParamsExtended>(
    key: K,
    value: RentabilityParamsExtended[K]
  ): void => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Save params to server
  const handleSave = async (): Promise<void> => {
    await updateRentability.mutateAsync({
      propertyId: property.id,
      rentabilityParams: params,
    });
  };

  // Reset to defaults
  const handleReset = (): void => {
    setParams(
      buildExtendedParams({
        price: property.price ?? 0,
        bedrooms: property.bedrooms ?? 2,
        cadastralIncome: property.cadastralIncome ?? 800,
        estimatedWorkCost: aiEstimations?.estimatedWorkCost ?? 0,
        insuranceYearly: aiEstimations?.estimatedInsurance ?? 300,
        rentPerRoom: aiEstimations?.rentPerRoom ?? 350,
      })
    );
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections): void => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-white p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-emerald-500 text-white p-2 rounded-lg shadow-md shadow-emerald-200 mr-3">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Analyse de Rentabilité</h2>
              <p className="text-sm text-slate-500">
                Modifiez les paramètres pour personnaliser le calcul
              </p>
            </div>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-slate-600"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateRentability.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-1" />
                {updateRentability.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-100">
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Rendement Brut"
          value={`${rentabilityData.grossYield.toFixed(2)}%`}
          color="emerald"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Rendement Net"
          value={`${rentabilityData.netYield.toFixed(2)}%`}
          color={rentabilityData.netYield >= 4 ? 'emerald' : rentabilityData.netYield >= 2 ? 'yellow' : 'red'}
        />
        <KpiCard
          icon={<Banknote className="w-5 h-5" />}
          label="Cash Flow Mensuel"
          value={`${rentabilityData.monthlyCashFlow >= 0 ? '+' : ''}${Math.round(rentabilityData.monthlyCashFlow)}€`}
          color={rentabilityData.monthlyCashFlow >= 0 ? 'emerald' : 'red'}
        />
        <KpiCard
          icon={<Wallet className="w-5 h-5" />}
          label="Investissement Total"
          value={`${Math.round(rentabilityData.totalInvestment / 1000)}k€`}
          color="slate"
        />
      </div>

      {/* Editable Sections */}
      <div className="divide-y divide-slate-100">
        {/* Investment Section */}
        <CollapsibleSection
          title="Investissement"
          icon={<Building2 className="w-5 h-5" />}
          isExpanded={expandedSections.investment}
          onToggle={() => toggleSection('investment')}
          summary={`${Math.round(rentabilityData.totalInvestment).toLocaleString('fr-FR')}€`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyField
              label="Prix d'achat"
              value={`${(property.price ?? 0).toLocaleString('fr-FR')}€`}
            />
            <InputField
              label="Droits d'enregistrement (%)"
              value={params.registrationFeesPercent}
              onChange={(v) => updateParam('registrationFeesPercent', v)}
              min={0}
              max={20}
              step={0.5}
            />
            <InputField
              label="Frais de notaire (%)"
              value={params.notaryFeesPercent}
              onChange={(v) => updateParam('notaryFeesPercent', v)}
              min={0}
              max={10}
              step={0.1}
            />
            <InputField
              label="Frais d'agence (%)"
              value={params.agencyFeesPercent}
              onChange={(v) => updateParam('agencyFeesPercent', v)}
              min={0}
              max={10}
              step={0.5}
            />
            <InputFieldWithBreakdown
              label="Travaux estimés (€)"
              value={params.estimatedWorkCost}
              onChange={(v) => updateParam('estimatedWorkCost', v)}
              min={0}
              step={1000}
              aiEstimated={aiEstimations?.estimatedWorkCost !== undefined}
              workBreakdown={aiEstimations?.workBreakdown}
            />
            <ReadOnlyField
              label="Total Frais"
              value={`${Math.round(rentabilityData.breakdown.totalAcquisitionFees).toLocaleString('fr-FR')}€`}
            />
          </div>
        </CollapsibleSection>

        {/* Income Section */}
        <CollapsibleSection
          title="Revenus Locatifs"
          icon={<Coins className="w-5 h-5" />}
          isExpanded={expandedSections.income}
          onToggle={() => toggleSection('income')}
          summary={`${Math.round(rentabilityData.monthlyRent).toLocaleString('fr-FR')}€/mois`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mode de calcul du loyer
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateParam('rentCalculationMode', 'per_room')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                    params.rentCalculationMode === 'per_room'
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                      : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                  )}
                >
                  Par chambre
                </button>
                <button
                  onClick={() => updateParam('rentCalculationMode', 'global')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                    params.rentCalculationMode === 'global'
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                      : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                  )}
                >
                  Loyer global
                </button>
              </div>
            </div>

            {params.rentCalculationMode === 'per_room' ? (
              <>
                <InputField
                  label="Loyer par chambre (€)"
                  value={params.rentPerRoom}
                  onChange={(v) => updateParam('rentPerRoom', v)}
                  min={0}
                  max={2000}
                  step={25}
                  aiEstimated={aiEstimations?.rentPerRoom !== undefined}
                />
                <InputField
                  label="Nombre de chambres"
                  value={params.numberOfRooms}
                  onChange={(v) => updateParam('numberOfRooms', v)}
                  min={1}
                  max={20}
                  step={1}
                />
              </>
            ) : (
              <InputField
                label="Loyer mensuel global (€)"
                value={params.monthlyRent ?? 0}
                onChange={(v) => updateParam('monthlyRent', v)}
                min={0}
                step={50}
              />
            )}

            <InputField
              label="Mois d'occupation/an"
              value={params.occupancyMonths}
              onChange={(v) => updateParam('occupancyMonths', v)}
              min={1}
              max={12}
              step={0.5}
            />
            <ReadOnlyField
              label="Taux d'occupation"
              value={`${rentabilityData.occupancyRate.toFixed(1)}%`}
            />
            <ReadOnlyField
              label="Loyer annuel brut"
              value={`${Math.round(rentabilityData.annualGrossRent).toLocaleString('fr-FR')}€`}
            />
            <ReadOnlyField
              label="Loyer annuel net"
              value={`${Math.round(rentabilityData.annualNetRent).toLocaleString('fr-FR')}€`}
            />
          </div>
        </CollapsibleSection>

        {/* Charges Section */}
        <CollapsibleSection
          title="Charges Annuelles"
          icon={<PiggyBank className="w-5 h-5" />}
          isExpanded={expandedSections.charges}
          onToggle={() => toggleSection('charges')}
          summary={`${Math.round(rentabilityData.totalAnnualCharges).toLocaleString('fr-FR')}€/an`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Revenu cadastral (€/an)"
              value={params.cadastralIncome}
              onChange={(v) => updateParam('cadastralIncome', v)}
              min={0}
              step={50}
            />
            <InputField
              label="Assurance (€/an)"
              value={params.insuranceYearly}
              onChange={(v) => updateParam('insuranceYearly', v)}
              min={0}
              step={25}
              aiEstimated={aiEstimations?.estimatedInsurance !== undefined}
            />
            <ReadOnlyField
              label="Total charges"
              value={`${Math.round(rentabilityData.totalAnnualCharges).toLocaleString('fr-FR')}€/an`}
            />
          </div>
        </CollapsibleSection>

        {/* Financing Section */}
        <CollapsibleSection
          title="Financement"
          icon={<Percent className="w-5 h-5" />}
          isExpanded={expandedSections.financing}
          onToggle={() => toggleSection('financing')}
          summary={`${Math.round(rentabilityData.financing.monthlyPayment).toLocaleString('fr-FR')}€/mois`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Apport personnel (%)"
              value={params.downPaymentPercent}
              onChange={(v) => updateParam('downPaymentPercent', v)}
              min={0}
              max={100}
              step={5}
            />
            <InputField
              label="Taux d'intérêt (%)"
              value={params.loanInterestRate}
              onChange={(v) => updateParam('loanInterestRate', v)}
              min={0}
              max={15}
              step={0.1}
            />
            <InputField
              label="Durée du prêt (mois)"
              value={params.loanDurationMonths}
              onChange={(v) => updateParam('loanDurationMonths', v)}
              min={12}
              max={360}
              step={12}
            />
            <ReadOnlyField
              label="Durée en années"
              value={`${Math.round(params.loanDurationMonths / 12)} ans`}
            />
            <ReadOnlyField
              label="Montant emprunté"
              value={`${Math.round(rentabilityData.financing.loanAmount).toLocaleString('fr-FR')}€`}
            />
            <ReadOnlyField
              label="Apport personnel"
              value={`${Math.round(rentabilityData.financing.downPayment).toLocaleString('fr-FR')}€`}
            />
            <ReadOnlyField
              label="Mensualité"
              value={`${Math.round(rentabilityData.financing.monthlyPayment).toLocaleString('fr-FR')}€`}
            />
            <ReadOnlyField
              label="Coût total du crédit"
              value={`${Math.round(rentabilityData.financing.totalInterest).toLocaleString('fr-FR')}€`}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* AI Confidence Note */}
      {aiEstimations && (
        <div className="p-4 bg-indigo-50 border-t border-indigo-100">
          <p className="text-sm text-indigo-700">
            <span className="font-medium">Note :</span> Certains paramètres sont estimés par l'IA
            avec un indice de confiance de {Math.round((aiEstimations.confidence ?? 0.5) * 100)}%.
            {aiEstimations.reasoning && (
              <span className="block mt-1 text-indigo-600">{aiEstimations.reasoning}</span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

// KPI Card Component
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'yellow' | 'red' | 'slate';
}

function KpiCard({ icon, label, value, color }: KpiCardProps): JSX.Element {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    slate: 'text-slate-600 bg-slate-100',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-2', colorClasses[color])}>
        {icon}
      </div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn('text-xl font-bold', color === 'slate' ? 'text-slate-800' : `text-${color}-600`)}>
        {value}
      </p>
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  summary: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  summary,
  children,
}: CollapsibleSectionProps): JSX.Element {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center">
          <div className="text-slate-400 mr-3">{icon}</div>
          <span className="font-medium text-slate-900">{title}</span>
        </div>
        <div className="flex items-center">
          <span className="text-sm font-medium text-emerald-600 mr-3">{summary}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Input Field Component
interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  aiEstimated?: boolean;
}

function InputField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  aiEstimated,
}: InputFieldProps): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">
        {label}
        {aiEstimated && (
          <span className="ml-2 text-xs text-indigo-500 font-normal">(estimé par IA)</span>
        )}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-sm',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          aiEstimated
            ? 'border-indigo-200 bg-indigo-50/50'
            : 'border-slate-200 bg-white'
        )}
      />
    </div>
  );
}

// Read-Only Field Component
interface ReadOnlyFieldProps {
  label: string;
  value: string;
}

function ReadOnlyField({ label, value }: ReadOnlyFieldProps): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <div className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-800">
        {value}
      </div>
    </div>
  );
}

// Work Breakdown type
interface WorkBreakdown {
  roofInsulation?: number;
  facadeInsulation?: number;
  windowsReplacement?: number;
  heatingSystem?: number;
  kitchen?: number;
  bathroom?: number;
  flooring?: number;
  painting?: number;
  electrical?: number;
  plumbing?: number;
  other?: number;
  // Legacy fields for backwards compatibility
  roof?: number;
  facade?: number;
  interior?: number;
}

// Labels for work breakdown items
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
  // Legacy labels
  roof: 'Toiture',
  facade: 'Façade',
  interior: 'Travaux intérieurs',
};

// Input Field with Work Breakdown Tooltip Component
interface InputFieldWithBreakdownProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  aiEstimated?: boolean;
  workBreakdown?: WorkBreakdown;
}

function InputFieldWithBreakdown({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  aiEstimated,
  workBreakdown,
}: InputFieldWithBreakdownProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);

  // Filter out zero values from breakdown
  const breakdownItems = workBreakdown
    ? Object.entries(workBreakdown)
        .filter(([, cost]) => cost && cost > 0)
        .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    : [];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-600 mb-1">
        {label}
        {aiEstimated && (
          <span className="ml-2 text-xs text-indigo-500 font-normal">(estimé par IA)</span>
        )}
        {workBreakdown && breakdownItems.length > 0 && (
          <button
            type="button"
            className="ml-2 text-slate-400 hover:text-indigo-500 transition-colors inline-flex items-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-sm',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          aiEstimated
            ? 'border-indigo-200 bg-indigo-50/50'
            : 'border-slate-200 bg-white'
        )}
      />

      {/* Tooltip with work breakdown */}
      {showTooltip && breakdownItems.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-2 w-64 bg-slate-800 text-white rounded-lg shadow-xl p-4 text-sm">
          <div className="absolute -top-2 left-4 w-4 h-4 bg-slate-800 transform rotate-45" />
          <p className="font-semibold mb-3 text-slate-200">Détail des travaux estimés</p>
          <div className="space-y-2">
            {breakdownItems.map(([key, cost]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-300">{WORK_BREAKDOWN_LABELS[key] || key}</span>
                <span className="font-medium">{(cost ?? 0).toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-600 mt-3 pt-3 flex justify-between items-center font-semibold">
            <span>Total</span>
            <span className="text-emerald-400">{value.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      )}
    </div>
  );
}
