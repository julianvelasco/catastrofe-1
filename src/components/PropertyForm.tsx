import React, { useState, useEffect } from 'react';
import { Property, PropertyZone, PropertyUse, ConservationState, PossessionType } from '../types';
import { CADASTRAL_ZONES, calculateValuationAndTax } from '../initialData';
import { Save, X, Calculator, HelpCircle, User, FileText, CheckCircle } from 'lucide-react';

interface PropertyFormProps {
  property: Partial<Property> | null;
  onSave: (property: Property) => void;
  onCancel: () => void;
  isEdit: boolean;
}

export default function PropertyForm({
  property,
  onSave,
  onCancel,
  isEdit,
}: PropertyFormProps) {
  // Estado local para los campos del formulario
  const [codigoCatastral, setCodigoCatastral] = useState('');
  const [matriculaInmobiliaria, setMatriculaInmobiliaria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zona, setZona] = useState<PropertyZone>('Chapinero');
  const [propietarioNombre, setPropietarioNombre] = useState('');
  const [propietarioIdentificacion, setPropietarioIdentificacion] = useState('');
  const [propietarioTipoDoc, setPropietarioTipoDoc] = useState<'CC' | 'NIT' | 'CE' | 'Pasaporte'>('CC');
  const [areaTerreno, setAreaTerreno] = useState(120);
  const [areaConstruida, setAreaConstruida] = useState(80);
  const [pisos, setPisos] = useState(1);
  const [estadoConservacion, setEstadoConservacion] = useState<ConservationState>('Bueno');
  const [usoSuelo, setUsoSuelo] = useState<PropertyUse>('Residencial');

  // Valores liquidados en tiempo real
  const [calcResults, setCalcResults] = useState({
    avaluoTerreno: 0,
    avaluoConstruccion: 0,
    avaluoTotal: 0,
    tarifaMil: 0,
    impuestoPredial: 0,
  });

  // Al cargar un predio para editar o con valores pre-completados por dibujo
  useEffect(() => {
    if (property) {
      setCodigoCatastral(property.codigoCatastral || generateMockCode());
      setMatriculaInmobiliaria(property.matriculaInmobiliaria || generateMockMatricula());
      setDireccion(property.direccion || '');
      setZona(property.zona || 'Chapinero');
      setPropietarioNombre(property.propietarioNombre || '');
      setPropietarioIdentificacion(property.propietarioIdentificacion || '');
      setPropietarioTipoDoc(property.propietarioTipoDoc || 'CC');
      setAreaTerreno(property.areaTerreno || 120);
      setAreaConstruida(property.areaConstruida || 80);
      setPisos(property.pisos || 1);
      setEstadoConservacion(property.estadoConservacion || 'Bueno');
      setUsoSuelo(property.usoSuelo || 'Residencial');
    }
  }, [property]);

  // Recalcular liquidaciones cuando cambian los valores físicos o de zona/uso
  useEffect(() => {
    const results = calculateValuationAndTax({
      zona,
      areaTerreno,
      areaConstruida,
      pisos,
      estadoConservacion,
      usoSuelo,
    });
    setCalcResults(results);
  }, [zona, areaTerreno, areaConstruida, pisos, estadoConservacion, usoSuelo]);

  // Generadores automáticos para agilizar el registro del usuario
  const generateMockCode = () => {
    const d1 = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const d2 = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const d3 = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const d4 = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${d1}-${d2}-${d3}-${d4}-000`;
  };

  const generateMockMatricula = () => {
    const prefix = zona.includes('Rural') ? '176' : '50C';
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${num}`;
  };

  const handleSuggestAddress = () => {
    const prefixes = ['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Vereda'];
    const selectedPref = prefixes[Math.floor(Math.random() * prefixes.length)];
    if (selectedPref === 'Vereda') {
      const veredas = ['La Esmeralda', 'Chuscal', 'Monquentiva', 'Meusa', 'Aposentos'];
      setDireccion(`${selectedPref} ${veredas[Math.floor(Math.random() * veredas.length)]}, Finca El Recuerdo`);
    } else {
      setDireccion(`${selectedPref} ${Math.floor(Math.random() * 150)} # ${Math.floor(Math.random() * 80)}-${Math.floor(Math.random() * 90)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propietarioNombre.trim() || !propietarioIdentificacion.trim() || !direccion.trim()) {
      alert("Por favor, complete todos los campos obligatorios (Propietario, Identificación y Dirección).");
      return;
    }

    const savedProperty: Property = {
      id: property?.id || Date.now().toString(),
      codigoCatastral,
      matriculaInmobiliaria,
      direccion,
      zona,
      tipoZona: CADASTRAL_ZONES[zona].tipoZona,
      propietarioNombre,
      propietarioIdentificacion,
      propietarioTipoDoc,
      areaTerreno,
      areaConstruida,
      pisos,
      estadoConservacion,
      usoSuelo,
      ...calcResults,
      vertices: property?.vertices || [
        { x: 400, y: 200 },
        { x: 500, y: 200 },
        { x: 500, y: 300 },
        { x: 400, y: 300 }
      ],
      centroide: property?.centroide || { x: 450, y: 250 },
      colorHex: property?.colorHex || (usoSuelo === 'Residencial' ? '#3b82f6' : '#f59e0b'),
    };

    onSave(savedProperty);
  };

  return (
    <div className="bg-white dark:bg-[#0a0f1e]/40 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl h-full flex flex-col max-h-[85vh] md:max-h-[none] relative z-10 transition-colors duration-300">
      {/* Cabecera del formulario */}
      <div className="bg-slate-50 dark:bg-white/5 px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Modificar Ficha Catastral' : 'Nueva Incorporación Catastral'}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Formulario Scrolleable */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-700 dark:text-slate-200 transition-colors duration-300">
        
        {/* Sección 1: Datos Identificativos */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            1. Identificación Jurídica y Catastral
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">CÓDIGO CATASTRAL (NUPRE)</label>
              <input
                type="text"
                value={codigoCatastral}
                onChange={(e) => setCodigoCatastral(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">MATRÍCULA INMOBILIARIA</label>
              <input
                type="text"
                value={matriculaInmobiliaria}
                onChange={(e) => setMatriculaInmobiliaria(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">DIRECCIÓN / UBICACIÓN DEL PREDIO</label>
              <button
                type="button"
                onClick={handleSuggestAddress}
                className="text-[9px] text-blue-500 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                Sugerir dirección
              </button>
            </div>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Calle 72 # 11-45 o Vereda Meusa, Finca Linda Vista"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Sección 2: Información del Propietario */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            2. Propietario / Sujeto Pasivo
          </h4>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">NOMBRE COMPLETO O RAZÓN SOCIAL</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-550 dark:text-slate-500">
                <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              </span>
              <input
                type="text"
                value={propietarioNombre}
                onChange={(e) => setPropietarioNombre(e.target.value)}
                placeholder="Ej: Carlos Restrepo o Constructora Ltda"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">TIPO DOC.</label>
              <select
                value={propietarioTipoDoc}
                onChange={(e: any) => setPropietarioTipoDoc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="CC" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Cédula Ciudadanía (CC)</option>
                <option value="NIT" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">NIT (Empresas)</option>
                <option value="CE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Cédula Extranjería (CE)</option>
                <option value="Pasaporte" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pasaporte</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">NÚMERO DE IDENTIFICACIÓN</label>
              <input
                type="text"
                value={propietarioIdentificacion}
                onChange={(e) => setPropietarioIdentificacion(e.target.value)}
                placeholder="Ej: 80.123.456 o 900.123.456-1"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Características Físicas y de Suelo */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            3. Variables Físicas y de Uso
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">ZONA CATASTRAL</label>
              <select
                value={zona}
                onChange={(e: any) => setZona(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {Object.keys(CADASTRAL_ZONES).map((z) => (
                  <option key={z} value={z} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {z} ({CADASTRAL_ZONES[z].tipoZona})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">USO DEL SUELO</label>
              <select
                value={usoSuelo}
                onChange={(e: any) => setUsoSuelo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="Residencial" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Residencial</option>
                <option value="Comercial" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Comercial</option>
                <option value="Industrial" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Industrial</option>
                <option value="Agropecuario" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Agropecuario</option>
                <option value="Institucional" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Institucional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-0.5">
                ÁREA TERR. (m²)
                <span className="text-slate-500 cursor-help" title="Área del lote o predio de tierra">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </label>
              <input
                type="number"
                value={areaTerreno}
                onChange={(e) => setAreaTerreno(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-0.5">
                ÁREA CONST. (m²)
                <span className="text-slate-500 cursor-help" title="Suma de áreas construidas en todos los pisos">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </label>
              <input
                type="number"
                value={areaConstruida}
                onChange={(e) => setAreaConstruida(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">N° PISOS</label>
              <input
                type="number"
                value={pisos}
                onChange={(e) => setPisos(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">ESTADO DE CONSERVACIÓN</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Excelente', 'Bueno', 'Regular', 'Malo'] as ConservationState[]).map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => setEstadoConservacion(state)}
                  className={`py-1.5 text-center font-semibold rounded-lg transition-all border cursor-pointer ${
                    estadoConservacion === state
                      ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sección de Liquidación Dinámica */}
        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10 space-y-3.5 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Liquidación Técnica Automática
            </span>
            <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold border border-blue-500/20">
              Método IGAC
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">Avalúo del Terreno</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                ${calcResults.avaluoTerreno.toLocaleString('es-CO')} <span className="text-[9px] text-slate-500">COP</span>
              </p>
              <p className="text-[9px] text-slate-500">
                ({areaTerreno} m² @ ${(CADASTRAL_ZONES[zona]?.valorM2Terreno || 0).toLocaleString('es-CO')}/m²)
              </p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">Avalúo de Construcción</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                ${calcResults.avaluoConstruccion.toLocaleString('es-CO')} <span className="text-[9px] text-slate-500">COP</span>
              </p>
              <p className="text-[9px] text-slate-500">
                ({areaConstruida} m² c/factor conserv.)
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-white/5 pt-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">AVALÚO CATASTRAL TOTAL</p>
              <p className="text-base font-black text-blue-600 dark:text-blue-400">
                ${calcResults.avaluoTotal.toLocaleString('es-CO')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">COP</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">IMPUESTO PREDIAL</p>
              <p className="text-base font-black text-blue-600 dark:text-blue-300">
                ${calcResults.impuestoPredial.toLocaleString('es-CO')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">COP</span>
              </p>
              <p className="text-[9px] text-slate-500">Tarifa: {calcResults.tarifaMil}‰ (milésimo)</p>
            </div>
          </div>
        </div>

        {property?.vertices && (
          <div className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Geometría cargada de manera exitosa desde el dibujo interactivo.</span>
          </div>
        )}
      </form>

      {/* Botones de acción inferiores */}
      <div className="bg-slate-50 dark:bg-white/5 px-5 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3.5 transition-colors duration-300">
        <button
          type="button"
          onClick={onCancel}
          className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Guardar Predio
        </button>
      </div>
    </div>
  );
}
