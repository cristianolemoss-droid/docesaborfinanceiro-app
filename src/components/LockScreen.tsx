import React, { useState, useEffect } from 'react';
import { Lock, Candy, AlertCircle, Sparkles, Key, Eye, EyeOff, User, UserPlus, ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { UserAccount } from '../types';
import bgImage from '../assets/images/bakery_display_bg_1781612198209.jpg';

interface LockScreenProps {
  requiredRole: 'admin' | 'any' | 'collaborator';
  onLogin: (role: 'admin' | 'collaborator' | 'developer', user?: UserAccount) => void;
  onNavigateToPublic: () => void;
  companyName?: string;
  users?: UserAccount[];
  devPassword?: string;
  tenantId?: string;
  onAddUser?: (user: UserAccount) => void;
}

export default function LockScreen({ 
  requiredRole, 
  onLogin, 
  onNavigateToPublic, 
  companyName, 
  users = [], 
  devPassword,
  tenantId,
  onAddUser
}: LockScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para o formulário de cadastro de usuário direto
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'collaborator'>('admin');
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);

  // Filtra usuários elegíveis (temp: sem filtro de inquilino para debug)
  const activeTenantId = tenantId || 'c_default';
  const eligibleUsers = users.filter(u => {
    // Retorna todos os usuários elegíveis baseado na role
    const roleMatches = requiredRole === 'any' || (requiredRole === 'admin' && u.role === 'admin') || (requiredRole === 'collaborator' && u.role === 'collaborator');
    console.log(`Debug User Filter (No Tenant): ${u.nome} (ID: ${u.id}, Tenant: ${u.tenantId}) - MatchesRole: ${roleMatches}`);
    return roleMatches;
  });

  // Define um usuário padrão se houver elegíveis para evitar campo em branco
  useEffect(() => {
    if (eligibleUsers.length > 0) {
      setSelectedUserId(eligibleUsers[0].id);
    } else {
      setSelectedUserId('');
    }
  }, [users, requiredRole, tenantId]);

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    setAddUserSuccess(null);

    const name = newUserName.trim();
    const username = newUserUsername.trim().toLowerCase().replace(/\s+/g, '');
    const pass = newUserPassword.trim();

    if (!name || !username || !pass) {
      setAddUserError('⚠️ Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (pass.length < 4) {
      setAddUserError('⚠️ A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    // Verificar se já existe usuário com o mesmo username
    if (users.some(u => u.username === username)) {
      setAddUserError(`⚠️ O nome de usuário "${username}" já está em uso.`);
      return;
    }

    const newUserId = 'u_' + Date.now();
    const newUser: UserAccount = {
      id: newUserId,
      nome: name,
      username: username,
      senha: pass,
      role: newUserRole as any,
      tenantId: tenantId || 'c_default'
    };

    if (onAddUser) {
      onAddUser(newUser);
    }

    setAddUserSuccess('✅ Usuário cadastrado com sucesso!');
    
    // Seleciona automaticamente o novo usuário e retorna à tela de login após um breve delay
    setTimeout(() => {
      setSelectedUserId(newUserId);
      setShowAddUserForm(false);
      // Limpar campos
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('admin');
      setAddUserSuccess(null);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = password.trim();

    if (devPassword && cleanPass === devPassword) {
      onLogin('developer', {
        id: 'u_developer',
        username: 'desenvolvedor',
        nome: 'Desenvolvedor do Sistema',
        senha: devPassword,
        role: 'developer'
      });
      return;
    }

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

      if (requiredRole === 'admin' && match.role !== 'admin') {
        setError('⚠️ Este painel é restrito para Administradores. Seu perfil é Colaborador.');
        return;
      }

      onLogin(match.role, match);
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
          {showAddUserForm ? (
            <div className="space-y-4 animate-fade-in" id="add-user-form-container">
              <div className="flex items-center gap-2 border-b border-rose-50 pb-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserForm(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-rose-500" /> Cadastrar Novo Usuário
                </h4>
              </div>

              <form onSubmit={handleAddUserSubmit} className="space-y-3" id="frm-add-user-lockscreen">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cristiano Lemos"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2 px-3 font-semibold text-slate-850 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Nome de Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: cristianolemos"
                    value={newUserUsername}
                    onChange={e => setNewUserUsername(e.target.value)}
                    className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2 px-3 font-semibold text-slate-850 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Senha de Acesso</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2 px-3 font-mono font-bold text-slate-850 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Cargo / Perfil</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserRole('admin')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer pointer-events-auto ${
                        newUserRole === 'admin'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-3xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Administrador
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserRole('collaborator')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer pointer-events-auto ${
                        newUserRole === 'collaborator'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-3xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Colaborador
                    </button>
                  </div>
                </div>

                {/* Info do Inquilino que receberá o usuário */}
                <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl text-[10px] text-rose-700 font-medium flex items-center gap-1.5 leading-tight">
                  <Shield className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Este usuário será vinculado ao cliente ativo: <strong className="font-extrabold">{companyName || 'Doce Sabor Financeiro'}</strong></span>
                </div>

                {addUserError && (
                  <div className="p-2 bg-red-50 rounded-xl border border-red-100 flex items-start gap-1.5 text-[11px] text-red-700 animate-bounce">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{addUserError}</span>
                  </div>
                )}

                {addUserSuccess && (
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-1.5 text-[11px] text-emerald-700 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{addUserSuccess}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer pointer-events-auto"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md cursor-pointer pointer-events-auto"
                  >
                    Salvar Usuário
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
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
                      {eligibleUsers.length === 0 ? (
                        <option value="" disabled>
                          Nenhum usuário cadastrado neste cliente
                        </option>
                      ) : (
                        eligibleUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.nome} ({u.role === 'admin' ? 'Admin' : 'Colaborador'})
                          </option>
                        ))
                      )}
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

                {onAddUser && (
                  <div className="flex justify-center pt-2 border-t border-dashed border-rose-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserForm(true);
                        setAddUserError(null);
                        setAddUserSuccess(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer pointer-events-auto"
                    >
                      <UserPlus className="w-4 h-4 animate-pulse" /> Criar Novo Usuário
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
