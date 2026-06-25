import React from 'react';
import { Sprout, MapPin, PenTool, Sparkles, HelpCircle, Check, ArrowRight } from 'lucide-react';
import { Property } from '../types';

interface FarmerOnboardingProps {
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  allProperties: Property[];
  onStartDrawing: () => void;
  onAskAdvisor: (question: string, mode: 'general' | 'appeal' | 'norms') => void;
  onCreateNewProperty: () => void;
}

export default function FarmerOnboarding({
  selectedProperty,
  onSelectProperty,
  allProperties,
  onStartDrawing,
  onAskAdvisor,
  onCreateNewProperty,
}: FarmerOnboardingProps) {
  // Find rural examples
  const mirador = allProperties.find(p => p.id === '4');
  const pradera = allProperties.find(p => p.id === '5');

  const isRuralSelected = selectedProperty?.tipoZona === 'Rural';

  return (
    <div id="farmer-onboarding-container" className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-2xl p-4 shadow-sm space-y-3.5 transition-all">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
          <Sprout className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-300 tracking-tight flex items-center gap-1.5">
            Guía Fácil para el Campesino
            <span className="text-[8.5px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
              Primeros Pasos
            </span>
          </h3>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed mt-0.5">
            ¡Bienvenido compadre! Te ayudamos a entender, registrar y proteger tu tierrita en 3 pasos muy sencillos.
          </p>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3 pt-1 border-t border-emerald-200/30 dark:border-emerald-500/10">
        
        {/* Step 1 */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${
              selectedProperty 
                ? 'bg-emerald-500 text-white' 
                : 'bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            }`}>
              {selectedProperty ? <Check className="w-2.5 h-2.5" /> : '1'}
            </div>
            <div className="flex-1">
              <h4 className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
                Busca o selecciona tu tierrita (finca)
              </h4>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Haz clic en cualquier finca del mapa o pruébalo seleccionando un ejemplo rural:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pl-6">
            {mirador && (
              <button
                type="button"
                onClick={() => onSelectProperty(mirador)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  selectedProperty?.id === '4'
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                Finca El Mirador (Sopó)
              </button>
            )}
            {pradera && (
              <button
                type="button"
                onClick={() => onSelectProperty(pradera)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  selectedProperty?.id === '5'
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                Hacienda La Pradera (Guatavita)
              </button>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
              2
            </div>
            <div className="flex-1">
              <h4 className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
                Revisa o dibuja tus linderos (cercas)
              </h4>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Puedes medir los límites de tu terreno dibujando directamente sobre el mapa:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pl-6">
            <button
              type="button"
              onClick={onStartDrawing}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-all shadow-sm"
            >
              <PenTool className="w-2.5 h-2.5 text-emerald-500" />
              Trazar linderos en el mapa
            </button>
            <button
              type="button"
              onClick={onCreateNewProperty}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
            >
              + Registrar mi finca directamente
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1">
              <h4 className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                Consulta a Don Mateo (Tu Asesor de Confianza IA)
                <Sparkles className="w-3 h-3 text-emerald-500" />
              </h4>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Don Mateo te explicará todo en palabras sencillas. Elige una pregunta para hablar con él en el chat de abajo:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pl-6">
            <button
              type="button"
              onClick={() => onAskAdvisor('¿Cómo puedo saber si el avalúo que el gobierno le puso a mi finca es correcto?', 'general')}
              className="text-left px-2.5 py-1 bg-white/70 dark:bg-slate-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-200/60 dark:border-white/5 rounded-lg text-[9px] text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-between"
            >
              <span>🌱 ¿Cómo sé si mi avalúo catastral es correcto?</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onAskAdvisor('¿Qué beneficios de impuesto predial tenemos los campesinos o productores de alimentos?', 'norms')}
              className="text-left px-2.5 py-1 bg-white/70 dark:bg-slate-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-200/60 dark:border-white/5 rounded-lg text-[9px] text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-between"
            >
              <span>🌾 ¿Qué descuentos de impuestos tengo por sembrar?</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedProperty) {
                  onAskAdvisor(`Ayúdame a redactar un reclamo por avalúo muy alto para el predio ID ${selectedProperty.id}`, 'appeal');
                } else {
                  // Fallback: select Finca El Mirador first
                  if (mirador) {
                    onSelectProperty(mirador);
                    onAskAdvisor(`Ayúdame a redactar un reclamo por avalúo muy alto para el predio ID 4`, 'appeal');
                  }
                }
              }}
              className="text-left px-2.5 py-1 bg-white/70 dark:bg-slate-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-200/60 dark:border-white/5 rounded-lg text-[9px] text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-between font-semibold"
            >
              <span className="text-emerald-700 dark:text-emerald-400">📝 Ayúdame a hacer un reclamo de impuesto predial</span>
              <ArrowRight className="w-2.5 h-2.5 text-emerald-500" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
