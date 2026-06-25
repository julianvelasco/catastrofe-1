import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware para JSON
app.use(express.json());

// Inicialización de la API de Gemini
// NOTA: Se requiere GEMINI_API_KEY en las variables de entorno.
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("ADVERTENCIA: GEMINI_API_KEY no está definida. Las funciones de IA estarán deshabilitadas.");
}

// Endpoint de Consulta de IA con Búsqueda de Google (Grounding)
app.post("/api/gemini/consult", async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: "La API de Gemini no está configurada en el servidor. Configure GEMINI_API_KEY."
    });
  }

  const { message, history = [], currentProperty = null, mode = "general" } = req.body;

  try {
    // Construimos las instrucciones de sistema en base al rol de un Asesor Catastral campesino y amigable
    let systemInstruction = `Eres "Don Mateo", un Asesor del Campo amigable, respetuoso y experto en Catastro Multipropósito de Colombia, especializado en la normativa del Instituto Geográfico Agustín Codazzi (IGAC), la Ley 1955 de 2019, avalúos catastrales y el impuesto predial rural.
Tu misión es ayudar a los campesinos, agricultores y productores de alimentos colombianos a entender su tierrita de forma muy sencilla, clara y afectuosa.
Hablas con un tono sumamente respetuoso, servicial, cálido y cercano (usa términos como "vecino", "doña", "don", "tierrita", "linderos", "su finca").
Explica los términos técnicos de manera sencilla, por ejemplo:
- Explica "Avalúo Catastral" como "el precio que el gobierno le pone a su finca para calcular los impuestos".
- Explica "Linderos" como "los límites o cercas de su terreno".
- Explica "Área" en metros cuadrados y haz analogías sencillas si es relevante (ej: 1 fanegada = 6.400 metros cuadrados, 1 hectárea = 10.000 metros cuadrados).
Si te piden redactar un Recurso de Reposición (apelación catastral), redacta un borrador formal impecable, estructurado y riguroso dirigido al IGAC o a la autoridad municipal, pero explícales primero de forma muy sencilla qué documentos de soporte necesitan (como fotos de cultivos, grietas, escrituras o planos antiguos).
Utiliza la Búsqueda de Google (Grounding) si se te pregunta sobre leyes vigentes, decretos recientes del sector agropecuario, o procedimientos actuales de actualización catastral en municipios rurales colombianos.`;

    // Si hay una propiedad seleccionada, la inyectamos como contexto
    let contextPrompt = "";
    if (currentProperty) {
      contextPrompt = `\n\n[CONTEXTO DEL PREDIO ACTUAL SELECCIONADO]:
- Código Catastral: ${currentProperty.codigoCatastral}
- Matrícula Inmobiliaria: ${currentProperty.matriculaInmobiliaria}
- Dirección: ${currentProperty.direccion}
- Zona: ${currentProperty.zona} (${currentProperty.tipoZona})
- Propietario: ${currentProperty.propietarioNombre} (Identificación: ${currentProperty.propietarioTipoDoc} ${currentProperty.propietarioIdentificacion})
- Área Terreno: ${currentProperty.areaTerreno} m²
- Área Construida: ${currentProperty.areaConstruida} m²
- Número de Pisos: ${currentProperty.pisos}
- Estado de Conservación: ${currentProperty.estadoConservacion}
- Uso de Suelo: ${currentProperty.usoSuelo}
- Avalúo Terreno: $${currentProperty.avaluoTerreno.toLocaleString('es-CO')} COP
- Avalúo Construcción: $${currentProperty.avaluoConstruccion.toLocaleString('es-CO')} COP
- Avalúo Total: $${currentProperty.avaluoTotal.toLocaleString('es-CO')} COP
- Impuesto Predial Estimado: $${currentProperty.impuestoPredial.toLocaleString('es-CO')} COP (Tarifa: ${currentProperty.tarifaMil}‰)`;
    }

    let userPrompt = message;
    if (mode === "appeal") {
      userPrompt = `Redacta un borrador formal de Recurso de Reposición por inconformidad con el avalúo catastral para el predio con los datos suministrados. Explica que el avalúo actual de $${currentProperty?.avaluoTotal.toLocaleString('es-CO')} COP es desproporcionado en comparación con las condiciones físicas, área construida de ${currentProperty?.areaConstruida} m², y estado de conservación (${currentProperty?.estadoConservacion}). El borrador debe estar dirigido a la autoridad catastral (IGAC o Gestor Catastral correspondiente), estructurado con fundamentos de hecho y derecho bajo el marco legal del Catastro Multipropósito de Colombia, dejando espacios claros en corchetes para fechas o firmas de soporte técnico.`;
    } else if (mode === "norms") {
      userPrompt = `Explícame detalladamente la normativa vigente de Catastro Multipropósito en Colombia (Ley 1955 de 2019, Decretos reglamentarios y resoluciones del IGAC) en relación con el siguiente aspecto o consulta: "${message}".`;
    }

    // Convertir el historial al formato adecuado de contenidos para Gemini
    const contents: any[] = [];
    
    // Añadimos el historial previo en el orden correcto
    for (const h of history) {
      contents.push({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }]
      });
    }

    // Añadimos el mensaje actual con el contexto
    contents.push({
      role: "user",
      parts: [{ text: userPrompt + contextPrompt }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        // Habilitamos búsqueda en Google (Grounding) según directivas
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      }
    });

    res.json({
      reply: response.text || "Lo siento, no pude generar una respuesta en este momento.",
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null
    });

  } catch (error: any) {
    console.error("Error al llamar a Gemini:", error);
    res.status(500).json({
      error: "Ocurrió un error al procesar la solicitud con el asistente de IA.",
      details: error.message
    });
  }
});

// === PROXY INTEGRACIÓN CON SERVICIOS IGAC (https://mapas.igac.gov.co/server/rest/services) ===

// Catálogo caché/local para fallbacks en caso de desconexión o lentitud del servidor oficial del IGAC
const IGAC_FALLBACK_CATALOG = {
  currentVersion: 10.81,
  folders: [
    "Catastro",
    "Cartografia_Basica",
    "Geodesia",
    "Ordenamiento_Territorial",
    "Agroecologia"
  ],
  services: [
    { name: "Catastro/CO_IGAC_Catastro_Nacional", type: "MapServer" },
    { name: "Cartografia_Basica/CO_IGAC_Cartografia_Clase_1_25000", type: "MapServer" },
    { name: "Geodesia/CO_IGAC_Red_Geodesica_Nacional", type: "MapServer" },
    { name: "Ordenamiento_Territorial/CO_IGAC_Zonas_Entidades_Municipales", type: "MapServer" }
  ],
  isFallback: true
};

// Detalle caché para el servicio de Catastro Nacional
const IGAC_FALLBACK_SERVICE_META: Record<string, any> = {
  "Catastro/CO_IGAC_Catastro_Nacional/MapServer": {
    currentVersion: 10.81,
    serviceDescription: "Servicio oficial de Catastro Nacional Multipropósito de Colombia (IGAC). Contiene capas de predios urbanos y rurales, manzanas catastrales y límites administrativos de municipios.",
    mapName: "Catastro_Nacional",
    spatialReference: { wkid: 4686, latestWkid: 4686 }, // MAGNA-SIRGAS (lat/long)
    layers: [
      { id: 0, name: "Departamentos", parentLayerId: -1, defaultVisibility: true, subLayerIds: null, minScale: 0, maxScale: 0 },
      { id: 1, name: "Municipios", parentLayerId: -1, defaultVisibility: true, subLayerIds: null, minScale: 0, maxScale: 0 },
      { id: 2, name: "Cabeceras Municipales", parentLayerId: -1, defaultVisibility: true, subLayerIds: null, minScale: 0, maxScale: 0 },
      { id: 3, name: "Sectores Catastrales", parentLayerId: -1, defaultVisibility: false, subLayerIds: null, minScale: 0, maxScale: 0 },
      { id: 4, name: "Terreno Urbano (Predios)", parentLayerId: -1, defaultVisibility: true, subLayerIds: null, minScale: 10000, maxScale: 0 },
      { id: 5, name: "Construcción Urbana", parentLayerId: -1, defaultVisibility: true, subLayerIds: null, minScale: 5000, maxScale: 0 },
      { id: 6, name: "Sectores Rurales", parentLayerId: -1, defaultVisibility: false, subLayerIds: null, minScale: 0, maxScale: 0 },
      { id: 7, name: "Terreno Rural (Predios)", parentLayerId: -1, defaultVisibility: true, subLayerIds: null, minScale: 50000, maxScale: 0 }
    ],
    isFallback: true
  }
};

// Generador de polígonos realistas en Colombia si falla el API real
function generateFallbackFeatures(layerId: number, where: string = ""): any[] {
  // Extraemos un municipio si viene en la query
  let munName = "Sopó (Cundinamarca)";
  if (where.toLowerCase().includes("sopo") || where.includes("25754")) {
    munName = "Sopó";
  } else if (where.toLowerCase().includes("guatavita") || where.includes("25326")) {
    munName = "Guatavita";
  } else if (where.toLowerCase().includes("usaquen") || where.toLowerCase().includes("chapinero")) {
    munName = "Bogotá, D.C.";
  }

  // Generamos de 3 a 5 predios reales simulados en el sistema de coordenadas de Colombia
  const baseLat = 4.9125; // Coord de Sopó aprox.
  const baseLng = -73.9425;

  const count = 4;
  const features = [];

  for (let i = 1; i <= count; i++) {
    const idNum = 100 + i;
    const offsetLat = (i - 2.5) * 0.0012;
    const offsetLng = (i % 2 === 0 ? 1 : -1) * 0.0009;

    const lat = baseLat + offsetLat;
    const lng = baseLng + offsetLng;

    // Polígono de 4 vértices
    const ring = [
      [lng - 0.0003, lat - 0.0003],
      [lng + 0.0003, lat - 0.0003],
      [lng + 0.0003, lat + 0.0003],
      [lng - 0.0003, lat + 0.0003],
      [lng - 0.0003, lat - 0.0003] // Cerrar polígono
    ];

    const area = Math.round(180 + (i * 45));
    const areaConst = Math.round(area * 0.7);

    features.push({
      attributes: {
        OBJECTID: idNum,
        CODIGO_CATASTRAL: `01-02-0089-00${idNum}-000`,
        NUPRE: `COL-NUPRE-${10239 + idNum}`,
        MATRICULA_INMOBILIARIA: `50C-${402830 + idNum}`,
        DIRECCION: `Vereda Meusa, Sector Centro N° ${23 + i * 5}, ${munName}`,
        PROPIETARIO: i === 1 ? "Inversiones Agrícolas Meusa" : i === 2 ? "Familia Clopatofsky Gómez" : i === 3 ? "Liliana María Suárez" : "Constructora Sabana Real",
        IDENTIFICACION: i === 1 ? "900.283.472-1" : `1.028.384.70${i}`,
        TIPO_DOC: i === 1 ? "NIT" : "CC",
        ZONA: munName.includes("Sopó") ? "Sopó Rural" : munName.includes("Guatavita") ? "Guatavita Rural" : "Chapinero",
        USO_SUELO: munName.includes("Rural") ? "Agropecuario" : "Residencial",
        CONSERVACION: i % 2 === 0 ? "Excelente" : "Bueno",
        PISOS: i % 2 === 0 ? 2 : 1,
        AREA_TERRENO: area,
        AREA_CONSTRUIDA: areaConst,
        MUNICIPIO: munName,
        DEPARTAMENTO: "Cundinamarca",
        METODO_SINC: "Sincronizado vía IGAC REST (Simulado con coordenadas reales)"
      },
      geometry: {
        rings: [ring]
      }
    });
  }

  return features;
}

// 1. Endpoint para listar carpetas y servicios principales
app.get("/api/igac/services", async (req, res) => {
  const { folder } = req.query;
  const baseUrl = "https://mapas.igac.gov.co/server/rest/services";
  const url = folder ? `${baseUrl}/${folder}?f=pjson` : `${baseUrl}?f=pjson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return res.json({ ...data, isLive: true });
  } catch (error: any) {
    console.warn(`[IGAC Proxy] Error al obtener catálogo de ${folder || 'raíz'}:`, error.message);
    // Devolvemos el catálogo fallback si falla o expira el tiempo
    if (!folder) {
      return res.json({ ...IGAC_FALLBACK_CATALOG, errorDetail: error.message });
    } else {
      // Si piden una carpeta que no está, simulamos su respuesta
      const folderServices = IGAC_FALLBACK_CATALOG.services.filter(s => s.name.startsWith(folder as string));
      return res.json({
        currentVersion: 10.81,
        services: folderServices,
        isFallback: true,
        errorDetail: error.message
      });
    }
  }
});

// 2. Endpoint para obtener metadatos de un servicio específico
app.get("/api/igac/service-meta", async (req, res) => {
  const { service } = req.query; // Ej: Catastro/CO_IGAC_Catastro_Nacional/MapServer
  if (!service) {
    return res.status(400).json({ error: "Debe especificar el parámetro 'service'." });
  }

  const url = `https://mapas.igac.gov.co/server/rest/services/${service}?f=pjson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return res.json({ ...data, isLive: true });
  } catch (error: any) {
    console.warn(`[IGAC Proxy] Error al obtener metadatos del servicio ${service}:`, error.message);
    const serviceStr = String(service);
    if (IGAC_FALLBACK_SERVICE_META[serviceStr]) {
      return res.json({ ...IGAC_FALLBACK_SERVICE_META[serviceStr], errorDetail: error.message });
    }
    // Formato por defecto si no está en fallback
    return res.json({
      currentVersion: 10.81,
      serviceDescription: `Servicio de mapas de IGAC Colombia (${serviceStr}). Metadatos cargados en modo seguro local.`,
      mapName: "Servicio_Local",
      spatialReference: { wkid: 4686, latestWkid: 4686 },
      layers: [
        { id: 0, name: "Capa Base de Consulta", parentLayerId: -1, defaultVisibility: true }
      ],
      isFallback: true,
      errorDetail: error.message
    });
  }
});

// 3. Endpoint para realizar consultas (Query) a una capa
app.post("/api/igac/query", async (req, res) => {
  const { service, layer, where = "1=1", outFields = "*", returnGeometry = true, resultRecordCount = 10 } = req.body;

  if (!service || layer === undefined) {
    return res.status(400).json({ error: "Faltan parámetros 'service' o 'layer'." });
  }

  // Construir los parámetros codificados
  const params = new URLSearchParams({
    where: where,
    outFields: outFields,
    returnGeometry: String(returnGeometry),
    resultRecordCount: String(resultRecordCount),
    f: "json"
  });

  const url = `https://mapas.igac.gov.co/server/rest/services/${service}/${layer}/query?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Error en el servidor de ArcGIS");
    }

    return res.json({ ...data, isLive: true });
  } catch (error: any) {
    console.warn(`[IGAC Proxy] Error en consulta de capa ${service}/${layer}:`, error.message);
    // Fallback: Retorna un set de features simuladas con datos válidos de Cundinamarca/Colombia
    const fallbackFeatures = generateFallbackFeatures(parseInt(layer), where);
    return res.json({
      displayFieldName: "CODIGO_CATASTRAL",
      fieldAliases: {
        OBJECTID: "Object ID",
        CODIGO_CATASTRAL: "Código Catastral",
        NUPRE: "Código Nupre",
        MATRICULA_INMOBILIARIA: "Matrícula Inmobiliaria",
        DIRECCION: "Dirección",
        PROPIETARIO: "Propietario",
        IDENTIFICACION: "Identificación",
        TIPO_DOC: "Tipo Documento"
      },
      geometryType: "esriGeometryPolygon",
      spatialReference: { wkid: 4686, latestWkid: 4686 },
      features: fallbackFeatures,
      isFallback: true,
      errorDetail: error.message
    });
  }
});

// 4. Verificación rápida del estado de conexión con IGAC
app.get("/api/igac/status", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("https://mapas.igac.gov.co/server/rest/services?f=json", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return res.json({ status: "online", message: "Conectado al servidor de mapas IGAC exitosamente" });
    }
    return res.json({ status: "unreachable", message: "Servidor IGAC respondió con error", code: response.status });
  } catch (error: any) {
    return res.json({ status: "offline", message: "No se pudo establecer conexión con mapas.igac.gov.co", error: error.message });
  }
});

// Configuración de Vite o archivos estáticos
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando en modo DESARROLLO con middleware de Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando en modo PRODUCCIÓN...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Express corriendo en puerto ${PORT}`);
  });
}

startServer();
