/**
 * Unit tests for the French social contributions engine V1
 * Tests based on the official 2025 rates JSON
 */

import { describe, it, expect } from 'vitest';
import { 
  computeSocialFromGross, 
  computeIS, 
  computeVAT,
  computePartSocialeV1,
  evalExpr,
  evalCondition 
} from './index';
import type { EmployeeInputs, CompanyInputs, SocialSettings } from './types';
import ratesJson from '../rates/fr/2025.json';

const PMSS = ratesJson.constants.PMSS; // 3925
const SMIC_MONTHLY = ratesJson.constants.SMIC_MONTHLY_35H; // 1801.80

describe('Expression Evaluator', () => {
  it('evaluates simple arithmetic', () => {
    expect(evalExpr('2 + 3', {})).toBe(5);
    expect(evalExpr('10 - 4', {})).toBe(6);
    expect(evalExpr('3 * 4', {})).toBe(12);
    expect(evalExpr('12 / 3', {})).toBe(4);
  });

  it('evaluates variables', () => {
    expect(evalExpr('grossMonthly', { grossMonthly: 3000 })).toBe(3000);
    expect(evalExpr('grossMonthly * 0.1', { grossMonthly: 3000 })).toBe(300);
  });

  it('evaluates min/max functions', () => {
    expect(evalExpr('min(100, 200)', {})).toBe(100);
    expect(evalExpr('max(100, 200)', {})).toBe(200);
    expect(evalExpr('min(grossMonthly, PMSS)', { grossMonthly: 5000, PMSS: 3925 })).toBe(3925);
  });

  it('evaluates comparisons', () => {
    expect(evalCondition('grossMonthly < PMSS', { grossMonthly: 3000, PMSS: 3925 })).toBe(true);
    expect(evalCondition('grossMonthly > PMSS', { grossMonthly: 5000, PMSS: 3925 })).toBe(true);
    expect(evalCondition('grossMonthly <= 2.25 * SMIC_MONTHLY_35H', { grossMonthly: 3000, SMIC_MONTHLY_35H: 1801.80 })).toBe(true);
  });

  it('evaluates boolean expressions', () => {
    expect(evalCondition('isCadre == true', { isCadre: true })).toBe(true);
    expect(evalCondition('isCadre == true', { isCadre: false })).toBe(false);
  });

  it('evaluates complex expressions', () => {
    const ctx = { grossMonthly: 5000, PMSS: 3925 };
    expect(evalExpr('min(max(grossMonthly - PMSS, 0), 7 * PMSS)', ctx)).toBe(1075);
  });
});

describe('Social Contributions - Salary Thresholds', () => {
  const defaultSettings: SocialSettings = {
    divisorMode: 'HEADCOUNT',
    headcount: 10,
    periodDate: '2025-12-01',
  };

  const defaultCompany: CompanyInputs = {
    companyHeadcount: 10,
  };

  it('brut < PMSS: vieillesse plafonnée uses full gross as base', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 3000, // < 3925
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const vieillesse = result.lines.find(l => l.id === 'vieillesse_plafonnee');
    
    expect(vieillesse).toBeDefined();
    expect(vieillesse!.base).toBe(3000); // t1 = min(3000, 3925) = 3000
    expect(vieillesse!.status).toBe('active');
  });

  it('brut > PMSS: vieillesse plafonnée is capped at PMSS', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 5000, // > 3925
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const vieillesse = result.lines.find(l => l.id === 'vieillesse_plafonnee');
    
    expect(vieillesse).toBeDefined();
    expect(vieillesse!.base).toBe(PMSS); // t1 = min(5000, 3925) = 3925
  });

  it('brut <= 2.25 * SMIC: maladie at 7%', () => {
    const threshold = 2.25 * SMIC_MONTHLY; // ~4054
    const employee: EmployeeInputs = {
      grossMonthly: 3500, // < 4054
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const maladie = result.lines.find(l => l.id === 'maladie_employer');
    
    expect(maladie).toBeDefined();
    // At 7% rate: 3500 * 0.07 = 245
    expect(maladie!.employerAmount).toBeCloseTo(245, 0);
  });

  it('brut > 2.25 * SMIC: maladie at 13%', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 5000, // > 4054
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const maladie = result.lines.find(l => l.id === 'maladie_employer');
    
    expect(maladie).toBeDefined();
    // At 13% rate: 5000 * 0.13 = 650
    expect(maladie!.employerAmount).toBeCloseTo(650, 0);
  });

  it('brut <= 3.3 * SMIC: allocations familiales at 3.45%', () => {
    const threshold = 3.3 * SMIC_MONTHLY; // ~5946
    const employee: EmployeeInputs = {
      grossMonthly: 4000, // < 5946
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const alloc = result.lines.find(l => l.id === 'allocations_familiales');
    
    expect(alloc).toBeDefined();
    // At 3.45%: 4000 * 0.0345 = 138
    expect(alloc!.employerAmount).toBeCloseTo(138, 0);
  });

  it('brut > 3.3 * SMIC: allocations familiales at 5.25%', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 7000, // > 5946
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const alloc = result.lines.find(l => l.id === 'allocations_familiales');
    
    expect(alloc).toBeDefined();
    // At 5.25%: 7000 * 0.0525 = 367.5
    expect(alloc!.employerAmount).toBeCloseTo(367.5, 0);
  });

  it('brut > PMSS: CET is active', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 5000, // > 3925
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const cet = result.lines.find(l => l.id === 'cet');
    
    expect(cet).toBeDefined();
    expect(cet!.status).toBe('active');
    expect(cet!.totalAmount).toBeGreaterThan(0);
  });

  it('brut <= PMSS: CET is inactive', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 3000, // <= 3925
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, defaultCompany, defaultSettings);
    const cet = result.lines.find(l => l.id === 'cet');
    
    expect(cet).toBeDefined();
    expect(cet!.status).toBe('inactive');
    expect(cet!.totalAmount).toBe(0);
  });
});

describe('Social Contributions - Company Size (FNAL)', () => {
  const defaultSettings: SocialSettings = {
    divisorMode: 'HEADCOUNT',
    headcount: 10,
    periodDate: '2025-12-01',
  };

  const employee: EmployeeInputs = {
    grossMonthly: 5000,
    isCadre: false,
    accidentAtMpRate: 0.0125,
  };

  it('headcount < 50: FNAL base = T1 (capped), rate = 0.1%', () => {
    const company: CompanyInputs = { companyHeadcount: 30 };
    const result = computeSocialFromGross(employee, company, defaultSettings);
    const fnal = result.lines.find(l => l.id === 'fnal');
    
    expect(fnal).toBeDefined();
    expect(fnal!.base).toBe(PMSS); // t1 = min(5000, 3925)
    // 0.1%: 3925 * 0.001 = 3.925
    expect(fnal!.employerAmount).toBeCloseTo(3.925, 2);
  });

  it('headcount >= 50: FNAL base = grossMonthly, rate = 0.5%', () => {
    const company: CompanyInputs = { companyHeadcount: 50 };
    const result = computeSocialFromGross(employee, company, defaultSettings);
    const fnal = result.lines.find(l => l.id === 'fnal');
    
    expect(fnal).toBeDefined();
    expect(fnal!.base).toBe(5000); // full gross
    // 0.5%: 5000 * 0.005 = 25
    expect(fnal!.employerAmount).toBeCloseTo(25, 0);
  });
});

describe('Social Contributions - Date Filtering', () => {
  const employee: EmployeeInputs = {
    grossMonthly: 4000,
    isCadre: false,
    accidentAtMpRate: 0.0125,
  };

  const company: CompanyInputs = { companyHeadcount: 20 };

  it('before 2025-05-01: chômage is not_applicable_yet', () => {
    const settings: SocialSettings = {
      divisorMode: 'HEADCOUNT',
      headcount: 10,
      periodDate: '2025-04-01', // Before effective date
    };

    const result = computeSocialFromGross(employee, company, settings);
    const chomage = result.lines.find(l => l.id === 'assurance_chomage');
    
    expect(chomage).toBeDefined();
    expect(chomage!.status).toBe('not_applicable_yet');
    expect(chomage!.totalAmount).toBe(0);
  });

  it('after 2025-05-01: chômage is active at 4%', () => {
    const settings: SocialSettings = {
      divisorMode: 'HEADCOUNT',
      headcount: 10,
      periodDate: '2025-06-01', // After effective date
    };

    const result = computeSocialFromGross(employee, company, settings);
    const chomage = result.lines.find(l => l.id === 'assurance_chomage');
    
    expect(chomage).toBeDefined();
    expect(chomage!.status).toBe('active');
    // 4% on capped base: min(4000, 4*3925) = 4000 * 0.04 = 160
    expect(chomage!.employerAmount).toBeCloseTo(160, 0);
  });
});

describe('Social Contributions - Cadre Status (APEC)', () => {
  const defaultSettings: SocialSettings = {
    divisorMode: 'HEADCOUNT',
    headcount: 10,
    periodDate: '2025-12-01',
  };

  const company: CompanyInputs = { companyHeadcount: 20 };

  it('cadre = true: APEC is active', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 4000,
      isCadre: true,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, company, defaultSettings);
    const apec = result.lines.find(l => l.id === 'apec');
    
    expect(apec).toBeDefined();
    expect(apec!.status).toBe('active');
    expect(apec!.totalAmount).toBeGreaterThan(0);
  });

  it('cadre = false: APEC is inactive', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 4000,
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, company, defaultSettings);
    const apec = result.lines.find(l => l.id === 'apec');
    
    expect(apec).toBeDefined();
    expect(apec!.status).toBe('inactive');
    expect(apec!.totalAmount).toBe(0);
  });
});

describe('CSG/CRDS Calculation', () => {
  const defaultSettings: SocialSettings = {
    divisorMode: 'HEADCOUNT',
    headcount: 10,
    periodDate: '2025-12-01',
  };

  const company: CompanyInputs = { companyHeadcount: 20 };

  it('CSG assiette = brut - 1.75% * min(brut, 4*PMSS)', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 5000,
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, company, defaultSettings);
    const csg = result.lines.find(l => l.id === 'csg');
    
    // csgAbatementBase = min(5000, 4*3925) * 0.0175 = 5000 * 0.0175 = 87.5
    // csgAssiette = 5000 - 87.5 = 4912.5
    expect(csg).toBeDefined();
    expect(csg!.base).toBeCloseTo(4912.5, 1);
  });

  it('CSG breakdown returns deductible and non-deductible amounts', () => {
    const employee: EmployeeInputs = {
      grossMonthly: 4000,
      isCadre: false,
      accidentAtMpRate: 0.0125,
    };

    const result = computeSocialFromGross(employee, company, defaultSettings);
    
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown!.csgDeductible).toBeDefined();
    expect(result.breakdown!.csgNonDeductible).toBeDefined();
    
    // csgAssiette = 4000 - (4000 * 0.0175) = 4000 - 70 = 3930
    // deductible = 3930 * 0.068 = 267.24
    // non-deductible = 3930 * 0.024 = 94.32
    expect(result.breakdown!.csgDeductible).toBeCloseTo(267.24, 0);
    expect(result.breakdown!.csgNonDeductible).toBeCloseTo(94.32, 0);
  });
});

describe('IS (Corporate Tax) Calculation', () => {
  const defaultSettings: SocialSettings = {
    divisorMode: 'HEADCOUNT',
    headcount: 10,
    periodDate: '2025-12-01',
  };

  it('without reduced rate: IS = 25% * profit', () => {
    const company: CompanyInputs = {
      companyHeadcount: 10,
      taxableProfitAnnual: 100000,
      isReducedRateEnabled: false,
    };

    const result = computeIS(company, defaultSettings);
    
    expect(result.isAnnual).toBe(25000); // 100000 * 0.25
    expect(result.isMonthlyPerPerson).toBeCloseTo(208.33, 1); // 25000 / 12 / 10
  });

  it('with reduced rate: IS = 15% on first 42500 + 25% on rest', () => {
    const company: CompanyInputs = {
      companyHeadcount: 10,
      taxableProfitAnnual: 100000,
      isReducedRateEnabled: true,
    };

    const result = computeIS(company, defaultSettings);
    
    // 15% * 42500 + 25% * (100000 - 42500)
    // = 6375 + 14375 = 20750
    expect(result.isAnnual).toBe(20750);
    expect(result.isReducedRateApplied).toBe(true);
  });

  it('missing taxableProfitAnnual returns null', () => {
    const company: CompanyInputs = {
      companyHeadcount: 10,
    };

    const result = computeIS(company, defaultSettings);
    
    expect(result.isAnnual).toBeNull();
    expect(result.diagnostics.missingInputs).toContain('taxableProfitAnnual');
  });
});

describe('VAT Calculation', () => {
  const defaultSettings: SocialSettings = {
    divisorMode: 'HEADCOUNT',
    headcount: 10,
    periodDate: '2025-12-01',
  };

  it('computes net VAT correctly', () => {
    const company: CompanyInputs = {
      companyHeadcount: 10,
      vat: {
        sales: [
          { rate: 0.20, baseHTAnnual: 100000 },
          { rate: 0.10, baseHTAnnual: 50000 },
        ],
        purchases: [
          { rate: 0.20, baseHTAnnual: 40000 },
        ],
      },
    };

    const result = computeVAT(company, defaultSettings);
    
    // Collected: 100000 * 0.20 + 50000 * 0.10 = 20000 + 5000 = 25000
    // Deductible: 40000 * 0.20 = 8000
    // Net: 25000 - 8000 = 17000
    expect(result.vatCollectedAnnual).toBe(25000);
    expect(result.vatDeductibleAnnual).toBe(8000);
    expect(result.vatNetAnnual).toBe(17000);
    expect(result.vatNetMonthlyPerPerson).toBeCloseTo(141.67, 1); // 17000 / 12 / 10
  });

  it('missing VAT data returns null', () => {
    const company: CompanyInputs = {
      companyHeadcount: 10,
    };

    const result = computeVAT(company, defaultSettings);
    
    expect(result.vatNetAnnual).toBeNull();
    expect(result.diagnostics.missingInputs).toContain('vat.sales');
  });
});

describe('Part Sociale V1 Integration', () => {
  it('aggregates all components correctly', () => {
    const result = computePartSocialeV1({
      settings: {
        divisorMode: 'HEADCOUNT',
        headcount: 10,
        periodDate: '2025-12-01',
      },
      employee: {
        grossMonthly: 4000,
        isCadre: false,
        accidentAtMpRate: 0.0125,
        irMonthly: 200,
      },
      company: {
        companyHeadcount: 10,
        taxableProfitAnnual: 50000,
        isReducedRateEnabled: true,
        vat: {
          sales: [{ rate: 0.20, baseHTAnnual: 100000 }],
          purchases: [{ rate: 0.20, baseHTAnnual: 40000 }],
        },
      },
    });

    expect(result.social.totals.socialContribFusionMonthly).toBeGreaterThan(0);
    expect(result.totals.irMonthly).toBe(200);
    expect(result.totals.isMonthlyPerPerson).toBeGreaterThan(0);
    expect(result.totals.vatNetMonthlyPerPerson).toBeGreaterThan(0);
    expect(result.totals.partSocialeTotalMonthly).toBeGreaterThan(0);
  });

  it('handles missing optional inputs gracefully', () => {
    const result = computePartSocialeV1({
      settings: {
        divisorMode: 'HEADCOUNT',
        headcount: 10,
        periodDate: '2025-12-01',
      },
      employee: {
        grossMonthly: 4000,
        isCadre: false,
        accidentAtMpRate: 0.0125,
      },
      company: {
        companyHeadcount: 10,
      },
    });

    expect(result.social.totals.socialContribFusionMonthly).toBeGreaterThan(0);
    expect(result.totals.irMonthly).toBeNull();
    expect(result.totals.isMonthlyPerPerson).toBeNull();
    expect(result.totals.vatNetMonthlyPerPerson).toBeNull();
    expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
  });
});
