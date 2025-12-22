import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileText, Zap, PenLine } from 'lucide-react';
import type { SimulatorInputs, PrimeOuAvantage, VATLineInput, AutoModeType, EmployeeStatusType } from '@/lib/types';
import { scenarios } from '@/lib/defaultData';

interface SimulatorFormProps {
  inputs: SimulatorInputs;
  onChange: (inputs: SimulatorInputs) => void;
}

// Default values for automation fields (handles migration from old data)
const defaultAutomation = {
  cotisationsMode: { mode: 'auto' as AutoModeType, manualValue: null },
  irMode: { mode: 'auto' as AutoModeType, manualValue: null },
  isMode: { mode: 'auto' as AutoModeType, manualValue: null },
  vatMode: { mode: 'auto' as AutoModeType, manualValue: null },
};

const defaultEmployee = {
  grossMonthly: null,
  brutMonthly: null,
  status: 'cadre' as EmployeeStatusType,
  pasRate: null,
  irMonthlyManual: null,
};

const defaultCompany = {
  taxableProfitAnnual: null,
  isReducedRateEnabled: false,
};

const defaultVat = {
  sales: [] as VATLineInput[],
  purchases: [] as VATLineInput[],
};

export function SimulatorForm({ inputs, onChange }: SimulatorFormProps) {
  const [mode, setMode] = useState<'simple' | 'detailed'>(inputs.mode);
  const [salarieAutoMode, setSalarieAutoMode] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  
  // Ensure automation fields exist (handles migration from old data structure)
  const automation = inputs.sociale.automation ?? defaultAutomation;
  const employee = inputs.sociale.employee ?? defaultEmployee;
  const company = inputs.sociale.company ?? defaultCompany;
  const vat = inputs.sociale.vat ?? defaultVat;
  
  const updateBase = (field: keyof SimulatorInputs['base'], value: string | number | null) => {
    onChange({
      ...inputs,
      base: { ...inputs.base, [field]: value },
    });
  };
  
  const updateCapital = (field: keyof SimulatorInputs['capital'], value: number | null) => {
    onChange({
      ...inputs,
      capital: { ...inputs.capital, [field]: value },
    });
  };
  
  const updateOrganisation = (field: keyof SimulatorInputs['organisation'], value: number | null) => {
    onChange({
      ...inputs,
      organisation: { ...inputs.organisation, [field]: value },
    });
  };
  
  const updateInvestissement = (field: keyof SimulatorInputs['investissement'], value: number | null) => {
    onChange({
      ...inputs,
      investissement: { ...inputs.investissement, [field]: value },
    });
  };
  
  const updateSociale = (field: keyof SimulatorInputs['sociale'], value: unknown) => {
    onChange({
      ...inputs,
      sociale: { ...inputs.sociale, [field]: value },
    });
  };
  
  const updateSocialeEmployee = (updates: Partial<SimulatorInputs['sociale']['employee']>) => {
    const currentEmployee = inputs.sociale.employee ?? defaultEmployee;
    onChange({
      ...inputs,
      sociale: {
        ...inputs.sociale,
        employee: { ...currentEmployee, ...updates },
      },
    });
  };
  
  const updateSocialeCompany = (field: keyof SimulatorInputs['sociale']['company'], value: unknown) => {
    onChange({
      ...inputs,
      sociale: {
        ...inputs.sociale,
        company: { ...inputs.sociale.company, [field]: value },
      },
    });
  };
  
  const updateAutomationMode = (component: 'cotisationsMode' | 'irMode' | 'isMode' | 'vatMode', mode: AutoModeType) => {
    onChange({
      ...inputs,
      sociale: {
        ...inputs.sociale,
        automation: {
          ...automation,
          [component]: { ...automation[component], mode },
        },
      },
    });
  };
  
  const updateSalarie = (field: keyof SimulatorInputs['salarie'], value: string) => {
    onChange({
      ...inputs,
      salarie: { ...inputs.salarie, [field]: value },
    });
  };
  
  const generateRandomSalarie = () => {
    const prenoms = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Claire', 'Thomas', 'Emma', 'Nicolas', 'Julie'];
    const noms = ['Dupont', 'Martin', 'Bernard', 'Durand', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'Roux'];
    const postes = ['Développeur Senior', 'Chef de projet', 'Designer UX', 'Consultant', 'Data Analyst', 'Product Manager', 'DevOps Engineer'];
    const statuts = ['Cadre - Syntec', 'Cadre - Convention Collective', 'Non-cadre - Syntec', 'Cadre - Métallurgie'];
    const anciennetes = ['6 mois', '1 an', '2 ans', '3 ans', '5 ans', '8 ans', '10 ans'];
    const villes = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nantes', 'Lille'];
    const rues = ['rue de la République', 'avenue des Champs', 'boulevard Victor Hugo', 'rue du Commerce', 'place de la Liberté'];
    
    const prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
    const nom = noms[Math.floor(Math.random() * noms.length)];
    const ville = villes[Math.floor(Math.random() * villes.length)];
    const rue = rues[Math.floor(Math.random() * rues.length)];
    const numero = Math.floor(Math.random() * 150) + 1;
    const codePostal = ville === 'Paris' ? '75001' : `${Math.floor(Math.random() * 90000) + 10000}`;
    
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const moisActuel = new Date().getMonth();
    const anneeActuelle = new Date().getFullYear();
    
    onChange({
      ...inputs,
      salarie: {
        nom: `${prenom} ${nom}`,
        poste: postes[Math.floor(Math.random() * postes.length)],
        statut: statuts[Math.floor(Math.random() * statuts.length)],
        anciennete: anciennetes[Math.floor(Math.random() * anciennetes.length)],
        adresse: `${numero} ${rue}\n${codePostal} ${ville}`,
        moisAffiche: `${moisNoms[moisActuel]} ${anneeActuelle}`,
      },
    });
  };
  
  const updatePartPersonnelle = (field: keyof SimulatorInputs['partPersonnelle'], value: number | null | PrimeOuAvantage[]) => {
    onChange({
      ...inputs,
      partPersonnelle: { ...inputs.partPersonnelle, [field]: value },
    });
  };
  
  const parseNumber = (value: string): number | null => {
    const num = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    return isNaN(num) ? null : num;
  };
  
  const loadScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      onChange(scenario.data);
      setSelectedScenarioId(scenarioId);
    }
  };
  
  const addPrime = () => {
    const newPrime: PrimeOuAvantage = {
      id: Date.now().toString(),
      label: 'Nouvelle prime',
      montant: null,
    };
    updatePartPersonnelle('primes', [...inputs.partPersonnelle.primes, newPrime]);
  };
  
  const removePrime = (id: string) => {
    updatePartPersonnelle('primes', inputs.partPersonnelle.primes.filter(p => p.id !== id));
  };
  
  const updatePrime = (id: string, field: 'label' | 'montant', value: string | number | null) => {
    updatePartPersonnelle('primes', inputs.partPersonnelle.primes.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };
  
  // VAT line helpers
  const addVATLine = (type: 'sales' | 'purchases') => {
    const newLine: VATLineInput = {
      id: Date.now().toString(),
      rate: 0.20,
      baseHTAnnual: null,
    };
    updateSociale('vat', {
      ...vat,
      [type]: [...vat[type], newLine],
    });
  };
  
  const removeVATLine = (type: 'sales' | 'purchases', id: string) => {
    updateSociale('vat', {
      ...vat,
      [type]: vat[type].filter(l => l.id !== id),
    });
  };
  
  const updateVATLine = (type: 'sales' | 'purchases', id: string, field: 'rate' | 'baseHTAnnual', value: number | null) => {
    updateSociale('vat', {
      ...vat,
      [type]: vat[type].map(l =>
        l.id === id ? { ...l, [field]: value } : l
      ),
    });
  };

  // Mode toggle component
  const ModeToggle = ({ 
    mode, 
    onToggle, 
    label 
  }: { 
    mode: AutoModeType; 
    onToggle: (mode: AutoModeType) => void;
    label: string;
  }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(mode === 'auto' ? 'manual' : 'auto')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          mode === 'auto' 
            ? 'bg-primary/10 text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {mode === 'auto' ? <Zap className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
        {mode === 'auto' ? 'Auto' : 'Manuel'}
      </button>
    </div>
  );
  
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Paramètres</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="mode-toggle" className="text-sm text-muted-foreground">Détaillé</Label>
          <Switch
            id="mode-toggle"
            checked={mode === 'detailed'}
            onCheckedChange={(checked) => {
              const newMode = checked ? 'detailed' : 'simple';
              setMode(newMode);
              onChange({ ...inputs, mode: newMode });
            }}
          />
        </div>
      </div>
      
      {/* Scenario selector */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Scénarios</h3>
        <div className="flex gap-2 flex-wrap">
        {scenarios.map(s => (
          <Button
            key={s.id}
            variant={selectedScenarioId === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => loadScenario(s.id)}
            className={`text-xs transition-all ${selectedScenarioId === s.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          >
            <FileText className="w-3 h-3 mr-1" />
            {s.label}
          </Button>
        ))}
        </div>
      </div>
      
      {/* Salarié - MOVED TO FIRST */}
      <section className="form-section">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-primary">Informations salarié</h3>
          <button
            type="button"
            onClick={() => {
              if (!salarieAutoMode) {
                generateRandomSalarie();
              }
              setSalarieAutoMode(!salarieAutoMode);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              salarieAutoMode 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {salarieAutoMode ? <Zap className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
            {salarieAutoMode ? 'Auto' : 'Manuel'}
          </button>
        </div>
        
        {salarieAutoMode ? (
          <p className="text-xs text-muted-foreground">
            Informations générées automatiquement
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={inputs.salarie.nom}
                onChange={(e) => updateSalarie('nom', e.target.value)}
                placeholder="Ex: Jean Dupont"
              />
            </div>
            
            <div>
              <Label htmlFor="poste">Poste</Label>
              <Input
                id="poste"
                value={inputs.salarie.poste}
                onChange={(e) => updateSalarie('poste', e.target.value)}
                placeholder="Ex: Développeur"
              />
            </div>
            
            <div>
              <Label htmlFor="statut">Statut / Convention</Label>
              <Input
                id="statut"
                value={inputs.salarie.statut}
                onChange={(e) => updateSalarie('statut', e.target.value)}
                placeholder="Ex: Cadre - Syntec"
              />
            </div>
            
            <div>
              <Label htmlFor="anciennete">Ancienneté</Label>
              <Input
                id="anciennete"
                value={inputs.salarie.anciennete}
                onChange={(e) => updateSalarie('anciennete', e.target.value)}
                placeholder="Ex: 2 ans"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Textarea
                id="adresse"
                value={inputs.salarie.adresse}
                onChange={(e) => updateSalarie('adresse', e.target.value)}
                placeholder="Ex: 12 rue de Paris&#10;75001 Paris"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="mois">Période affichée</Label>
              <Input
                id="mois"
                value={inputs.salarie.moisAffiche}
                onChange={(e) => updateSalarie('moisAffiche', e.target.value)}
                placeholder="Ex: Décembre 2025"
              />
            </div>
          </div>
        )}
      </section>
      
      {/* Base Parameters */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Paramètres de base</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ca">CA annuel HT (€)</Label>
            <Input
              id="ca"
              type="text"
              placeholder="Ex: 1 000 000"
              value={inputs.base.caAnnuelHT ?? ''}
              onChange={(e) => updateBase('caAnnuelHT', parseNumber(e.target.value))}
            />
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          <Label>Pondération :</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ponderation"
                checked={inputs.base.ponderation === 'HEADCOUNT'}
                onChange={() => updateBase('ponderation', 'HEADCOUNT')}
                className="accent-primary"
              />
              Effectif
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ponderation"
                checked={inputs.base.ponderation === 'FTE'}
                onChange={() => updateBase('ponderation', 'FTE')}
                className="accent-primary"
              />
              ETP
            </label>
          </div>
        </div>
        
        <div className="mt-4">
          {inputs.base.ponderation === 'HEADCOUNT' ? (
            <div>
              <Label htmlFor="effectif">Effectif (têtes)</Label>
              <Input
                id="effectif"
                type="number"
                value={inputs.base.effectif ?? ''}
                onChange={(e) => updateBase('effectif', parseNumber(e.target.value))}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="etp">ETP</Label>
              <Input
                id="etp"
                type="number"
                step="0.5"
                value={inputs.base.etp ?? ''}
                onChange={(e) => updateBase('etp', parseNumber(e.target.value))}
              />
            </div>
          )}
        </div>
      </section>
      
      {/* Capital */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Part du Capital (annuel €)</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dividendes">Dividendes</Label>
            <Input
              id="dividendes"
              type="text"
              value={inputs.capital.dividendes ?? ''}
              onChange={(e) => updateCapital('dividendes', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="reserves">Réserves</Label>
            <Input
              id="reserves"
              type="text"
              value={inputs.capital.reserves ?? ''}
              onChange={(e) => updateCapital('reserves', parseNumber(e.target.value))}
            />
          </div>
        </div>
      </section>
      
      {/* Fonctionnelle */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Part Fonctionnelle (annuel €)</h3>
        
        <p className="text-xs text-muted-foreground mb-3">Organisation</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="locaux">Locaux / énergie</Label>
            <Input
              id="locaux"
              type="text"
              value={inputs.organisation.locauxEnergie ?? ''}
              onChange={(e) => updateOrganisation('locauxEnergie', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="it">IT / outils / infra</Label>
            <Input
              id="it"
              type="text"
              value={inputs.organisation.outilsIT ?? ''}
              onChange={(e) => updateOrganisation('outilsIT', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="management">Management intermédiaire</Label>
            <Input
              id="management"
              type="text"
              value={inputs.organisation.managementIntermediaire ?? ''}
              onChange={(e) => updateOrganisation('managementIntermediaire', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="support">Fonctions support</Label>
            <Input
              id="support"
              type="text"
              value={inputs.organisation.fonctionsSupport ?? ''}
              onChange={(e) => updateOrganisation('fonctionsSupport', parseNumber(e.target.value))}
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">Investissement</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="amortissements">Amortissements</Label>
            <Input
              id="amortissements"
              type="text"
              value={inputs.investissement.amortissements ?? ''}
              onChange={(e) => updateInvestissement('amortissements', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="formation">Formation</Label>
            <Input
              id="formation"
              type="text"
              value={inputs.investissement.formation ?? ''}
              onChange={(e) => updateInvestissement('formation', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="rnd">R&D / innovation</Label>
            <Input
              id="rnd"
              type="text"
              value={inputs.investissement.rAndD ?? ''}
              onChange={(e) => updateInvestissement('rAndD', parseNumber(e.target.value))}
            />
          </div>
        </div>
      </section>
      
      {/* Sociale - AUTOMATISATION */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Part Sociale</h3>
        
        {/* Salaire brut - TOUJOURS VISIBLE (source de vérité) */}
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs font-medium text-primary mb-3">💰 Salaire (source de vérité)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grossMonthly">Salaire brut mensuel (€)</Label>
              <Input
                id="grossMonthly"
                type="text"
                placeholder="Ex: 4 500"
                value={employee.grossMonthly ?? employee.brutMonthly ?? ''}
                onChange={(e) => {
                  const val = parseNumber(e.target.value);
                  updateSocialeEmployee({ grossMonthly: val, brutMonthly: val });
                }}
                className="font-medium"
              />
            </div>
            <div>
              <Label>Statut</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="employeeStatus"
                    checked={employee.status === 'cadre'}
                    onChange={() => updateSocialeEmployee({ status: 'cadre' as EmployeeStatusType })}
                    className="accent-primary"
                  />
                  Cadre
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="employeeStatus"
                    checked={employee.status === 'non_cadre'}
                    onChange={() => updateSocialeEmployee({ status: 'non_cadre' as EmployeeStatusType })}
                    className="accent-primary"
                  />
                  Non-cadre
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cotisations sociales */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <ModeToggle
            mode={automation.cotisationsMode.mode}
            onToggle={(m) => updateAutomationMode('cotisationsMode', m)}
            label="Cotisations sociales"
          />
          
          {automation.cotisationsMode.mode === 'auto' ? (
            <p className="text-xs text-muted-foreground">
              Calculées automatiquement à partir du salaire brut
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sante">Santé (€/mois)</Label>
                <Input
                  id="sante"
                  type="text"
                  value={inputs.sociale.sante ?? ''}
                  onChange={(e) => updateSociale('sante', parseNumber(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="retraite">Retraite (€/mois)</Label>
                <Input
                  id="retraite"
                  type="text"
                  value={inputs.sociale.retraite ?? ''}
                  onChange={(e) => updateSociale('retraite', parseNumber(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="chomage">Chômage (€/mois)</Label>
                <Input
                  id="chomage"
                  type="text"
                  value={inputs.sociale.chomage ?? ''}
                  onChange={(e) => updateSociale('chomage', parseNumber(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="solidarite">Solidarité (€/mois)</Label>
                <Input
                  id="solidarite"
                  type="text"
                  value={inputs.sociale.solidarite ?? ''}
                  onChange={(e) => updateSociale('solidarite', parseNumber(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="csg">CSG/CRDS (€/mois)</Label>
                <Input
                  id="csg"
                  type="text"
                  value={inputs.sociale.csgCrds ?? ''}
                  onChange={(e) => updateSociale('csgCrds', parseNumber(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Impôt sur le revenu (IR) */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <ModeToggle
            mode={automation.irMode?.mode ?? 'auto'}
            onToggle={(m) => updateAutomationMode('irMode', m)}
            label="Impôt sur le revenu (IR / PAS)"
          />
          
          {(automation.irMode?.mode ?? 'auto') === 'auto' ? (
            <p className="text-xs text-muted-foreground">
              Taux PAS calculé automatiquement à partir du net imposable (barème par défaut)
            </p>
          ) : (
            <div className="w-1/2">
              <Label htmlFor="pasRateManual">Taux PAS (%)</Label>
              <Input
                id="pasRateManual"
                type="text"
                placeholder="Ex: 7.5"
                value={employee.pasRate !== null ? (employee.pasRate * 100).toString() : ''}
                onChange={(e) => {
                  const val = parseNumber(e.target.value);
                  updateSocialeEmployee({ pasRate: val !== null ? val / 100 : null });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Saisissez votre taux de prélèvement à la source (visible sur votre fiche de paie)
              </p>
            </div>
          )}
        </div>
        
        {/* Impôt sur les sociétés */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <ModeToggle
            mode={automation.isMode.mode}
            onToggle={(m) => updateAutomationMode('isMode', m)}
            label="Impôt sur les sociétés (IS)"
          />
          
          {automation.isMode.mode === 'auto' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxableProfit">Bénéfice imposable annuel (€)</Label>
                <Input
                  id="taxableProfit"
                  type="text"
                  placeholder="Ex: 150 000"
                  value={company.taxableProfitAnnual ?? ''}
                  onChange={(e) => updateSocialeCompany('taxableProfitAnnual', parseNumber(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Switch
                  id="reducedRate"
                  checked={company.isReducedRateEnabled}
                  onCheckedChange={(checked) => updateSocialeCompany('isReducedRateEnabled', checked)}
                />
                <Label htmlFor="reducedRate" className="text-sm">Taux réduit PME (15%)</Label>
              </div>
            </div>
          ) : (
            <div className="w-1/2">
              <Label htmlFor="isManual">IS annuel (€)</Label>
              <Input
                id="isManual"
                type="text"
                value={inputs.sociale.impotSocietes ?? ''}
                onChange={(e) => updateSociale('impotSocietes', parseNumber(e.target.value))}
              />
            </div>
          )}
        </div>
        
        {/* TVA */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <ModeToggle
            mode={automation.vatMode.mode}
            onToggle={(m) => updateAutomationMode('vatMode', m)}
            label="TVA nette reversée"
          />
          
          {automation.vatMode.mode === 'auto' ? (
            <div className="space-y-4">
              {/* Ventes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Ventes (TVA collectée)</Label>
                  <Button variant="ghost" size="sm" onClick={() => addVATLine('sales')}>
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {vat.sales.map(line => (
                  <div key={line.id} className="flex gap-2 mb-2">
                    <select
                      value={line.rate}
                      onChange={(e) => updateVATLine('sales', line.id, 'rate', parseFloat(e.target.value))}
                      className="w-24 px-2 py-1.5 text-sm border rounded-md bg-background"
                    >
                      <option value={0.20}>20%</option>
                      <option value={0.10}>10%</option>
                      <option value={0.055}>5.5%</option>
                      <option value={0.021}>2.1%</option>
                    </select>
                    <Input
                      type="text"
                      placeholder="CA HT annuel"
                      value={line.baseHTAnnual ?? ''}
                      onChange={(e) => updateVATLine('sales', line.id, 'baseHTAnnual', parseNumber(e.target.value))}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeVATLine('sales', line.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {vat.sales.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucune ligne de vente</p>
                )}
              </div>
              
              {/* Achats */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Achats (TVA déductible)</Label>
                  <Button variant="ghost" size="sm" onClick={() => addVATLine('purchases')}>
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {vat.purchases.map(line => (
                  <div key={line.id} className="flex gap-2 mb-2">
                    <select
                      value={line.rate}
                      onChange={(e) => updateVATLine('purchases', line.id, 'rate', parseFloat(e.target.value))}
                      className="w-24 px-2 py-1.5 text-sm border rounded-md bg-background"
                    >
                      <option value={0.20}>20%</option>
                      <option value={0.10}>10%</option>
                      <option value={0.055}>5.5%</option>
                      <option value={0.021}>2.1%</option>
                    </select>
                    <Input
                      type="text"
                      placeholder="Achats HT annuel"
                      value={line.baseHTAnnual ?? ''}
                      onChange={(e) => updateVATLine('purchases', line.id, 'baseHTAnnual', parseNumber(e.target.value))}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeVATLine('purchases', line.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {vat.purchases.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucune ligne d'achat</p>
                )}
              </div>
            </div>
          ) : (
            <div className="w-1/2">
              <Label htmlFor="vatManual">TVA nette annuelle (€)</Label>
              <Input
                id="vatManual"
                type="text"
                placeholder="TVA collectée - TVA déductible"
                value={automation.vatMode.manualValue ?? ''}
                onChange={(e) => onChange({
                  ...inputs,
                  sociale: {
                    ...inputs.sociale,
                    automation: {
                      ...automation,
                      vatMode: { ...automation.vatMode, manualValue: parseNumber(e.target.value) },
                    },
                  },
                })}
              />
            </div>
          )}
        </div>
      </section>
      
      {/* Part Personnelle */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Part Personnelle (mensuel €)</h3>
        
        <p className="text-xs text-muted-foreground mb-3">
          Le salaire net après IR est calculé automatiquement à partir du brut.
          Vous pouvez ajouter des primes et avantages ci-dessous.
        </p>
        
        <div className="space-y-4">
          {/* Primes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Primes</Label>
              <Button variant="ghost" size="sm" onClick={addPrime}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
            
            {inputs.partPersonnelle.primes.map(prime => (
              <div key={prime.id} className="flex gap-2 mb-2">
                <Input
                  value={prime.label}
                  onChange={(e) => updatePrime(prime.id, 'label', e.target.value)}
                  placeholder="Libellé"
                  className="flex-1"
                />
                <Input
                  type="text"
                  value={prime.montant ?? ''}
                  onChange={(e) => updatePrime(prime.id, 'montant', parseNumber(e.target.value))}
                  placeholder="Montant"
                  className="w-28"
                />
                <Button variant="ghost" size="icon" onClick={() => removePrime(prime.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
