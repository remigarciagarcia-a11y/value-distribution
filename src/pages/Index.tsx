import { useState, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import html2canvas from 'html2canvas';
import { SimulatorForm } from '@/components/SimulatorForm';
import { BulletinA4 } from '@/components/bulletin/BulletinA4';
import { calculateBulletin } from '@/lib/calculationEngine';
import { exampleScenario1 } from '@/lib/defaultData';
import type { SimulatorInputs } from '@/lib/types';
import { toast } from 'sonner';
import { PanelLeftClose, PanelLeft, Download, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [inputs, setInputs] = useState<SimulatorInputs>(exampleScenario1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const bulletinRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Calculate view model
  const viewModel = useMemo(() => calculateBulletin(inputs), [inputs]);
  
  const handleExport = useCallback(async () => {
    const el = bulletinRef.current;
    if (!el) return;

    // Freeze animations/transitions + force opaque background to avoid washed-out renders.
    const originalBg = el.style.backgroundColor;
    el.classList.add('export-freeze');
    el.style.backgroundColor = '#ffffff';

    try {
      toast.info("Génération de l'export en cours...");

      // Ensure the styles are applied before snapshotting.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.backgroundColor = '#ffffff';

          const clonedRoot = clonedDoc.querySelector('[data-export-root="true"]') as HTMLElement | null;
          if (clonedRoot) {
            clonedRoot.classList.add('export-freeze');
            clonedRoot.style.backgroundColor = '#ffffff';
            clonedRoot.style.opacity = '1';
            clonedRoot.style.filter = 'none';
            clonedRoot.style.transform = 'none';
          }

          const clonedA4 = clonedDoc.querySelector('[data-bulletin-a4="true"]') as HTMLElement | null;
          if (clonedA4) {
            clonedA4.style.backgroundColor = '#ffffff';
            clonedA4.style.opacity = '1';
            clonedA4.style.filter = 'none';
          }
        },
      });

      const link = document.createElement('a');
      link.download = `releve-contribution-${inputs.salarie.moisAffiche.replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Export téléchargé !');
    } catch (error) {
      toast.error("Erreur lors de l'export");
      console.error(error);
    } finally {
      el.classList.remove('export-freeze');
      el.style.backgroundColor = originalBg;
    }
  }, [inputs.salarie.moisAffiche]);
  
  // Mobile layout
  if (isMobile) {
    return (
      <>
        <Helmet>
          <title>Simulateur de Relevé de Contribution | France</title>
          <meta name="description" content="Simulez votre relevé de contribution mensuel et visualisez la répartition de la valeur produite." />
        </Helmet>
        
        <div className="min-h-screen bg-background flex flex-col">
          {/* Mobile optimization banner */}
          <div className="bg-primary/10 border-b border-primary/20 px-3 py-2 text-center">
            <p className="text-xs text-primary">
              📱 Cette application est optimisée pour une vue desktop
            </p>
          </div>
          
          {/* Mobile Header */}
          <header className="sticky top-0 z-20 flex-shrink-0 p-3 flex justify-between items-center border-b bg-background/95 backdrop-blur-sm">
            <h1 className="text-sm font-semibold text-primary truncate">Relevé de contribution</h1>
            <div className="flex gap-2">
              <Sheet open={mobileFormOpen} onOpenChange={setMobileFormOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Paramètres
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-hidden p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Paramètres du simulateur</SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(85vh-60px)] overflow-y-auto">
                    <SimulatorForm 
                      inputs={inputs} 
                      onChange={setInputs}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <Button onClick={handleExport} size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </header>
          
          {/* Scrollable content */}
          <main className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-muted/30">
            <div className="min-w-fit">
              <div ref={bulletinRef} data-export-root="true" className="animate-fade-in">
                <BulletinA4 viewModel={viewModel} />
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }
  
  // Desktop layout
  return (
    <>
      <Helmet>
        <title>Simulateur de Relevé de Contribution Mensuel | France</title>
        <meta name="description" content="Simulez votre relevé de contribution mensuel et visualisez la répartition de la valeur produite entre capital, fonctionnement, social et personnel." />
      </Helmet>
      
      <div className="h-screen bg-background flex overflow-hidden">
        {/* Left Panel - Form */}
        <aside 
          className={`border-r bg-secondary/30 flex-shrink-0 h-screen transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-[420px]' : 'w-0'
          }`}
        >
          <div className={`w-[420px] h-full overflow-y-auto ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
            <SimulatorForm 
              inputs={inputs} 
              onChange={setInputs}
            />
          </div>
        </aside>
        
        {/* Right Panel - Preview */}
        <main className="flex-1 h-screen flex flex-col bg-muted/30 relative">
          {/* Top bar with toggle and export buttons */}
          <div className="flex-shrink-0 p-4 flex justify-between items-center border-b bg-background/80 backdrop-blur-sm z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="bg-card shadow-md"
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
            
            <Button onClick={handleExport} className="shadow-md">
              <Download className="w-4 h-4 mr-2" />
              Exporter en PNG
            </Button>
          </div>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* A4 Bulletin Preview */}
            <div className="flex justify-center">
              <div ref={bulletinRef} data-export-root="true" className="animate-fade-in">
                <BulletinA4 viewModel={viewModel} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
