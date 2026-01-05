import Link from 'next/link';
import { ArrowRight, FileText, CheckCircle } from 'lucide-react';

export default function HomePage(): JSX.Element {
  return (
    <div className="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden">
      {/* BACKGROUND GRID DECORATION */}
      <div
        className="absolute inset-0 opacity-40 z-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-0" />

      {/* MAIN CONTAINER */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-screen">
        {/* HEADER / LOGO */}
        <div className="mb-8 animate-fade-in-down">
          <span className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg shadow-emerald-100 border border-emerald-50 mb-6">
            <span className="text-3xl">🏡</span>
          </span>
        </div>

        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Immo-<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">Score</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            L&apos;Analyse Immobilière Intelligente <span className="text-ai font-semibold">Propulsée par l&apos;IA</span>.
            <br />Transformez la data en décisions d&apos;investissement rentables.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center"
            >
              Voir le Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-400" />
              Documentation
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            Architecture robuste & prête à l&apos;emploi
          </div>
        </div>

        {/* FEATURE CARDS (GLASS EFFECT) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {/* Card 1 - Analyse IA */}
          <div className="group bg-white/60 backdrop-blur-md border border-slate-200 p-8 rounded-2xl hover:shadow-xl hover:shadow-indigo-100/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🤖
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Analyse IA</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Évaluation automatique de l&apos;état du bien via <span className="text-indigo-600 font-medium">Claude Vision</span>. Détection des travaux et risques.
            </p>
          </div>

          {/* Card 2 - Rentabilité */}
          <div className="group bg-white/60 backdrop-blur-md border border-slate-200 p-8 rounded-2xl hover:shadow-xl hover:shadow-emerald-100/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Rentabilité</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Calculs précis de ROI, cash-flow et rendements locatifs basés sur les données du marché.
            </p>
          </div>

          {/* Card 3 - Scoring */}
          <div className="group bg-white/60 backdrop-blur-md border border-slate-200 p-8 rounded-2xl hover:shadow-xl hover:shadow-orange-100/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Scoring</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Score 0-100 objectif basé sur la localisation, l&apos;état, le prix et le potentiel de plus-value.
            </p>
          </div>
        </div>

        {/* TECHNICAL STATUS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* SYSTEM STATUS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="font-bold text-emerald-900 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Application Initialisée
              </h3>
              <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-1 rounded">v1.0.0</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatusItem text="Config TypeScript Strict" />
                <StatusItem text="Schéma Prisma (6 modèles)" />
                <StatusItem text="Moteur Rentabilité" />
                <StatusItem text="Client Claude AI" />
                <StatusItem text="Validation Zod" />
                <StatusItem text="Logging Pino" />
              </div>
            </div>
          </div>

          {/* NEXT STEPS (TERMINAL STYLE) */}
          <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-2 text-xs text-slate-400 font-mono">setup-guide — bash</span>
            </div>
            <div className="p-6 font-mono text-sm text-slate-300 space-y-4 flex-1">
              <h3 className="text-white font-bold flex items-center">
                <span className="mr-2">🚀</span> Prochaines Étapes
              </h3>

              <div className="space-y-4">
                <div className="group">
                  <p className="text-slate-500 mb-1"># 1. Configurer les variables d&apos;environnement</p>
                  <div className="bg-black/30 p-2 rounded border border-slate-700 text-emerald-400 flex justify-between items-center group-hover:border-slate-500 transition-colors cursor-pointer">
                    <span>cp .env.example .env</span>
                    <span className="text-xs text-slate-500 bg-slate-800 px-1 rounded">INSTALLATION.md</span>
                  </div>
                </div>

                <div className="group">
                  <p className="text-slate-500 mb-1"># 2. Synchroniser la base de données</p>
                  <div className="bg-black/30 p-2 rounded border border-slate-700 text-blue-400">
                    <span>npm run db:push</span>
                  </div>
                </div>

                <div className="group">
                  <p className="text-slate-500 mb-1"># 3. Lancer les scrapers</p>
                  <div className="bg-black/30 p-2 rounded border border-slate-700 text-purple-400">
                    <span>voir PRD_Immo-Score.md</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-16 text-center text-slate-400 text-sm">
          <p>&copy; 2025 Immo-Score. All systems operational.</p>
        </footer>
      </main>
    </div>
  );
}

function StatusItem({ text }: { readonly text: string }): JSX.Element {
  return (
    <div className="flex items-center space-x-3 text-sm text-slate-600">
      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span>{text}</span>
    </div>
  );
}
