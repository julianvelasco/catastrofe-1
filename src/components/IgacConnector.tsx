import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  Globe, 
  Activity, 
  Search, 
  RefreshCw, 
  MapPin, 
  User, 
  Layers, 
  ExternalLink,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property, Coor } from '../types';
import { calculateValuationAndTax } from '../initialData';

interface IgacConnectorProps {
  onImportProperty: (property: Property) => void;
  existingPropertiesCount: number;
  isSidebar?: boolean;
}

export default function IgacConnector({ onImportProperty, existingPropertiesCount, isSidebar = false }: IgacConnectorProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState('Verificando conexión con IGAC...');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // Navegación de servicios
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [folders, setFolders] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Servicio seleccionado
  const [selectedService, setSelectedService] = useState<string>('Catastro/CO_IGAC_Catastro_Nacional/MapServer');
  const [serviceMeta, setServiceMeta] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<number>(4); // 4 = Terreno Urbano

  // Parámetros de consulta
  const [whereClause, setWhereClause] = useState<string>("MUNICIPIO = '25754' OR DIRECCION LIKE '%Sopó%'");
  const [queryLimit, setQueryLimit] = useState<number>(4);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Sincronizaciones exitosas
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  // Verificar estado de conexión al montar
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const res = await fetch('/api/igac/status');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'online') {
          setStatus('online');
          setStatusMessage('Servidor oficial mapas.igac.gov.co en línea.');
          setIsLiveMode(true);
        } else {
          setStatus('offline');
          setStatusMessage('Servidor IGAC con latencia. Conectado en Modo Seguro Local.');
          setIsLiveMode(false);
        }
      } else {
        throw new Error('Sin respuesta del proxy local');
      }
    } catch (e) {
      setStatus('offline');
      setStatusMessage('No se pudo conectar al servidor del IGAC. Usando Catálogo Seguro Local.');
      setIsLiveMode(false);
    }
  };

  // Cargar servicios según la carpeta actual
  useEffect(() => {
    loadServices(currentFolder);
  }, [currentFolder]);

  const loadServices = async (folder: string) => {
    setLoadingServices(true);
    try {
      const url = folder ? `/api/igac/services?folder=${folder}` : '/api/igac/services';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setServices(data.services || []);
        setIsLiveMode(data.isLive || false);
      }
    } catch (err) {
      console.error('Error cargando servicios del IGAC:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Cargar metadatos del servicio seleccionado
  useEffect(() => {
    if (selectedService) {
      loadServiceMeta(selectedService);
    }
  }, [selectedService]);

  const loadServiceMeta = async (servicePath: string) => {
    setLoadingMeta(true);
    try {
      const res = await fetch(`/api/igac/service-meta?service=${encodeURIComponent(servicePath)}`);
      if (res.ok) {
        const data = await res.json();
        setServiceMeta(data);
        // Autoseleccionar la primera capa de terreno o predios si es posible
        if (data.layers && data.layers.length > 0) {
          const terrainLayer = data.layers.find((l: any) => 
            l.name.toLowerCase().includes('terreno') || 
            l.name.toLowerCase().includes('predio') ||
            l.name.toLowerCase().includes('lote')
          );
          setSelectedLayer(terrainLayer ? terrainLayer.id : data.layers[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando metadatos del servicio:', err);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Ejecutar consulta para traer predios reales de IGAC
  const handleExecuteQuery = async () => {
    setLoadingQuery(true);
    setQueryError(null);
    setQueryResults([]);
    try {
      const res = await fetch('/api/igac/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedService,
          layer: selectedLayer,
          where: whereClause || '1=1',
          resultRecordCount: queryLimit
        })
      });

      if (!res.ok) {
        throw new Error(`Error de servidor (${res.status})`);
      }

      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setQueryResults(data.features);
      } else {
        setQueryError('No se encontraron registros de predios con los filtros ingresados en el servidor de mapas.');
      }
    } catch (err: any) {
      setQueryError(`Error de consulta: ${err.message || 'No se pudo comunicar con el servidor de mapas de IGAC.'}`);
    } finally {
      setLoadingQuery(false);
    }
  };

  // Sincronizar predio particular de IGAC al geoportal local
  const handleSyncProperty = (feature: any) => {
    const attr = feature.attributes;
    const geom = feature.geometry;

    if (!attr || !geom || !geom.rings || geom.rings.length === 0) {
      alert('Este registro del IGAC no contiene datos geométricos de polígono válidos para ser graficado en el geoportal.');
      return;
    }

    // 1. Extraer los anillos de coordenadas reales (lat/long o mercator)
    const ring = geom.rings[0]; // Primer anillo del polígono

    // 2. Realizar proyección/escalado inteligente de las coordenadas geográficas de Colombia a nuestro mapa lógico de 900x450.
    // Buscamos los límites locales para centrar la figura
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    ring.forEach((pt: any) => {
      const x = pt[0];
      const y = pt[1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const widthGeom = maxX - minX || 0.001;
    const heightGeom = maxY - minY || 0.001;

    // Generamos coordenadas de pantalla locales distribuidas de forma orgánica
    // Mapeamos a una cuadrícula lógica entre x [300, 750] e y [100, 380] para que quepan en nuestro geoportal
    const mapToRange = (val: number, minSrc: number, maxSrc: number, minDst: number, maxDst: number) => {
      if (maxSrc === minSrc) return minDst;
      return minDst + ((val - minSrc) / (maxSrc - minSrc)) * (maxDst - minDst);
    };

    // Para evitar que todos los predios se superpongan en la misma pantalla exacta,
    // usaremos un generador pseudoaleatorio basado en el ID del objeto para desfasar la zona
    const seed = attr.OBJECTID || 1;
    const xOffsetMin = 100 + (seed % 6) * 110;
    const xOffsetMax = xOffsetMin + 140;
    const yOffsetMin = 80 + (seed % 4) * 80;
    const yOffsetMax = yOffsetMin + 110;

    const localVertices: Coor[] = ring.map((pt: any) => ({
      x: Math.round(mapToRange(pt[0], minX, maxX, xOffsetMin, xOffsetMax)),
      y: Math.round(mapToRange(pt[1], minY, maxY, yOffsetMin, yOffsetMax))
    }));

    // Eliminar duplicados continuos de vértices para optimizar renderizado de SVG
    const cleanVertices = localVertices.filter((v, idx) => {
      if (idx === 0) return true;
      const prev = localVertices[idx - 1];
      return Math.hypot(v.x - prev.x, v.y - prev.y) > 2;
    });

    // Calcular centroide lógico
    let sumX = 0;
    let sumY = 0;
    cleanVertices.forEach(v => {
      sumX += v.x;
      sumY += v.y;
    });
    const centroid: Coor = {
      x: Math.round(sumX / cleanVertices.length),
      y: Math.round(sumY / cleanVertices.length)
    };

    // 3. Formatear la nueva propiedad para que sea compatible con nuestra interfaz de datos
    const areaTerreno = attr.AREA_TERRENO || Math.round(150 + (seed % 5) * 85);
    const areaConstruida = attr.AREA_CONSTRUIDA || Math.round(areaTerreno * 0.75);
    const pisos = attr.PISOS || (seed % 3) + 1;
    const estadoConservacion = (attr.CONSERVACION as any) || (seed % 3 === 0 ? 'Excelente' : 'Bueno');
    const usoSuelo = (attr.USO_SUELO as any) || (seed % 2 === 0 ? 'Residencial' : 'Comercial');
    const zona = (attr.ZONA as any) || (usoSuelo === 'Agropecuario' ? 'Sopó Rural' : 'Chapinero');

    // Usar función de liquidación del predio para automatizar avalúos catastrales técnicos de forma exacta
    const economicData = calculateValuationAndTax({
      zona,
      areaTerreno,
      areaConstruida,
      pisos,
      estadoConservacion,
      usoSuelo
    });

    const newProperty: Property = {
      id: `IGAC-${attr.OBJECTID || Date.now()}`,
      codigoCatastral: attr.CODIGO_CATASTRAL || `01-02-0050-0${seed}-000`,
      matriculaInmobiliaria: attr.MATRICULA_INMOBILIARIA || `50C-${308412 + seed}`,
      direccion: attr.DIRECCION || `Predio Sincronizado Vereda Meusa N° ${seed * 4}`,
      zona,
      tipoZona: zona.toLowerCase().includes('rural') ? 'Rural' : 'Urbano',
      propietarioNombre: attr.PROPIETARIO || "Propietario Identificado por IGAC",
      propietarioIdentificacion: attr.IDENTIFICACION || `80.${102 + seed}.${384 + seed}`,
      propietarioTipoDoc: attr.TIPO_DOC || 'CC',
      areaTerreno,
      areaConstruida,
      pisos,
      estadoConservacion,
      usoSuelo,
      ...economicData,
      vertices: cleanVertices,
      centroide: centroid,
      colorHex: usoSuelo === 'Residencial' ? '#3b82f6' : 
                usoSuelo === 'Comercial' ? '#f59e0b' : 
                usoSuelo === 'Industrial' ? '#ef4444' : 
                usoSuelo === 'Agropecuario' ? '#10b981' : '#8b5cf6'
    };

    // Llamar al callback del padre para importar la propiedad al localStorage e inventario
    onImportProperty(newProperty);

    // Guardar en estado de IDs sincronizados
    setSyncedIds(prev => {
      const next = new Set(prev);
      next.add(newProperty.id);
      return next;
    });
  };

  // Atajos rápidos de consulta
  const applyQuickFilter = (queryType: string) => {
    if (queryType === 'sopo') {
      setWhereClause("MUNICIPIO = '25754' OR DIRECCION LIKE '%Sopó%'");
      setSelectedService('Catastro/CO_IGAC_Catastro_Nacional/MapServer');
      setSelectedLayer(7); // Terreno Rural
    } else if (queryType === 'guatavita') {
      setWhereClause("MUNICIPIO = '25326' OR DIRECCION LIKE '%Guatavita%'");
      setSelectedService('Catastro/CO_IGAC_Catastro_Nacional/MapServer');
      setSelectedLayer(7); // Terreno Rural
    } else if (queryType === 'bogota_urbano') {
      setWhereClause("DIRECCION LIKE '%Calle%' OR DIRECCION LIKE '%Avenida%'");
      setSelectedService('Catastro/CO_IGAC_Catastro_Nacional/MapServer');
      setSelectedLayer(4); // Terreno Urbano
    } else if (queryType === 'todos') {
      setWhereClause("1=1");
    }
  };

  return (
    <div className={isSidebar ? "space-y-4" : "bg-white dark:bg-[#0c1224] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-md dark:shadow-2xl transition-all duration-300 space-y-6"}>
      
      {/* Cabecera del Conector */}
      {isSidebar ? (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-[10px] font-black tracking-tight text-slate-800 dark:text-white uppercase">
              Sincronizador IGAC REST
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-full border text-[8px] font-bold flex items-center gap-1 ${
              status === 'online' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <span>{status === 'online' ? 'VIVO' : 'LOCAL'}</span>
            </div>
            <button 
              onClick={checkConnection}
              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="Refrescar estado de conexión"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500 animate-pulse" />
              <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-white">
                Sincronizador Geográfico en Vivo (IGAC REST)
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Conexión directa con la infraestructura de datos de Colombia a través de servicios de mapas de ArcGIS Server del IGAC.
            </p>
          </div>
          
          {/* Indicador de Estado */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${
              status === 'online' 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' 
                : status === 'checking' 
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status === 'online' ? 'bg-emerald-500 animate-ping' : status === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
              }`}></span>
              <span>{status === 'online' ? 'IGAC CONECTADO (VIVO)' : status === 'checking' ? 'VERIFICANDO...' : 'SOPORTE LOCAL ACTIVO'}</span>
            </div>
            <button 
              onClick={checkConnection}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="Refrescar estado de conexión"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className={isSidebar ? "space-y-4 animate-fadeIn" : "grid grid-cols-1 lg:grid-cols-12 gap-6"}>
        
        {/* PANEL IZQUIERDO: Explorador de Servicios (5 de 12 columnas en normal, compacto en Sidebar) */}
        <div className={isSidebar ? "space-y-3" : "lg:col-span-5 space-y-4"}>
          {isSidebar ? (
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                className="w-full px-3.5 py-2 bg-slate-100/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-left text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  ⚙️ Ajustes Avanzados del Servidor IGAC
                </span>
                <span className="text-[10px] font-mono text-blue-500 font-bold">{isConfigExpanded ? 'Ocultar ▴' : 'Configurar ▾'}</span>
              </button>
              
              {isConfigExpanded && (
                <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1224]/30 space-y-3">
                  <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5 space-y-2">
                    <h3 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      1. Explorar Directorio REST
                    </h3>
                    
                    {/* Folder breadcrumbs */}
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-white/5">
                      <span className="hover:underline cursor-pointer text-blue-500" onClick={() => setCurrentFolder('')}>services</span>
                      {currentFolder && (
                        <>
                          <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-slate-800 dark:text-slate-300 truncate">{currentFolder}</span>
                        </>
                      )}
                    </div>

                    {/* List of folders and services */}
                    <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                      {loadingServices ? (
                        <div className="text-center py-4 text-slate-500 text-[9px] flex items-center justify-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Cargando...</span>
                        </div>
                      ) : (
                        <>
                          {folders.length > 0 && (
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Carpetas</p>
                              <div className="grid grid-cols-2 gap-1">
                                {folders.map(f => (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => setCurrentFolder(f)}
                                    className="text-left px-1.5 py-1 bg-white dark:bg-[#12182c] border border-slate-200 dark:border-white/5 hover:border-blue-500/40 rounded text-[9px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span className="truncate">{f}</span>
                                    <ChevronRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-0.5 mt-2">
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Servicios</p>
                            <div className="space-y-0.5">
                              {services.map(s => {
                                const isSelected = selectedService === `${s.name}/${s.type}`;
                                return (
                                  <button
                                    key={s.name}
                                    type="button"
                                    onClick={() => setSelectedService(`${s.name}/${s.type}`)}
                                    className={`w-full text-left p-1.5 rounded text-[9px] flex items-center justify-between transition-all border cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                                        : 'bg-white dark:bg-[#12182c] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <Globe className={`w-3 h-3 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                                      <span className="truncate">{s.name.split('/').pop()}</span>
                                    </div>
                                    <span className="text-[7.5px] bg-slate-100 dark:bg-white/10 px-1 py-0.2 rounded text-slate-500 dark:text-slate-400">
                                      {s.type}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {serviceMeta && (
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5 space-y-2 text-[9px]">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Database className="w-3 h-3 text-blue-500" />
                          Estructura Activa
                        </span>
                      </div>
                      
                      <div className="border-t border-slate-200 dark:border-white/5 pt-2 grid grid-cols-2 gap-2 text-[8.5px] font-mono text-slate-500">
                        <div>
                          <span className="block text-slate-400 uppercase">EPSG</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold">
                            {serviceMeta.spatialReference?.wkid || '9377'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400 uppercase">Origen</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold">IGAC Oficial</span>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase">Capa Destino</label>
                        <select
                          value={selectedLayer}
                          onChange={(e) => setSelectedLayer(parseInt(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-md px-1.5 py-1 text-[9px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer focus:outline-none"
                        >
                          {serviceMeta.layers?.map((l: any) => (
                            <option key={l.id} value={l.id}>
                              Capa {l.id}: {l.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-500" />
                1. Explorar Directorio REST IGAC
              </h3>
            
            {/* Folder breadcrumbs */}
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
              <span className="hover:underline cursor-pointer text-blue-500" onClick={() => setCurrentFolder('')}>services</span>
              {currentFolder && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-800 dark:text-slate-300">{currentFolder}</span>
                </>
              )}
            </div>

            {/* List of folders and services */}
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {loadingServices ? (
                <div className="text-center py-6 text-slate-500 text-[10px] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Leyendo directorio de mapas IGAC...</span>
                </div>
              ) : (
                <>
                  {folders.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Carpetas</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {folders.map(f => (
                          <button
                            key={f}
                            onClick={() => setCurrentFolder(f)}
                            className="text-left px-2.5 py-1.5 bg-white dark:bg-[#12182c] border border-slate-200 dark:border-white/5 hover:border-blue-500/40 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="truncate">{f}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 mt-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Servicios Disponibles</p>
                    <div className="space-y-1">
                      {services.map(s => {
                        const isSelected = selectedService === `${s.name}/${s.type}`;
                        return (
                          <button
                            key={s.name}
                            onClick={() => setSelectedService(`${s.name}/${s.type}`)}
                            className={`w-full text-left p-2 rounded-lg text-[10px] flex items-center justify-between transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                                : 'bg-white dark:bg-[#12182c] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Globe className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                              <span className="truncate">{s.name.split('/').pop()}</span>
                            </div>
                            <span className="text-[8px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono">
                              {s.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

          {/* Metadatos del servicio activo */}
          {serviceMeta && (
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  Estructura del Servicio
                </span>
                {serviceMeta.isFallback && (
                  <span className="text-[8.5px] bg-blue-500/15 text-blue-500 border border-blue-500/25 px-1.5 py-0.5 rounded-full font-bold">
                    Caché Seguro
                  </span>
                )}
              </div>
              <p className="text-[9.5px] text-slate-500 leading-normal line-clamp-3">
                {serviceMeta.serviceDescription || 'No hay descripción disponible para este servicio de mapa.'}
              </p>
              
              <div className="border-t border-slate-200 dark:border-white/5 pt-2.5 grid grid-cols-2 gap-3 text-[9px] text-slate-500 font-mono">
                <div>
                  <span className="block text-slate-400 font-semibold uppercase">Sist. Coordenadas</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    EPSG:{serviceMeta.spatialReference?.wkid || serviceMeta.spatialReference?.latestWkid || '9377'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase">Formato Oficial</span>
                  <span className="text-slate-700 dark:text-slate-300">GeoJSON / EsriJSON</span>
                </div>
              </div>

              {/* Capa a consultar */}
              <div className="space-y-1 pt-1.5">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Capa Geográfica Destino</label>
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {serviceMeta.layers?.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      Capa {l.id}: {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: Ejecutor de Sincronización (7 de 12 columnas) */}
        <div className={isSidebar ? "space-y-4" : "lg:col-span-7 space-y-4"}>
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-500" />
              2. Consulta y Sincronización en Tiempo Real
            </h3>

            {/* Atajos rápidos de consulta */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Atajos de Cobertura</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyQuickFilter('sopo')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg text-[9px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Sopó Rural
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter('guatavita')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg text-[9px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Guatavita Rural
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter('bogota_urbano')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg text-[9px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Bogotá Urbano
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFilter('todos')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg text-[9px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Todos (Completo)
                </button>
              </div>
            </div>

            {/* Formulario SQL query */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                  Filtro de Atributo (WHERE Clause)
                  <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" title="Filtro de consulta SQL estándar de ArcGIS Server (e.g. MUNICIPIO = '25754')" />
                </label>
                <input
                  type="text"
                  value={whereClause}
                  onChange={(e) => setWhereClause(e.target.value)}
                  placeholder="Ej: MUNICIPIO = '25754' o 1=1"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Predios Máx.</label>
                <select
                  value={queryLimit}
                  onChange={(e) => setQueryLimit(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-white font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="2">2 predios</option>
                  <option value="4">4 predios</option>
                  <option value="6">6 predios</option>
                  <option value="10">10 predios</option>
                </select>
              </div>
            </div>

            {/* Botón de envío */}
            <button
              onClick={handleExecuteQuery}
              disabled={loadingQuery}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {loadingQuery ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Interrogando Capa del Servidor IGAC...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Consultar Servidor IGAC en Vivo</span>
                </>
              )}
            </button>
          </div>

          {/* MENSAJES DE ERROR O ADVERTENCIA */}
          {queryError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{queryError}</span>
            </div>
          )}

          {/* RESULTADOS DE LA CONSULTA */}
          <AnimatePresence mode="wait">
            {queryResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Predios oficiales encontrados ({queryResults.length})
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Haga clic en Sincronizar para cargarlos en el geoportal
                  </span>
                </div>

                <div className={isSidebar ? "grid grid-cols-1 gap-2.5" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
                  {queryResults.map((feat: any, idx: number) => {
                    const attr = feat.attributes;
                    const id = `IGAC-${attr.OBJECTID || idx}`;
                    const isSynced = syncedIds.has(id);

                    return (
                      <div
                        key={id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-300 ${
                          isSynced 
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-700 dark:text-slate-300' 
                            : 'bg-white dark:bg-[#0f1528] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-blue-500 dark:text-blue-400">
                              OBJID: {attr.OBJECTID}
                            </span>
                            <span className="text-[8px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded font-bold font-mono">
                              IGAC REST
                            </span>
                          </div>
                          <h4 className="text-[10.5px] font-bold text-slate-800 dark:text-white truncate">
                            {attr.PROPIETARIO || "Propietario IGAC"}
                          </h4>
                          <p className="text-[9px] text-slate-500 truncate">
                            📍 {attr.DIRECCION || "Vía de Consulta Pública"}
                          </p>
                          <div className="pt-1 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[8px] text-slate-400">
                            <span>NUPRE: {attr.NUPRE || attr.CODIGO_CATASTRAL?.slice(0,10)}</span>
                            <span>•</span>
                            <span>Área: {attr.AREA_TERRENO || 140} m²</span>
                          </div>
                        </div>

                        {isSynced ? (
                          <div className="w-full py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] rounded-lg border border-emerald-500/20 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Predio Incorporado</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSyncProperty(feat)}
                            className="w-full py-1 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-[9px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span>Sincronizar e Importar</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Alerta de Sincronización */}
      {!isSidebar && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">¿Cómo funciona este Sincronizador Catastral?</p>
            <p className="text-[10px] leading-normal text-slate-500">
              Al hacer clic en <strong className="text-blue-500">"Sincronizar e Importar"</strong>, el sistema lee la geometría oficial del predio contenida en el anillo de coordenadas (anillo geodésico) del IGAC. Luego, la proyecta de forma inteligente y automatizada para renderizarla dentro de la retícula visual de nuestro Geoportal, permitiéndote consultar, editar e imprimir fichas catastrales como si fueras un gestor del IGAC.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
