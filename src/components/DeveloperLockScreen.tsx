import React, { useState } from 'react';
import { Lock, AlertCircle, Key, Eye, EyeOff, ShieldCheck, Code } from 'lucide-react';
import { motion } from 'motion/react';
import bgImage from '../assets/images/bakery_display_bg_1781612198209.jpg';

interface DeveloperLockScreenProps {
  onLogin: () => void;
  onNavigateToPublic: () => void;
  devPassword?: string;
}

export default function DeveloperLockScreen({ onLogin, onNavigateToPublic, devPassword = 'Cris@551866' }: DeveloperLockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = password.trim();

    if (cleanPass === devPassword) {
      onLogin();
    } else if (cleanPass === '') {
      setError('Por favor, informe a senha de desenvolvedor.');
    } else {
      setError('❌ Senha de Desenvolvedor incorreta! Verifique ou configure a senha correta.');
    }
  };

  return (
    <div 
      className="w-full min-h-[500px] md:min-h-[580px] flex items-center justify-center p-4 md:p-8 rounded-3xl bg-cover bg-center relative overflow-hidden shadow-md border border-rose-100/30 font-sans"
      style={{ backgroundImage: `url(${bgImage})` }}
      id="dev-lockscreen-outer-bg"
    >
      {/* Dark/Amber ambient spotlight overlay for developer aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/75 to-teal-950/50 backdrop-blur-[1px]"></div>

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 shadow-2xl overflow-hidden pastry-glow" id="dev-lockscreen-container">
        {/* Top Developer Aesthetics Banner */}
        <div className="bg-slate-900 p-6 text-center relative overflow-hidden flex flex-col items-center justify-center border-b border-slate-850">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-500/10 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-rose-500/10 rounded-full opacity-10"></div>
          
          <div className="p-3 bg-teal-500/15 backdrop-blur-md rounded-2xl text-teal-400 mb-3 border border-teal-500/30">
            <Code className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white font-serif tracking-tight">Console do Desenvolvedor</h2>
          <p className="text-[11px] text-teal-400 font-bold uppercase tracking-widest mt-1">Acesso Restrito ao Sistema</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">🔒 Configurações Avançadas</p>
            <h3 className="text-base font-extrabold text-slate-800">
              Acesso Exclusivo de Engenharia
            </h3>
            <p className="text-xs text-slate-500 px-4 mt-2">
              Administradores e usuários comuns não possuem permissão para acessar ou realizar alterações nesta área comercial. Insira a senha de desenvolvedor ativa para prosseguir.
            </p>
          </div>

          {/* Formulário de Acesso */}
          <form onSubmit={handleSubmit} className="space-y-4" id="frm-dev-lockscreen">
            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-slate-600 block">Senha de Desenvolvedor</label>
              <div className="relative">
                <input 
                  id="inp-dev-lock-password"
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-400 focus:bg-white focus:outline-hidden rounded-xl py-2.5 pl-3.5 pr-10 font-mono text-center font-bold text-slate-800 text-lg transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 p-0.5 pointer-events-auto cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-xs text-red-700 animate-bounce" id="dev-lock-error-msg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onNavigateToPublic}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer pointer-events-auto"
              >
                Voltar ao PDV
              </button>
              <button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-teal-400 border border-teal-500/20 font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer pointer-events-auto flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" /> Autenticar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
