import { useState, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import html2canvas from 'html2canvas';
import { SimulatorForm } from '@/components/SimulatorForm';
import { BulletinA4 } from '@/components/bulletin/BulletinA4';
import { calculateBulletin } from '@/lib/calculationEngine';
import { exampleScenario1 } from '@/lib/defaultData';
import type { SimulatorInputs } from '@/lib/types';
import { toast } from 'sonner';
import { AlertCircle, Info, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const Index = () => {
  const [inputs, setInputs] = useState<SimulatorInputs>(exampleScenario1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bulletinRef = useRef<HTMLDivElement>(null);
  
  // Calculate view model
  const viewModel = useMemo(() => calculateBulletin(inputs), [inputs]);
  
  const handleExport = useCallback(async () => {
    if (!bulletinRef.current) return;
    
    try {
      toast.info('Génération de l\'export en cours...');
      
      const canvas = await html2canvas(bulletinRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `releve-contribution-${inputs.salarie.moisAffiche.replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Export téléchargé !');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error(error);
    }
  }, [inputs.salarie.moisAffiche]);
  
  return (
    <>
      <Helmet>
        <title>Simulateur de Relevé de Contribution Mensuel | France</title>
        <meta name="description" content="Simulez votre relevé de contribution mensuel et visualisez la répartition de la valeur produite entre capital, fonctionnement, social et personnel." />
      </Helmet>
      
      <div className="min-h-screen bg-background flex">
        {/* Left Panel - Form */}
        <aside 
          className={`border-r bg-secondary/30 flex-shrink-0 h-screen overflow-hidden transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-[420px]' : 'w-0'
          }`}
        >
          <div className={`w-[420px] h-full ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
            <SimulatorForm 
              inputs={inputs} 
              onChange={setInputs}
              onExport={handleExport}
            />
          </div>
        </aside>
        
        {/* Right Panel - Preview */}
        <main className="flex-1 overflow-auto p-8 bg-muted/30 relative">
          {/* Toggle sidebar button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute top-4 left-4 z-10 bg-card shadow-md"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {sidebarOpen ? 'Masquer les paramètres' : 'Afficher les paramètres'}
            </TooltipContent>
          </Tooltip>
          
          {/* Diagnostics */}
          {viewModel.diagnostics.length > 0 && (
            <div className="mb-4 max-w-[210mm] mx-auto space-y-2">
              {viewModel.diagnostics.map((d, i) => (
                <div 
                  key={i}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                    d.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    d.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  {d.type === 'warning' || d.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 flex-shrink-0" />
                  )}
                  {d.message}
                </div>
              ))}
            </div>
          )}
          
          {/* A4 Bulletin Preview */}
          <div className="flex justify-center">
            <div ref={bulletinRef} className="animate-fade-in">
              <BulletinA4 viewModel={viewModel} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
