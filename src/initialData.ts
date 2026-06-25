import { Property, CadastralZoneConfig } from './types';

export const CADASTRAL_ZONES: Record<string, CadastralZoneConfig> = {
  'Chapinero': {
    name: 'Chapinero',
    tipoZona: 'Urbano',
    valorM2Terreno: 2800000, // COP
    valorM2ConstruccionBase: 1900000, // COP
    tarifaMilBase: 6.5, // 6.5 x mil
  },
  'Usaquén': {
    name: 'Usaquén',
    tipoZona: 'Urbano',
    valorM2Terreno: 3100000,
    valorM2ConstruccionBase: 2100000,
    tarifaMilBase: 7.0,
  },
  'Suba': {
    name: 'Suba',
    tipoZona: 'Urbano',
    valorM2Terreno: 1900000,
    valorM2ConstruccionBase: 1400000,
    tarifaMilBase: 5.8,
  },
  'Teusaquillo': {
    name: 'Teusaquillo',
    tipoZona: 'Urbano',
    valorM2Terreno: 2200000,
    valorM2ConstruccionBase: 1600000,
    tarifaMilBase: 6.0,
  },
  'Sopó Rural': {
    name: 'Sopó Rural',
    tipoZona: 'Rural',
    valorM2Terreno: 120000, // Menor valor m2 de tierra
    valorM2ConstruccionBase: 950000,
    tarifaMilBase: 4.5,
  },
  'Guatavita Rural': {
    name: 'Guatavita Rural',
    tipoZona: 'Rural',
    valorM2Terreno: 95000,
    valorM2ConstruccionBase: 880000,
    tarifaMilBase: 4.0,
  }
};

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: '1',
    codigoCatastral: '01-02-0045-0012-000',
    matriculaInmobiliaria: '50C-874521',
    direccion: 'Calle 72 # 11-45',
    zona: 'Chapinero',
    tipoZona: 'Urbano',
    propietarioNombre: 'Carlos Eduardo Restrepo',
    propietarioIdentificacion: '79.654.123',
    propietarioTipoDoc: 'CC',
    areaTerreno: 150,
    areaConstruida: 240,
    pisos: 3,
    estadoConservacion: 'Excelente',
    usoSuelo: 'Residencial',
    avaluoTerreno: 420000000,
    avaluoConstruccion: 456000000,
    avaluoTotal: 876000000,
    tarifaMil: 6.5,
    impuestoPredial: 5694000,
    colorHex: '#3b82f6', // Azul para residencial
    vertices: [
      { x: 120, y: 150 },
      { x: 220, y: 150 },
      { x: 220, y: 220 },
      { x: 120, y: 220 }
    ],
    centroide: { x: 170, y: 185 }
  },
  {
    id: '2',
    codigoCatastral: '01-01-0102-0034-000',
    matriculaInmobiliaria: '50C-928374',
    direccion: 'Carrera 15 # 119-10',
    zona: 'Usaquén',
    tipoZona: 'Urbano',
    propietarioNombre: 'Almacenes Terranova S.A.S.',
    propietarioIdentificacion: '900.512.443-1',
    propietarioTipoDoc: 'NIT',
    areaTerreno: 320,
    areaConstruida: 580,
    pisos: 2,
    estadoConservacion: 'Bueno',
    usoSuelo: 'Comercial',
    avaluoTerreno: 992000000,
    avaluoConstruccion: 1218000000,
    avaluoTotal: 2210000000,
    tarifaMil: 8.5, // Tarifa comercial más alta
    impuestoPredial: 18785000,
    colorHex: '#f59e0b', // Ámbar para comercial
    vertices: [
      { x: 240, y: 120 },
      { x: 380, y: 120 },
      { x: 380, y: 210 },
      { x: 240, y: 210 }
    ],
    centroide: { x: 310, y: 165 }
  },
  {
    id: '3',
    codigoCatastral: '01-05-0211-0089-000',
    matriculaInmobiliaria: '50N-112233',
    direccion: 'Transversal 91 # 145-22',
    zona: 'Suba',
    tipoZona: 'Urbano',
    propietarioNombre: 'Industrias del Metal del Norte',
    propietarioIdentificacion: '860.012.987-5',
    propietarioTipoDoc: 'NIT',
    areaTerreno: 850,
    areaConstruida: 720,
    pisos: 1,
    estadoConservacion: 'Regular',
    usoSuelo: 'Industrial',
    avaluoTerreno: 1615000000,
    avaluoConstruccion: 1008000000,
    avaluoTotal: 2623000000,
    tarifaMil: 9.0, // Tarifa industrial
    impuestoPredial: 23607000,
    colorHex: '#ef4444', // Rojo para industrial
    vertices: [
      { x: 100, y: 240 },
      { x: 280, y: 240 },
      { x: 280, y: 360 },
      { x: 100, y: 360 }
    ],
    centroide: { x: 190, y: 300 }
  },
  {
    id: '4',
    codigoCatastral: '25-758-01-00-0012-0056',
    matriculaInmobiliaria: '176-45129',
    direccion: 'Vereda Chuscal, Finca El Mirador',
    zona: 'Sopó Rural',
    tipoZona: 'Rural',
    propietarioNombre: 'María Helena Gómez de Castro',
    propietarioIdentificacion: '32.485.901',
    propietarioTipoDoc: 'CC',
    areaTerreno: 4800,
    areaConstruida: 180,
    pisos: 1,
    estadoConservacion: 'Bueno',
    usoSuelo: 'Agropecuario',
    avaluoTerreno: 576000000,
    avaluoConstruccion: 171000000,
    avaluoTotal: 747000000,
    tarifaMil: 4.5,
    impuestoPredial: 3361500,
    colorHex: '#10b981', // Esmeralda/Verde para rural/agropecuario
    vertices: [
      { x: 420, y: 100 },
      { x: 590, y: 130 },
      { x: 540, y: 280 },
      { x: 390, y: 230 }
    ],
    centroide: { x: 485, y: 185 }
  },
  {
    id: '5',
    codigoCatastral: '25-312-02-00-0044-0102',
    matriculaInmobiliaria: '176-99234',
    direccion: 'Vereda Monquentiva, Hacienda La Pradera',
    zona: 'Guatavita Rural',
    tipoZona: 'Rural',
    propietarioNombre: 'Agropecuaria Guatavita S.A.',
    propietarioIdentificacion: '800.223.119-0',
    propietarioTipoDoc: 'NIT',
    areaTerreno: 9500,
    areaConstruida: 220,
    pisos: 1,
    estadoConservacion: 'Excelente',
    usoSuelo: 'Agropecuario',
    avaluoTerreno: 902500000,
    avaluoConstruccion: 193600000,
    avaluoTotal: 1096100000,
    tarifaMil: 4.0,
    impuestoPredial: 4384400,
    colorHex: '#059669', // Verde más oscuro para agropecuario grande
    vertices: [
      { x: 610, y: 120 },
      { x: 780, y: 100 },
      { x: 820, y: 310 },
      { x: 590, y: 290 }
    ],
    centroide: { x: 700, y: 205 }
  },
  {
    id: '6',
    codigoCatastral: '01-03-0182-0005-000',
    matriculaInmobiliaria: '50C-445566',
    direccion: 'Calle 34 # 19-05',
    zona: 'Teusaquillo',
    tipoZona: 'Urbano',
    propietarioNombre: 'Colegio Distrital Simón Bolívar',
    propietarioIdentificacion: '899.999.061-2',
    propietarioTipoDoc: 'NIT',
    areaTerreno: 650,
    areaConstruida: 1120,
    pisos: 3,
    estadoConservacion: 'Bueno',
    usoSuelo: 'Institucional',
    avaluoTerreno: 1430000000,
    avaluoConstruccion: 1792000000,
    avaluoTotal: 3222000000,
    tarifaMil: 5.0, // Tarifa preferencial institucional
    impuestoPredial: 16110000,
    colorHex: '#8b5cf6', // Violeta para institucional
    vertices: [
      { x: 300, y: 230 },
      { x: 380, y: 230 },
      { x: 380, y: 380 },
      { x: 300, y: 380 }
    ],
    centroide: { x: 340, y: 305 }
  },
  {
    id: '7',
    codigoCatastral: '01-02-0056-0002-000',
    matriculaInmobiliaria: '50C-109283',
    direccion: 'Carrera 7 # 65-12, Of. 401',
    zona: 'Chapinero',
    tipoZona: 'Urbano',
    propietarioNombre: 'Constructora El Condor S.A.',
    propietarioIdentificacion: '890.112.544-3',
    propietarioTipoDoc: 'NIT',
    areaTerreno: 200,
    areaConstruida: 850,
    pisos: 5,
    estadoConservacion: 'Excelente',
    usoSuelo: 'Comercial',
    avaluoTerreno: 560000000,
    avaluoConstruccion: 1615000000,
    avaluoTotal: 2175000000,
    tarifaMil: 8.5,
    impuestoPredial: 18487500,
    colorHex: '#d97706',
    vertices: [
      { x: 120, y: 60 },
      { x: 220, y: 60 },
      { x: 220, y: 130 },
      { x: 120, y: 130 }
    ],
    centroide: { x: 170, y: 95 }
  }
];

export function calculateValuationAndTax(data: {
  zona: string;
  areaTerreno: number;
  areaConstruida: number;
  pisos: number;
  estadoConservacion: string;
  usoSuelo: string;
}): { avaluoTerreno: number; avaluoConstruccion: number; avaluoTotal: number; tarifaMil: number; impuestoPredial: number } {
  const config = CADASTRAL_ZONES[data.zona] || CADASTRAL_ZONES['Chapinero'];
  
  // Avalúo del terreno
  const avaluoTerreno = data.areaTerreno * config.valorM2Terreno;
  
  // Factor de conservación
  let factorConservacion = 1.0;
  if (data.estadoConservacion === 'Excelente') factorConservacion = 1.2;
  if (data.estadoConservacion === 'Bueno') factorConservacion = 1.0;
  if (data.estadoConservacion === 'Regular') factorConservacion = 0.7;
  if (data.estadoConservacion === 'Malo') factorConservacion = 0.4;
  
  // Avalúo de construcción
  const avaluoConstruccion = data.areaConstruida * config.valorM2ConstruccionBase * factorConservacion;
  const avaluoTotal = avaluoTerreno + avaluoConstruccion;
  
  // Tarifa predial (por mil) dependiendo del uso del suelo y estrato
  let tarifaMil = config.tarifaMilBase;
  if (data.usoSuelo === 'Comercial') tarifaMil = 8.5;
  else if (data.usoSuelo === 'Industrial') tarifaMil = 9.0;
  else if (data.usoSuelo === 'Agropecuario') tarifaMil = 4.2;
  else if (data.usoSuelo === 'Institucional') tarifaMil = 5.0;
  else {
    // Residencial depende levemente del tamaño o estrato virtual (acá usamos pisos como aproximación rápida de densidad)
    tarifaMil = config.tarifaMilBase + (data.pisos > 2 ? 0.8 : 0);
  }
  
  const impuestoPredial = Math.round((avaluoTotal * tarifaMil) / 1000);
  
  return {
    avaluoTerreno: Math.round(avaluoTerreno),
    avaluoConstruccion: Math.round(avaluoConstruccion),
    avaluoTotal: Math.round(avaluoTotal),
    tarifaMil,
    impuestoPredial
  };
}
