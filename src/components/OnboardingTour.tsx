import { useState, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  title: string;
  content: string;
  icon?: string;
  targetId?: string;
  isExplore?: boolean;
}

const mainPageSteps: TourStep[] = [
  {
    title: 'Direct Messages 💬',
    content: 'Chat privately with your friends here. Click to see your DMs.',
    icon: '💬',
    targetId: 'dm-button',
  },
  {
    title: 'Add Friend 👥',
    content: 'Click "Add Friend" and enter your friend\'s User ID to send them a friend request!',
    icon: '👥',
    targetId: 'add-friend-button',
  },
  {
    title: 'Your User ID 🔑',
    content: 'To share your User ID with friends, click on your profile picture and go to "Edit Profile". Copy your User ID from there and share it!',
    icon: '🔑',
    targetId: 'profile-menu',
  },
  {
    title: 'Explore Servers 🌐',
    content: 'Click here to discover and join public servers from around the world.',
    icon: '🌐',
    targetId: 'explore-button',
  },
  {
    title: 'Create Server ➕',
    content: 'Click the + button to create your own server and start building your travel community!',
    icon: '➕',
    targetId: 'add-server-button',
  },
];

interface OnboardingTourProps {
  run: boolean;
  onTourComplete: () => void;
  isExplorePage?: boolean;
}

const TOUR_STORAGE_KEY = 'soulvoyage_tour_state';

export function OnboardingTour({ run, onTourComplete, isExplorePage = false }: OnboardingTourProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [exploreStep, setExploreStep] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Restore tour state from sessionStorage if on explore page or returning from explore
  useEffect(() => {
    if (isExplorePage) {
      const savedState = sessionStorage.getItem(TOUR_STORAGE_KEY);
      if (savedState) {
        const { step } = JSON.parse(savedState);
        setCurrentStep(step);
        setExploreStep(step); // Store the step for later use
        setIsVisible(true);
        sessionStorage.removeItem(TOUR_STORAGE_KEY);
      }
    } else if (run) {
      // Check if we're returning from explore page
      const returningFromExplore = sessionStorage.getItem('returning_from_explore');
      const savedStep = sessionStorage.getItem('saved_tour_step');

      if (returningFromExplore && savedStep) {
        // Continue from the next step after explore
        const nextStep = parseInt(savedStep) + 1;
        setCurrentStep(nextStep);
        setIsVisible(true);
        sessionStorage.removeItem('returning_from_explore');
        sessionStorage.removeItem('saved_tour_step');
        setTimeout(() => updateHighlight(nextStep), 100);
      } else {
        // Start fresh from step 0
        setCurrentStep(0);
        setIsVisible(true);
        setTimeout(() => updateHighlight(0), 100);
      }
    } else {
      setIsVisible(false);
      setHighlightStyle({});
    }
  }, [run, isExplorePage]);

  const updateHighlight = (stepIndex: number) => {
    const targets = ['dm-button', 'add-friend-button', 'profile-menu', 'explore-button', 'add-server-button'];
    const targetId = targets[stepIndex];

    // Step 1 is Add Friend - need to ensure DM section is open first
    if (stepIndex === 1) {
      const dmButton = document.querySelector('[data-tour="dm-button"]') as HTMLElement;
      if (dmButton) {
        dmButton.click();
        // Wait for DM section to open smoothly before finding add-friend-button
        setTimeout(() => {
          const target = document.querySelector(`[data-tour="${targetId}"]`) as HTMLElement;
          if (target) {
            const rect = target.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            const style = {
              top: rect.top + scrollTop,
              left: rect.left + scrollLeft,
              width: rect.width,
              height: rect.height,
            };
            setHighlightStyle(style);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
        return;
      }
    }

    if (targetId) {
      const target = document.querySelector(`[data-tour="${targetId}"]`) as HTMLElement;
      if (target) {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        const style = {
          top: rect.top + scrollTop,
          left: rect.left + scrollLeft,
          width: rect.width,
          height: rect.height,
        };
        setHighlightStyle(style);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // No target for this step (show centered modal)
      setHighlightStyle({});
    }
  };

  const handleNext = () => {
    if (isExplorePage) {
      // On explore page, just finish and go back to main
      handleFinish();
      return;
    }

    if (currentStep < mainPageSteps.length - 1) {
      const nextStep = currentStep + 1;
      setIsTransitioning(true);

      // Fade out, then change step and fade in
      setTimeout(() => {
        setCurrentStep(nextStep);
        updateHighlight(nextStep);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      }, 150);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (isExplorePage) {
      // Go back to main page
      navigate('/main');
      setIsVisible(false);
      return;
    }

    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setIsTransitioning(true);

      // Fade out, then change step and fade in
      setTimeout(() => {
        setCurrentStep(prevStep);
        updateHighlight(prevStep);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      }, 150);
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    setHighlightStyle({});

    // If on explore page, save the step before navigating
    if (isExplorePage && exploreStep !== null) {
      sessionStorage.setItem('saved_tour_step', exploreStep.toString());
      sessionStorage.setItem('returning_from_explore', 'true');
    }

    onTourComplete();
    if (isExplorePage) {
      navigate('/main');
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setHighlightStyle({});
    onTourComplete();
    if (isExplorePage) {
      navigate('/main');
    }
  };

  if (!isVisible) return null;

  const step = isExplorePage
    ? {
        title: 'Discover Servers 🌍',
        content: 'Browse through public servers from different locations. Click "Join" on any server to connect with fellow travelers!',
        icon: '🌍',
      }
    : mainPageSteps[currentStep];

  const isFirstStep = currentStep === 0 && !isExplorePage;
  const isLastStep = (currentStep === mainPageSteps.length - 1) || isExplorePage;
  const totalSteps = mainPageSteps.length;
  const progress = isExplorePage
    ? ((currentStep + 2) / totalSteps) * 100
    : ((currentStep + 1) / totalSteps) * 100;

  // Check if current step should show centered modal (no target element)
  const currentStepObj = mainPageSteps[currentStep];
  const isCenteredModal = isExplorePage || (currentStepObj && !currentStepObj.targetId);

  // Calculate tooltip position - show on left if element is on right side of screen
  const getTooltipPosition = () => {
    if (isCenteredModal) return undefined;

    const windowWidth = window.innerWidth;
    const elementRight = (highlightStyle.left || 0) + (highlightStyle.width || 0);
    const tooltipWidth = 320; // max-w-xs = 20rem = 320px
    const padding = 20;

    // If element is on the right side and not enough space for tooltip on right
    if (elementRight + tooltipWidth + padding > windowWidth) {
      // Show on left side
      return {
        right: windowWidth - (highlightStyle.left || 0) + padding,
        top: (highlightStyle.top || 0),
      };
    } else {
      // Show on right side (default)
      return {
        left: elementRight + padding,
        top: (highlightStyle.top || 0),
      };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* Dark overlay with highlight hole using clip-path - only on main page with target */}
      {!isExplorePage && !isCenteredModal && highlightStyle.top && (
        <div
          className="fixed inset-0 z-[99998] bg-black/70 transition-all duration-300"
          style={{
            clipPath: `polygon(
              0% 0%,
              0% 100%,
              ${highlightStyle.left! - 8}px 100%,
              ${highlightStyle.left! - 8}px ${highlightStyle.top! - 8}px,
              ${highlightStyle.left! + highlightStyle.width! + 8}px ${highlightStyle.top! - 8}px,
              ${highlightStyle.left! + highlightStyle.width! + 8}px ${highlightStyle.top! + highlightStyle.height! + 8}px,
              ${highlightStyle.left! - 8}px ${highlightStyle.top! + highlightStyle.height! + 8}px,
              ${highlightStyle.left! - 8}px 100%,
              100% 100%,
              100% 0%
            )`,
          }}
        />
      )}

      {/* Border glow around highlighted element - only on main page with target */}
      {!isExplorePage && !isCenteredModal && highlightStyle.top && (
        <div
          className="fixed z-[99997] pointer-events-none rounded-xl transition-all duration-300"
          style={{
            ...highlightStyle,
            boxShadow: 'inset 0 0 0 4px rgb(20, 184, 166)',
            backgroundColor: 'transparent',
          }}
        />
      )}

      {/* Simple dark overlay for centered modals (explore page or steps without target) */}
      {isCenteredModal && (
        <div className="fixed inset-0 z-[99998] bg-black/70" />
      )}

      {/* Tooltip */}
      {(!isExplorePage && highlightStyle.top) || isCenteredModal ? (
        <div
          className={`fixed z-[100000] bg-card border border-border rounded-xl shadow-2xl p-5 max-w-xs transition-all duration-300 ${
            isCenteredModal ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
          } ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          style={isCenteredModal ? undefined : tooltipPosition}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Skip tour"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Icon */}
          {step.icon && <div className="text-3xl mb-2">{step.icon}</div>}

          {/* Title */}
          <h3 className="text-base font-bold mb-2 pr-6">{step.title}</h3>

          {/* Content */}
          <p className="text-sm text-muted-foreground mb-4">{step.content}</p>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-muted rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Step Indicator */}
          <div className="text-xs text-muted-foreground mb-3">
            {isExplorePage ? currentStep + 2 : currentStep + 1} / {totalSteps}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={handleBack}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium flex items-center justify-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              {isLastStep ? 'Finish' : isExplorePage ? 'Back to Main' : 'Next'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
