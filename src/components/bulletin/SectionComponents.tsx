import { formatND, formatCurrencyCompact } from '@/lib/types';
import type { LineValue, PartTotal } from '@/lib/types';

interface SectionLineProps {
  line: LineValue;
  showPct?: boolean;
  showRate?: boolean;
}

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '';
  return `${(rate * 100).toFixed(2)}%`;
}

export function SectionLine({ line, showPct = false, showRate = false }: SectionLineProps) {
  const hasRate = showRate && (line.rate !== null && line.rate !== undefined);
  const hasDetailedRates = showRate && (line.rateEmployee !== null && line.rateEmployee !== undefined);
  
  return (
    <div className="flex justify-between items-baseline py-0.5 gap-2">
      <span className="text-sm text-foreground/80 flex-1">{line.label}</span>
      {hasRate && (
        <span className="text-xs text-muted-foreground tabular-nums min-w-[60px] text-right">
          {hasDetailedRates ? (
            <span title={`Salarié: ${formatRate(line.rateEmployee)} | Employeur: ${formatRate(line.rateEmployer)}`}>
              {formatRate(line.rate)}
            </span>
          ) : (
            formatRate(line.rate)
          )}
        </span>
      )}
      <span className="text-sm font-medium tabular-nums min-w-[80px] text-right">
        {formatND(line.value)}
      </span>
    </div>
  );
}

interface SectionTotalProps {
  label: string;
  total: PartTotal;
  large?: boolean;
}

export function SectionTotal({ label, total, large = false }: SectionTotalProps) {
  const value = total.total;
  
  return (
    <div className="flex items-baseline gap-4">
      <span className={`part-label ${large ? 'text-base' : 'text-sm'}`}>{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={`amount-display ${large ? 'text-3xl' : 'text-2xl'}`}>
          {value !== null ? formatCurrencyCompact(value) : 'ND'}
        </span>
        {total.isPartial && (
          <span className="nd-badge">partiel</span>
        )}
      </div>
    </div>
  );
}

interface SubSectionHeaderProps {
  label: string;
  total: number | null;
}

export function SubSectionHeader({ label, total }: SubSectionHeaderProps) {
  return (
    <div className="flex justify-between items-baseline border-b border-primary/10 pb-1 mb-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-sm font-bold tabular-nums text-primary">
        {formatND(total)}
      </span>
    </div>
  );
}

interface HighlightBoxProps {
  children: React.ReactNode;
}

export function HighlightBox({ children }: HighlightBoxProps) {
  return (
    <div className="highlight-box text-xs text-muted-foreground leading-relaxed">
      {children}
    </div>
  );
}

interface SectionSeparatorProps {
  label?: string;
  value?: string;
}

export function SectionSeparator({ label, value }: SectionSeparatorProps) {
  return (
    <div className="section-separator py-3 flex justify-between items-center">
      {label && (
        <span className="text-xs text-primary font-medium">{label}</span>
      )}
      {value && (
        <span className="text-xs font-bold text-primary">{value}</span>
      )}
    </div>
  );
}
