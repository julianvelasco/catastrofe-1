import React from 'react';
import { Property } from '../types';
import { CADASTRAL_ZONES } from '../initialData';
import { 
  Landmark, 
  TrendingUp, 
  DollarSign, 
  Map, 
  BarChart3, 
  PieChart, 
  Info, 
  ShieldCheck,
  SlidersHorizontal,
  Coins,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsDashboardProps {
  properties: Property[];
}

export default function AnalyticsDashboard({ properties }: AnalyticsDashboardProps) {
  
  // Estados para simulación fiscal
  const [avaluoAdjustment, setAvaluoAdjustment] = React.useState<number>(0); // -30% a +50%
  const [tarifaAdjustment, setTarifaAdjustment] = React.useState<number>(0); // -5 a +5 por mil

  // 1. Cálculos de Estadísticas
  const totalPredios = properties.length;
  const totalAreaTerreno = properties.reduce((sum, p) => sum + p.areaTerreno, 0);
  const totalAvaluo = properties.reduce((sum, p) => sum + p.avaluoTotal, 0);
  const totalImpuesto = properties.reduce((sum, p) => sum + p.impuestoPredial, 0);
  const avgImpuesto = totalPredios > 0 ? Math.round(totalImpuesto / totalPredios) : 0;

  // 2. Distribución de Predios por Uso de Suelo
  const usesCount: Record<string, number> = {
    Residencial: 0,
    Comercial: 0,
    Industrial: 0,
    Agropecuario: 0,
    Institucional: 0,
  };
  properties.forEach(p => {
    if (usesCount[p.usoSuelo] !== undefined) {
      usesCount[p.usoSuelo]++;
    }
  });

  const useColors: Record<string, string> = {
    Residencial: '#3b82f6',
    Comercial: '#f59e0b',
    Industrial: '#ef4444',
    Agropecuario: '#10b981',
    Institucional: '#8b5cf6',
  };

  // 3. Avalúo Promedio por Zona
  const zoneAvaluos: Record<string, { total: number; count: number }> = {};
  properties.forEach(p => {
    if (!zoneAvaluos[p.zona]) {
      zoneAvaluos[p.zona] = { total: 0, count: 0 };
    }
    zoneAvaluos[p.zona].total += p.avaluoTotal;
    zoneAvaluos[p.zona].count++;
  });

  const zoneAverages = Object.keys(zoneAvaluos).map(z => ({
    name: z,
    avg: Math.round(zoneAvaluos[z].total / zoneAvaluos[z].count),
    count: zoneAvaluos[z].count,
  })).sort((a, b) => b.avg - a.avg);

  const maxAvgValue = zoneAverages.length > 0 ? Math.max(...zoneAverages.map(z => z.avg)) : 1;

  // === CÁLCULOS DE SIMULACIÓN FISCAL ===
  const simulatedProperties = properties.map(p => {
    // Ajustar avalúo
    const newAvaluo = p.avaluoTotal * (1 + avaluoAdjustment / 100);
    // Ajustar tarifa (clamped between 1 and 33)
    const originalTarifa = p.tarifaMil || 8;
    const newTarifa = Math.max(1, Math.min(33, originalTarifa + tarifaAdjustment));
    // Calcular nuevo impuesto
    const newImpuesto = Math.round((newAvaluo * newTarifa) / 1000);
    return {
      ...p,
      simulatedAvaluo: newAvaluo,
      simulatedTarifa: newTarifa,
      simulatedImpuesto: newImpuesto
    };
  });

  const totalSimulatedImpuesto = simulatedProperties.reduce((sum, p) => sum + p.simulatedImpuesto, 0);
  const totalSimulatedDifference = totalSimulatedImpuesto - totalImpuesto;
  const simulatedPercentChange = totalImpuesto > 0 ? (totalSimulatedDifference / totalImpuesto) * 100 : 0;

  // Costos unitarios estimados para proyectos (en COP)
  const costoVia = 300000000; // 300 millones por km de vía veredal
  const costoAlimentacion = 40000000; // 40 millones anuales por canasta alimentaria para 50 niños
  const costoParque = 80000000; // 80 millones por parque infantil municipal
  const costoReforestacion = 12000000; // 12 millones por hectárea reforestada

  const absDiff = Math.abs(totalSimulatedDifference);
  
  // Cantidades de proyectos viables adicionales o perdidos
  const viasVal = (absDiff / costoVia).toFixed(1);
  const alimentacionVal = (absDiff / costoAlimentacion).toFixed(0);
  const parqueVal = (absDiff / costoParque).toFixed(1);
  const reforestacionVal = (absDiff / costoReforestacion).toFixed(0);

  return (
    <div className="space-y-6 text-xs text-slate-200">
      
      {/* 4 Cards de Resumen Técnico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Predios */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Predios Registrados</span>
            <span className="text-xl font-black text-slate-100 mt-1 block">{totalPredios}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Base territorial activa</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        {/* Área Lote */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Área Terreno Consolidada</span>
            <span className="text-xl font-black text-slate-100 mt-1 block">
              {totalAreaTerreno.toLocaleString('es-CO')} <span className="text-xs font-normal text-slate-400">m²</span>
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Suelo rural y urbano</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Map className="w-5 h-5" />
          </div>
        </div>

        {/* Avalúo Catastral Municipal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg col-span-1">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Avalúo Consolidado</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">
              ${(totalAvaluo / 1000000).toFixed(1)}M <span className="text-xs font-normal text-slate-400">COP</span>
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Valorización fiscal total</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Recaudo Impuesto Predial */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Recaudo Predial Proyectado</span>
            <span className="text-xl font-black text-blue-400 mt-1 block">
              ${(totalImpuesto / 1000000).toFixed(2)}M <span className="text-xs font-normal text-slate-400">COP</span>
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Promedio por predio: ${(avgImpuesto/1000).toFixed(0)}k</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Gráficos de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Gráfico de Barras: Avalúo Promedio por Zona */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="font-bold text-slate-100 text-xs">Avalúo Promedio por Zona</h4>
              <p className="text-[9px] text-slate-400">Distribución económica según ubicación del suelo</p>
            </div>
          </div>

          <div className="space-y-4">
            {zoneAverages.length > 0 ? (
              zoneAverages.map((zone, index) => {
                const percentage = (zone.avg / maxAvgValue) * 100;
                return (
                  <div key={zone.name} className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold text-slate-300">
                        {zone.name} <span className="text-[8px] font-normal text-slate-500">({zone.count} predios)</span>
                      </span>
                      <span className="font-mono text-slate-400">
                        ${zone.avg.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                    
                    {/* Barra de Progreso */}
                    <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 italic">No hay predios registrados para analizar.</div>
            )}
          </div>
        </div>

        {/* 2. Gráfico Distribución por Uso de Suelo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="font-bold text-slate-100 text-xs">Distribución por Uso de Suelo POT</h4>
              <p className="text-[9px] text-slate-400">Clasificación de predios registrados en el municipio</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
            
            {/* Visualización Gráfica de Anillo */}
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Círculo de fondo */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#090d16" strokeWidth="12" />
                
                {/* Generación dinámica de arcos */}
                {(() => {
                  let accumulatedPercent = 0;
                  return Object.keys(usesCount).map((use, index) => {
                    const count = usesCount[use];
                    if (count === 0) return null;
                    const percent = (count / (totalPredios || 1)) * 100;
                    const strokeDasharray = `${percent} ${100 - percent}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += percent;

                    return (
                      <circle
                        key={use}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={useColors[use]}
                        strokeWidth="12"
                        strokeDasharray={`${percent * 2.51} 251`} // 2 * pi * r = 251
                        strokeDashoffset={-accumulatedPercent * 2.51 + (percent * 2.51)}
                        strokeLinecap="round"
                        className="transition-all duration-500 hover:stroke-[15]"
                        title={`${use}: ${percent.toFixed(1)}%`}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Centro de la dona */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xl font-black text-slate-100 leading-none">{totalPredios}</span>
                <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Predios</span>
              </div>
            </div>

            {/* Listado con Indicadores */}
            <div className="flex-1 w-full space-y-2.5">
              {Object.keys(usesCount).map((use) => {
                const count = usesCount[use];
                const pct = totalPredios > 0 ? (count / totalPredios) * 100 : 0;
                return (
                  <div key={use} className="flex items-center justify-between pb-1.5 border-b border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: useColors[use] }} />
                      <span className="font-semibold text-slate-300">{use}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{count}</span>
                      <span className="text-[9px] text-slate-500">({pct.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN INTERACTIVA: SIMULADOR DE IMPACTO FISCAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <SlidersHorizontal className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                Simulador de Impacto Fiscal y Recaudo Municipal
                <span className="text-[9px] bg-blue-500/25 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                  Interactivo
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Simule el impacto financiero en el recaudo predial variando las tarifas de milaje y el avalúo catastral del municipio.
              </p>
            </div>
          </div>
          
          {/* Botón de reinicio rápido */}
          {(avaluoAdjustment !== 0 || tarifaAdjustment !== 0) && (
            <button
              onClick={() => { setAvaluoAdjustment(0); setTarifaAdjustment(0); }}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/15 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
            >
              Restablecer Valores
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controles deslizantes (5 de 12 col) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Control 1: Ajuste de Avalúo Catastral */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ajuste de Avalúo Catastral
                </span>
                <span className={`font-mono font-black px-2 py-0.5 rounded ${
                  avaluoAdjustment > 0 
                    ? 'text-emerald-400 bg-emerald-400/10' 
                    : avaluoAdjustment < 0 
                      ? 'text-amber-400 bg-amber-400/10' 
                      : 'text-slate-400 bg-slate-400/10'
                }`}>
                  {avaluoAdjustment > 0 ? `+${avaluoAdjustment}` : avaluoAdjustment}%
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="1"
                value={avaluoAdjustment}
                onChange={(e) => setAvaluoAdjustment(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>Conservación (-30%)</span>
                <span>Actual (0%)</span>
                <span>Valorización (+50%)</span>
              </div>
            </div>

            {/* Control 2: Ajuste de Tarifa por Mil */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Modificador de Tarifa Predial (‰)
                </span>
                <span className={`font-mono font-black px-2 py-0.5 rounded ${
                  tarifaAdjustment > 0 
                    ? 'text-blue-400 bg-blue-400/10' 
                    : tarifaAdjustment < 0 
                      ? 'text-amber-400 bg-amber-400/10' 
                      : 'text-slate-400 bg-slate-400/10'
                }`}>
                  {tarifaAdjustment > 0 ? `+${tarifaAdjustment.toFixed(1)}` : tarifaAdjustment.toFixed(1)}‰
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={tarifaAdjustment}
                onChange={(e) => setTarifaAdjustment(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>Disminución (-5.0‰)</span>
                <span>Normal (0.0‰)</span>
                <span>Incremento (+5.0‰)</span>
              </div>
            </div>

            {/* Información del Modelo */}
            <div className="bg-slate-950 p-3.5 border border-slate-800/60 rounded-xl text-[9.5px] text-slate-400 leading-normal space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>Dinámica de Simulación</span>
              </div>
              <p>
                Los prediales se estiman bajo la fórmula de ordenamiento nacional: 
                <code className="bg-slate-900 border border-slate-800 text-slate-200 px-1 py-0.5 rounded ml-1 font-mono text-[9px]">
                  (Avalúo × Tarifa) / 1000
                </code>.
              </p>
              <p>
                Al aumentar las tarifas o ajustar los avalúos promedio por conservación catastral multipropósito, se genera un impacto directo de recaudo para inversión local.
              </p>
            </div>
          </div>

          {/* Resultados Financieros (7 de 12 col) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Recaudo Original vs Simulado */}
              <div className="bg-slate-950 p-4 border border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Presupuesto Fiscal Simulado
                  </span>
                  <span className="text-xl font-black text-slate-100 block">
                    ${(totalSimulatedImpuesto / 1000000).toFixed(2)}M
                    <span className="text-xs font-normal text-slate-400 ml-1">COP</span>
                  </span>
                </div>

                <div className="flex justify-between items-center text-[9.5px] border-t border-slate-800/50 pt-2 font-mono">
                  <span className="text-slate-500">Recaudo Base:</span>
                  <span className="text-slate-300">${(totalImpuesto / 1000000).toFixed(2)}M</span>
                </div>
              </div>

              {/* Variación Absoluta e Incremento */}
              <div className="bg-slate-950 p-4 border border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Variación de Presupuesto
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-black block ${
                      totalSimulatedDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {totalSimulatedDifference >= 0 ? '+' : ''}${(totalSimulatedDifference / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-[10px] text-slate-400">COP</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9.5px] border-t border-slate-800/50 pt-2 font-mono">
                  <span className="text-slate-500">Porcentaje de Cambio:</span>
                  <span className={`font-bold flex items-center gap-0.5 ${
                    totalSimulatedDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {totalSimulatedDifference >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {simulatedPercentChange >= 0 ? '+' : ''}{simulatedPercentChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* IMPACTO EN PROYECTOS VEREDALES / LOCALES */}
            <div className="bg-slate-950/60 p-4 border border-slate-800/60 rounded-xl space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                {totalSimulatedDifference >= 0 
                  ? 'Equivalencia de Inversión (Presupuesto Adicional)' 
                  : 'Impacto de Recorte de Proyectos (Déficit Estimado)'
                }
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Proyecto 1: Pavimentación Rural */}
                <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 ${
                  totalSimulatedDifference >= 0 
                    ? 'bg-emerald-500/5 border-emerald-500/10' 
                    : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-300">Vías de Placa Huella</span>
                    <span className={`font-mono font-bold ${
                      totalSimulatedDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {totalSimulatedDifference >= 0 ? '+' : '-'}{viasVal} km
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-500 leading-tight">
                    Mantenimiento y pavimentación de corredores viales veredales de conexión.
                  </p>
                </div>

                {/* Proyecto 2: Canastas Escolares */}
                <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 ${
                  totalSimulatedDifference >= 0 
                    ? 'bg-emerald-500/5 border-emerald-500/10' 
                    : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-300">Alimentación Escolar</span>
                    <span className={`font-mono font-bold ${
                      totalSimulatedDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {totalSimulatedDifference >= 0 ? '+' : '-'}{alimentacionVal} becas
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-500 leading-tight">
                    Canastas nutricionales anuales para estudiantes de escuelas públicas rurales.
                  </p>
                </div>

                {/* Proyecto 3: Parques Infantiles */}
                <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 ${
                  totalSimulatedDifference >= 0 
                    ? 'bg-emerald-500/5 border-emerald-500/10' 
                    : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-300">Parques Recreativos</span>
                    <span className={`font-mono font-bold ${
                      totalSimulatedDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {totalSimulatedDifference >= 0 ? '+' : '-'}{parqueVal} zonas
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-500 leading-tight">
                    Adecuación de parques infantiles y espacios públicos saludables municipales.
                  </p>
                </div>

                {/* Proyecto 4: Conservación Ecológica */}
                <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 ${
                  totalSimulatedDifference >= 0 
                    ? 'bg-emerald-500/5 border-emerald-500/10' 
                    : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-300">Reforestación Activa</span>
                    <span className={`font-mono font-bold ${
                      totalSimulatedDifference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {totalSimulatedDifference >= 0 ? '+' : '-'}{reforestacionVal} ha
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-500 leading-tight">
                    Bosques nativos reforestados para protección de cuencas hídricas locales.
                  </p>
                </div>
              </div>
            </div>

            {/* Sugerencia de Planificación con Inteligencia Artificial */}
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex gap-2.5 items-start">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[9.5px] text-slate-400 leading-relaxed">
                <span className="font-bold text-blue-300 block mb-0.5">Asesoría de Planeación Fiscal de Colombia:</span>
                {avaluoAdjustment === 0 && tarifaAdjustment === 0 ? (
                  <span>La tarifa y los avalúos actuales están balanceados para el presupuesto vigente. Ajuste los controles para iniciar simulaciones del Plan de Desarrollo Municipal.</span>
                ) : totalSimulatedDifference > 0 ? (
                  <span>Un incremento fiscal de <b>${(totalSimulatedDifference / 1000000).toFixed(2)}M COP</b> permite apalancar infraestructura cofinanciada por el gobierno nacional, reduciendo la dependencia de transferencias centrales SGP.</span>
                ) : (
                  <span>Una reducción catastral o tributaria por valor de <b>${(absDiff / 1000000).toFixed(2)}M COP</b> requiere reajustar los gastos de funcionamiento municipales para evitar caer en restricciones de la Ley 617 de 2000.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Transparencia Tributaria */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex gap-3 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <h5 className="font-bold text-slate-200 mb-0.5">Cumplimiento del Marco Técnico Catastral de Colombia</h5>
          <p className="text-[10px] text-slate-400">
            Los datos analizados corresponden al proceso de conservación y actualización catastral multipropósito regulado por el <b>IGAC</b> y el <b>DANE</b>. Esto permite estructurar de manera óptima las finanzas del municipio para inversiones en infraestructura, servicios sociales y ordenamiento ecológico.
          </p>
        </div>
      </div>
    </div>
  );
}
