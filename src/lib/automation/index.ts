// ============================================
// AUTOMATION MODULE - Public API
// ============================================

// Types
export type {
  AutomationMode,
  AutomationModeType,
  AutomatedSettings,
  EmployeeInputs,
  EmployeeStatus,
  CompanyInputs,
  VATLine,
  SocialAutomationConfig,
  PartSocialeAutomationInputs,
  CalculationResult,
  ContributionLine,
  SocialContributionsResult,
  ISResult,
  VATResult,
  EmployeeSalaryResult,
  PartSocialeAutomatedResult,
  PartSocialeDiagnostic,
  SocialRatesConfig,
  ContributionRateConfig,
} from './types';

// Default values
export {
  defaultAutomationMode,
  defaultEmployeeInputs,
  defaultCompanyInputs,
  defaultSocialAutomationConfig,
  defaultAutomatedSettings,
} from './types';

// Calculators
export { computeDivisor, annualToMonthlyPerPerson, monthlyToAnnual, monthlyPerPersonToAnnual } from './calculators/divisor';
export { computeSocialContributions, aggregateContributionsByCategory } from './calculators/socialContributions';
export { computeEmployeeSalary } from './calculators/employeeSalary';
export { computeIS } from './calculators/corporateTax';
export { computeVAT, FRENCH_VAT_RATES } from './calculators/vat';
export { computePartSociale, toPartSocialeVM } from './calculators/partSociale';

// Rates
import ratesFr2025 from './rates/fr/2025/social.json';
export { ratesFr2025 };
