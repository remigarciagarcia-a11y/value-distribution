import { formatND, formatCurrencyCompact } from '@/lib/types';
import type { LineValue, PartTotal } from '@/lib/types';

interface SectionLineProps {
  line: LineValue;
  showPct?: boolean;
}

export function SectionLine({ line, showPct = false }: SectionLineProps) {
  return (
    <div className="flex justify-between items-baseline py-0.5">
      <span className="text-sm text-foreground/80">{line.label}</span>
      <span className="text-sm font-medium tabular-nums">
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
