import { useTour } from '@/contexts/TourContext';
import { TourSpotlight } from './TourSpotlight';
import { TourCard } from './TourCard';

export function TourOverlay() {
  const { isActive, isPaused, currentStep } = useTour();

  if (!isActive || isPaused) return null;

  return (
    <div className="tour-overlay">
      {/* Spotlight effect */}
      <TourSpotlight 
        targetSelector={currentStep?.targetSelector || null}
        isActive={isActive && !!currentStep?.spotlight}
      />
      
      {/* Explanation card */}
      <TourCard />
    </div>
  );
}
