import React, { useState, useEffect, useMemo } from 'react';
import { Property, Coor } from './types';
import { INITIAL_PROPERTIES, calculateValuationAndTax } from './initialData';
import MapGeoportal from './components/MapGeoportal';
import PropertyForm from './components/PropertyForm';
import PropertyDetailsCard from './components/PropertyDetailsCard';
import CadastralAdvisor from './components/CadastralAdvisor';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import IgacConnector from './components/IgacConnector';
import FarmerOnboarding from './components/FarmerOnboarding';
import FarmerLogin from './components/FarmerLogin';
import UserGuideTour from './components/UserGuideTour';
import { 
  Building2, 
  Map, 
  TrendingUp, 
  Search, 
  Database, 
  Plus, 
  Filter, 
  Info, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  ArrowRightLeft,
  X,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // 1. Estado de Predios con Persistencia Local
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Estado para el panel de Formulario (Creación o Edición)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formProperty, setFormProperty] = useState<Partial<Property> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Estado para el tema basado en la preferencia del sistema operativo
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Detectar automáticamente la preferencia del sistema operativo (oscuro/claro)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const systemIsDark = e.matches;
      setTheme(systemIsDark ? 'dark' : 'light');
      if (systemIsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Evaluar estado inicial
    handleThemeChange(mediaQuery);

    // Escuchar cambios futuros en tiempo real
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Estados para inicio de sesión y guía interactiva
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'farmer' | 'official' | null>(null);
  const [userName, setUserName] = useState('');
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Navegación principal de vistas
  const [currentView, setCurrentView] = useState<'geoportal' | 'analytics'>('geoportal');

  // Estado para la pestaña activa de la barra lateral izquierda
  const [leftPanelTab, setLeftPanelTab] = useState<'inventory' | 'igac'>('inventory');

  // Filtros de búsqueda en la barra lateral
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZona, setFilterZona] = useState<string>('todos');
  const [filterUso, setFilterUso] = useState<string>('todos');

  // Propiedad que activa la apelación con IA
  const [appealRequestProp, setAppealRequestProp] = useState<Property | null>(null);

  // Estado para preguntas rápidas iniciadas desde la guía del campesino hacia el asesor
  const [advisorTriggerQuestion, setAdvisorTriggerQuestion] = useState<{question: string, mode: 'general' | 'appeal' | 'norms'} | null>(null);

  // Alerta temporal de éxito
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inicializar Datos
  useEffect(() => {
    const saved = localStorage.getItem('catastro_properties');
    if (saved) {
      try {
        setProperties(JSON.parse(saved));
      } catch (e) {
        setProperties(INITIAL_PROPERTIES);
      }
    } else {
      setProperties(INITIAL_PROPERTIES);
      localStorage.setItem('catastro_properties', JSON.stringify(INITIAL_PROPERTIES));
    }
  }, []);

  // Guardar Datos ante cambios
  const saveToLocalStorage = (updatedProperties: Property[]) => {
    setProperties(updatedProperties);
    localStorage.setItem('catastro_properties', JSON.stringify(updatedProperties));
  };

  // Mostrar mensaje temporal de confirmación
  const triggerAlert = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleLoginSuccess = (role: 'farmer' | 'official', name: string) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUserName(name);
    // Automatically trigger the tour on login!
    setIsTourOpen(true);
    triggerAlert(`¡Bienvenido, ${name}! Sesión iniciada con éxito.`);
  };

  // 2. Operaciones CRUD
  const handleSaveProperty = (savedProp: Property) => {
    let updated: Property[];
    if (isEditMode) {
      updated = properties.map(p => p.id === savedProp.id ? savedProp : p);
      triggerAlert(`Ficha catastral del predio N° ${savedProp.id} actualizada correctamente.`);
    } else {
      updated = [savedProp, ...properties];
      triggerAlert(`Predio N° ${savedProp.id} incorporado exitosamente al inventario catastral.`);
    }
    
    saveToLocalStorage(updated);
    setSelectedProperty(savedProp);
    setIsFormOpen(false);
    setFormProperty(null);
  };

  const handleDeleteProperty = (id: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar permanentemente el predio N° ${id} de la base de datos municipal? Esta acción es irreversible.`)) {
      const updated = properties.filter(p => p.id !== id);
      saveToLocalStorage(updated);
      setSelectedProperty(null);
      triggerAlert(`Predio N° ${id} desincorporado correctamente.`);
    }
  };

  const handleEditProperty = (prop: Property) => {
    setFormProperty(prop);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleCreateNewProperty = () => {
    // Generamos datos básicos para que el formulario se inicie limpio
    const nextId = (Math.max(...properties.map(p => parseInt(p.id) || 0)) + 1).toString();
    setFormProperty({
      id: nextId,
      areaTerreno: 120,
      areaConstruida: 80,
      pisos: 1,
      estadoConservacion: 'Bueno',
      usoSuelo: 'Residencial',
    });
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  // Callback de dibujo de predio en el mapa
  const handleAddPropertyFromDrawing = (vertices: Coor[], area: number, centroid: Coor) => {
    const nextId = (Math.max(...properties.map(p => parseInt(p.id) || 0)) + 1).toString();
    
    // Predio pre-rellenado con datos calculados del dibujo
    const drawnProp: Partial<Property> = {
      id: nextId,
      areaTerreno: area,
      areaConstruida: Math.round(area * 0.6), // default
      pisos: 1,
      estadoConservacion: 'Bueno',
      usoSuelo: area > 1000 ? 'Agropecuario' : 'Residencial',
      vertices,
      centroide: centroid,
      colorHex: area > 1000 ? '#10b981' : '#3b82f6'
    };

    setFormProperty(drawnProp);
    setIsEditMode(false);
    setIsFormOpen(true);
    triggerAlert("Polígono trazado con éxito. Complete los datos de propietario y dirección.");
  };

  // Iniciar borrador de apelación en el Asesor IA
  const handleDraftAppeal = (prop: Property) => {
    setAppealRequestProp(prop);
    triggerAlert("Asesor de IA activado para redactar recurso de reposición.");
  };

  // Callback de importación desde el IGAC
  const handleImportProperty = (newProp: Property) => {
    if (properties.some(p => p.id === newProp.id)) {
      setSelectedProperty(properties.find(p => p.id === newProp.id) || newProp);
      triggerAlert(`El predio con ID ${newProp.id} ya se encuentra incorporado.`);
      return;
    }
    const updated = [newProp, ...properties];
    saveToLocalStorage(updated);
    setSelectedProperty(newProp);
    triggerAlert(`Predio de ${newProp.propietarioNombre} importado y sincronizado correctamente desde el IGAC.`);
  };

  // 3. Filtrado de Propiedades para la Lista
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = 
        p.direccion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.propietarioNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.codigoCatastral.includes(searchQuery) ||
        p.matriculaInmobiliaria.includes(searchQuery) ||
        p.id === searchQuery;

      const matchesZona = filterZona === 'todos' || p.zona === filterZona;
      const matchesUso = filterUso === 'todos' || p.usoSuelo === filterUso;

      return matchesSearch && matchesZona && matchesUso;
    });
  }, [properties, searchQuery, filterZona, filterUso]);

  if (!isLoggedIn) {
    return <FarmerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      
      {/* Interactive Tour Guide for Farmers */}
      <UserGuideTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      {/* Mesh Gradient Background Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/25 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 dark:bg-emerald-600/15 rounded-full blur-[150px]"></div>
      </div>

      {/* 1. Header Principal Estilo Admin Panel */}
      <header className="bg-white/85 dark:bg-white/5 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 py-4 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-30 shadow-md dark:shadow-lg dark:shadow-black/10 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              SGC <span className="text-blue-500 dark:text-blue-400">Multipropósito</span>
              <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10">
                v2.6
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Sistema de Gestión de Catastro de Colombia</p>
          </div>
        </div>

        {/* Pestañas de Navegación Principal */}
        <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 gap-1 backdrop-blur-md transition-colors duration-300">
          <button
            onClick={() => setCurrentView('geoportal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'geoportal'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Map className="w-4 h-4" />
            Visor Geoportal
          </button>
          <button
            onClick={() => setCurrentView('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'analytics'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Estadísticas Municipales
          </button>
        </div>

        {/* Acciones de la Cabecera */}
        <div className="flex items-center flex-wrap gap-3">
          {/* User Profile Badge */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-sm">
              {userRole === 'farmer' ? '👨‍🌾' : '🏢'}
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">
                {userName}
              </p>
              <p className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-bold leading-tight uppercase tracking-wider">
                {userRole === 'farmer' ? 'Productor Rural' : 'Gestor de Tierras'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTourOpen(true)}
            className="bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/35 text-emerald-700 dark:text-emerald-400 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/20"
            title="Ver la guía interactiva para campesinos"
          >
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <span>Guía de Uso</span>
          </button>

          <button
            onClick={handleCreateNewProperty}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Predio
          </button>

          <button
            onClick={() => {
              setIsLoggedIn(false);
              setUserRole(null);
              setUserName('');
              triggerAlert("Sesión cerrada correctamente.");
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-2 rounded-xl transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Alerta flotante de éxito */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-[#0d1527]/90 backdrop-blur-xl border border-blue-500/40 text-blue-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs z-50 max-w-md"
          >
            <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Cuerpo Principal de la Aplicación */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {currentView === 'geoportal' ? (
          
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
            
            {/* PANEL IZQUIERDO CON PESTAÑAS (4 de 12 columnas) */}
            <div className="xl:col-span-4 flex flex-col gap-4 h-full relative z-10">
              
              {/* SELECTOR DE PESTAÑAS DEL PANEL IZQUIERDO */}
              <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 gap-1">
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('inventory')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    leftPanelTab === 'inventory'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Inventario</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('igac')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    leftPanelTab === 'igac'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm animate-pulse'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Conector IGAC</span>
                </button>
              </div>

              {leftPanelTab === 'inventory' ? (
                <>
                  {/* Guía de Primeros Pasos para el Campesino */}
                  <FarmerOnboarding
                    selectedProperty={selectedProperty}
                    onSelectProperty={(p) => {
                      setSelectedProperty(p);
                      triggerAlert(`Se seleccionó la finca ${p.propietarioNombre}.`);
                    }}
                    allProperties={properties}
                    onStartDrawing={() => {
                      triggerAlert("Haz clic en el ícono de lápiz de dibujo ✍️ arriba a la derecha en el Geoportal para iniciar el trazado de tu finca, luego haz clic en el mapa.");
                    }}
                    onAskAdvisor={(question, mode) => {
                      setAdvisorTriggerQuestion({ question, mode });
                      // Desplazar suavemente hasta el asesor de Don Mateo
                      setTimeout(() => {
                        const el = document.getElementById('cadastral-advisor-container');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }}
                    onCreateNewProperty={handleCreateNewProperty}
                  />

                  {/* Buscador y Filtros */}
                  <div id="search-filter-container" className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3.5 shadow-sm dark:shadow-lg transition-colors duration-300">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por propietario, matrícula, NUPRE o ID..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Zona</label>
                        <select
                          value={filterZona}
                          onChange={(e) => setFilterZona(e.target.value)}
                          className="w-full bg-white dark:bg-[#12182c] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold cursor-pointer transition-colors duration-300"
                        >
                          <option value="todos">Todas las zonas</option>
                          <option value="Chapinero">Chapinero (Urb.)</option>
                          <option value="Usaquén">Usaquén (Urb.)</option>
                          <option value="Suba">Suba (Urb.)</option>
                          <option value="Teusaquillo">Teusaquillo (Urb.)</option>
                          <option value="Sopó Rural">Sopó (Rural)</option>
                          <option value="Guatavita Rural">Guatavita (Rural)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Uso Suelo</label>
                        <select
                          value={filterUso}
                          onChange={(e) => setFilterUso(e.target.value)}
                          className="w-full bg-white dark:bg-[#12182c] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold cursor-pointer transition-colors duration-300"
                        >
                          <option value="todos">Todos los usos</option>
                          <option value="Residencial">Residencial</option>
                          <option value="Comercial">Comercial</option>
                          <option value="Industrial">Industrial</option>
                          <option value="Agropecuario">Agropecuario</option>
                          <option value="Institucional">Institucional</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Predios */}
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex-1 flex flex-col gap-3.5 shadow-sm dark:shadow-lg min-h-[300px] transition-colors duration-300">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                      <span className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        Inventario Predial ({filteredProperties.length})
                      </span>
                      {searchQuery || filterZona !== 'todos' || filterUso !== 'todos' ? (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setFilterZona('todos');
                            setFilterUso('todos');
                          }}
                          className="text-[9px] text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      ) : null}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] xl:max-h-[500px]">
                      {filteredProperties.length > 0 ? (
                        filteredProperties.map((prop) => {
                          const isSelected = selectedProperty?.id === prop.id;
                          return (
                            <div
                              key={prop.id}
                              onClick={() => setSelectedProperty(isSelected ? null : prop)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer duration-300 ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-900 dark:text-white shadow-md'
                                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-300">
                                  Predio {prop.id}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold ${
                                  prop.usoSuelo === 'Residencial' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30' :
                                  prop.usoSuelo === 'Comercial' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30' :
                                  prop.usoSuelo === 'Industrial' ? 'bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30' :
                                  prop.usoSuelo === 'Institucional' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30' :
                                  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {prop.usoSuelo}
                                </span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-100 font-bold truncate text-[11px]">{prop.propietarioNombre}</p>
                              <p className="text-slate-500 dark:text-slate-400 truncate text-[10px] mt-0.5">{prop.direccion}</p>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[9px] text-slate-500 dark:text-slate-500 font-semibold">
                                <span>{prop.zona} ({prop.tipoZona})</span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold">${prop.avaluoTotal.toLocaleString('es-CO')} COP</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-slate-500 space-y-2">
                          <p className="italic text-[10px]">No se encontraron predios que coincidan con la búsqueda.</p>
                          <button
                            onClick={handleCreateNewProperty}
                            className="text-xs text-blue-400 hover:underline font-bold cursor-pointer"
                          >
                            Crear nuevo predio
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex-1 flex flex-col shadow-sm dark:shadow-lg min-h-[400px] transition-colors duration-300 overflow-y-auto max-h-[700px]">
                  <IgacConnector
                    onImportProperty={handleImportProperty}
                    existingPropertiesCount={properties.length}
                    isSidebar={true}
                  />
                </div>
              )}

            </div>

            {/* AREA CENTRAL: Geoportal Interactivo (5 de 12 columnas) */}
            <div id="map-geoportal-container" className="xl:col-span-5 h-full min-h-[450px]">
              <MapGeoportal
                properties={filteredProperties}
                selectedProperty={selectedProperty}
                onSelectProperty={setSelectedProperty}
                onAddPropertyFromDrawing={handleAddPropertyFromDrawing}
                theme={theme}
              />
            </div>

            {/* PANEL DERECHO: Detalle Ficha Catastral o Formulario de Registro (3 de 12 columnas) */}
            <div className="xl:col-span-3 h-full">
              {isFormOpen ? (
                <PropertyForm
                  property={formProperty}
                  onSave={handleSaveProperty}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setFormProperty(null);
                  }}
                  isEdit={isEditMode}
                />
              ) : selectedProperty ? (
                <PropertyDetailsCard
                  property={selectedProperty}
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                  onDraftAppeal={handleDraftAppeal}
                  allProperties={properties}
                />
              ) : (
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center space-y-4 h-full flex flex-col justify-center shadow-sm dark:shadow-lg text-slate-500 dark:text-slate-400 relative z-10 transition-colors duration-300">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center mx-auto text-slate-600 dark:text-slate-300">
                    <Info className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">Visor de Ficha Catastral</h4>
                    <p className="text-[10px] mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
                      Selecciona un predio en el Geoportal o en la lista lateral para explorar sus especificaciones físicas, datos del propietario único, avalúo catastral multipropósito, liquidación fiscal de predial y redactar reclamos automatizados con nuestro asistente de IA.
                    </p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/10 pt-4 mt-2">
                    <button
                      onClick={handleCreateNewProperty}
                      className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold px-4 py-2 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm"
                    >
                      Crear Ficha Directa
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : currentView === 'analytics' ? (
          /* VISTA: Estadísticas Municipales Integrales */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            <AnalyticsDashboard properties={properties} />
          </motion.div>
        ) : (
          /* VISTA: Conector IGAC REST */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <IgacConnector 
              onImportProperty={(newProp) => {
                const updated = [newProp, ...properties];
                saveToLocalStorage(updated);
                setSelectedProperty(newProp);
                triggerAlert(`Predio N° ${newProp.id} sincronizado del IGAC e incorporado exitosamente.`);
              }}
              existingPropertiesCount={properties.length}
            />
          </motion.div>
        )}

        {/* 3. ASESOR CATASTRAL CON IA EN LA PARTE INFERIOR (Acoplable/Desplegable) */}
        {currentView === 'geoportal' && (
          <div id="cadastral-advisor-container" className="grid grid-cols-1 gap-6 mt-6">
            <div className="h-[450px]">
              <CadastralAdvisor
                selectedProperty={selectedProperty}
                onSelectPropertyById={(id) => {
                  const found = properties.find(p => p.id === id);
                  if (found) setSelectedProperty(found);
                }}
                appealRequestProp={appealRequestProp}
                onClearAppealRequest={() => setAppealRequestProp(null)}
                advisorTriggerQuestion={advisorTriggerQuestion}
                onClearAdvisorTriggerQuestion={() => setAdvisorTriggerQuestion(null)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer del Municipio */}
      <footer className="bg-slate-100/50 dark:bg-white/[0.02] text-slate-500 py-6 border-t border-slate-200 dark:border-white/5 text-center text-[10px] space-y-1 relative z-10 transition-colors duration-300">
        <p>Catastro Multipropósito de Colombia © 2026. Todos los derechos reservados.</p>
        <p className="text-slate-600 dark:text-slate-500">Soporte Técnico de datos espaciales y tributarios alineados con el IGAC.</p>
      </footer>
    </div>
  );
}
