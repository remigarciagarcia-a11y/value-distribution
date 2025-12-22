import { Euro, Building2, Heart, User } from 'lucide-react';
import type { BulletinViewModel } from '@/lib/types';
import { formatPctND } from '@/lib/types';

interface StackedBarProps {
  viewModel: BulletinViewModel;
}

export function StackedBar({ viewModel }: StackedBarProps) {
  const { stackedBar, parts } = viewModel;
  
  const segments = [
    {
      key: 'capital',
      pct: parts.capital.total.pct ?? 0,
      color: 'bg-blue-400',
      icon: Euro,
      label: formatPctND(parts.capital.total.pct),
    },
    {
      key: 'fonctionnelle',
      pct: parts.fonctionnelle.total.pct ?? 0,
      color: 'bg-blue-500',
      icon: Building2,
      label: formatPctND(parts.fonctionnelle.total.pct),
    },
    {
      key: 'sociale',
      pct: parts.sociale.total.pct ?? 0,
      color: 'bg-blue-600',
      icon: Heart,
      label: formatPctND(parts.sociale.total.pct),
    },
    {
      key: 'personnelle',
      pct: parts.personnelle.total.pct ?? 0,
      color: 'bg-blue-700',
      icon: User,
      label: formatPctND(parts.personnelle.total.pct),
    },
  ];
  
  return (
    <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col">
      {/* 100% VP indicator at top */}
      <div className="h-32 flex flex-col items-center justify-end pb-2 bg-gradient-to-b from-blue-300 to-blue-400">
        <span className="text-[11px] font-bold text-primary-foreground">100 %</span>
      </div>
      
      {/* Stacked segments */}
      {segments.map((segment) => {
        const Icon = segment.icon;
        // Calculate height based on percentage, with minimum for visibility
        const heightPercent = segment.pct > 0 ? Math.max(segment.pct * 1.8, 12) : 10;
        
        return (
          <div
            key={segment.key}
            className={`${segment.color} flex flex-col items-center justify-center relative transition-all duration-500`}
            style={{ 
              height: `${heightPercent}%`,
              minHeight: '70px',
            }}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-primary-foreground">
              <Icon className="w-5 h-5 opacity-90" />
              <span className="text-[10px] font-semibold whitespace-nowrap">
                {segment.label}
              </span>
            </div>
          </div>
        );
      })}
      
      {/* Overflow indicator */}
      {stackedBar.overflowPct !== null && stackedBar.overflowPct > 0 && (
        <div className="bg-red-400 py-1 flex items-center justify-center">
          <span className="text-[9px] font-bold text-primary-foreground">
            +{stackedBar.overflowPct.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
