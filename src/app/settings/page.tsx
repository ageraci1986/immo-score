'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Key,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sidebar } from '@/components/layout/sidebar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AiPrompt {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  content: string;
  model: string;
  provider: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  version: number;
  updatedAt: string;
}

interface AiProvider {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  isActive: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

const PROVIDER_CONFIG = [
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'openai', name: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { id: 'google', name: 'Google (Gemini)', placeholder: 'AIza...' },
] as const;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SettingsPage(): JSX.Element {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showSuccess = (msg: string): void => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (msg: string): void => {
    setError(msg);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Réglages</h1>
        <p className="text-slate-500 mt-1">
          Gestion des clés API, modèles IA et prompts
        </p>
      </div>

      {/* Status messages */}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center text-green-700 text-sm">
          <Check className="w-4 h-4 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="w-4 h-4" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Prompts IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <ApiKeysTab onSuccess={showSuccess} onError={showError} />
        </TabsContent>

        <TabsContent value="prompts">
          <PromptsTab onSuccess={showSuccess} onError={showError} />
        </TabsContent>
      </Tabs>
    </div>
      </main>
    </div>
  );
}

// ─── API Keys Tab ────────────────────────────────────────────────────────────

function ApiKeysTab({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}): JSX.Element {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const fetchProviders = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.providers ?? []);
    } catch {
      onError('Impossible de charger les providers');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSaveKey = async (providerId: string, providerName: string): Promise<void> => {
    const apiKey = keyInputs[providerId];
    if (!apiKey || apiKey.trim().length === 0) return;

    try {
      setSaving(providerId);
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          name: providerName,
          apiKey: apiKey.trim(),
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      await fetchProviders();
      setKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
      onSuccess(`Clé API ${providerName} sauvegardée`);
    } catch {
      onError(`Erreur lors de la sauvegarde de la clé ${providerName}`);
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteKey = async (provider: AiProvider): Promise<void> => {
    try {
      setSaving(provider.provider);
      const res = await fetch(`/api/providers/${provider.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchProviders();
      onSuccess(`Clé API ${provider.name} supprimée`);
    } catch {
      onError('Erreur lors de la suppression');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-1/4 mb-3" />
            <div className="h-10 bg-slate-100 rounded w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Configurez vos clés API pour accéder aux différents fournisseurs IA.
        Les clés sont stockées de manière sécurisée.
      </p>

      {PROVIDER_CONFIG.map((config) => {
        const existing = providers.find(
          (p) => p.provider === config.id && p.isActive
        );
        const isSaving = saving === config.id;

        return (
          <Card key={config.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Key className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{config.name}</h3>
                  <p className="text-xs text-slate-500">
                    {existing ? 'Clé configurée' : 'Non configuré'}
                  </p>
                </div>
              </div>
              {existing && (
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                  Actif
                </Badge>
              )}
            </div>

            {/* Show existing key (masked) */}
            {existing && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 rounded-lg">
                <code className="text-sm text-slate-600 flex-1 font-mono">
                  {showKeys[config.id]
                    ? existing.apiKey
                    : existing.apiKey}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowKeys((prev) => ({
                      ...prev,
                      [config.id]: !prev[config.id],
                    }))
                  }
                >
                  {showKeys[config.id] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteKey(existing)}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Input for new/update key */}
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={existing ? 'Remplacer la clé...' : config.placeholder}
                value={keyInputs[config.id] ?? ''}
                onChange={(e) =>
                  setKeyInputs((prev) => ({
                    ...prev,
                    [config.id]: e.target.value,
                  }))
                }
                className="font-mono text-sm"
              />
              <Button
                onClick={() => handleSaveKey(config.id, config.name)}
                disabled={!keyInputs[config.id]?.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Prompts Tab ─────────────────────────────────────────────────────────────

function PromptsTab({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}): JSX.Element {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<
    Record<string, Partial<AiPrompt>>
  >({});

  // Models fetched from providers APIs
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [promptsRes, providersRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/providers'),
      ]);
      const [promptsData, providersData] = await Promise.all([
        promptsRes.json(),
        providersRes.json(),
      ]);
      setPrompts(promptsData.prompts ?? []);
      setProviders(providersData.providers ?? []);
    } catch {
      onError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const fetchAllModels = useCallback(async (): Promise<void> => {
    const activeProviders = providers.filter((p) => p.isActive);
    if (activeProviders.length === 0) return;

    try {
      setLoadingModels(true);
      const results = await Promise.allSettled(
        activeProviders.map(async (provider) => {
          const res = await fetch(`/api/providers/${provider.id}/models`);
          if (!res.ok) return [];
          const data = await res.json();
          return data.models as ModelInfo[];
        })
      );

      const allModels = results
        .filter(
          (r): r is PromiseFulfilledResult<ModelInfo[]> =>
            r.status === 'fulfilled'
        )
        .flatMap((r) => r.value);

      setAvailableModels(allModels);
    } catch {
      console.error('Failed to fetch models');
    } finally {
      setLoadingModels(false);
    }
  }, [providers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (providers.length > 0) {
      fetchAllModels();
    }
  }, [providers, fetchAllModels]);

  const handleSeedPrompts = async (): Promise<void> => {
    try {
      setSeeding(true);
      const res = await fetch('/api/prompts/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Seed failed');
      await fetchData();
      onSuccess('Prompts par défaut initialisés');
    } catch {
      onError("Erreur lors de l'initialisation des prompts");
    } finally {
      setSeeding(false);
    }
  };

  const handleFieldChange = (
    promptId: string,
    field: string,
    value: unknown
  ): void => {
    setEditedPrompts((prev) => ({
      ...prev,
      [promptId]: {
        ...prev[promptId],
        [field]: value,
      },
    }));
  };

  const handleModelChange = (promptId: string, modelId: string): void => {
    // Determine provider from the selected model
    const model = availableModels.find((m) => m.id === modelId);
    if (model) {
      setEditedPrompts((prev) => ({
        ...prev,
        [promptId]: {
          ...prev[promptId],
          model: modelId,
          provider: model.provider,
        },
      }));
    }
  };

  const handleSave = async (promptId: string): Promise<void> => {
    const changes = editedPrompts[promptId];
    if (!changes) return;

    try {
      setSaving(promptId);
      const res = await fetch(`/api/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!res.ok) throw new Error('Save failed');

      const data = await res.json();
      setPrompts((prev) =>
        prev.map((p) => (p.id === promptId ? data.prompt : p))
      );
      setEditedPrompts((prev) => {
        const next = { ...prev };
        delete next[promptId];
        return next;
      });
      onSuccess('Prompt sauvegardé');
    } catch {
      onError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const getFieldValue = (prompt: AiPrompt, field: keyof AiPrompt): unknown => {
    const edited = editedPrompts[prompt.id];
    if (edited && field in edited) return edited[field as keyof typeof edited];
    return prompt[field];
  };

  const hasChanges = (promptId: string): boolean => {
    return (
      !!editedPrompts[promptId] &&
      Object.keys(editedPrompts[promptId]).length > 0
    );
  };

  // Group models by provider for the select
  const modelsByProvider = availableModels.reduce<Record<string, ModelInfo[]>>(
    (acc, model) => {
      const key = model.provider;
      if (!acc[key]) acc[key] = [];
      acc[key].push(model);
      return acc;
    },
    {}
  );

  const getProviderLabel = (provider: string): string => {
    switch (provider) {
      case 'anthropic':
        return 'Anthropic';
      case 'openai':
        return 'OpenAI';
      case 'google':
        return 'Google';
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (prompts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">
          Aucun prompt configuré
        </h3>
        <p className="text-slate-500 mb-6">
          Initialisez les prompts par défaut pour commencer.
        </p>
        <Button onClick={handleSeedPrompts} disabled={seeding}>
          {seeding ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Initialiser les prompts par défaut
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Models refresh info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {availableModels.length > 0
            ? `${availableModels.length} modèles disponibles depuis ${Object.keys(modelsByProvider).length} fournisseur(s)`
            : 'Configurez vos clés API dans l\'onglet "Clés API" pour voir les modèles disponibles'}
        </p>
        {providers.some((p) => p.isActive) && (
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllModels}
            disabled={loadingModels}
          >
            {loadingModels ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Rafraîchir les modèles
          </Button>
        )}
      </div>

      {/* Prompt cards */}
      {prompts.map((prompt) => {
        const isExpanded = expandedPrompt === prompt.id;
        const changed = hasChanges(prompt.id);
        const isSaving = saving === prompt.id;
        const currentModel = getFieldValue(prompt, 'model') as string;
        const modelLabel =
          availableModels.find((m) => m.id === currentModel)?.name ??
          currentModel;

        return (
          <Card key={prompt.id} className="overflow-hidden">
            {/* Header */}
            <button
              type="button"
              onClick={() =>
                setExpandedPrompt(isExpanded ? null : prompt.id)
              }
              className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">
                    {prompt.name}
                  </h3>
                  <Badge
                    variant={prompt.isActive ? 'default' : 'secondary'}
                  >
                    {prompt.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    v{prompt.version}
                  </Badge>
                  {changed && (
                    <Badge variant="destructive" className="text-xs">
                      Non sauvegardé
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {prompt.description ?? prompt.slug}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  {modelLabel}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Expanded */}
            {isExpanded && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-5">
                {/* Model & Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Model selector - dynamic */}
                  <div className="space-y-2">
                    <Label htmlFor={`model-${prompt.id}`}>Modèle IA</Label>
                    {availableModels.length > 0 ? (
                      <Select
                        value={currentModel}
                        onValueChange={(val) =>
                          handleModelChange(prompt.id, val)
                        }
                      >
                        <SelectTrigger id={`model-${prompt.id}`}>
                          <SelectValue placeholder="Sélectionner un modèle" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(modelsByProvider).map(
                            ([provider, models]) => (
                              <div key={provider}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  {getProviderLabel(provider)}
                                </div>
                                {models.map((model) => (
                                  <SelectItem
                                    key={model.id}
                                    value={model.id}
                                  >
                                    {model.name}
                                  </SelectItem>
                                ))}
                              </div>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        <Input
                          id={`model-${prompt.id}`}
                          value={currentModel}
                          onChange={(e) =>
                            handleFieldChange(
                              prompt.id,
                              'model',
                              e.target.value
                            )
                          }
                          className="font-mono text-sm"
                          placeholder="ex: claude-sonnet-4-20250514"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Ajoutez une clé API pour voir les modèles
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`maxTokens-${prompt.id}`}>
                      Max Tokens
                    </Label>
                    <Input
                      id={`maxTokens-${prompt.id}`}
                      type="number"
                      min={256}
                      max={32768}
                      value={getFieldValue(prompt, 'maxTokens') as number}
                      onChange={(e) =>
                        handleFieldChange(
                          prompt.id,
                          'maxTokens',
                          parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`temperature-${prompt.id}`}>
                      Température (
                      {getFieldValue(prompt, 'temperature') as number})
                    </Label>
                    <Input
                      id={`temperature-${prompt.id}`}
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={
                        getFieldValue(prompt, 'temperature') as number
                      }
                      onChange={(e) =>
                        handleFieldChange(
                          prompt.id,
                          'temperature',
                          parseFloat(e.target.value)
                        )
                      }
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Prompt content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`content-${prompt.id}`}>
                      Contenu du prompt
                    </Label>
                    <span className="text-xs text-slate-400">
                      Utilisez {'{{variable}}'} pour les paramètres dynamiques
                    </span>
                  </div>
                  <Textarea
                    id={`content-${prompt.id}`}
                    value={getFieldValue(prompt, 'content') as string}
                    onChange={(e) =>
                      handleFieldChange(prompt.id, 'content', e.target.value)
                    }
                    rows={16}
                    className="font-mono text-sm leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    Dernière modification :{' '}
                    {new Date(prompt.updatedAt).toLocaleDateString('fr-BE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <div className="flex gap-2">
                    {changed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditedPrompts((prev) => {
                            const next = { ...prev };
                            delete next[prompt.id];
                            return next;
                          });
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={!changed || isSaving}
                      onClick={() => handleSave(prompt.id)}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
