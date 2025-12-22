// ============================================
// AUTOMATION TYPES - Part Sociale
// France Only - V1
// ============================================

// ===== AUTOMATION MODE =====

export type AutomationModeType = 'auto' | 'manual';

export interface AutomationMode {
  mode: AutomationModeType;
  /** Manual override value (annual amount) */
  manualValueAnnual?: number | null;
  /** Manual override value (monthly amount) */
  manualValueMonthly?: number | null;
}

// ===== RESULT TYPES =====

export interface CalculationResult<T = number> {
  value: T | null;
  formula: string;
  sources: string[];
  assumptions: string[];
  missingInputs: string[];
}

export interface ContributionLine {
  label: string;
  category: 'health' | 'retirement' | 'unemployment' | 'solidarity' | 'csg_crds' | 'other';
  baseUsed: 'brut_total' | 'brut_plafonne_pmss' | 'custom';
  rate: number;
  /** Base amount used for calculation */
  baseAmount: number | null;
  /** Monthly value per person */
  valueMonthly: number | null;
  formula: string;
}

export interface SocialContributionsResult extends CalculationResult {
  lines: ContributionLine[];
  totalMonthly: number | null;
  totalAnnual: number | null;
}

export interface ISResult extends CalculationResult {
  annual: number | null;
  monthlyPerPerson: number | null;
  tranches: {
    label: string;
    base: number;
    rate: number;
    amount: number;
  }[];
}

export interface VATResult extends CalculationResult {
  collectedAnnual: number | null;
  deductibleAnnual: number | null;
  netAnnual: number | null;
  netMonthlyPerPerson: number | null;
  salesBreakdown: { rate: number; baseHT: number; vatAmount: number }[];
  purchasesBreakdown: { rate: number; baseHT: number; vatAmount: number }[];
}

export interface PartSocialeAutomatedResult {
  cotisations: SocialContributionsResult;
  is: ISResult;
  vat: VATResult;
  ir: CalculationResult;
  total: {
    monthlyPerPerson: number | null;
    isPartial: boolean;
    formula: string;
  };
  diagnostics: PartSocialeDiagnostic[];
}

export interface PartSocialeDiagnostic {
  type: 'warning' | 'info' | 'error';
  code: string;
  message: string;
  field?: string;
}

// ===== INPUT TYPES =====

export interface AutomatedSettings {
  year: number;
  divisorMode: 'HEADCOUNT' | 'FTE';
  headcount: number | null;
  fte: number | null;
}

export type EmployeeStatus = 'cadre' | 'non_cadre';

export interface EmployeeInputs {
  /** Gross monthly salary */
  brutMonthly: number | null;
  /** Net salary after income tax (monthly) */
  netAfterIrMonthly: number | null;
  /** Income tax amount (monthly) */
  irMonthly: number | null;
  /** Employee status (affects some rates) */
  status: EmployeeStatus;
  /** Bonuses - array of monthly amounts */
  primes: { label: string; montant: number | null }[];
  /** Benefits - array of monthly amounts */
  avantages: { label: string; montant: number | null }[];
}

export interface VATLine {
  rate: number; // e.g., 0.20 for 20%
  baseHTAnnual: number;
}

export interface CompanyInputs {
  /** Annual revenue HT (Chiffre d'affaires HT annuel) */
  caAnnualHT: number | null;
  /** Annual taxable profit (Bénéfice imposable annuel) */
  taxableProfitAnnual: number | null;
  /** Enable reduced IS rate (15% up to 42,500€) */
  isReducedRateEnabled: boolean;
  /** Reduced rate cap (default 42,500€) */
  isReducedRateCap: number;
  /** VAT collected on sales */
  vatSales: VATLine[];
  /** VAT paid on purchases */
  vatPurchases: VATLine[];
}

export interface SocialAutomationConfig {
  /** Cotisations sociales mode */
  contribMode: AutomationMode;
  /** Impôt sur les sociétés mode */
  isMode: AutomationMode;
  /** TVA mode */
  vatMode: AutomationMode;
}

// ===== RATE CONFIGURATION TYPES =====

export interface ContributionRateConfig {
  id: string;
  label: string;
  labelFr: string;
  category: ContributionLine['category'];
  /** Base for calculation */
  base: 'brut_total' | 'brut_plafonne_pmss';
  /** Rate as decimal (e.g., 0.07 for 7%) */
  rateEmployer: number;
  rateEmployee: number;
  /** Total rate (employer + employee) */
  rateTotal: number;
  /** Applicable to cadre only */
  cadreOnly?: boolean;
  /** Applicable to non-cadre only */
  nonCadreOnly?: boolean;
  /** Notes about the contribution */
  notes?: string;
}

export interface SocialRatesConfig {
  year: number;
  pmss: {
    monthly: number;
    annual: number;
    notes: string;
  };
  contributions: ContributionRateConfig[];
  sources: string[];
  lastUpdated: string;
}

// ===== AGGREGATED INPUT FOR AUTOMATION =====

export interface PartSocialeAutomationInputs {
  settings: AutomatedSettings;
  employee: EmployeeInputs;
  company: CompanyInputs;
  automation: SocialAutomationConfig;
}

// ===== DEFAULT VALUES =====

export const defaultAutomationMode: AutomationMode = {
  mode: 'auto',
  manualValueAnnual: null,
  manualValueMonthly: null,
};

export const defaultEmployeeInputs: EmployeeInputs = {
  brutMonthly: null,
  netAfterIrMonthly: null,
  irMonthly: null,
  status: 'cadre',
  primes: [],
  avantages: [],
};

export const defaultCompanyInputs: CompanyInputs = {
  caAnnualHT: null,
  taxableProfitAnnual: null,
  isReducedRateEnabled: false,
  isReducedRateCap: 42500,
  vatSales: [],
  vatPurchases: [],
};

export const defaultSocialAutomationConfig: SocialAutomationConfig = {
  contribMode: { ...defaultAutomationMode },
  isMode: { ...defaultAutomationMode },
  vatMode: { ...defaultAutomationMode },
};

export const defaultAutomatedSettings: AutomatedSettings = {
  year: 2025,
  divisorMode: 'HEADCOUNT',
  headcount: null,
  fte: null,
};
