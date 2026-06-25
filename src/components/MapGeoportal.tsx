import React, { useState, useRef, useEffect } from 'react';
import { Property, Coor, PropertyZone } from '../types';
import { CADASTRAL_ZONES } from '../initialData';
import { Map, Layers, Plus, ZoomIn, ZoomOut, RotateCcw, Compass, MousePointer, Info, AlertTriangle, Eye, Sparkles, Flame, X, MapPin, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
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
export function projectXYToLatLng(x: number, y: number): { lat: number; lng: number } {
  const degPerUnit = 0.000035;
  const lng = BOGOTA_CENTER.lng + (x - 450) * degPerUnit;
  const lat = BOGOTA_CENTER.lat - (y - 225) * degPerUnit;
  return { lat, lng };
}

// Hierarchical territories with coordinates & LatLng positions
export const TERRITORIAL_HIERARCHY: Record<
  string, 
  Record<string, Record<string, { x: number; y: number; zoom: number; lat: number; lng: number }>>
> = {
  'Cundinamarca': {
    'Sopó': {
      'Vereda Chuscal': { x: 485, y: 185, zoom: 17, lat: 4.908, lng: -73.938 },
      'Vereda Meusa': { x: 520, y: 110, zoom: 16, lat: 4.920, lng: -73.920 },
      'Centro Sopó': { x: 450, y: 150, zoom: 17, lat: 4.914, lng: -73.945 }
    },
    'Guatavita': {
      'Vereda Monquentiva': { x: 700, y: 205, zoom: 17, lat: 4.939, lng: -73.834 },
      'Vereda Potrero Largo': { x: 740, y: 280, zoom: 16, lat: 4.930, lng: -73.840 },
      'Centro Guatavita': { x: 670, y: 230, zoom: 17, lat: 4.942, lng: -73.836 }
    }
  },
  'Bogotá D.C.': {
    'Bogotá D.C.': {
      'Chapinero': { x: 170, y: 95, zoom: 17, lat: 4.665, lng: -74.065 },
      'Usaquén': { x: 310, y: 165, zoom: 17, lat: 4.701, lng: -74.041 },
      'Suba': { x: 190, y: 300, zoom: 17, lat: 4.745, lng: -74.095 },
      'Teusaquillo': { x: 340, y: 305, zoom: 17, lat: 4.642, lng: -74.078 }
    }
  },
  'Boyacá': {
    'Villa de Leyva': {
      'Vereda La Capilla': { x: 800, y: 350, zoom: 16, lat: 5.632, lng: -73.528 },
      'Centro Histórico': { x: 850, y: 380, zoom: 17, lat: 5.637, lng: -73.524 }
    }
  }
};

// MapController to automatically center the Google Map on selectedProperty or custom coordinates
function MapController({ 
  selectedProperty, 
  customCenter 
}: { 
  selectedProperty: Property | null;
  customCenter: { lat: number; lng: number; zoom: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedProperty) {
      const coords = projectXYToLatLng(selectedProperty.centroide.x, selectedProperty.centroide.y);
      map.panTo(coords);
      map.setZoom(17);
    } else if (customCenter) {
      map.panTo({ lat: customCenter.lat, lng: customCenter.lng });
      map.setZoom(customCenter.zoom);
    }
  }, [map, selectedProperty, customCenter]);

  return null;
}

interface MapGeoportalProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property | null) => void;
  onAddPropertyFromDrawing: (vertices: Coor[], area: number, centroid: Coor) => void;
  theme?: 'light' | 'dark';
}

type MapLayer = 'catastral' | 'avaluo' | 'riesgo' | 'satelital' | 'heatmap';

export default function MapGeoportal({
  properties,
  selectedProperty,
  onSelectProperty,
  onAddPropertyFromDrawing,
  theme = 'dark',
}: MapGeoportalProps) {
  const [layer, setLayer] = useState<MapLayer>('catastral');
  const [mapType, setMapType] = useState<'vector' | 'gmaps'>(hasValidKey ? 'gmaps' : 'vector');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Coor>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Coor>({ x: 0, y: 0 });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Coor[]>([]);
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null);

  // Estados de la herramienta de Consulta Catastral
  const [isQueryBoxOpen, setIsQueryBoxOpen] = useState(true);
  const [activeQueryTab, setActiveQueryTab] = useState<'coordenada' | 'direccion' | 'predial'>('predial');
  const [queryX, setQueryX] = useState('');
  const [queryY, setQueryY] = useState('');
  const [queryAddress, setQueryAddress] = useState('');
  const [queryPredial, setQueryPredial] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);

  // Estados para Clasificación y Ubicación Territorial (Departamento, Ciudad, Barrio/Vereda)
  const [selectedDept, setSelectedDept] = useState('Cundinamarca');
  const [selectedCity, setSelectedCity] = useState('Sopó');
  const [selectedBarrio, setSelectedBarrio] = useState('Vereda Chuscal');
  const [customCenter, setCustomCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [isTerritorialOpen, setIsTerritorialOpen] = useState(true);

  const applyTerritorialLocation = (dept: string, city: string, barrio: string) => {
    const loc = TERRITORIAL_HIERARCHY[dept]?.[city]?.[barrio];
    if (!loc) return;

    // Buscar si hay algún predio que coincida con este sector / barrio / vereda
    const matchingProp = properties.find(p => 
      p.direccion.toLowerCase().includes(barrio.toLowerCase()) || 
      p.zona.toLowerCase().includes(barrio.toLowerCase()) ||
      p.zona.toLowerCase().includes(city.toLowerCase())
    );

    if (matchingProp) {
      onSelectProperty(matchingProp);
      const targetScale = 2.0;
      setScale(targetScale);
      setOffset({
        x: (MAP_WIDTH / 2 - matchingProp.centroide.x) * targetScale,
        y: (MAP_HEIGHT / 2 - matchingProp.centroide.y) * targetScale
      });
      setSearchSuccess(`Navegando a ${barrio}, ${city}. Se seleccionó automáticamente el predio de ${matchingProp.propietarioNombre}.`);
    } else {
      // Si no hay predio en la zona, limpiamos selección y enfocamos la zona directamente
      onSelectProperty(null);
      setCustomCenter({ lat: loc.lat, lng: loc.lng, zoom: loc.zoom });
      const targetScale = 2.0;
      setScale(targetScale);
      setOffset({
        x: (MAP_WIDTH / 2 - loc.x) * targetScale,
        y: (MAP_HEIGHT / 2 - loc.y) * targetScale
      });
      setSearchSuccess(`Enfocando vista en: ${barrio}, ${city}.`);
    }
    setSearchError(null);
  };

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    const cities = Object.keys(TERRITORIAL_HIERARCHY[dept] || {});
    if (cities.length > 0) {
      const firstCity = cities[0];
      setSelectedCity(firstCity);
      const barrios = Object.keys(TERRITORIAL_HIERARCHY[dept]?.[firstCity] || {});
      if (barrios.length > 0) {
        const firstBarrio = barrios[0];
        setSelectedBarrio(firstBarrio);
        applyTerritorialLocation(dept, firstCity, firstBarrio);
      }
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const barrios = Object.keys(TERRITORIAL_HIERARCHY[selectedDept]?.[city] || {});
    if (barrios.length > 0) {
      const firstBarrio = barrios[0];
      setSelectedBarrio(firstBarrio);
      applyTerritorialLocation(selectedDept, city, firstBarrio);
    }
  };

  const handleBarrioChange = (barrio: string) => {
    setSelectedBarrio(barrio);
    applyTerritorialLocation(selectedDept, selectedCity, barrio);
  };

  const svgRef = useRef<SVGSVGElement>(null);

  // Dimensiones lógicas del mapa
  const MAP_WIDTH = 900;
  const MAP_HEIGHT = 450;

  // Manejo de Zoom
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsDrawingMode(false);
    setDrawingPoints([]);
    setSearchError(null);
    setSearchSuccess(null);
  };

  // Función de consulta y enfoque de predio
  const handleQuerySearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    setSearchSuccess(null);

    let found: Property | undefined = undefined;

    if (activeQueryTab === 'predial') {
      const term = queryPredial.trim().toLowerCase();
      if (!term) {
        setSearchError('Por favor ingrese un número predial o código.');
        return;
      }
      found = properties.find(p => 
        p.id.toString() === term ||
        p.codigoCatastral.toLowerCase().includes(term) ||
        p.matriculaInmobiliaria.toLowerCase().includes(term)
      );
    } else if (activeQueryTab === 'direccion') {
      const term = queryAddress.trim().toLowerCase();
      if (!term) {
        setSearchError('Por favor ingrese una dirección.');
        return;
      }
      found = properties.find(p => 
        p.direccion.toLowerCase().includes(term)
      );
    } else if (activeQueryTab === 'coordenada') {
      const x = parseFloat(queryX);
      const y = parseFloat(queryY);
      if (isNaN(x) || isNaN(y)) {
        setSearchError('Por favor ingrese coordenadas válidas.');
        return;
      }
      
      // Buscar el predio cuyo centroide o vértice esté más cercano
      let closestProp: Property | null = null;
      let minDistance = Infinity;
      properties.forEach(p => {
        const dist = Math.hypot(p.centroide.x - x, p.centroide.y - y);
        if (dist < minDistance) {
          minDistance = dist;
          closestProp = p;
        }
      });

      if (closestProp && minDistance < 150) {
        found = closestProp;
      }
    }

    if (found) {
      onSelectProperty(found);
      
      // Aplicar zoom de enfoque centrado en el predio
      const targetScale = 1.8;
      setScale(targetScale);
      setOffset({
        x: (MAP_WIDTH / 2 - found.centroide.x) * targetScale,
        y: (MAP_HEIGHT / 2 - found.centroide.y) * targetScale
      });

      setSearchSuccess(`Predio N° ${found.id} localizado en el geoportal.`);
    } else {
      setSearchError('No se encontró ningún predio con la información provista.');
    }
  };

  // Drag and Pan
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (isDrawingMode) return; // No panear en modo dibujo
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convertir click en SVG a coordenadas de mapa teniendo en cuenta escala y offset
  const getSVGCoordinates = (e: React.MouseEvent<SVGSVGElement, MouseEvent>): Coor => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    
    // Coordenada relativa dentro del elemento SVG visible
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convertir de pixeles de pantalla a coordenadas del viewBox aplicando escala y offset
    // viewBox_X * escala + offset_X = click_X
    // viewBox_X = (click_X - offset_X) / escala
    
    // Para simplificar, calculamos con la escala y offset actuales:
    const mapX = Math.round((clickX - (rect.width - MAP_WIDTH * scale) / 2 - offset.x) / scale);
    const mapY = Math.round((clickY - (rect.height - MAP_HEIGHT * scale) / 2 - offset.y) / scale);
    
    return { x: mapX, y: mapY };
  };

  // Manejo de clicks en el mapa
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const coords = getSVGCoordinates(e);
    if (isDrawingMode) {
      // Evitar puntos fuera del rango lógico aproximado
      if (coords.x >= 0 && coords.x <= MAP_WIDTH && coords.y >= 0 && coords.y <= MAP_HEIGHT) {
        setDrawingPoints(prev => [...prev, coords]);
      }
    } else {
      if (isQueryBoxOpen && activeQueryTab === 'coordenada') {
        setQueryX(Math.round(coords.x).toString());
        setQueryY(Math.round(coords.y).toString());
        setSearchSuccess(`Coordenada capturada: (${Math.round(coords.x)}, ${Math.round(coords.y)}). Haz clic en "Consultar" para buscar.`);
        setSearchError(null);
      }
    }
  };

  // Completar dibujo de polígono
  const handleFinishDrawing = () => {
    if (drawingPoints.length < 3) return;

    // Calcular área usando la fórmula de la zapatilla (Shoelace formula)
    let areaPixels = 0;
    const n = drawingPoints.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      areaPixels += drawingPoints[i].x * drawingPoints[j].y;
      areaPixels -= drawingPoints[j].x * drawingPoints[i].y;
    }
    areaPixels = Math.abs(areaPixels) / 2;

    // Convertir pixeles de área a metros cuadrados simulados (1 px lineal = 2 metros lineales, por ende 1 px2 = 4 m2)
    const areaM2 = Math.round(areaPixels * 4.5);

    // Calcular centroide simple (promedio de vértices)
    const sumX = drawingPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = drawingPoints.reduce((sum, p) => sum + p.y, 0);
    const centroid = {
      x: Math.round(sumX / n),
      y: Math.round(sumY / n),
    };

    onAddPropertyFromDrawing(drawingPoints, areaM2, centroid);
    setIsDrawingMode(false);
    setDrawingPoints([]);
  };

  // Cancelar dibujo
  const handleCancelDrawing = () => {
    setIsDrawingMode(false);
    setDrawingPoints([]);
  };

  // Obtener el color de fondo del predio según la capa seleccionada
  const getPropertyColor = (prop: Property) => {
    if (selectedProperty?.id === prop.id) {
      return 'rgba(234, 179, 8, 0.4)'; // Resaltado de selección
    }

    if (layer === 'catastral') {
      // Color por uso de suelo estándar
      switch (prop.usoSuelo) {
        case 'Residencial': return 'rgba(59, 130, 246, 0.25)'; // Azul
        case 'Comercial': return 'rgba(245, 158, 11, 0.25)'; // Ámbar
        case 'Industrial': return 'rgba(239, 68, 68, 0.25)'; // Rojo
        case 'Agropecuario': return 'rgba(16, 185, 129, 0.25)'; // Esmeralda
        case 'Institucional': return 'rgba(139, 92, 246, 0.25)'; // Púrpura
        default: return 'rgba(156, 163, 175, 0.25)';
      }
    } else if (layer === 'avaluo') {
      // Mapa de calor económico (Avalúo catastral total)
      const val = prop.avaluoTotal;
      if (val > 2000000000) return 'rgba(220, 38, 38, 0.65)'; // Muy Alto - Rojo
      if (val > 1000000000) return 'rgba(245, 158, 11, 0.65)'; // Alto - Naranja
      if (val > 500000000) return 'rgba(234, 179, 8, 0.5)'; // Medio - Amarillo
      return 'rgba(16, 185, 129, 0.5)'; // Bajo - Verde
    } else if (layer === 'riesgo') {
      // Mapa de riesgos físicos ficticio (Sopó Rural y Suba tienen zonas propensas a inundación o deslizamiento)
      if (prop.zona.includes('Rural') || prop.zona === 'Suba') {
        // Riesgo Alto o Medio en estas zonas simuladas
        return prop.zona === 'Suba' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.4)';
      }
      return 'rgba(16, 185, 129, 0.15)'; // Riesgo Bajo - Verde claro
    } else if (layer === 'heatmap') {
      // En el modo Heatmap, los predios son casi transparentes para que resalte el gradiente del fondo,
      // pero con un sutil tinte según su valor para dar continuidad visual.
      const val = prop.avaluoTotal;
      if (val > 1500000000) return 'rgba(239, 68, 68, 0.08)';
      if (val > 1000000000) return 'rgba(245, 158, 11, 0.08)';
      if (val > 500000000) return 'rgba(234, 179, 8, 0.08)';
      return 'rgba(6, 182, 212, 0.08)';
    } else {
      // Satelital - fondo semitransparente para ver los detalles satelitales simulados debajo
      return 'rgba(255, 255, 255, 0.12)';
    }
  };

  const getPropertyBorderColor = (prop: Property) => {
    if (selectedProperty?.id === prop.id) return '#eab308'; // Amarillo brillante
    if (hoveredProperty?.id === prop.id) return '#ffffff';

    if (layer === 'heatmap') {
      return 'rgba(255, 255, 255, 0.22)'; // Sutil borde semi-transparente futurista
    }

    switch (prop.usoSuelo) {
      case 'Residencial': return '#3b82f6';
      case 'Comercial': return '#f59e0b';
      case 'Industrial': return '#ef4444';
      case 'Agropecuario': return '#10b981';
      case 'Institucional': return '#8b5cf6';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl relative flex flex-col h-full z-10 transition-colors duration-300">
      {/* Barra de Herramientas Superior del Mapa */}
      <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap gap-2 items-center justify-between z-10 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg border border-blue-500/20">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              Geoportal Catastral
              <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">
                SGC Colombia
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Cartografía territorial e infraestructura de datos</p>
          </div>
        </div>

        {/* Selector de Capas */}
        <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-0.5 gap-0.5 text-xs backdrop-blur-md transition-colors duration-300">
          <button
            onClick={() => setLayer('catastral')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              layer === 'catastral' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Mostrar uso de suelo de los predios"
          >
            <Layers className="w-3.5 h-3.5" />
            Uso Catastral
          </button>
          <button
            onClick={() => setLayer('avaluo')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              layer === 'avaluo' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Ver mapa de calor de valores catastrales"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Valorización
          </button>
          <button
            onClick={() => setLayer('heatmap')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              layer === 'heatmap' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Ver mapa de densidad de calor continuo de los avalúos"
          >
            <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            Heatmap
          </button>
          <button
            onClick={() => setLayer('riesgo')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              layer === 'riesgo' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Zonas de riesgo físico e inundación"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Riesgos
          </button>
          <button
            onClick={() => setLayer('satelital')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              layer === 'satelital' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Capa satelital con geografía de soporte"
          >
            <Eye className="w-3.5 h-3.5" />
            Satelital
          </button>
        </div>

        {/* Selector de Tipo de Mapa (Vector vs Google Maps) */}
        <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-0.5 gap-0.5 text-xs backdrop-blur-md transition-colors duration-300">
          <button
            onClick={() => setMapType('vector')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
              mapType === 'vector' ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Mapa vectorial local SVG"
          >
            Vectorial
          </button>
          <button
            onClick={() => setMapType('gmaps')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
              mapType === 'gmaps' ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Mapa satelital e interactivo con Google Maps"
          >
            <Map className="w-3.5 h-3.5 text-blue-500" />
            Google Maps
          </button>
        </div>

        {/* Acciones de Edición */}
        <div className="flex items-center gap-1.5">
          {isDrawingMode ? (
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-xl border border-blue-500/30">
              <span className="text-[11px] text-blue-300 font-semibold animate-pulse">
                Dibujando: {drawingPoints.length} ptos
              </span>
              <button
                onClick={handleFinishDrawing}
                disabled={drawingPoints.length < 3}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-pulse"
              >
                Completar
              </button>
              <button
                onClick={handleCancelDrawing}
                className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setMapType('vector'); // Cambiar automáticamente a vectorial para permitir el dibujo SVG
                setIsDrawingMode(true);
                onSelectProperty(null);
                setDrawingPoints([]);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              title="Haz clic en el mapa para trazar los vértices de un nuevo predio"
            >
              <Plus className="w-4 h-4" />
              Dibujar Predio
            </button>
          )}
        </div>
      </div>

      {/* Contenedor del Visor SVG */}
      <div className="flex-1 relative overflow-hidden bg-black/40 select-none">
        
        {/* Cuadro de Clasificación y Ubicación Territorial (Derecha) */}
        {isTerritorialOpen ? (
          <div className="absolute top-4 right-4 z-20 w-80 bg-white/95 dark:bg-[#0a1020]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg dark:shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 max-h-[85%] transition-all duration-300">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20 dark:border-emerald-500/30">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs tracking-wide">Ubicación Territorial</span>
              </div>
              <button
                onClick={() => setIsTerritorialOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                title="Minimizar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Selecciona tu ubicación para clasificar, filtrar y centrar el mapa en tu región o vereda de interés.
              </p>

              <div className="space-y-3">
                {/* Selector de Departamento */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
                    Departamento
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDept}
                      onChange={(e) => handleDeptChange(e.target.value)}
                      className="w-full appearance-none bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer pr-8 font-semibold"
                    >
                      {Object.keys(TERRITORIAL_HIERARCHY).map((dept) => (
                        <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                          {dept}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Selector de Ciudad/Municipio */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
                    Municipio / Ciudad
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full appearance-none bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer pr-8 font-semibold"
                    >
                      {Object.keys(TERRITORIAL_HIERARCHY[selectedDept] || {}).map((city) => (
                        <option key={city} value={city} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                          {city}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                      <Map className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Selector de Barrio/Vereda */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
                    Barrio / Vereda / Sector
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBarrio}
                      onChange={(e) => handleBarrioChange(e.target.value)}
                      className="w-full appearance-none bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer pr-8 font-semibold"
                    >
                      {Object.keys(TERRITORIAL_HIERARCHY[selectedDept]?.[selectedCity] || {}).map((barrio) => (
                        <option key={barrio} value={barrio} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                          {barrio}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de acción e información */}
              <button
                type="button"
                onClick={() => applyTerritorialLocation(selectedDept, selectedCity, selectedBarrio)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold py-2 rounded-xl transition-all shadow-md shadow-emerald-500/15 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4 animate-spin-slow text-white" />
                Ubicar Finca o Sector
              </button>

              <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 space-y-1 font-sans">
                <span className="font-bold text-slate-700 dark:text-slate-300">Resumen Territorial:</span>
                <p className="leading-snug">
                  Zona clasificada como <strong className="text-emerald-500 dark:text-emerald-400 font-extrabold">{selectedDept === 'Bogotá D.C.' ? 'Urbana' : 'Rural'}</strong>.
                  La escala predial se calcula con valores m2 optimizados para campesinos de {selectedCity}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsTerritorialOpen(true)}
            className="absolute top-4 right-4 z-20 bg-white dark:bg-[#0a1020]/90 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md dark:shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-emerald-500 animate-pulse" />
            Ubicación territorial
          </button>
        )}

        {/* Botón flotante para abrir la Consulta Catastral cuando está cerrada */}
        {!isQueryBoxOpen && (
          <button
            onClick={() => setIsQueryBoxOpen(true)}
            className="absolute top-4 left-4 z-20 bg-white dark:bg-[#0a1020]/90 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md dark:shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Consulta catastral
          </button>
        )}

        {/* Cuadro de Consulta Catastral Flotante */}
        {isQueryBoxOpen && (
          <div className="absolute top-4 left-4 z-20 w-80 bg-white/95 dark:bg-[#0a1020]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg dark:shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 max-h-[85%] transition-colors duration-300">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20 dark:border-blue-500/30">
                  <Map className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs tracking-wide">Consulta catastral</span>
              </div>
              <button
                onClick={() => setIsQueryBoxOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                title="Minimizar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Formulario */}
            <div className="p-4 space-y-4 overflow-y-auto">
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 italic">
                Esta herramienta te permite hacer una consulta catastral por número predial, dirección o coordenada.
              </p>

              {/* Pestañas de Navegación */}
              <div className="grid grid-cols-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-0.5 rounded-xl text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveQueryTab('coordenada');
                    setSearchError(null);
                    setSearchSuccess(null);
                  }}
                  className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                    activeQueryTab === 'coordenada'
                      ? 'bg-blue-500 text-white shadow-md font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Coordenada
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQueryTab('direccion');
                    setSearchError(null);
                    setSearchSuccess(null);
                  }}
                  className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                    activeQueryTab === 'direccion'
                      ? 'bg-blue-500 text-white shadow-md font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Dirección
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQueryTab('predial');
                    setSearchError(null);
                    setSearchSuccess(null);
                  }}
                  className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                    activeQueryTab === 'predial'
                      ? 'bg-blue-500 text-white shadow-md font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Número predial
                </button>
              </div>

              {/* Campos de Input */}
              <form onSubmit={(e) => { e.preventDefault(); handleQuerySearch(); }} className="space-y-3.5">
                {activeQueryTab === 'coordenada' && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-blue-600 dark:text-blue-300 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 px-2.5 py-1.5 rounded-lg leading-snug">
                      💡 <strong>Tip:</strong> Haz clic en cualquier punto del mapa para capturar sus coordenadas automáticamente.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coordenada X</label>
                        <input
                          type="number"
                          value={queryX}
                          onChange={(e) => setQueryX(e.target.value)}
                          placeholder="Ej: 450"
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coordenada Y</label>
                        <input
                          type="number"
                          value={queryY}
                          onChange={(e) => setQueryY(e.target.value)}
                          placeholder="Ej: 220"
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeQueryTab === 'direccion' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dirección del predio</label>
                    <input
                      type="text"
                      value={queryAddress}
                      onChange={(e) => setQueryAddress(e.target.value)}
                      placeholder="Ej: Calle 80, Sopó, Suba"
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                )}

                {activeQueryTab === 'predial' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Número predial o catastral</label>
                    <input
                      type="text"
                      value={queryPredial}
                      onChange={(e) => setQueryPredial(e.target.value)}
                      placeholder="Código catastral o ID predio"
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                )}

                {/* Feedback de Estado */}
                {searchError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-1.5 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-red-300 leading-snug">{searchError}</span>
                  </div>
                )}

                {searchSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-1.5 animate-fadeIn">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-ping"></div>
                    <span className="text-[10px] text-emerald-300 leading-snug">{searchSuccess}</span>
                  </div>
                )}

                {/* Botón de Envío */}
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-bold py-2 rounded-xl transition-all shadow-md shadow-blue-500/15 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Consultar
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* Leyenda flotante */}
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-[#0a1020]/95 backdrop-blur-xl p-3 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 z-10 pointer-events-none max-w-xs space-y-2 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="font-semibold text-slate-850 dark:text-white flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            {layer === 'catastral' && 'Leyenda: Uso de Suelo'}
            {layer === 'avaluo' && 'Leyenda: Valorización Catastral'}
            {layer === 'heatmap' && 'Leyenda: Densidad de Avalúos'}
            {layer === 'riesgo' && 'Leyenda: Clasificación de Riesgos'}
            {layer === 'satelital' && 'Leyenda: Geografía Satelital'}
          </div>

          {layer === 'heatmap' && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] inline-block"></span>
                <span>Muy Alto (&gt; $1,500 M COP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] inline-block"></span>
                <span>Alto ($1,000 M - $1,500 M COP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b] inline-block"></span>
                <span>Medio ($500 M - $1,000 M COP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4] inline-block"></span>
                <span>Bajo (&lt; $500 M COP)</span>
              </div>
            </div>
          )}

          {layer === 'catastral' && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/25 border border-blue-500 inline-block"></span>
                <span>Residencial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/25 border border-amber-500 inline-block"></span>
                <span>Comercial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500/25 border border-red-500 inline-block"></span>
                <span>Industrial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/25 border border-emerald-500 inline-block"></span>
                <span>Agropecuario</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/25 border border-purple-500 inline-block"></span>
                <span>Institucional</span>
              </div>
            </div>
          )}

          {layer === 'avaluo' && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600/75 inline-block"></span>
                <span>Alto Valor (&gt; $2,000 M COP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/75 inline-block"></span>
                <span>Medio-Alto ($1,000 M - $2,000 M COP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/75 inline-block"></span>
                <span>Medio ($500 M - $1,000 M COP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/75 inline-block"></span>
                <span>Bajo (&lt; $500 M COP)</span>
              </div>
            </div>
          )}

          {layer === 'riesgo' && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500/45 inline-block border border-red-500"></span>
                <span>Amenaza Alta (Deslizamiento / Inundación)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 inline-block border border-amber-500"></span>
                <span>Amenaza Media (Inestabilidad de taludes)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/15 inline-block border border-emerald-500"></span>
                <span>Sin Amenaza Crítica Detectada</span>
              </div>
            </div>
          )}

          {layer === 'satelital' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-sky-600 rounded-sm inline-block"></span>
                <span>Río Bogotá (Curva Hídrica)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-slate-600 rounded-sm inline-block"></span>
                <span>Vías Primarias y Conectores</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-950 inline-block"></span>
                <span>Reserva Forestal / Arbolado</span>
              </div>
            </div>
          )}
        </div>

        {/* Panel de Control Flotante del Mapa (Derecha) */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleZoomIn}
            className="p-2.5 bg-white dark:bg-white/5 backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-md dark:shadow-lg cursor-pointer"
            title="Acercar mapa"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 bg-white dark:bg-white/5 backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-md dark:shadow-lg cursor-pointer"
            title="Alejar mapa"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 bg-white dark:bg-white/5 backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-md dark:shadow-lg cursor-pointer"
            title="Restaurar vista y limpiar dibujos"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="p-2.5 bg-white dark:bg-white/5 backdrop-blur-xl text-blue-500 dark:text-blue-400 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-md dark:shadow-lg">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
        </div>

        {/* Notificación de Modo de Dibujo */}
        {isDrawingMode && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#0a1020]/95 border border-blue-500/40 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs z-10 pointer-events-none max-w-sm text-center backdrop-blur-xl">
            <MousePointer className="w-4 h-4 text-blue-400 animate-bounce" />
            <span>
              {drawingPoints.length === 0
                ? "Haz clic en varias zonas del mapa para trazar un polígono."
                : "Sigue haciendo clic. Conecta con el primer punto para cerrar o presiona 'Completar'."}
            </span>
          </div>
        )}

        {mapType === 'gmaps' ? (
          hasValidKey ? (
            <APIProvider apiKey={API_KEY} version="weekly">
              <div className="w-full h-full relative" style={{ height: '100%', minHeight: '350px' }}>
                <GoogleMap
                  defaultCenter={BOGOTA_CENTER}
                  defaultZoom={15}
                  mapId="DEMO_MAP_ID"
                  mapTypeId={layer === 'satelital' ? 'hybrid' : 'roadmap'}
                  gestureHandling="greedy"
                  disableDefaultUI={true}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  {/* Escucha cambios de selección para re-centrar */}
                  <MapController selectedProperty={selectedProperty} customCenter={customCenter} />

                  {/* Dibujar los predios */}
                  {properties.map((prop) => {
                    const isSelected = selectedProperty?.id === prop.id;
                    const isHovered = hoveredProperty?.id === prop.id;
                    const paths = prop.vertices.map(v => projectXYToLatLng(v.x, v.y));

                    // Determinar estilos de polígono según la capa activa
                    let fillColor = getPropertyColor(prop);
                    let strokeColor = getPropertyBorderColor(prop);
                    let fillOpacity = isSelected ? 0.45 : isHovered ? 0.35 : 0.22;

                    // Ajuste visual para el modo satelital con polígonos claros
                    if (layer === 'satelital' && !isSelected && !isHovered) {
                      fillColor = 'rgba(255, 255, 255, 0.15)';
                      strokeColor = '#ffffff';
                      fillOpacity = 0.15;
                    }

                    return (
                      <GmpPolygon
                        key={`gmap-poly-${prop.id}`}
                        paths={paths}
                        fillColor={fillColor}
                        fillOpacity={fillOpacity}
                        strokeColor={strokeColor}
                        strokeOpacity={0.8}
                        strokeWeight={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                        onClick={() => {
                          onSelectProperty(isSelected ? null : prop);
                        }}
                        onMouseOver={() => setHoveredProperty(prop)}
                        onMouseOut={() => setHoveredProperty(null)}
                      />
                    );
                  })}

                  {/* Marcadores / Etiquetas de información de predios seleccionados */}
                  {properties.map((prop) => {
                    const isSelected = selectedProperty?.id === prop.id;
                    const isHovered = hoveredProperty?.id === prop.id;
                    if (!isSelected && !isHovered) return null;

                    const latLng = projectXYToLatLng(prop.centroide.x, prop.centroide.y);

                    return (
                      <AdvancedMarker
                        key={`gmap-marker-${prop.id}`}
                        position={latLng}
                        title={`Predio N° ${prop.id}`}
                      >
                        <div className="bg-slate-900/95 text-white text-[9.5px] font-mono px-2 py-1 rounded-md border border-slate-700 shadow-xl flex items-center gap-1.5 whitespace-nowrap pointer-events-none select-none">
                          <span 
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: getPropertyBorderColor(prop) }}
                          ></span>
                          <span className="font-bold">N° {prop.id}</span>
                          <span className="text-slate-400">({prop.usoSuelo})</span>
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                </GoogleMap>
              </div>
            </APIProvider>
          ) : (
            // Splash screen / setup instructions if API key is missing
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#020617] text-white">
              <div className="max-w-md p-6 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-blue-500/20">
                  <Map className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-white">Se Requiere la Clave de API de Google Maps</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para habilitar la visualización del mapa global interactivo y la geolocalización satelital real de Bogotá, necesitas configurar una API Key de Google Maps Platform.
                </p>
                <div className="text-left bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5 text-[11px] font-mono text-slate-300 leading-normal">
                  <p><strong>Paso 1:</strong> Obtén una clave de API gratuita en <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>.</p>
                  <p><strong>Paso 2:</strong> Agrégala como secreto en AI Studio:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Abre <strong>Settings</strong> (icono de ⚙️ en la esquina superior derecha)</li>
                    <li>Selecciona la pestaña <strong>Secrets</strong></li>
                    <li>Agrega un secreto con el nombre <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                    <li>Pega tu clave de API y presiona <strong>Enter</strong></li>
                  </ul>
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setMapType('vector')}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                  >
                    Volver a Mapa Vectorial
                  </button>
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    Obtener Clave
                  </a>
                </div>
              </div>
            </div>
          )
        ) : (
          <svg
            ref={svgRef}
            className={`w-full h-full transition-all cursor-${isDragging ? 'grabbing' : isDrawingMode ? 'crosshair' : 'grab'}`}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleMapClick}
          >
            {/* Grupo de Traslación y Escala */}
            <g transform={`translate(${offset.x + (svgRef.current?.getBoundingClientRect().width ?? MAP_WIDTH) / 2 - (MAP_WIDTH * scale) / 2}, ${offset.y + (svgRef.current?.getBoundingClientRect().height ?? MAP_HEIGHT) / 2 - (MAP_HEIGHT * scale) / 2}) scale(${scale})`}>
              
              {/* FONDO MAPA - Grilla o Mapa Base */}
              <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={theme === 'dark' ? "#020617" : "#f8fafc"} className="transition-all duration-300" />
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme === 'dark' ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)"} strokeWidth="1" className="transition-all duration-300" />
                </pattern>
                
                {/* Filtro de desenfoque gaussiano para el Heatmap */}
                <filter id="heatmap-blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="24" />
                </filter>
                
                {/* Degradados de calor para el Heatmap con opacidades para simular brillo */}
                <radialGradient id="grad-hot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#f97316" stopOpacity="0.7" />
                  <stop offset="65%" stopColor="#f97316" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
                
                <radialGradient id="grad-warm" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#eab308" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#eab308" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                </radialGradient>
                
                <radialGradient id="grad-mild" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#059669" stopOpacity="0.45" />
                  <stop offset="75%" stopColor="#10b981" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
                
                <radialGradient id="grad-cool" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.75" />
                  <stop offset="45%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="80%" stopColor="#3b82f6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#grid)" />
  
              {/* ELEMENTOS GEOGRÁFICOS NATURALES (Río, Bosques) - Visibles especialmente en Capa Satelital */}
              {layer === 'satelital' && (
                <>
                  {/* Río Bogotá simulado (curva sinuosa azul) */}
                  <path
                    d="M -50 200 C 150 150, 250 350, 450 300 C 650 250, 750 400, 1000 350"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="28"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  <path
                    d="M -50 200 C 150 150, 250 350, 450 300 C 650 250, 750 400, 1000 350"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="22"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  {/* Bosque / Zonas Verdes en los costados */}
                  <circle cx="80" cy="80" r="45" fill="#064e3b" opacity="0.6" />
                  <circle cx="120" cy="70" r="30" fill="#064e3b" opacity="0.6" />
                  <circle cx="850" cy="400" r="70" fill="#064e3b" opacity="0.5" />
                  
                  {/* Carreteras secundarias dibujadas */}
                  <path d="M 0 100 L 900 100" fill="none" stroke="#475569" strokeWidth="6" opacity="0.4" />
                  <path d="M 350 0 L 350 450" fill="none" stroke="#475569" strokeWidth="8" opacity="0.4" />
                  {/* Vías de tren o separador en la carretera */}
                  <path d="M 350 0 L 350 450" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" opacity="0.6" />
                </>
              )}
  
              {/* CAPA DE HEATMAP (OPACIDAD INTEGRADA POR CENTROIDE CON BLUR) */}
              {layer === 'heatmap' && (
                <g filter="url(#heatmap-blur)" opacity="0.85" className="pointer-events-none">
                  {properties.map((prop) => {
                    const valuations = properties.map(p => p.avaluoTotal);
                    const maxVal = valuations.length > 0 ? Math.max(...valuations) : 2500000000;
                    const minVal = valuations.length > 0 ? Math.min(...valuations) : 100000000;
                    const ratio = (prop.avaluoTotal - minVal) / (maxVal - minVal || 1);
                    
                    // Radio del calor proporcional al avalúo (entre 45px y 115px)
                    const radius = 45 + ratio * 70;
                    
                    // Elegir gradiente según el ratio de valor
                    let fillGrad = 'url(#grad-cool)';
                    if (ratio > 0.75) {
                      fillGrad = 'url(#grad-hot)';
                    } else if (ratio > 0.45) {
                      fillGrad = 'url(#grad-warm)';
                    } else if (ratio > 0.18) {
                      fillGrad = 'url(#grad-mild)';
                    }
                    
                    return (
                      <circle
                        key={`heat-${prop.id}`}
                        cx={prop.centroide.x}
                        cy={prop.centroide.y}
                        r={radius}
                        fill={fillGrad}
                      />
                    );
                  })}
                </g>
              )}
  
              {/* RENDERIZADO DE PREDIOS REGISTRADOS */}
              {properties.map((prop) => {
                const verticesString = prop.vertices.map(p => `${p.x},${p.y}`).join(' ');
                const isSelected = selectedProperty?.id === prop.id;
                const isHovered = hoveredProperty?.id === prop.id;
  
                return (
                  <g key={prop.id} className="transition-all duration-200">
                    {/* Polígono del predio */}
                    <polygon
                      points={verticesString}
                      fill={getPropertyColor(prop)}
                      stroke={getPropertyBorderColor(prop)}
                      strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                      className="cursor-pointer transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDrawingMode) {
                          onSelectProperty(isSelected ? null : prop);
                        }
                      }}
                      onMouseEnter={() => setHoveredProperty(prop)}
                      onMouseLeave={() => setHoveredProperty(null)}
                    />
  
                    {/* Pulso de animación en el predio seleccionado */}
                    {isSelected && (
                      <polygon
                        points={verticesString}
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="6"
                        opacity="0.3"
                        className="animate-pulse pointer-events-none"
                      />
                    )}
  
                    {/* Etiquetas identificadoras (Códigos o nombres) en el centroide */}
                    {scale >= 0.8 && (
                      <g
                        transform={`translate(${prop.centroide.x}, ${prop.centroide.y})`}
                        className="pointer-events-none select-none"
                      >
                        {/* Fondo de la etiqueta al hacer hover o selección */}
                        {(isSelected || isHovered || scale > 1.2) && (
                          <rect
                            x="-45"
                            y="-10"
                            width="90"
                            height="18"
                            rx="4"
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke={isSelected ? '#eab308' : 'rgba(148, 163, 184, 0.3)'}
                            strokeWidth="1"
                          />
                        )}
                        
                        {/* Texto identificador */}
                        <text
                          textAnchor="middle"
                          y="2"
                          className="font-mono text-[9px] font-bold text-slate-100"
                          fill="#f8fafc"
                        >
                          {isSelected || isHovered 
                            ? `${prop.id} - ${prop.usoSuelo.substring(0,4)}` 
                            : `N° ${prop.id}`
                          }
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
  
              {/* RENDERIZADO DE LÍNEAS DE DIBUJO EN CURSO */}
              {isDrawingMode && drawingPoints.length > 0 && (
                <g className="pointer-events-none">
                  {/* Polígono parcial relleno temporalmente */}
                  {drawingPoints.length >= 3 && (
                    <polygon
                      points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="rgba(16, 185, 129, 0.12)"
                      stroke="rgba(16, 185, 129, 0.4)"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  )}
  
                  {/* Líneas entre puntos */}
                  <path
                    d={`M ${drawingPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />
  
                  {/* Vértices individuales dibujados */}
                  {drawingPoints.map((point, index) => (
                    <g key={index} transform={`translate(${point.x}, ${point.y})`}>
                      <circle
                        r={index === 0 ? "7" : "5"}
                        fill={index === 0 ? "#eab308" : "#10b981"}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      {index === 0 && (
                        <circle
                          r="12"
                          fill="none"
                          stroke="#eab308"
                          strokeWidth="1"
                          className="animate-ping"
                        />
                      )}
                    </g>
                  ))}
                </g>
              )}
            </g>
          </svg>
        )}

        {/* Coordenadas actuales del cursor en el mapa */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 pointer-events-none shadow-2xl">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          <span>Capa: {layer.toUpperCase()}</span>
          <span className="text-slate-600">|</span>
          <span>Zoom: {Math.round(scale * 100)}%</span>
          <span className="text-slate-600">|</span>
          <span className="font-semibold text-blue-300">Predios: {properties.length}</span>
        </div>
      </div>
    </div>
  );
}
