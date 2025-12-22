import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileText } from 'lucide-react';
import type { SimulatorInputs, PrimeOuAvantage } from '@/lib/types';
import { scenarios } from '@/lib/defaultData';

interface SimulatorFormProps {
  inputs: SimulatorInputs;
  onChange: (inputs: SimulatorInputs) => void;
}

export function SimulatorForm({ inputs, onChange }: SimulatorFormProps) {
  const [mode, setMode] = useState<'simple' | 'detailed'>(inputs.mode);
  
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
  
  const updateSociale = (field: keyof SimulatorInputs['sociale'], value: number | null) => {
    onChange({
      ...inputs,
      sociale: { ...inputs.sociale, [field]: value },
    });
  };
  
  const updateSalarie = (field: keyof SimulatorInputs['salarie'], value: string) => {
    onChange({
      ...inputs,
      salarie: { ...inputs.salarie, [field]: value },
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
      <div className="flex gap-2 flex-wrap">
        {scenarios.map(s => (
          <Button
            key={s.id}
            variant="outline"
            size="sm"
            onClick={() => loadScenario(s.id)}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            {s.label}
          </Button>
        ))}
      </div>
      
      {/* Base Parameters */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Paramètres de base</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="annee">Année de référence</Label>
            <Input
              id="annee"
              value={inputs.base.anneeReference}
              onChange={(e) => updateBase('anneeReference', e.target.value)}
            />
          </div>
          
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
          
          <div>
            <Label htmlFor="effectif">Effectif (têtes)</Label>
            <Input
              id="effectif"
              type="number"
              value={inputs.base.effectif ?? ''}
              onChange={(e) => updateBase('effectif', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="etp">ETP (optionnel)</Label>
            <Input
              id="etp"
              type="number"
              step="0.5"
              value={inputs.base.etp ?? ''}
              onChange={(e) => updateBase('etp', parseNumber(e.target.value))}
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
      </section>
      
      {/* Salarié */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Informations salarié</h3>
        
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
      
      {/* Sociale */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Part Sociale (mensuel € / personne)</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="sante">Santé</Label>
            <Input
              id="sante"
              type="text"
              value={inputs.sociale.sante ?? ''}
              onChange={(e) => updateSociale('sante', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="retraite">Retraite</Label>
            <Input
              id="retraite"
              type="text"
              value={inputs.sociale.retraite ?? ''}
              onChange={(e) => updateSociale('retraite', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="chomage">Chômage</Label>
            <Input
              id="chomage"
              type="text"
              value={inputs.sociale.chomage ?? ''}
              onChange={(e) => updateSociale('chomage', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="solidarite">Solidarité / famille</Label>
            <Input
              id="solidarite"
              type="text"
              value={inputs.sociale.solidarite ?? ''}
              onChange={(e) => updateSociale('solidarite', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="csg">CSG / CRDS</Label>
            <Input
              id="csg"
              type="text"
              value={inputs.sociale.csgCrds ?? ''}
              onChange={(e) => updateSociale('csgCrds', parseNumber(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="ir">Impôt sur le revenu</Label>
            <Input
              id="ir"
              type="text"
              value={inputs.sociale.impotRevenu ?? ''}
              onChange={(e) => updateSociale('impotRevenu', parseNumber(e.target.value))}
            />
          </div>
        </div>
      </section>
      
      {/* Part Personnelle */}
      <section className="form-section">
        <h3 className="font-semibold text-sm text-primary mb-4">Part Personnelle (mensuel €)</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="salaire">Salaire net après IR</Label>
            <Input
              id="salaire"
              type="text"
              value={inputs.partPersonnelle.salaireNetApresIR ?? ''}
              onChange={(e) => updatePartPersonnelle('salaireNetApresIR', parseNumber(e.target.value))}
            />
          </div>
          
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
