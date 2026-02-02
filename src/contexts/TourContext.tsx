import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tourSteps, TourStep } from '@/config/tourSteps';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface TourContextType {
  isActive: boolean;
  isPaused: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  progress: number;
  startTour: () => void;
  nextStep: () => Promise<void>;
  prevStep: () => Promise<void>;
  skipTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();

  const currentStep = isActive && !isPaused ? tourSteps[currentStepIndex] : null;
  const totalSteps = tourSteps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Fetch profile ID on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!tenant?.id) return;
      
      const { data } = await supabase
        .from('ff_user_profiles')
        .select('id')
        .eq('tenant_id', tenant.id)
        .maybeSingle();
      
      if (data) {
        setProfileId(data.id);
      }
    };
    
    fetchProfile();
  }, [tenant?.id]);

  const navigateToStep = useCallback(async (step: TourStep) => {
    if (step.targetRoute && location.pathname !== step.targetRoute) {
      navigate(step.targetRoute);
      // Wait for navigation and render
      await new Promise(r => setTimeout(r, 800));
    }
    
    // Scroll element into view if it exists
    if (step.targetSelector) {
      await new Promise(r => setTimeout(r, 300));
      const element = document.querySelector(step.targetSelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [navigate, location.pathname]);

  const saveTourProgress = useCallback(async (stepIndex: number, completed = false, skipped = false) => {
    if (!profileId) return;
    
    try {
      await supabase
        .from('ff_user_profiles')
        .update({ 
          guided_tour_step: stepIndex,
          guided_tour_completed: completed,
          guided_tour_skipped: skipped,
        })
        .eq('id', profileId);
    } catch (error) {
      console.error('Error saving tour progress:', error);
    }
  }, [profileId]);

  const startTour = useCallback(async () => {
    setCurrentStepIndex(0);
    setIsActive(true);
    setIsPaused(false);
    await navigateToStep(tourSteps[0]);
    await saveTourProgress(0);
  }, [navigateToStep, saveTourProgress]);

  const nextStep = useCallback(async () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      await navigateToStep(tourSteps[nextIndex]);
      await saveTourProgress(nextIndex);
    } else {
      // Complete tour
      setIsActive(false);
      await saveTourProgress(totalSteps, true, false);
      navigate('/jarvis');
    }
  }, [currentStepIndex, totalSteps, navigateToStep, saveTourProgress, navigate]);

  const prevStep = useCallback(async () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      await navigateToStep(tourSteps[prevIndex]);
    }
  }, [currentStepIndex, navigateToStep]);

  const endTour = useCallback(async () => {
    setIsActive(false);
    await saveTourProgress(totalSteps, true, false);
    navigate('/jarvis');
  }, [saveTourProgress, navigate, totalSteps]);

  const skipTour = useCallback(async () => {
    setIsActive(false);
    await saveTourProgress(currentStepIndex, false, true);
    navigate('/jarvis');
  }, [currentStepIndex, saveTourProgress, navigate]);

  const pauseTour = useCallback(() => setIsPaused(true), []);
  const resumeTour = useCallback(() => setIsPaused(false), []);

  return (
    <TourContext.Provider value={{
      isActive,
      isPaused,
      currentStepIndex,
      currentStep,
      totalSteps,
      progress,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      pauseTour,
      resumeTour,
      endTour,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};
