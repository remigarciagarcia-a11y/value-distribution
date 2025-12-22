// ============================================
// UNIT TESTS - Part Sociale Automation
// ============================================

import { describe, it, expect } from 'vitest';
import {
  computeDivisor,
  annualToMonthlyPerPerson,
  computeSocialContributions,
  computeIS,
  computeVAT,
  computePartSociale,
  defaultEmployeeInputs,
  defaultCompanyInputs,
  defaultSocialAutomationConfig,
  defaultAutomatedSettings,
} from './index';

describe('computeDivisor', () => {
  it('returns headcount when mode is HEADCOUNT', () => {
    const result = computeDivisor({ ...defaultAutomatedSettings, headcount: 10 });
    expect(result.divisor).toBe(10);
    expect(result.missingInputs).toHaveLength(0);
  });

  it('returns FTE when mode is FTE', () => {
    const result = computeDivisor({ ...defaultAutomatedSettings, divisorMode: 'FTE', fte: 8.5 });
    expect(result.divisor).toBe(8.5);
  });

  it('returns ND when headcount missing', () => {
    const result = computeDivisor({ ...defaultAutomatedSettings, headcount: null });
    expect(result.divisor).toBeNull();
    expect(result.missingInputs).toContain('settings.headcount');
  });
});

describe('annualToMonthlyPerPerson', () => {
  it('converts correctly', () => {
    expect(annualToMonthlyPerPerson(120000, 10)).toBe(1000); // 120000 / (12 * 10)
  });

  it('returns null for null inputs', () => {
    expect(annualToMonthlyPerPerson(null, 10)).toBeNull();
    expect(annualToMonthlyPerPerson(120000, null)).toBeNull();
  });
});

describe('computeIS', () => {
  const settings = { ...defaultAutomatedSettings, headcount: 10 };
  const automation = defaultSocialAutomationConfig;

  it('calculates IS at normal rate (25%)', () => {
    const company = { ...defaultCompanyInputs, taxableProfitAnnual: 100000 };
    const result = computeIS(company, settings, automation);
    expect(result.annual).toBe(25000);
    expect(result.monthlyPerPerson).toBeCloseTo(208.33, 1);
  });

  it('applies reduced rate when enabled', () => {
    const company = { ...defaultCompanyInputs, taxableProfitAnnual: 50000, isReducedRateEnabled: true };
    const result = computeIS(company, settings, automation);
    // 42500 * 15% + 7500 * 25% = 6375 + 1875 = 8250
    expect(result.annual).toBe(8250);
    expect(result.tranches).toHaveLength(2);
  });

  it('returns 0 for loss', () => {
    const company = { ...defaultCompanyInputs, taxableProfitAnnual: -10000 };
    const result = computeIS(company, settings, automation);
    expect(result.annual).toBe(0);
  });

  it('returns ND when profit missing', () => {
    const result = computeIS(defaultCompanyInputs, settings, automation);
    expect(result.annual).toBeNull();
    expect(result.missingInputs).toContain('company.taxableProfitAnnual');
  });
});

describe('computeVAT', () => {
  const settings = { ...defaultAutomatedSettings, headcount: 10 };
  const automation = defaultSocialAutomationConfig;

  it('calculates net VAT correctly', () => {
    const company = {
      ...defaultCompanyInputs,
      vatSales: [{ rate: 0.20, baseHTAnnual: 500000 }],
      vatPurchases: [{ rate: 0.20, baseHTAnnual: 200000 }],
    };
    const result = computeVAT(company, settings, automation);
    expect(result.collectedAnnual).toBe(100000); // 500k * 20%
    expect(result.deductibleAnnual).toBe(40000); // 200k * 20%
    expect(result.netAnnual).toBe(60000);
    expect(result.netMonthlyPerPerson).toBeCloseTo(500, 1);
  });

  it('returns ND when VAT data missing', () => {
    const result = computeVAT(defaultCompanyInputs, settings, automation);
    expect(result.netAnnual).toBeNull();
    expect(result.missingInputs.length).toBeGreaterThan(0);
  });
});

describe('computeSocialContributions', () => {
  const settings = { ...defaultAutomatedSettings, headcount: 1 };
  const automation = defaultSocialAutomationConfig;

  it('calculates contributions from brut monthly', () => {
    const employee = { ...defaultEmployeeInputs, brutMonthly: 4000, status: 'cadre' as const };
    const result = computeSocialContributions(employee, settings, automation);
    expect(result.totalMonthly).toBeGreaterThan(0);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('returns ND when brutMonthly missing', () => {
    const result = computeSocialContributions(defaultEmployeeInputs, settings, automation);
    expect(result.totalMonthly).toBeNull();
    expect(result.missingInputs).toContain('employee.brutMonthly');
  });
});
