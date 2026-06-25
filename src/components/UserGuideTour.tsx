import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, ArrowRight, ArrowLeft, X, HelpCircle, Map, MessageSquare, Search, Landmark, UserCheck } from 'lucide-react';

interface TourStep {
  id: number;
  title: string;
  description: string;
  targetId?: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface UserGuideTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserGuideTour({ isOpen, onClose }: UserGuideTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const steps: TourStep[] = [
    {
      id: 1,
      title: "🌾 ¡Bienvenido a tu SGC Multipropósito, compadre!",
      description: "Este sistema te ayuda a cuidar, medir y proteger tu tierrita o finca. Don Mateo te guiará paso a paso para que aprendas a usar las herramientas en pocos minutos. ¡Es muy fácil!",
      icon: <Sprout className="w-8 h-8 text-emerald-500 animate-bounce" />,
      position: 'center'
    },
    {
      id: 2,
      title: "🗺️ Visor Geoportal: Tu Finca desde el Aire",
      description: "En este mapa interactivo puedes ver los límites (linderos) de tu finca y de tus vecinos. Haz clic en cualquier finca del mapa para ver cuánto mide, su avalúo y cuánto paga de impuesto.",
      targetId: "map-geoportal-container",
      icon: <Map className="w-8 h-8 text-blue-500" />,
      position: 'right'
    },
    {
      id: 3,
      title: "🌱 Guía Fácil de Primeros Pasos",
      description: "Esta tarjeta verde te da accesos directos. Puedes hacer clic en los ejemplos de fincas rurales (como 'El Mirador') para explorar el sistema, o tocar el botón para empezar a trazar tus linderos en el mapa.",
      targetId: "farmer-onboarding-container",
      icon: <Sprout className="w-8 h-8 text-emerald-600" />,
      position: 'right'
    },
    {
      id: 4,
      title: "🔍 Buscador de Predios",
      description: "Si no encuentras tu finca en el mapa, ¡no te preocupes! Escribe tu nombre, la dirección de la finca o el código catastral en este buscador para localizarla de inmediato.",
      targetId: "search-filter-container",
      icon: <Search className="w-8 h-8 text-amber-500" />,
      position: 'right'
    },
    {
      id: 5,
      title: "👨‍🌾 Don Mateo: Tu Asesor de Confianza",
      description: "¡Aquí abajo vive Don Mateo! Escríbele cualquier duda que tengas. Te enseñará sobre las leyes del campo y hasta te redactará una carta de reclamo formal dirigida al IGAC si sientes que tu avalúo catastral está muy alto.",
      targetId: "cadastral-advisor-container",
      icon: <MessageSquare className="w-8 h-8 text-teal-500" />,
      position: 'top'
    }
  ];

  const activeStep = steps[currentStep];

  // Update position of spotlight highlights based on the active target element
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (activeStep.targetId) {
        const element = document.getElementById(activeStep.targetId);
        if (element) {
          const rect = element.getBoundingClientRect();
          setCoords({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });

          // Smooth scroll to the target element
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      setCoords(null);
    };

    // Delay slightly to allow any layout shifts or tab switching to finish
    const timer = setTimeout(updatePosition, 150);

    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep, isOpen, activeStep.targetId]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Determine positions for tooltip card
  const getTooltipStyle = (): React.CSSProperties => {
    if (!coords) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 55,
      };
    }

    const { top, left, width, height } = coords;
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        zIndex: 55,
      };
    }

    // Logic to place the card relative to the target element on desktop
    if (activeStep.position === 'right') {
      return {
        position: 'absolute',
        top: `${top + height / 2 - 160}px`,
        left: `${left + width + 24}px`,
        width: '380px',
        zIndex: 55,
      };
    }

    if (activeStep.position === 'top') {
      return {
        position: 'absolute',
        top: `${top - 340}px`,
        left: `${left + width / 2 - 190}px`,
        width: '380px',
        zIndex: 55,
      };
    }

    return {
      position: 'absolute',
      top: `${top + height + 24}px`,
      left: `${left + width / 2 - 190}px`,
      width: '380px',
      zIndex: 55,
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dimmed backdrop with an SVG cutout for the highlighted element */}
      <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300" />

      {/* Spotlight highlight overlay */}
      {coords && (
        <div
          className="absolute border-2 border-emerald-500/80 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.7)] pointer-events-none transition-all duration-300 z-40 animate-pulse"
          style={{
            top: `${coords.top - 6}px`,
            left: `${coords.left - 6}px`,
            width: `${coords.width + 12}px`,
            height: `${coords.height + 12}px`,
          }}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div style={getTooltipStyle()} ref={tooltipRef} className="transition-all duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: coords ? 0 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4 max-w-lg mx-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                {activeStep.icon}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Paso {currentStep + 1} de {steps.length}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {activeStep.title}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {activeStep.description}
          </p>

          {/* Progress Sprout Bar */}
          <div className="flex items-center gap-1.5 py-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-8 bg-emerald-500'
                    : idx < currentStep
                    ? 'w-2 bg-emerald-600/60'
                    : 'w-2 bg-slate-200 dark:bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={onClose}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              Saltar guía
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-[10px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Atrás
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-600/10 transition-all"
              >
                {currentStep === steps.length - 1 ? '¡Listo, entiendo!' : 'Siguiente'}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
