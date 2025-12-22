/**
 * Types for the French social contributions calculation engine V1
 * Based on the official 2025 rates JSON
 */

// ============================================
// CONFIG TYPES (from JSON)
// ============================================

export interface RatesConfig {
  meta: {
    country: string;
    year: number;
    currency: string;
    notes: string[];
  };
  constants: Record<string, number>;
  tax_rates: {
    vat_rates: number[];
    cit_is: {
      normal_rate: number;
      reduced_rate: number;
      reduced_cap_profit: number;
      reduced_conditions: string;
    };
  };
  inputs_required: Record<string, string>;
  derived: Record<string, string>;
  contributions: ContributionConfig[];
  reduction_generale: {
    enabledByInput: string;
    annualFormula: string;
    T_values_2025: {
      lt50: { jan_to_apr: number; may_to_dec: number };
      ge50: { jan_to_apr: number; may_to_dec: number };
    };
    notes: string[];
  };
}

export interface ContributionConfig {
  id: string;
  label: string;
  payer: 'employee' | 'employer' | 'both';
  baseExpr: string | ConditionalExpr[];
  rate?: number | ConditionalRate[];
  rateExpr?: string;
  rateEmployee?: number;
  rateEmployer?: number;
  applyIf?: string;
  effectiveFrom?: string;
  breakdown?: {
    deductible_ir: number;
    non_deductible_ir: number;
  };
}

export interface ConditionalExpr {
  if?: string;
  expr?: string;
  else?: string;
}

export interface ConditionalRate {
  if?: string;
  value?: number;
  else?: number;
}

// ============================================
// INPUT TYPES
// ============================================

export interface SocialSettings {
  year?: number;
  divisorMode: 'HEADCOUNT' | 'FTE';
  headcount?: number;
  fte?: number;
  periodDate?: string; // ISO date, e.g., '2025-12-01'
}

export interface EmployeeInputs {
  grossMonthly: number;
  isCadre: boolean;
  irMonthly?: number; // manual, optional
  accidentAtMpRate: number; // required, e.g., 0.0125
  versementMobiliteRate?: number;
  applyReductionGenerale?: boolean;
}

export interface VATSalesItem {
  rate: number;
  baseHTAnnual: number;
}

export interface CompanyInputs {
  companyHeadcount: number;
  taxableProfitAnnual?: number;
  isReducedRateEnabled?: boolean;
  vat?: {
    sales: VATSalesItem[];
    purchases: VATSalesItem[];
  };
}

// ============================================
// OUTPUT TYPES
// ============================================

export type ContributionStatus = 'active' | 'inactive' | 'not_applicable_yet';

export interface ContributionLine {
  id: string;
  label: string;
  base: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  status: ContributionStatus;
  formula: string;
  sources: string[];
}

export interface SocialResult {
  lines: ContributionLine[];
  totals: {
    employeeContribMonthly: number;
    employerContribMonthly: number;
    csgCrdsMonthly: number;
    socialContribFusionMonthly: number;
  };
  breakdown?: {
    csgDeductible?: number;
    csgNonDeductible?: number;
  };
  diagnostics: {
    missingInputs: string[];
    warnings: string[];
  };
}

export interface ISResult {
  taxableProfitAnnual: number | null;
  isAnnual: number | null;
  isMonthlyPerPerson: number | null;
  isReducedRateApplied: boolean;
  formula: string;
  diagnostics: {
    missingInputs: string[];
    warnings: string[];
  };
}

export interface VATResult {
  vatCollectedAnnual: number | null;
  vatDeductibleAnnual: number | null;
  vatNetAnnual: number | null;
  vatNetMonthlyPerPerson: number | null;
  formula: string;
  diagnostics: {
    missingInputs: string[];
    warnings: string[];
  };
}

export interface PartSocialeV1Result {
  social: SocialResult;
  is: ISResult;
  vat: VATResult;
  irMonthly: number | null;
  divisor: number | null;
  totals: {
    socialContribFusionMonthly: number;
    irMonthly: number | null;
    isMonthlyPerPerson: number | null;
    vatNetMonthlyPerPerson: number | null;
    partSocialeTotalMonthly: number | null;
  };
  diagnostics: {
    missingInputs: string[];
    warnings: string[];
  };
}
