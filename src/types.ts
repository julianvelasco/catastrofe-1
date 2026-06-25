export interface Coor {
  x: number;
  y: number;
}

export type PropertyZone = 'Chapinero' | 'Usaquén' | 'Suba' | 'Teusaquillo' | 'Sopó Rural' | 'Guatavita Rural';

export type PropertyUse = 'Residencial' | 'Comercial' | 'Industrial' | 'Agropecuario' | 'Institucional';

export type ConservationState = 'Excelente' | 'Bueno' | 'Regular' | 'Malo';

export type PossessionType = 'Propietario' | 'Copropietario' | 'Poseedor' | 'Ocupante';

export interface Property {
  id: string; // ID interno
  codigoCatastral: string; // NUPRE o Código catastral (e.g., 01-02-0004-0015-000)
  matriculaInmobiliaria: string; // Folio de matrícula (e.g., 50C-123456)
  direccion: string;
  zona: PropertyZone;
  tipoZona: 'Urbano' | 'Rural';
  propietarioNombre: string;
  propietarioIdentificacion: string;
  propietarioTipoDoc: 'CC' | 'NIT' | 'CE' | 'Pasaporte';
  areaTerreno: number; // m2
  areaConstruida: number; // m2
  pisos: number;
  estadoConservacion: ConservationState;
  usoSuelo: PropertyUse;
  
  // Económico
  avaluoTerreno: number; // COP
  avaluoConstruccion: number; // COP
  avaluoTotal: number; // COP
  impuestoPredial: number; // COP
  tarifaMil: number; // Tarifa en por mil (e.g. 6.5)
  
  // Geometría para renderizar en el mapa interactivo (coordenadas locales en una cuadrícula de 1000x1000)
  vertices: Coor[];
  colorHex?: string;
  centroide: Coor;
}

export interface CadastralZoneConfig {
  name: PropertyZone;
  tipoZona: 'Urbano' | 'Rural';
  valorM2Terreno: number; // COP por m2
  valorM2ConstruccionBase: number; // COP por m2
  tarifaMilBase: number; // tarifa milésima base
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
