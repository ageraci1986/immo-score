import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface KpiCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  indicator?: React.ReactNode;
  progress?: {
    value: number;
    color?: string;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  suffix,
  icon,
  iconClassName,
  trend,
  indicator,
  progress,
  className,
}: KpiCardProps): JSX.Element {
  return (
    <Card className={cn('p-6 hover:shadow-md transition-shadow', className)}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex items-center mt-2">
            <h3 className="text-3xl font-bold text-slate-800">
              {value}
              {suffix && <span className="text-lg text-slate-400">{suffix}</span>}
            </h3>
            {indicator}
          </div>
          {trend && (
            <p
              className={cn(
                'text-xs font-medium mt-1',
                trend.isPositive ? 'text-emerald-600' : 'text-red-500'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <span className={cn('p-2 rounded-lg', iconClassName || 'bg-slate-50 text-slate-400')}>
            {icon}
          </span>
        )}
      </div>
      {progress && (
        <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', progress.color || 'bg-emerald-500')}
            style={{ width: `${Math.min(progress.value, 100)}%` }}
          />
        </div>
      )}
    </Card>
  );
}

// AI activity indicator
export function AiActivityIndicator(): JSX.Element {
  return (
    <span className="ml-2 flex h-3 w-3 relative">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ai opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-ai" />
    </span>
  );
}

// Score KPI card variant
interface ScoreKpiCardProps {
  score: number;
  label?: string;
  className?: string;
}

export function ScoreKpiCard({ score, label = 'Score Moyen', className }: ScoreKpiCardProps): JSX.Element {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return 'text-emerald-600';
    if (s >= 60) return 'text-yellow-600';
    return 'text-red-500';
  };

  const getRingColor = (s: number): string => {
    if (s >= 80) return 'border-emerald-100 border-t-emerald-500';
    if (s >= 60) return 'border-yellow-100 border-t-yellow-500';
    return 'border-red-100 border-t-red-500';
  };

  return (
    <Card className={cn('p-6 hover:shadow-md transition-shadow relative overflow-hidden', className)}>
      <div className="flex justify-between items-start z-10 relative">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className={cn('text-3xl font-bold mt-2', getScoreColor(score))}>
            {score}
            <span className={cn('text-lg', score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400')}>
              /100
            </span>
          </h3>
        </div>
        <div className={cn('h-10 w-10 rounded-full border-4 flex items-center justify-center', getRingColor(score))} />
      </div>
    </Card>
  );
}
