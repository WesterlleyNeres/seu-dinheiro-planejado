import { Brain, ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTour } from '@/contexts/TourContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function TourCard() {
  const { 
    isActive, 
    isPaused,
    currentStep, 
    currentStepIndex, 
    totalSteps, 
    progress,
    nextStep, 
    prevStep, 
    skipTour, 
    endTour 
  } = useTour();
  
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!currentStep?.content) return;
    
    setDisplayedText('');
    setIsTyping(true);
    
    let index = 0;
    const text = currentStep.content;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [currentStep?.content, currentStepIndex]);

  if (!isActive || isPaused || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Position classes based on step config
  const positionClasses = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    bottom: 'bottom-8 left-1/2 -translate-x-1/2',
    top: 'top-24 left-1/2 -translate-x-1/2',
    left: 'left-8 top-1/2 -translate-y-1/2',
    right: 'right-8 top-1/2 -translate-y-1/2 ml-64',
  };

  return (
    <div 
      className={cn(
        "fixed z-[9999] w-[90vw] max-w-md pointer-events-auto",
        "bg-card border border-border rounded-2xl shadow-2xl",
        "animate-in slide-in-from-bottom-4 fade-in duration-500",
        positionClasses[currentStep.position]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Brain className={cn(
              "h-6 w-6 text-primary transition-all",
              isTyping && "animate-pulse"
            )} />
          </div>
          <div>
            <span className="font-semibold text-primary">JARVIS</span>
            <p className="text-xs text-muted-foreground">Tour Guiado</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={skipTour} 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <h3 className="text-xl font-semibold text-foreground">
          {currentStep.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed min-h-[60px]">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
          )}
        </p>
      </div>

      {/* Progress */}
      <div className="px-5 pb-3">
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-center mt-2">
          Passo {currentStepIndex + 1} de {totalSteps}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30 rounded-b-2xl">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          disabled={isFirstStep}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={skipTour}
          className="text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Pular Tour
        </Button>

        <Button 
          size="sm" 
          onClick={isLastStep ? endTour : nextStep}
          className="gap-1"
        >
          {isLastStep ? 'Finalizar' : 'Próximo'}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
