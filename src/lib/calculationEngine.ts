// Pure calculation engine for the simulator
// All functions are pure and testable

import type {
  SimulatorInputs,
  BulletinViewModel,
  LineValue,
  PartTotal,
  PartCapitalVM,
  PartOrganisationVM,
  PartInvestissementVM,
  PartFonctionnelleVM,
  PartSocialeVM,
  PartPersonnelleVM,
  StackedBarVM,
  StackedBarSegment,
  Diagnostic,
} from './types';

// ===== CORE CALCULATIONS =====

/**
 * Get the divisor based on ponderation type
 */
export function getDiviseur(inputs: SimulatorInputs): number | null {
  const { base } = inputs;
  if (base.ponderation === 'HEADCOUNT') {
    return base.effectif;
  }
  return base.etp;
}

/**
 * Calculate Valeur Produite (VP)
 * VP = CA_annuel / (12 × Diviseur)
 */
export function calculateVP(inputs: SimulatorInputs): { value: number | null; formula: string } {
  const { base } = inputs;
  const diviseur = getDiviseur(inputs);
  
  if (base.caAnnuelHT === null || diviseur === null || diviseur === 0) {
    return {
      value: null,
      formula: 'VP = CA annuel / (12 × Diviseur)',
    };
  }
  
  const vp = base.caAnnuelHT / (12 * diviseur);
  return {
    value: vp,
    formula: `VP = ${base.caAnnuelHT.toLocaleString('fr-FR')} € / (12 × ${diviseur}) = ${Math.round(vp).toLocaleString('fr-FR')} €`,
  };
}

/**
 * Convert annual enterprise value to monthly per person
 */
export function annualToMonthlyPerPerson(annual: number | null, diviseur: number | null): number | null {
  if (annual === null || diviseur === null || diviseur === 0) {
    return null;
  }
  return annual / (12 * diviseur);
}

/**
 * Calculate percentage relative to VP
 */
export function calculatePct(value: number | null, vp: number | null): number | null {
  if (value === null || vp === null || vp === 0) {
    return null;
  }
  return (value / vp) * 100;
}

/**
 * Sum values, returning null if all are null, or partial sum if some are null
 */
export function sumValues(values: (number | null)[]): { total: number | null; isPartial: boolean } {
  const nonNullValues = values.filter((v): v is number => v !== null);
  
  if (nonNullValues.length === 0) {
    return { total: null, isPartial: false };
  }
  
  const total = nonNullValues.reduce((a, b) => a + b, 0);
  const isPartial = nonNullValues.length < values.length;
  
  return { total, isPartial };
}

// ===== PART CALCULATIONS =====

export function calculatePartCapital(inputs: SimulatorInputs, vp: number | null): PartCapitalVM {
  const diviseur = getDiviseur(inputs);
  const { capital } = inputs;
  
  const lines: LineValue[] = [
    {
      label: 'Dividendes / intérêts',
      value: annualToMonthlyPerPerson(capital.dividendes, diviseur),
      pct: null,
      sourceFields: ['dividendes'],
    },
    {
      label: 'Réserves libres non affectées',
      value: annualToMonthlyPerPerson(capital.reserves, diviseur),
      pct: null,
      sourceFields: ['reserves'],
    },
  ];
  
  // Add interest capital if present
  if (capital.interetsCapital !== null) {
    lines[0].value = (lines[0].value || 0) + annualToMonthlyPerPerson(capital.interetsCapital, diviseur)!;
  }
  
  // Calculate percentages
  lines.forEach(line => {
    line.pct = calculatePct(line.value, vp);
  });
  
  const { total, isPartial } = sumValues(lines.map(l => l.value));
  
  return {
    lines,
    total: {
      total,
      pct: calculatePct(total, vp),
      isPartial,
    },
  };
}

export function calculatePartOrganisation(inputs: SimulatorInputs, vp: number | null): PartOrganisationVM {
  const diviseur = getDiviseur(inputs);
  const { organisation } = inputs;
  
  const lines: LineValue[] = [
    {
      label: 'Locaux, énergie, sites multiples',
      value: annualToMonthlyPerPerson(organisation.locauxEnergie ?? organisation.chargesExternes, diviseur),
      pct: null,
    },
    {
      label: 'IT interne, outils, infra',
      value: annualToMonthlyPerPerson(organisation.outilsIT, diviseur),
      pct: null,
    },
    {
      label: 'Management intermédiaire',
      value: annualToMonthlyPerPerson(organisation.managementIntermediaire, diviseur),
      pct: null,
    },
    {
      label: 'Fonctions support (RH, finance, juridique...)',
      value: annualToMonthlyPerPerson(organisation.fonctionsSupport, diviseur),
      pct: null,
    },
  ];
  
  // Filter out null lines for display, but keep track
  const displayLines = lines.filter(l => l.value !== null);
  
  displayLines.forEach(line => {
    line.pct = calculatePct(line.value, vp);
  });
  
  const { total, isPartial } = sumValues(lines.map(l => l.value));
  
  return {
    lines: displayLines.length > 0 ? displayLines : lines.slice(0, 2), // Show at least 2 lines
    total: {
      total,
      pct: calculatePct(total, vp),
      isPartial,
    },
  };
}

export function calculatePartInvestissement(inputs: SimulatorInputs, vp: number | null): PartInvestissementVM {
  const diviseur = getDiviseur(inputs);
  const { investissement } = inputs;
  
  const lines: LineValue[] = [
    {
      label: 'Amortissements',
      value: annualToMonthlyPerPerson(investissement.amortissements, diviseur),
      pct: null,
    },
    {
      label: 'Formation / upskilling',
      value: annualToMonthlyPerPerson(investissement.formation, diviseur),
      pct: null,
    },
    {
      label: 'R&D / innovation',
      value: annualToMonthlyPerPerson(investissement.rAndD, diviseur),
      pct: null,
    },
  ];
  
  lines.forEach(line => {
    line.pct = calculatePct(line.value, vp);
  });
  
  const { total, isPartial } = sumValues(lines.map(l => l.value));
  
  return {
    lines,
    total: {
      total,
      pct: calculatePct(total, vp),
      isPartial,
    },
  };
}

export function calculatePartFonctionnelle(inputs: SimulatorInputs, vp: number | null): PartFonctionnelleVM {
  const organisation = calculatePartOrganisation(inputs, vp);
  const investissement = calculatePartInvestissement(inputs, vp);
  
  const orgTotal = organisation.total.total;
  const invTotal = investissement.total.total;
  
  const { total, isPartial } = sumValues([orgTotal, invTotal]);
  
  return {
    organisation,
    investissement,
    total: {
      total,
      pct: calculatePct(total, vp),
      isPartial: organisation.total.isPartial || investissement.total.isPartial || isPartial,
    },
  };
}

export function calculatePartSociale(inputs: SimulatorInputs, vp: number | null): PartSocialeVM {
  const { sociale } = inputs;
  
  // Social contributions are already monthly per person
  const lines: LineValue[] = [
    { label: 'Santé', value: sociale.sante, pct: null },
    { label: 'Retraite', value: sociale.retraite, pct: null },
    { label: 'Chômage / sécurisation des parcours', value: sociale.chomage, pct: null },
    { label: 'Solidarité, famille, autres', value: sociale.solidarite, pct: null },
    { label: 'CSG / CRDS', value: sociale.csgCrds, pct: null },
    { label: 'Impôt sur le revenu (7%)', value: sociale.impotRevenu, pct: null },
  ];
  
  // Add IS converted from annual
  const diviseur = getDiviseur(inputs);
  if (sociale.impotSocietes !== null && diviseur !== null) {
    const isMonthly = annualToMonthlyPerPerson(sociale.impotSocietes, diviseur);
    // IS is included in sociale but displayed separately in reference
  }
  
  lines.forEach(line => {
    line.pct = calculatePct(line.value, vp);
  });
  
  const { total, isPartial } = sumValues(lines.map(l => l.value));
  
  return {
    lines: lines.filter(l => l.value !== null).length > 0 ? lines : lines,
    total: {
      total,
      pct: calculatePct(total, vp),
      isPartial,
    },
  };
}

export function calculatePartPersonnelle(inputs: SimulatorInputs, vp: number | null): PartPersonnelleVM {
  const { partPersonnelle } = inputs;
  
  const salaireLine: LineValue = {
    label: 'Salaire net après IR',
    value: partPersonnelle.salaireNetApresIR,
    pct: calculatePct(partPersonnelle.salaireNetApresIR, vp),
  };
  
  const primeLines: LineValue[] = partPersonnelle.primes.map(p => ({
    label: p.label,
    value: p.montant,
    pct: calculatePct(p.montant, vp),
  }));
  
  const avantageLines: LineValue[] = partPersonnelle.avantages.map(a => ({
    label: a.label,
    value: a.montant,
    pct: calculatePct(a.montant, vp),
  }));
  
  const allValues = [
    partPersonnelle.salaireNetApresIR,
    ...partPersonnelle.primes.map(p => p.montant),
    ...partPersonnelle.avantages.map(a => a.montant),
  ];
  
  const { total, isPartial } = sumValues(allValues);
  
  return {
    salaireLine,
    primeLines,
    avantageLines,
    total: {
      total,
      pct: calculatePct(total, vp),
      isPartial,
    },
  };
}

// ===== STACKED BAR CALCULATION =====

export function calculateStackedBar(
  capital: PartCapitalVM,
  fonctionnelle: PartFonctionnelleVM,
  sociale: PartSocialeVM,
  personnelle: PartPersonnelleVM,
  vp: number | null
): StackedBarVM {
  const segments: StackedBarSegment[] = [
    {
      key: 'capital',
      pct: capital.total.pct ?? 0,
      isND: capital.total.total === null,
      label: 'Capital',
    },
    {
      key: 'fonctionnelle',
      pct: fonctionnelle.total.pct ?? 0,
      isND: fonctionnelle.total.total === null,
      label: 'Fonctionnelle',
    },
    {
      key: 'sociale',
      pct: sociale.total.pct ?? 0,
      isND: sociale.total.total === null,
      label: 'Sociale',
    },
    {
      key: 'personnelle',
      pct: personnelle.total.pct ?? 0,
      isND: personnelle.total.total === null,
      label: 'Personnelle',
    },
  ];
  
  const totalPct = segments.reduce((sum, s) => sum + s.pct, 0);
  const overflowPct = totalPct > 100 ? totalPct - 100 : null;
  
  return {
    segments,
    overflowPct,
    totalPct,
  };
}

// ===== MAIN CALCULATION FUNCTION =====

export function calculateBulletin(inputs: SimulatorInputs): BulletinViewModel {
  const diagnostics: Diagnostic[] = [];
  
  // Calculate VP
  const vpResult = calculateVP(inputs);
  const vp = vpResult.value;
  const diviseur = getDiviseur(inputs);
  
  // Calculate all parts
  const capital = calculatePartCapital(inputs, vp);
  const fonctionnelle = calculatePartFonctionnelle(inputs, vp);
  const sociale = calculatePartSociale(inputs, vp);
  const personnelle = calculatePartPersonnelle(inputs, vp);
  
  // Calculate reste à redistribuer
  let resteValue: number | null = null;
  if (vp !== null && capital.total.total !== null) {
    resteValue = vp - capital.total.total;
  }
  
  // Stacked bar
  const stackedBar = calculateStackedBar(capital, fonctionnelle, sociale, personnelle, vp);
  
  // Diagnostics
  if (vp === null) {
    diagnostics.push({
      type: 'warning',
      message: 'CA annuel ou effectif manquant pour calculer la Valeur Produite',
    });
  }
  
  if (stackedBar.overflowPct !== null && stackedBar.overflowPct > 10) {
    diagnostics.push({
      type: 'info',
      message: `Les parts dépassent la valeur produite de ${stackedBar.overflowPct.toFixed(1)}%`,
    });
  }
  
  // Check invariant: VP ≈ sum of parts
  if (vp !== null) {
    const sumParts = (capital.total.total ?? 0) + 
                     (fonctionnelle.total.total ?? 0) + 
                     (sociale.total.total ?? 0) + 
                     (personnelle.total.total ?? 0);
    const diff = Math.abs(vp - sumParts);
    if (diff > vp * 0.05 && sumParts > 0) { // More than 5% difference
      diagnostics.push({
        type: 'info',
        message: `Écart de ${Math.round(diff).toLocaleString('fr-FR')} € entre VP et la somme des parts`,
      });
    }
  }
  
  return {
    meta: {
      periode: inputs.salarie.moisAffiche,
      poste: inputs.salarie.poste,
      statut: inputs.salarie.statut,
      anciennete: inputs.salarie.anciennete,
      nom: inputs.salarie.nom,
      adresse: inputs.salarie.adresse,
    },
    settings: {
      ponderation: inputs.base.ponderation,
      diviseur,
      annee: inputs.base.anneeReference,
    },
    vp: {
      value: vp,
      pct: 100,
      formula: vpResult.formula,
    },
    resteARedistribuer: {
      value: resteValue,
      formula: 'Reste = VP - Part Capital',
    },
    parts: {
      capital,
      fonctionnelle,
      sociale,
      personnelle,
    },
    deficitDette: {
      montant: inputs.deficitDette.montantDeficit,
      dontSecuriteSociale: inputs.deficitDette.dontSecuriteSociale,
    },
    stackedBar,
    diagnostics,
  };
}
