/**
 * Compute social contributions from gross salary
 * Uses the official French 2025 rates JSON
 */

import { evalExpr, evalCondition } from './evaluator';
import type {
  RatesConfig,
  SocialSettings,
  EmployeeInputs,
  CompanyInputs,
  SocialResult,
  ContributionLine,
  ContributionStatus,
  ContributionConfig,
  ConditionalExpr,
  ConditionalRate,
} from './types';
import ratesJson from '../rates/fr/2025.json';

const defaultRates = ratesJson as RatesConfig;

interface ComputeContext extends Record<string, number | boolean> {
  grossMonthly: number;
  isCadre: boolean;
  accidentAtMpRate: number;
  companyHeadcount: number;
  PMSS: number;
  PASS: number;
  SMIC_MONTHLY_35H: number;
  chomageCapMonthly: number;
  csgAbatementBase: number;
  csgAssiette: number;
  t1: number;
  t2: number;
}

/**
 * Build evaluation context from inputs and config
 */
function buildContext(
  employee: EmployeeInputs,
  company: CompanyInputs,
  config: RatesConfig
): ComputeContext {
  const constants = config.constants;
  
  // Start with constants
  const ctx: ComputeContext = {
    grossMonthly: employee.grossMonthly,
    isCadre: employee.isCadre,
    accidentAtMpRate: employee.accidentAtMpRate,
    companyHeadcount: company.companyHeadcount,
    versementMobiliteRate: employee.versementMobiliteRate ?? 0,
    applyReductionGenerale: employee.applyReductionGenerale ?? false,
    // Constants from config
    PMSS: constants.PMSS,
    PASS: constants.PASS,
    SMIC_HOURLY: constants.SMIC_HOURLY,
    SMIC_MONTHLY_35H: constants.SMIC_MONTHLY_35H,
    CHOMAGE_CAP_MULTIPLIER_PMSS: constants.CHOMAGE_CAP_MULTIPLIER_PMSS,
    CSG_ABATTEMENT_RATE: constants.CSG_ABATTEMENT_RATE,
    CSG_ABATTEMENT_CAP_MULTIPLIER_PMSS: constants.CSG_ABATTEMENT_CAP_MULTIPLIER_PMSS,
    // Placeholders for derived (will be computed below)
    chomageCapMonthly: 0,
    csgAbatementBase: 0,
    csgAssiette: 0,
    t1: 0,
    t2: 0,
  };
  
  // Compute derived values
  for (const [key, expr] of Object.entries(config.derived)) {
    ctx[key] = evalExpr(expr, ctx);
  }
  
  return ctx;
}

/**
 * Resolve a conditional expression array to a value
 */
function resolveConditionalExpr(
  exprArray: ConditionalExpr[],
  ctx: ComputeContext
): number {
  for (const item of exprArray) {
    if (item.if && item.expr) {
      if (evalCondition(item.if, ctx)) {
        return evalExpr(item.expr, ctx);
      }
    } else if (item.else !== undefined) {
      return evalExpr(item.else, ctx);
    }
  }
  return 0;
}

/**
 * Resolve a conditional rate array to a value
 */
function resolveConditionalRate(
  rateArray: ConditionalRate[],
  ctx: ComputeContext
): number {
  for (const item of rateArray) {
    if (item.if && item.value !== undefined) {
      if (evalCondition(item.if, ctx)) {
        return item.value;
      }
    } else if (item.else !== undefined) {
      return item.else;
    }
  }
  return 0;
}

/**
 * Check if a contribution is applicable based on effectiveFrom date
 */
function isEffectiveAt(effectiveFrom: string | undefined, periodDate: string): boolean {
  if (!effectiveFrom) return true;
  return periodDate >= effectiveFrom;
}

/**
 * Compute a single contribution line
 */
function computeContributionLine(
  contrib: ContributionConfig,
  ctx: ComputeContext,
  periodDate: string
): ContributionLine {
  let status: ContributionStatus = 'active';
  let employeeAmount = 0;
  let employerAmount = 0;
  let base = 0;
  let formula = '';
  
  // Check effectiveFrom
  if (contrib.effectiveFrom && !isEffectiveAt(contrib.effectiveFrom, periodDate)) {
    return {
      id: contrib.id,
      label: contrib.label,
      base: 0,
      employeeAmount: 0,
      employerAmount: 0,
      totalAmount: 0,
      status: 'not_applicable_yet',
      formula: `Applicable from ${contrib.effectiveFrom}`,
      sources: [],
    };
  }
  
  // Check applyIf condition
  if (contrib.applyIf && !evalCondition(contrib.applyIf, ctx)) {
    return {
      id: contrib.id,
      label: contrib.label,
      base: 0,
      employeeAmount: 0,
      employerAmount: 0,
      totalAmount: 0,
      status: 'inactive',
      formula: `Condition not met: ${contrib.applyIf}`,
      sources: [],
    };
  }
  
  // Compute base
  if (typeof contrib.baseExpr === 'string') {
    base = evalExpr(contrib.baseExpr, ctx);
    formula = contrib.baseExpr;
  } else if (Array.isArray(contrib.baseExpr)) {
    base = resolveConditionalExpr(contrib.baseExpr, ctx);
    formula = 'conditional base';
  }
  
  // Compute rate(s)
  let rate = 0;
  let rateEmployee = 0;
  let rateEmployer = 0;
  
  if (contrib.payer === 'both') {
    rateEmployee = contrib.rateEmployee ?? 0;
    rateEmployer = contrib.rateEmployer ?? 0;
  } else {
    // Single payer
    if (contrib.rateExpr) {
      rate = evalExpr(contrib.rateExpr, ctx);
    } else if (typeof contrib.rate === 'number') {
      rate = contrib.rate;
    } else if (Array.isArray(contrib.rate)) {
      rate = resolveConditionalRate(contrib.rate, ctx);
    }
  }
  
  // Compute amounts based on payer
  switch (contrib.payer) {
    case 'employee':
      employeeAmount = base * rate;
      formula += ` × ${(rate * 100).toFixed(2)}%`;
      break;
    case 'employer':
      employerAmount = base * rate;
      formula += ` × ${(rate * 100).toFixed(2)}%`;
      break;
    case 'both':
      employeeAmount = base * rateEmployee;
      employerAmount = base * rateEmployer;
      formula += ` × (${(rateEmployee * 100).toFixed(2)}% sal. + ${(rateEmployer * 100).toFixed(2)}% emp.)`;
      break;
  }
  
  return {
    id: contrib.id,
    label: contrib.label,
    base,
    employeeAmount,
    employerAmount,
    totalAmount: employeeAmount + employerAmount,
    status,
    formula,
    sources: [],
  };
}

/**
 * Main function: compute all social contributions from gross salary
 */
export function computeSocialFromGross(
  employee: EmployeeInputs,
  company: CompanyInputs,
  settings: SocialSettings,
  config: RatesConfig = defaultRates
): SocialResult {
  const diagnostics = {
    missingInputs: [] as string[],
    warnings: [] as string[],
  };
  
  // Validate required inputs
  if (employee.grossMonthly === undefined || employee.grossMonthly === null) {
    diagnostics.missingInputs.push('grossMonthly');
  }
  if (employee.accidentAtMpRate === undefined || employee.accidentAtMpRate === null) {
    diagnostics.missingInputs.push('accidentAtMpRate');
  }
  if (company.companyHeadcount === undefined || company.companyHeadcount === null) {
    diagnostics.missingInputs.push('companyHeadcount');
  }
  
  // Return empty result if critical inputs missing
  if (diagnostics.missingInputs.length > 0) {
    return {
      lines: [],
      totals: {
        employeeContribMonthly: 0,
        employerContribMonthly: 0,
        csgCrdsMonthly: 0,
        socialContribFusionMonthly: 0,
      },
      diagnostics,
    };
  }
  
  // Build context
  const ctx = buildContext(employee, company, config);
  const periodDate = settings.periodDate ?? '2025-12-01';
  
  // Compute all contribution lines
  const lines: ContributionLine[] = [];
  let csgDeductible: number | undefined;
  let csgNonDeductible: number | undefined;
  
  for (const contrib of config.contributions) {
    const line = computeContributionLine(contrib, ctx, periodDate);
    lines.push(line);
    
    // Handle CSG breakdown
    if (contrib.id === 'csg' && contrib.breakdown && line.status === 'active') {
      csgDeductible = line.base * contrib.breakdown.deductible_ir;
      csgNonDeductible = line.base * contrib.breakdown.non_deductible_ir;
    }
  }
  
  // Compute totals
  let employeeContribMonthly = 0;
  let employerContribMonthly = 0;
  let csgCrdsMonthly = 0;
  
  for (const line of lines) {
    if (line.status !== 'active') continue;
    
    // CSG and CRDS go into their own category
    if (line.id === 'csg' || line.id === 'crds') {
      csgCrdsMonthly += line.employeeAmount;
    } else {
      employeeContribMonthly += line.employeeAmount;
      employerContribMonthly += line.employerAmount;
    }
  }
  
  // IR warning
  if (employee.irMonthly === undefined) {
    diagnostics.warnings.push('IR ND: missing employee.irMonthly');
  }
  
  return {
    lines,
    totals: {
      employeeContribMonthly,
      employerContribMonthly,
      csgCrdsMonthly,
      socialContribFusionMonthly: employeeContribMonthly + employerContribMonthly + csgCrdsMonthly,
    },
    breakdown: {
      csgDeductible,
      csgNonDeductible,
    },
    diagnostics,
  };
}
