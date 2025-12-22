// Types for the "Relevé de contribution mensuel" simulator

// ===== ENUMS =====
export type PonderationType = 'HEADCOUNT' | 'FTE';
export type EmployeeStatusType = 'cadre' | 'non_cadre';
export type AutoModeType = 'auto' | 'manual';

// ===== INPUT TYPES =====

export interface BaseInputs {
  anneeReference: string;
  caAnnuelHT: number | null;
  ponderation: PonderationType;
  effectif: number | null;
  etp: number | null;
}

export interface CapitalInputs {
  dividendes: number | null;
  reserves: number | null;
  interetsCapital: number | null;
}

export interface OrganisationInputs {
  achatsMatieresEtSousTraitance: number | null;
  chargesExternes: number | null;
  interetsDette: number | null;
  locauxEnergie: number | null;
  outilsIT: number | null;
  managementIntermediaire: number | null;
  fonctionsSupport: number | null;
}

export interface InvestissementInputs {
  amortissements: number | null;
  formation: number | null;
  rAndD: number | null;
}

// ===== AUTOMATION INPUTS =====

export interface AutoModeConfig {
  mode: AutoModeType;
  manualValue: number | null;
}

export interface EmployeeAutomationInputs {
  grossMonthly: number | null;
  /** @deprecated Use grossMonthly instead */
  brutMonthly?: number | null;
  status: EmployeeStatusType;
  /** PAS rate (0-1, e.g., 0.12 for 12%) */
  pasRate: number | null;
  /** Manual IR override (monthly) */
  irMonthlyManual: number | null;
}

export interface CompanyAutomationInputs {
  taxableProfitAnnual: number | null;
  isReducedRateEnabled: boolean;
}

export interface VATLineInput {
  id: string;
  rate: number;
  baseHTAnnual: number | null;
}

export interface VATAutomationInputs {
  sales: VATLineInput[];
  purchases: VATLineInput[];
}

export interface SocialeAutomationConfig {
  cotisationsMode: AutoModeConfig;
  irMode: AutoModeConfig;
  isMode: AutoModeConfig;
  vatMode: AutoModeConfig;
}

export interface SocialeInputs {
  // Legacy manual values (used when mode = manual)
  sante: number | null;
  retraite: number | null;
  chomage: number | null;
  solidarite: number | null;
  csgCrds: number | null;
  impotRevenu: number | null;
  impotSocietes: number | null;
  // Automation inputs
  employee: EmployeeAutomationInputs;
  company: CompanyAutomationInputs;
  vat: VATAutomationInputs;
  automation: SocialeAutomationConfig;
}

export interface SalarieIdentite {
  nom: string;
  adresse: string;
  poste: string;
  statut: string;
  anciennete: string;
  moisAffiche: string;
}

export interface PrimeOuAvantage {
  id: string;
  label: string;
  montant: number | null;
}

export interface PartPersonnelleInputs {
  salaireNetApresIR: number | null;
  primes: PrimeOuAvantage[];
  avantages: PrimeOuAvantage[];
}

export interface DeficitDette {
  montantDeficit: number | null;
  dontSecuriteSociale: number | null;
}

export interface SimulatorInputs {
  base: BaseInputs;
  capital: CapitalInputs;
  organisation: OrganisationInputs;
  investissement: InvestissementInputs;
  sociale: SocialeInputs;
  salarie: SalarieIdentite;
  partPersonnelle: PartPersonnelleInputs;
  deficitDette: DeficitDette;
  mode: 'simple' | 'detailed';
}

// ===== VIEW MODEL TYPES =====

export interface LineValue {
  label: string;
  value: number | null;  // null = ND
  pct: number | null;    // null = cannot calculate
  rate?: number | null;  // rate as decimal (e.g., 0.07 for 7%)
  rateEmployee?: number | null;  // employee portion rate
  rateEmployer?: number | null;  // employer portion rate
  isPartial?: boolean;
  formulaText?: string;
  sourceFields?: string[];
}

export interface PartTotal {
  total: number | null;
  pct: number | null;
  isPartial: boolean;
}

export interface PartCapitalVM {
  lines: LineValue[];
  total: PartTotal;
}

export interface PartOrganisationVM {
  lines: LineValue[];
  total: PartTotal;
}

export interface PartInvestissementVM {
  lines: LineValue[];
  total: PartTotal;
}

export interface PartFonctionnelleVM {
  organisation: PartOrganisationVM;
  investissement: PartInvestissementVM;
  total: PartTotal;
}

export interface PartSocialeVM {
  lines: LineValue[];
  total: PartTotal;
}

export interface PartPersonnelleVM {
  salaireLine: LineValue;
  primeLines: LineValue[];
  avantageLines: LineValue[];
  total: PartTotal;
}

export interface StackedBarSegment {
  key: 'capital' | 'fonctionnelle' | 'sociale' | 'personnelle';
  pct: number;
  isND: boolean;
  label: string;
}

export interface StackedBarVM {
  segments: StackedBarSegment[];
  overflowPct: number | null;
  totalPct: number;
}

export interface Diagnostic {
  type: 'warning' | 'info' | 'error';
  message: string;
}

export interface BulletinViewModel {
  meta: {
    periode: string;
    poste: string;
    statut: string;
    anciennete: string;
    nom: string;
    adresse: string;
  };
  settings: {
    ponderation: PonderationType;
    diviseur: number | null;
    annee: string;
  };
  vp: {
    value: number | null;
    pct: 100;
    formula: string;
  };
  resteARedistribuer: {
    value: number | null;
    formula: string;
  };
  parts: {
    capital: PartCapitalVM;
    fonctionnelle: PartFonctionnelleVM;
    sociale: PartSocialeVM;
    personnelle: PartPersonnelleVM;
  };
  deficitDette: {
    montant: number | null;
    dontSecuriteSociale: number | null;
  };
  stackedBar: StackedBarVM;
  diagnostics: Diagnostic[];
}

// ===== HELPER TYPES =====

export type NDValue = number | 'ND';

export function formatND(value: number | null): string {
  return value !== null ? formatCurrency(value) : 'ND';
}

export function formatPctND(value: number | null): string {
  return value !== null ? `${value.toFixed(1)} %` : '—';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value)) + ' €';
}

export function formatCurrencyCompact(value: number): string {
  // Format with space as thousands separator, bold numbers style
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return formatted + ' €';
}
