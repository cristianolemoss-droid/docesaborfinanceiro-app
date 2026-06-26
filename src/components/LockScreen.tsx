import React, { useState, useEffect } from 'react';
import { Lock, Candy, AlertCircle, Sparkles, Key, Eye, EyeOff, User } from 'lucide-react';
import { motion } from 'motion/react';
import { UserAccount } from '../types';
import bgImage from '../assets/images/bakery_display_bg_1781612198209.jpg';

interface LockScreenProps {
  requiredRole: 'admin' | 'any';
  onLogin: (role: 'admin' | 'collaborator') => void;
  onNavigateToPublic: () => void;
  companyName?: string;
  users?: UserAccount[];
}

export default function LockScreen({ requiredRole, onLogin, onNavigateToPublic, companyName, users = [] }: LockScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtra usuários elegíveis de acordo com a permissão exigida pela tela
  const eligibleUsers = users.filter(u => requiredRole === 'any' || (requiredRole === 'admin' && u.role === 'admin'));

  // Define um usuário padrão se houver elegíveis para evitar campo em branco
  useEffect(() => {
    if (eligibleUsers.length > 0) {
      setSelectedUserId(eligibleUsers[0].id);
    }
  }, [users, requiredRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = password.trim();

    if (users && users.length > 0) {
      if (!selectedUserId) {
        setError('Por favor, selecione um usuário.');
        return;
      }
      const match = users.find(u => u.id === selectedUserId);
      if (!match) {
        setError('Usuário não encontrado.');
        return;
      }
      if (match.senha !== cleanPass) {
        setError('❌ Senha inválida! Tente novamente.');
        return;
      }

      onLogin(match.role);
      return;
    }

    // Fallback caso não haja usuários cadastrados por algum motivo
    if (cleanPass === '1234') {
      onLogin('admin');
    } else if (cleanPass === 'colab') {
      if (requiredRole === 'admin') {
        setError('⚠️ A senha inserida é de Colaborador. A tela de Estatísticas é restrita para o perfil Administrador!');
      } else {
        onLogin('collaborator');
      }
    } else if (cleanPass === '') {
      setError('Por favor, informe a senha de acesso.');
    } else {
      setError('❌ Senha inválida!');
    }
  };


  return (
    <div 
      className="w-full min-h-[500px] md:min-h-[580px] flex items-center justify-center p-4 md:p-8 rounded-3xl bg-cover bg-center relative overflow-hidden shadow-md border border-rose-100/30"
      style={{ backgroundImage: `url(${bgImage})` }}
      id="lockscreen-outer-bg"
    >
      {/* Dark/Warm ambient spotlight overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-slate-900/60 to-rose-950/50 backdrop-blur-[1px]"></div>

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 shadow-xl overflow-hidden font-sans pastry-glow" id="lockscreen-container">
        {/* Top Confectionery Aesthetics Banner */}
        <div className="bg-rose-500 p-6 text-center relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-450 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-rose-400 rounded-full opacity-10"></div>
          
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white mb-3 shadow-inner">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white font-serif tracking-tight">Cofre de Segurança</h2>
          <p className="text-[11px] text-rose-100 font-medium">{companyName || 'Doce Sabor Financeiro'} • ERP</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Acesso Protegido</p>
            <h3 className="text-base font-extrabold text-slate-800">
              {requiredRole === 'admin' 
                ? '🔑 Painel Estatístico & Auditoria' 
                : '📊 Livro Caixa e Resultados'}
            </h3>
            <p className="text-xs text-slate-500 px-4">
              Esta seção possui dados confidenciais de faturamento e perdas. Digite sua senha correspondente para entrar.
            </p>
          </div>

          {/* Formulário de Acesso */}
          <form onSubmit={handleSubmit} className="space-y-4" id="frm-lockscreen">
            {users && users.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-rose-500" /> Selecione o Usuário
                </label>
                <select
                  className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2 px-3 font-semibold text-slate-800 text-xs transition-all cursor-pointer"
                  value={selectedUserId}
                  onChange={e => {
                    setSelectedUserId(e.target.value);
                    setError(null);
                  }}
                >
                  {eligibleUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.role === 'admin' ? 'Admin' : 'Colaborador'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-slate-600 block">Senha de Acesso</label>
              <div className="relative">
                <input 
                  id="inp-lock-password"
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2.5 pl-3.5 pr-10 font-mono text-center font-bold text-slate-800 text-lg transition-all"
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
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-xs text-red-700 animate-bounce" id="lock-error-msg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onNavigateToPublic}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer pointer-events-auto"
              >
                Voltar ao PDV
              </button>
              <button
                type="submit"
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer pointer-events-auto flex items-center justify-center gap-1"
              >
                <Key className="w-3.5 h-3.5" /> Desbloquear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
