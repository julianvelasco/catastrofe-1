import React, { useState, useRef, useEffect } from 'react';
import { Property, ChatMessage } from '../types';
import { Send, Sparkles, AlertCircle, HelpCircle, FileText, Search, ExternalLink, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CadastralAdvisorProps {
  selectedProperty: Property | null;
  onSelectPropertyById: (id: string) => void;
  appealRequestProp: Property | null;
  onClearAppealRequest: () => void;
  advisorTriggerQuestion?: {question: string, mode: 'general' | 'appeal' | 'norms'} | null;
  onClearAdvisorTriggerQuestion?: () => void;
}

export default function CadastralAdvisor({
  selectedProperty,
  onSelectPropertyById,
  appealRequestProp,
  onClearAppealRequest,
  advisorTriggerQuestion,
  onClearAdvisorTriggerQuestion,
}: CadastralAdvisorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola compadre, bienvenido! Soy **Don Mateo, tu Asesor del Campo IA** 🌾.\n\nEstoy aquí para guiarte en el catastro de tu tierrita o finca, y ayudarte con las normas del IGAC en Colombia. Puedo:\n\n1. 🌱 **Explicar tu avalúo e impuestos** de forma muy clara y sencilla, para que no pagues de más.\n2. 📝 **Redactar una carta de reclamo (Recurso)** si sientes que el precio que le pusieron a tu finca está muy alto o desproporcionado.\n3. 📏 **Calcular los linderos** o el tamaño de tu finca para verificar el catastro.\n\n*¿De qué te gustaría que hablemos hoy?* Si seleccionas tu predio en la lista o el mapa, podré darte consejos personalizados de inmediato.',
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'general' | 'appeal' | 'norms'>('general');
  const [activeGrounding, setActiveGrounding] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll en nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Si se solicita redactar apelación desde la tarjeta del predio
  useEffect(() => {
    if (appealRequestProp) {
      setMode('appeal');
      handleSend(undefined, appealRequestProp, 'appeal');
      onClearAppealRequest();
    }
  }, [appealRequestProp]);

  // Si se solicita una pregunta rápida desde la guía del campesino
  useEffect(() => {
    if (advisorTriggerQuestion) {
      setMode(advisorTriggerQuestion.mode);
      handleSend(undefined, selectedProperty, advisorTriggerQuestion.mode, advisorTriggerQuestion.question);
      onClearAdvisorTriggerQuestion?.();
    }
  }, [advisorTriggerQuestion]);

  const handleSend = async (
    e?: React.FormEvent,
    overrideProperty?: Property | null,
    overrideMode?: 'general' | 'appeal' | 'norms',
    overrideMessage?: string
  ) => {
    e?.preventDefault();
    
    const activeMsg = overrideMessage || (overrideMode === 'appeal' ? 'Redacción de Recurso de Reposición por Avalúo Catastral' : input.trim());
    const activeMode = overrideMode || mode;
    const activeProp = overrideProperty !== undefined ? overrideProperty : selectedProperty;

    if (!activeMsg && activeMode !== 'appeal') return;

    // Crear mensaje del usuario
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: activeMode === 'appeal' && !overrideMessage
        ? `📝 Generar recurso formal de apelación catastral para el Predio: **${activeProp?.direccion}** (Código: \`${activeProp?.codigoCatastral}\`).`
        : activeMsg,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);
    setActiveGrounding(null);

    try {
      const response = await fetch('/api/gemini/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: activeMsg,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          currentProperty: activeProp,
          mode: activeMode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        }]);

        if (data.groundingMetadata) {
          setActiveGrounding(data.groundingMetadata);
        }
      } else {
        throw new Error(data.error || 'Ocurrió un error en el servidor.');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Error de conexión:** No se pudo completar la consulta catastral. Detalle: ${err.message}. Por favor verifica las credenciales de la API en el panel de Secrets.`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string, qMode: 'general' | 'appeal' | 'norms') => {
    setMode(qMode);
    setInput(question);
  };

  // Formateador simple de Markdown para el chat
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Reemplazar negritas
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-bold">$1</strong>');
      // Reemplazar código en línea
      formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[10.5px] border border-slate-800">$1</code>');
      
      // Manejar listas con viñetas
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <li key={i} className="ml-4 list-disc mb-1" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-*]\s+/, '') }} />;
      }
      
      // Manejar listas numeradas
      const numMatch = line.trim().match(/^(\d+)\.\s+/);
      if (numMatch) {
        return <li key={i} className="ml-4 list-decimal mb-1" dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s+/, '') }} />;
      }

      if (line.trim() === '') return <div key={i} className="h-2" />;

      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full text-xs text-slate-200">
      
      {/* Cabecera del Chat */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg shadow-sm">
            👨‍🌾
          </div>
          <div>
            <h3 className="font-bold text-slate-100">Don Mateo - Asistente del Campo IA</h3>
            <p className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Soporte de confianza para el campesino (IGAC)
            </p>
          </div>
        </div>

        {/* Modo de Consulta */}
        <select
          value={mode}
          onChange={(e: any) => setMode(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-500 font-semibold"
        >
          <option value="general">Chat General</option>
          <option value="appeal">Recurso de Apelación</option>
          <option value="norms">Consulta de Normas</option>
        </select>
      </div>

      {/* Indicador de Contexto del Predio */}
      <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800/60 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">Predio para Personalización:</span>
        {selectedProperty ? (
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] text-blue-400 font-bold">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            ID {selectedProperty.id} - {selectedProperty.zona}
          </div>
        ) : (
          <span className="text-[9px] text-slate-500 italic">Selecciona un predio en el mapa</span>
        )}
      </div>

      {/* Mensajes del Chat */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[50vh] md:max-h-[none]">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-1 ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-medium'
                  : 'bg-slate-950 border border-slate-800 rounded-tl-none text-slate-300 leading-relaxed'
              }`}>
                {/* Formato de texto */}
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="space-y-1 select-text">
                    {formatMarkdown(msg.content)}
                  </div>
                )}
                <span className={`block text-[8px] text-right mt-1.5 ${
                  msg.role === 'user' ? 'text-slate-900/60' : 'text-slate-500'
                }`}>
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Indicador de Carga */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 max-w-[85%]">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold animate-pulse">
                Consultando Leyes Catastrales en Google Search...
              </span>
            </div>
          </div>
        )}

        {/* Citaciones / Grounding de Google Search */}
        {activeGrounding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-950 border border-emerald-500/20 p-3 rounded-xl space-y-2"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
              <Search className="w-3.5 h-3.5" />
              Búsqueda en Google (Grounding Catastral)
            </div>
            {activeGrounding.webSources && activeGrounding.webSources.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400">Fuentes consultadas por la IA:</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeGrounding.webSources.slice(0, 3).map((src: any, idx: number) => (
                    <a
                      key={idx}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded px-2 py-1 text-[8px] font-medium text-slate-300 flex items-center gap-1 truncate max-w-[200px]"
                    >
                      <ExternalLink className="w-2.5 h-2.5 text-emerald-400" />
                      {src.title || 'Norma IGAC / Registro'}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[8.5px] text-slate-500 italic">Información respaldada por la red de datos IGAC.</p>
            )}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugerencias de Consultas Rápidas */}
      <div className="px-4 py-2 bg-slate-950/20 border-t border-slate-800/40 flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-none shrink-0 select-none">
        <button
          onClick={() => handleQuickQuestion('¿Qué beneficios o descuentos de impuesto predial tenemos los campesinos o productores de alimentos?', 'norms')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg px-2.5 py-1 text-[9px] text-emerald-400 shrink-0 font-bold transition-all"
        >
          🌾 Descuentos de Agricultura
        </button>
        <button
          onClick={() => handleQuickQuestion('¿Cómo se calcula el avalúo catastral rural y qué es una fanegada?', 'general')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg px-2.5 py-1 text-[9px] text-slate-300 shrink-0 font-medium transition-all"
        >
          📏 ¿Cómo se calcula el avalúo?
        </button>
        {selectedProperty && (
          <button
            onClick={() => handleQuickQuestion(`Redacta un borrador de recurso de reposición para apelar el avalúo catastral para el predio ID ${selectedProperty.id}`, 'appeal')}
            className="bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/40 rounded-lg px-2.5 py-1 text-[9px] text-emerald-400 shrink-0 font-bold transition-all"
          >
            ✍️ Apelar predio actual
          </button>
        )}
      </div>

      {/* Input de Chat */}
      <form onSubmit={(e) => handleSend(e)} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === 'appeal'
              ? 'Describe los motivos de la apelación (ej: grietas, avalúo inflado)...'
              : 'Haz una consulta sobre normas, avalúos catastrales...'
          }
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && mode !== 'appeal')}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 p-2 rounded-xl transition-all font-black flex items-center justify-center cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
