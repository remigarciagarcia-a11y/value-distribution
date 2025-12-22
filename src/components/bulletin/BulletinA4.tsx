import type { BulletinViewModel } from '@/lib/types';
import { formatND, formatCurrencyCompact } from '@/lib/types';
import { StackedBar } from './StackedBar';
import { 
  SectionLine, 
  SectionTotal, 
  SubSectionHeader,
  HighlightBox, 
  SectionSeparator 
} from './SectionComponents';
import { Euro, Building2, Heart, User } from 'lucide-react';

interface BulletinA4Props {
  viewModel: BulletinViewModel;
}

// Stylized amount with alternating colors (like "8 730" with some digits in different opacity)
function StylizedAmount({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-mono font-bold text-4xl text-primary">ND</span>;
  }
  
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const parts = formatted.split(' ');
  
  return (
    <span className="font-mono font-bold text-4xl tracking-tight">
      {parts.map((part, i) => (
        <span key={i} className={i % 2 === 0 ? 'text-primary' : 'text-primary/70'}>
          {part}{i < parts.length - 1 ? ' ' : ''}
        </span>
      ))}
      <span className="text-primary ml-1">€</span>
    </span>
  );
}

function SmallStylizedAmount({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-mono font-bold text-2xl text-primary">ND</span>;
  }
  
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const parts = formatted.split(' ');
  
  return (
    <span className="font-mono font-bold text-2xl tracking-tight">
      {parts.map((part, i) => (
        <span key={i} className={i % 2 === 0 ? 'text-primary' : 'text-primary/70'}>
          {part}{i < parts.length - 1 ? ' ' : ''}
        </span>
      ))}
      <span className="text-primary ml-0.5">€</span>
    </span>
  );
}

export function BulletinA4({ viewModel }: BulletinA4Props) {
  const { meta, vp, resteARedistribuer, parts, deficitDette, stackedBar } = viewModel;
  
  const hasOverflow = stackedBar.overflowPct !== null && stackedBar.overflowPct > 0;
  
  // Calculate the sum of all parts and the gap
  const sumOfParts = (parts.capital.total.total ?? 0) + 
                     (parts.fonctionnelle.total.total ?? 0) + 
                     (parts.sociale.total.total ?? 0) + 
                     (parts.personnelle.total.total ?? 0);
  const gapValue = vp.value !== null ? sumOfParts - vp.value : null;
  
  return (
    <div className="bg-card shadow-document rounded-lg overflow-hidden" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="relative">
        {/* Left Stacked Bar */}
        <StackedBar viewModel={viewModel} />
        
        {/* Main Content */}
        <div className="ml-16 p-8 pr-6">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-primary mb-0.5">
              Relevé de contribution mensuel
            </h1>
            <p className="text-sm text-muted-foreground">{meta.periode}</p>
          </header>
          
          {/* Employee Info */}
          <div className="flex justify-between mb-8">
            <div>
              <p className="text-sm font-semibold text-foreground">{meta.poste}</p>
              <p className="text-sm text-muted-foreground">{meta.statut}</p>
              <p className="text-sm text-muted-foreground">Ancienneté : {meta.anciennete}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{meta.nom || 'ND'}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{meta.adresse || 'ND'}</p>
            </div>
          </div>
          
          {/* VALEUR PRODUITE */}
          <section className="mb-4">
            <div className="flex justify-between items-start gap-6">
              <div className="flex-1">
                <p className="part-label mb-2">Valeur produite</p>
                <StylizedAmount value={vp.value} />
                {hasOverflow && (
                  <p className="mt-2 text-xs text-red-600 font-medium">
                    Dépassement de la Valeur Produite de {stackedBar.overflowPct?.toFixed(1)}%{gapValue !== null && <span className="font-bold"> ({gapValue > 0 ? '+' : ''}{formatCurrencyCompact(gapValue)})</span>}
                  </p>
                )}
              </div>
              <div className="w-64 flex-shrink-0">
                <HighlightBox>
                  Richesse créée par l'ensemble du travail collectif de l'entreprise de l'année précédente ramenée à une moyenne mensuelle par personne.
                </HighlightBox>
              </div>
            </div>
          </section>
          
          <SectionSeparator />
          
          {/* PART DU CAPITAL */}
          <section className="mb-4">
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="icon-container mt-0.5">
                    <Euro className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="part-label mb-1">Part du Capital</p>
                    <SmallStylizedAmount value={parts.capital.total.total} />
                  </div>
                </div>
                
                <div className="ml-11 space-y-1">
                  {parts.capital.lines.map((line, i) => (
                    <SectionLine key={i} line={line} />
                  ))}
                </div>
                
                <div className="mt-3 ml-11">
                  <p className="text-xs text-primary font-medium">
                    Reste à redistribuer : <span className="font-bold">{formatND(resteARedistribuer.value)}</span>
                  </p>
                </div>
              </div>
              
              <div className="w-64 flex-shrink-0">
                <HighlightBox>
                  Valeur distribuée aux détenteurs du capital ou conservée sous forme de réserves financières.
                </HighlightBox>
              </div>
            </div>
          </section>
          
          <SectionSeparator />
          
          {/* PART FONCTIONNELLE */}
          <section className="mb-4">
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="icon-container mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="part-label mb-1">Part fonctionnelle</p>
                    <SmallStylizedAmount value={parts.fonctionnelle.total.total} />
                  </div>
                </div>
                
                <div className="ml-11 space-y-4">
                  {/* Organisation */}
                  <div>
                    <SubSectionHeader 
                      label="Organisation" 
                      total={parts.fonctionnelle.organisation.total.total} 
                    />
                    <div className="space-y-0.5">
                      {parts.fonctionnelle.organisation.lines.map((line, i) => (
                        <SectionLine key={i} line={line} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Investissement */}
                  <div>
                    <SubSectionHeader 
                      label="Investissement" 
                      total={parts.fonctionnelle.investissement.total.total} 
                    />
                    <div className="space-y-0.5">
                      {parts.fonctionnelle.investissement.lines.map((line, i) => (
                        <SectionLine key={i} line={line} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-64 flex-shrink-0">
                <HighlightBox>
                  Financement des fonctions supports de l'organisation incluant les locaux, les outils, les systèmes, la coordination (RH, juridique, management...) ainsi que l'amélioration des moyens de productions (innovation, amélioration des outils, formation...)
                </HighlightBox>
              </div>
            </div>
          </section>
          
          <SectionSeparator />
          
          {/* PART SOCIALE */}
          <section className="mb-4">
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="icon-container mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="part-label mb-1">Part sociale</p>
                    <SmallStylizedAmount value={parts.sociale.total.total} />
                  </div>
                </div>
                
                <div className="ml-11 space-y-0.5">
                  {parts.sociale.lines.map((line, i) => (
                    <SectionLine key={i} line={line} showRate={true} />
                  ))}
                </div>
              </div>
              
              <div className="w-64 flex-shrink-0">
                <HighlightBox>
                  Financement des droits sociaux de l'année en cours : santé, retraite, chômage, solidarité.
                  <br /><br />
                  Elle permet d'assurer une protection indépendante des aléas individuels et de sécuriser les parcours de vie.
                </HighlightBox>
                
                {/* Deficit box - under the note */}
                {deficitDette.montant !== null && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground leading-tight block mb-2">
                      Montant du déficit de la Sécurité Sociale et de la dette de l'État par actif.
                    </span>
                    <div className="text-center">
                      <span className="font-mono font-bold text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                        {formatCurrencyCompact(deficitDette.montant)}
                      </span>
                      {deficitDette.dontSecuriteSociale && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          dont {deficitDette.dontSecuriteSociale}€ pour la Sécurité Sociale
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          
          <SectionSeparator />
          
          {/* PART PERSONNELLE */}
          <section className="mb-6">
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="icon-container mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="part-label mb-1">Part personnelle</p>
                    <SmallStylizedAmount value={parts.personnelle.total.total} />
                  </div>
                </div>
                
                <div className="ml-11 space-y-0.5">
                  <SectionLine line={parts.personnelle.salaireLine} />
                  {parts.personnelle.primeLines.map((line, i) => (
                    <SectionLine key={`prime-${i}`} line={line} />
                  ))}
                  {parts.personnelle.avantageLines.map((line, i) => (
                    <SectionLine key={`avantage-${i}`} line={line} />
                  ))}
                </div>
              </div>
              
              <div className="w-64 flex-shrink-0">
                <HighlightBox>
                  Part individuelle de la valeur produite convertie en revenu direct déterminée par les conventions de branche et les négociations.
                </HighlightBox>
              </div>
            </div>
          </section>
          
          {/* Footer */}
          <footer className="border-t border-primary/20 pt-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Document pédagogique de simulation — Ne constitue pas un bulletin de paie légal
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
