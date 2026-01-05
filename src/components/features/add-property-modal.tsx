'use client';

import { useState } from 'react';
import { Zap, Link as LinkIcon, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCreateProperties } from '@/hooks/use-properties';

interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  duration?: number;
  error?: string;
}

interface AddPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPropertyModal({
  open,
  onOpenChange,
}: AddPropertyModalProps): JSX.Element {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: 'extraction', label: 'Extraction des données structurées', status: 'pending' },
    { id: 'vision', label: 'Analyse IA des photos (Claude Vision)', status: 'pending' },
    { id: 'calculation', label: 'Calculs de rentabilité & Cashflow', status: 'pending' },
  ]);
  const [logs, setLogs] = useState<string[]>([]);

  const createProperties = useCreateProperties();

  const addLog = (message: string): void => {
    setLogs((prev) => [...prev, message]);
  };

  const updateStep = (id: string, update: Partial<AnalysisStep>): void => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...update } : step))
    );
  };

  const resetModal = (): void => {
    setUrl('');
    setIsAnalyzing(false);
    setLogs([]);
    setSteps([
      { id: 'extraction', label: 'Extraction des données structurées', status: 'pending' },
      { id: 'vision', label: 'Analyse IA des photos (Claude Vision)', status: 'pending' },
      { id: 'calculation', label: 'Calculs de rentabilité & Cashflow', status: 'pending' },
    ]);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!url.trim()) return;

    setIsAnalyzing(true);
    setLogs([]);
    addLog('> Initialisation du scraping...');

    // Step 1: Create property and start scraping
    updateStep('extraction', { status: 'processing' });
    addLog('> Envoi de la requête API...');

    try {
      const startTime = Date.now();

      // Call the real API
      await createProperties.mutateAsync({ urls: [url.trim()] });

      const duration = Date.now() - startTime;
      updateStep('extraction', { status: 'completed', duration });
      addLog('> Propriété créée avec succès!');
      addLog('> Scraping lancé en arrière-plan...');

      // Mark other steps as pending (they happen in background)
      updateStep('vision', { status: 'pending' });
      updateStep('calculation', { status: 'pending' });
      addLog('> L\'analyse complète se fait en arrière-plan.');
      addLog('> Vous pouvez fermer cette fenêtre.');

      // Close modal after success
      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 2000);
    } catch (error) {
      addLog(`> Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      updateStep('extraction', { status: 'error', error: error instanceof Error ? error.message : 'Erreur' });
      setIsAnalyzing(false);
    }
  };

  const renderStepIcon = (status: AnalysisStep['status']): React.ReactNode => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Check className="w-3 h-3" strokeWidth={3} />
          </div>
        );
      case 'processing':
        return (
          <div className="relative w-6 h-6 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-indigo-200 rounded-full" />
            <div className="absolute inset-0 border-2 border-indigo-600 rounded-full border-t-transparent animate-spin" />
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            ✕
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span className="w-8 h-8 rounded-lg bg-ai/10 text-ai flex items-center justify-center mr-3 inline-flex">
              <Zap className="w-5 h-5" />
            </span>
            Nouvelle Analyse
          </DialogTitle>
        </DialogHeader>

        {/* Input Area */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 -mx-6 -mt-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-slate-400 group-focus-within:text-ai transition-colors" />
            </div>
            <input
              type="url"
              className="block w-full pl-12 pr-28 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-ai/20 focus:border-ai transition-all shadow-sm font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Collez l'URL Immoweb ou Logic-Immo ici..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isAnalyzing}
            />
            <Button
              className="absolute right-2 top-2 bottom-2"
              onClick={handleSubmit}
              disabled={!url.trim() || isAnalyzing}
            >
              Analyser
              <span className="ml-2 text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
                ↵
              </span>
            </Button>
          </div>

          <div className="flex space-x-4 mt-3 ml-1 text-xs text-slate-400 font-medium">
            <span className="flex items-center text-emerald-600">
              <Check className="w-3 h-3 mr-1" />
              Immoweb supporté
            </span>
            <button className="flex items-center hover:text-slate-600 transition-colors">
              Test avec un bien démo
            </button>
          </div>
        </div>

        {/* Processing State */}
        <div className="p-6 bg-white min-h-[300px]">
          {isAnalyzing && (
            <>
              {/* Property Preview Skeleton */}
              <div className="flex items-start mb-6 animate-pulse">
                <div className="h-16 w-24 bg-slate-200 rounded-lg mr-4 flex-shrink-0" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between group">
                    <div className="flex items-center">
                      <div className="mr-3">{renderStepIcon(step.status)}</div>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          step.status === 'pending' ? 'text-slate-500' : 'text-slate-800',
                          step.status === 'pending' && 'opacity-40'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {step.status === 'completed' && step.duration && (
                      <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        {step.duration}ms
                      </span>
                    )}
                    {step.status === 'processing' && (
                      <span className="text-xs font-medium text-indigo-600 animate-pulse">
                        En cours...
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Terminal Log */}
              <div className="mt-8 bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 shadow-inner">
                <div className="flex items-center mb-2 border-b border-slate-700 pb-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5" />
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5" />
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="ml-auto text-slate-500">logs</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {logs.map((log, index) => (
                    <p
                      key={index}
                      className={cn(
                        log.includes('Error') && 'text-red-400',
                        log.includes('Warning') && 'text-yellow-400',
                        log.includes('Found') && 'text-green-400',
                        log.includes('complete') && 'text-green-400'
                      )}
                    >
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}

          {!isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <LinkIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-medium text-slate-800 mb-2">
                Collez une URL pour commencer
              </h4>
              <p className="text-sm text-slate-500 max-w-md">
                Nous analyserons automatiquement le bien avec notre IA pour extraire toutes les informations et calculer la rentabilité.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
