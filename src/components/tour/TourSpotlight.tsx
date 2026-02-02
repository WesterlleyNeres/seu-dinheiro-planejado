import { useEffect, useState } from 'react';

interface TourSpotlightProps {
  targetSelector: string | null;
  isActive: boolean;
  padding?: number;
}

export function TourSpotlight({ targetSelector, isActive, padding = 12 }: TourSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const newRect = element.getBoundingClientRect();
        setRect(newRect);
      } else {
        setRect(null);
      }
    };

    // Initial update with delay for render
    const timeout = setTimeout(updatePosition, 100);
    
    // Update on resize/scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    // Observe DOM changes
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      observer.disconnect();
    };
  }, [targetSelector, isActive]);

  if (!isActive) return null;

  // Full screen overlay with cutout using clip-path
  const clipPath = rect
    ? `polygon(
        0% 0%, 
        0% 100%, 
        ${rect.left - padding}px 100%, 
        ${rect.left - padding}px ${rect.top - padding}px, 
        ${rect.right + padding}px ${rect.top - padding}px, 
        ${rect.right + padding}px ${rect.bottom + padding}px, 
        ${rect.left - padding}px ${rect.bottom + padding}px, 
        ${rect.left - padding}px 100%, 
        100% 100%, 
        100% 0%
      )`
    : 'none';

  return (
    <>
      {/* Dark overlay with cutout */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          clipPath: targetSelector && rect ? clipPath : 'none',
          transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      
      {/* Highlight border around element */}
      {rect && targetSelector && (
        <div
          className="fixed z-[9998] pointer-events-none rounded-lg"
          style={{
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            boxShadow: '0 0 0 4px hsl(var(--primary)), 0 0 20px 8px hsl(var(--primary) / 0.3)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}
    </>
  );
}
