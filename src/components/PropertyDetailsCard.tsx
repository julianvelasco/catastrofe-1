import React, { useState } from 'react';
import { Property } from '../types';
import { CADASTRAL_ZONES } from '../initialData';
import { FileText, MapPin, DollarSign, Calendar, Trash2, Edit3, ShieldAlert, FileDown, Sparkles, User, Tag, Scale, FileSpreadsheet, Compass, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { APIProvider, Map as GoogleMap } from '@vis.gl/react-google-maps';
import { GmpPolygon } from './GmpPolygon';

// Google Maps Configuration
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Center of Bogotá (Chapinero area)
const BOGOTA_CENTER = { lat: 4.665, lng: -74.065 };

// Projection: generic map coords (900x450 width x height) mapping to LatLng around Bogotá
function projectXYToLatLng(x: number, y: number): { lat: number; lng: number } {
  const degPerUnit = 0.000035;
  const lng = BOGOTA_CENTER.lng + (x - 450) * degPerUnit;
  const lat = BOGOTA_CENTER.lat - (y - 225) * degPerUnit;
  return { lat, lng };
}

interface PropertyDetailsCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onDraftAppeal: (property: Property) => void;
  allProperties?: Property[];
}

export default function PropertyDetailsCard({
  property,
  onEdit,
  onDelete,
  onDraftAppeal,
  allProperties = [],
}: PropertyDetailsCardProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'fisico' | 'economico'>('general');
  const [isDownloading, setIsDownloading] = useState(false);
  const [miniZoom, setMiniZoom] = useState(1.0);

  const zoneConfig = CADASTRAL_ZONES[property.zona];

  // Helper colors for the mini-map
  const getPropertyColor = (prop: Property) => {
    if (prop.usoSuelo === 'Residencial') return 'rgba(59, 130, 246, 0.25)';
    if (prop.usoSuelo === 'Comercial') return 'rgba(245, 158, 11, 0.25)';
    if (prop.usoSuelo === 'Industrial') return 'rgba(239, 68, 68, 0.25)';
    if (prop.usoSuelo === 'Agropecuario') return 'rgba(16, 185, 129, 0.25)';
    if (prop.usoSuelo === 'Institucional') return 'rgba(168, 85, 247, 0.25)';
    return 'rgba(148, 163, 184, 0.25)';
  };

  const getPropertyBorderColor = (prop: Property) => {
    if (prop.usoSuelo === 'Residencial') return '#3b82f6';
    if (prop.usoSuelo === 'Comercial') return '#f59e0b';
    if (prop.usoSuelo === 'Industrial') return '#ef4444';
    if (prop.usoSuelo === 'Agropecuario') return '#10b981';
    if (prop.usoSuelo === 'Institucional') return '#a855f7';
    return '#94a3b8';
  };

  // Cálculo de la caja delimitadora (Bounding Box) para centrar el polígono en el mini-mapa
  const vertices = property.vertices || [];
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : 100;
  const minY = ys.length > 0 ? Math.min(...ys) : 0;
  const maxY = ys.length > 0 ? Math.max(...ys) : 100;

  const polyWidth = maxX - minX;
  const polyHeight = maxY - minY;
  const maxDim = Math.max(polyWidth, polyHeight, 10);

  const centerX = minX + polyWidth / 2;
  const centerY = minY + polyHeight / 2;

  // Tamaño de la caja de visualización (viewBox) ajustada por el miniZoom interactivo
  const size = (maxDim * 1.6) / miniZoom;
  const viewMinX = centerX - size / 2;
  const viewMinY = centerY - size / 2;
  const viewBox = `${viewMinX} ${viewMinY} ${size} ${size}`;

  // Exportar datos del predio a un archivo CSV estructurado
  const handleExportToCSV = () => {
    const headers = ['Variable / Campo', 'Valor'];
    const rows = [
      ['ID Predio', property.id],
      ['Codigo Catastral (NUPRE)', property.codigoCatastral],
      ['Matricula Inmobiliaria', property.matriculaInmobiliaria],
      ['Direccion', property.direccion],
      ['Zona', property.zona],
      ['Tipo Zona', property.tipoZona],
      ['Propietario', property.propietarioNombre],
      ['Tipo Identificacion', property.propietarioTipoDoc],
      ['Identificacion', property.propietarioIdentificacion],
      ['Area Terreno (m2)', property.areaTerreno],
      ['Area Construida (m2)', property.areaConstruida],
      ['Numero Pisos', property.pisos],
      ['Estado Conservacion', property.estadoConservacion],
      ['Uso Suelo', property.usoSuelo],
      ['Avaluo Terreno (COP)', property.avaluoTerreno],
      ['Avaluo Construccion (COP)', property.avaluoConstruccion],
      ['Avaluo Total (COP)', property.avaluoTotal],
      ['Impuesto Predial Anual (COP)', property.impuestoPredial],
      ['Tarifa Mil (por mil)', property.tarifaMil]
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ficha_Catastral_${property.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulación de descarga de ficha catastral oficial
  const handleDownloadCertificate = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      
      // Abrimos una ventana con una vista de impresión impecable y oficial para la Ficha Catastral
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const content = `
        <html>
          <head>
            <title>Ficha Catastral Oficial - Predio ${property.id}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; color: #1e293b; padding: 40px; }
              .header { border-bottom: 3px double #000; padding-bottom: 20px; text-align: center; }
              .logo-placeholder { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .title { font-size: 16px; font-weight: bold; margin-bottom: 15px; }
              .stamp { border: 1px solid #dc2626; color: #dc2626; display: inline-block; padding: 5px 15px; font-weight: bold; transform: rotate(-3deg); margin-top: 10px; }
              .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; margin-top: 30px; margin-bottom: 15px; padding-bottom: 4px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px; }
              .field { margin-bottom: 10px; }
              .label { font-weight: bold; color: #475569; }
              .value { font-size: 13px; font-weight: bold; border-bottom: 1px dotted #94a3b8; padding-bottom: 2px; }
              .footer { margin-top: 50px; font-size: 10px; border-top: 1px solid #000; padding-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-placeholder">REPÚBLICA DE COLOMBIA</div>
              <div class="title">INSTITUTO GEOGRÁFICO AGUSTÍN CODAZZI (IGAC)</div>
              <div>SISTEMA DE GESTIÓN DE CATASTRO MULTIPROPÓSITO</div>
              <div class="stamp">CERTIFICADO OFICIAL VÁLIDO</div>
            </div>
            
            <div class="section-title">I. INFORMACIÓN DE REGISTRO JURÍDICO</div>
            <div class="grid">
              <div class="field"><span class="label">CÓDIGO CATASTRAL:</span> <span class="value">${property.codigoCatastral}</span></div>
              <div class="field"><span class="label">FOLIO MATRÍCULA INMOBILIARIA:</span> <span class="value">${property.matriculaInmobiliaria}</span></div>
              <div class="field"><span class="label">NÚMERO DE EXPEDIENTE:</span> <span class="value">SGC-00${property.id}</span></div>
              <div class="field"><span class="label">DIRECCIÓN DE REGISTRO:</span> <span class="value">${property.direccion}</span></div>
            </div>

            <div class="section-title">II. SUJETO PASIVO / PROPIETARIO</div>
            <div class="grid">
              <div class="field"><span class="label">PROPIETARIO REGISTRADO:</span> <span class="value">${property.propietarioNombre}</span></div>
              <div class="field"><span class="label">IDENTIFICACIÓN:</span> <span class="value">${property.propietarioTipoDoc} ${property.propietarioIdentificacion}</span></div>
            </div>

            <div class="section-title">III. VARIABLES FÍSICAS DEL TERRITORIO</div>
            <div class="grid">
              <div class="field"><span class="label">ZONA TERRITORIAL:</span> <span class="value">${property.zona} (${property.tipoZona})</span></div>
              <div class="field"><span class="label">USO DEL SUELO ADMITIDO:</span> <span class="value">${property.usoSuelo}</span></div>
              <div class="field"><span class="label">ÁREA DEL TERRENO:</span> <span class="value">${property.areaTerreno} m²</span></div>
              <div class="field"><span class="label">ÁREA CONSTRUIDA:</span> <span class="value">${property.areaConstruida} m²</span></div>
              <div class="field"><span class="label">ESTADO DE CONSERVACIÓN:</span> <span class="value">${property.estadoConservacion}</span></div>
              <div class="field"><span class="label">NÚMERO DE ALTURAS/PISOS:</span> <span class="value">${property.pisos} piso(s)</span></div>
            </div>

            <div class="section-title">IV. AVALÚOS Y LIQUIDACIÓN TRIBUTARIA (COP)</div>
            <div class="grid">
              <div class="field"><span class="label">AVALÚO CATASTRAL DE TIERRA:</span> <span class="value">$${property.avaluoTerreno.toLocaleString('es-CO')}</span></div>
              <div class="field"><span class="label">AVALÚO CATASTRAL EDIFICACIÓN:</span> <span class="value">$${property.avaluoConstruccion.toLocaleString('es-CO')}</span></div>
              <div class="field"><span class="label">AVALÚO CATASTRAL INTEGRAL:</span> <span class="value">$${property.avaluoTotal.toLocaleString('es-CO')}</span></div>
              <div class="field"><span class="label">IMPUESTO PREDIAL ANUAL:</span> <span class="value">$${property.impuestoPredial.toLocaleString('es-CO')}</span></div>
              <div class="field"><span class="label">TARIFA DE LIQUIDACIÓN:</span> <span class="value">${property.tarifaMil}‰</span></div>
            </div>

            <div class="footer">
              <p>Este certificado es una representación oficial generada digitalmente en fecha ${new Date().toLocaleDateString('es-CO')}.</p>
              <p>La veracidad de los datos cartográficos y de avalúo está regulada conforme a la Ley 1955 de 2019 de Catastro Multipropósito de la República de Colombia.</p>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `;
      
      printWindow.document.write(content);
      printWindow.document.close();
    }, 1200);
  };

  return (
    <div className="bg-white dark:bg-[#0a0f1e]/40 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl flex flex-col h-full text-xs text-slate-700 dark:text-slate-200 relative z-10 transition-all duration-300">
      
      {/* Cabecera de Detalle */}
      <div className="bg-slate-50 dark:bg-white/5 p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Predio ID: {property.id}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(property)}
            className="p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
            title="Editar ficha"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(property.id)}
            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-300 rounded-lg transition-all cursor-pointer"
            title="Eliminar predio"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 transition-colors duration-300">
        {(['general', 'fisico', 'economico'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center font-semibold transition-all border-b-2 capitalize text-[11px] cursor-pointer ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {tab === 'general' ? 'General & Legal' : tab === 'fisico' ? 'Físico / Suelos' : 'Económico'}
          </button>
        ))}
      </div>

      {/* Contenido de la Pestaña */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        
        {/* MINI-MAPA DE IDENTIFICACIÓN RÁPIDA DE PREDIO */}
        <div className="relative bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-md flex flex-col group transition-all duration-300">
          {/* Cabecera del mini-mapa */}
          <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/50 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-slate-300">
            <Compass className="w-3 h-3 text-blue-400 animate-spin-slow" />
            <span>Mini-Mapa de Ubicación</span>
          </div>

          {/* Botones de zoom interactivo */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <button
              onClick={() => setMiniZoom(prev => Math.min(prev + 0.25, 4.0))}
              className="p-1 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-white rounded border border-slate-700/50 transition-all cursor-pointer text-[10px] font-bold"
              title="Acercar mini-mapa"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMiniZoom(prev => Math.max(prev - 0.25, 0.5))}
              className="p-1 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-white rounded border border-slate-700/50 transition-all cursor-pointer text-[10px] font-bold"
              title="Alejar mini-mapa"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMiniZoom(1.0)}
              className="p-1 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-white rounded border border-slate-700/50 transition-all cursor-pointer text-[10px] font-bold"
              title="Reestablecer escala"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* El visor de mapa (Google Maps si está disponible, o SVG como fallback) */}
          {hasValidKey ? (
            <div className="w-full h-28 relative">
              <APIProvider apiKey={API_KEY} version="weekly">
                <GoogleMap
                  center={projectXYToLatLng(centerX, centerY)}
                  zoom={17.5 + Math.log2(miniZoom)}
                  mapId="MINI_MAP_PROPERTY_ID"
                  mapTypeId="hybrid"
                  gestureHandling="none"
                  disableDefaultUI={true}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  <GmpPolygon
                    paths={vertices.map(v => projectXYToLatLng(v.x, v.y))}
                    fillColor={getPropertyBorderColor(property)}
                    fillOpacity={0.4}
                    strokeColor={getPropertyBorderColor(property)}
                    strokeOpacity={0.9}
                    strokeWeight={3.0}
                  />
                </GoogleMap>
              </APIProvider>
            </div>
          ) : (
            <svg className="w-full h-28 select-none pointer-events-none" viewBox={viewBox}>
              <defs>
                <pattern id="miniGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(148, 163, 184, 0.08)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x={viewMinX - 200} y={viewMinY - 200} width={size + 400} height={size + 400} fill="#020617" />
              <rect x={viewMinX - 200} y={viewMinY - 200} width={size + 400} height={size + 400} fill="url(#miniGrid)" />
  
              {/* Dibujar otros predios de fondo en gris/azul muy tenue */}
              {allProperties && allProperties.filter(p => p.id !== property.id).map(p => {
                const pts = p.vertices.map(v => `${v.x},${v.y}`).join(' ');
                return (
                  <polygon
                    key={`neighbor-${p.id}`}
                    points={pts}
                    fill="rgba(148, 163, 184, 0.02)"
                    stroke="rgba(148, 163, 184, 0.12)"
                    strokeWidth="0.75"
                    strokeDasharray="2,2"
                  />
                );
              })}
  
              {/* Dibujar el predio seleccionado */}
              <polygon
                points={property.vertices.map(v => `${v.x},${v.y}`).join(' ')}
                fill={getPropertyColor(property)}
                stroke={getPropertyBorderColor(property)}
                strokeWidth="2.5"
              />
  
              {/* Pulso animado */}
              <polygon
                points={property.vertices.map(v => `${v.x},${v.y}`).join(' ')}
                fill="none"
                stroke={getPropertyBorderColor(property)}
                strokeWidth="5"
                opacity="0.3"
                className="animate-pulse"
              />
  
              {/* Centroide / Punto de ubicación */}
              <circle
                cx={property.centroide.x}
                cy={property.centroide.y}
                r="4"
                fill="#ffffff"
                stroke={getPropertyBorderColor(property)}
                strokeWidth="1.5"
              />
              <circle
                cx={property.centroide.x}
                cy={property.centroide.y}
                r="2"
                fill={getPropertyBorderColor(property)}
              />
            </svg>
          )}

          {/* Información y escala */}
          <div className="absolute bottom-1.5 left-2 right-2 flex justify-between items-center text-[7.5px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-slate-800/40 select-none pointer-events-none">
            <span>CENTROIDE: {property.centroide.x.toFixed(1)} N, {property.centroide.y.toFixed(1)} E</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-slate-400 inline-block"></span>
              <span>{Math.round(size * 0.2)} m</span>
            </div>
          </div>
        </div>

        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Código Catastral */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
              <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Código Homologado (NUPRE)</span>
              <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">{property.codigoCatastral}</span>
            </div>

            {/* Fila de Matrícula y Ubicación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Matrícula Inmobiliaria</span>
                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">{property.matriculaInmobiliaria}</span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Jurisdicción (Municipio)</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{property.zona}</span>
              </div>
            </div>

            {/* Dirección */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 flex gap-2 transition-colors duration-300">
              <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Dirección Registrada</span>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{property.direccion}</span>
              </div>
            </div>

            {/* Propietario */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 flex gap-2 transition-colors duration-300">
              <User className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="w-full">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Propietario / Sujeto Pasivo</span>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">{property.propietarioNombre}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                    {property.propietarioTipoDoc}: {property.propietarioIdentificacion}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'fisico' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Bento Grid Físico */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Área del Terreno</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100">{property.areaTerreno}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">m²</span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Área Construida</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100">{property.areaConstruida}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">m²</span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Uso de Suelo POT</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{property.usoSuelo}</span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nivel de Alturas</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{property.pisos} Pisos</span>
              </div>
            </div>

            {/* Conservación */}
            <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between transition-colors duration-300">
              <div>
                <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Estado de Conservación</span>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-bold mt-1 inline-block">Calidad de Materiales y Mantenimiento</span>
              </div>
              <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${
                property.estadoConservacion === 'Excelente' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                property.estadoConservacion === 'Bueno' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                property.estadoConservacion === 'Regular' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              }`}>
                {property.estadoConservacion}
              </span>
            </div>

            {/* Georreferencia y Vértices */}
            <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 transition-colors duration-300">
              <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Información Espacial (Nodos del Polígono)</span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                {property.vertices.slice(0, 4).map((v, i) => (
                  <div key={i} className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
                    <span>Vértice {i + 1}:</span>
                    <span className="text-slate-700 dark:text-slate-300">({v.x * 2}, {v.y * 2}) N</span>
                  </div>
                ))}
                {property.vertices.length > 4 && (
                  <div className="col-span-2 text-center text-blue-600 dark:text-blue-400 pt-1 font-sans text-[8.5px] font-semibold">
                    + {property.vertices.length - 4} vértices georreferenciados adicionales
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'economico' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Desglose de Valores */}
            <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 space-y-2 transition-colors duration-300">
              <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Desglose de Avalúo Multipropósito</span>
              
              <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Avalúo Terreno ({property.areaTerreno} m²):</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">${property.avaluoTerreno.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Avalúo Construcción ({property.areaConstruida} m²):</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">${property.avaluoConstruccion.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between text-xs py-1.5 pt-2">
                <span className="text-slate-800 dark:text-slate-100 font-bold">AVALÚO TOTAL INTEGRAL:</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-sm">${property.avaluoTotal.toLocaleString('es-CO')} COP</span>
              </div>
            </div>

            {/* Impuesto Predial Liquidado */}
            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/5 dark:to-blue-950/20 flex items-center justify-between transition-all">
              <div>
                <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase">Liquidación Predial</span>
                <span className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5 inline-block">
                  ${property.impuestoPredial.toLocaleString('es-CO')} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">COP</span>
                </span>
                <span className="block text-[8.5px] text-slate-450 dark:text-slate-500">Vence: 31-Dic-2026</span>
              </div>
              <div className="text-right">
                <span className="block text-[8px] font-bold text-slate-500 dark:text-slate-450 uppercase">Tarifa Efectiva</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{property.tarifaMil} ‰</span>
                <span className="block text-[8.5px] text-slate-500 dark:text-slate-450">(por mil)</span>
              </div>
            </div>

            {/* Factor de Referencia Catastral */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed flex gap-2 transition-colors duration-300">
              <Scale className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                El avalúo de este predio se calcula de acuerdo con la clasificación del <b>POT de {property.zona}</b>. El valor catastral representa aproximadamente el 70% del valor comercial estimado de mercado.
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Acciones del Predio */}
      <div className="bg-slate-50 dark:bg-white/5 p-4 border-t border-slate-200 dark:border-white/10 space-y-3 transition-colors duration-300">
        <div className="grid grid-cols-2 gap-3">
          {/* Generar Ficha Oficial */}
          <button
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] disabled:opacity-50 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            {isDownloading ? 'Generando...' : 'Descargar Ficha'}
          </button>

          {/* Borrador de Recurso de Apelación Catastral (Gemini AI) */}
          <button
            onClick={() => onDraftAppeal(property)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Apelar Avalúo IA
          </button>
        </div>

        {/* Exportador CSV al final de la pantalla de consulta de dicho predio */}
        <button
          onClick={handleExportToCSV}
          className="w-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] cursor-pointer shadow-sm"
          title="Exportar ficha técnica y datos de avalúo de este predio en formato CSV"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <span>Exportar Consulta a CSV</span>
        </button>
      </div>
    </div>
  );
}
