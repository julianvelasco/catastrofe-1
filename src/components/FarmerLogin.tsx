import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sprout, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface FarmerLoginProps {
  onLoginSuccess: (role: 'farmer' | 'official', name: string) => void;
}

export default function FarmerLogin({ onLoginSuccess }: FarmerLoginProps) {
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'official'>('farmer');
  const [userName, setUserName] = useState('Don Cleofás Pérez');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate login loading delay
    setTimeout(() => {
      onLoginSuccess(selectedRole, userName);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060a13] p-4 overflow-y-auto">
      {/* Background ambient lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-600/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[160px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 space-y-6"
      >
        {/* Logo and Greeting */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-emerald-500 to-green-400 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <Sprout className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            SGC <span className="text-emerald-400">Multipropósito Rural</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Plataforma amigable de catastro para nuestros campesinos y productores colombianos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de Rol */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              ¿Cómo deseas ingresar hoy?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('farmer');
                  setUserName('Don Cleofás Pérez');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'farmer'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/5'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-lg">👨‍🌾</span>
                <span className="leading-none">Soy Campesino</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('official');
                  setUserName('Ing. Claudia Jiménez');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'official'
                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-400 shadow-md shadow-blue-500/5'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-lg">🏢</span>
                <span className="leading-none">Gestor de Tierras</span>
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Tu Nombre de Usuario
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                placeholder="Escribe tu nombre completo..."
                className="w-full bg-slate-950/60 border border-slate-850 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* Contraseña Simbólica */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Clave de Acceso (Simulada)
              </label>
              <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Libre sin clave
              </span>
            </div>
            <div className="relative opacity-60">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                disabled
                value="••••••••••••"
                className="w-full bg-slate-950/20 border border-slate-850 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-500 cursor-not-allowed select-none"
              />
            </div>
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2 ${
              selectedRole === 'farmer'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10'
            }`}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Ingresar de Forma Segura</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-800/60">
          <p className="text-[9px] text-slate-500 leading-normal">
            Cumple con la Directiva del Catastro Multipropósito del IGAC de Colombia.<br />
            Los datos personales están protegidos por la Ley de Habeas Data.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
