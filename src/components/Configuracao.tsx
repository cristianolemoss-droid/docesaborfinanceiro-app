import React, { useState } from 'react';
import { CompanyConfig, UserAccount } from '../types';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Building, 
  Phone, 
  MapPin, 
  Mail, 
  Sparkles, 
  FileText, 
  Save, 
  X,
  CreditCard,
  User,
  Shield,
  Key,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfiguracaoProps {
  companies: CompanyConfig[];
  onAddCompany: (company: CompanyConfig) => void;
  onUpdateCompany: (company: CompanyConfig) => void;
  onDeleteCompany: (id: string) => void;
  onSelectActiveCompany: (id: string) => void;
  
  users: UserAccount[];
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;

  devPassword?: string;
  onUpdateDevPassword?: (newPass: string) => void;
  onShowInstallModal: () => void;
}

export default function Configuracao({
  companies,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onSelectActiveCompany,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  devPassword = 'Cris@551866',
  onUpdateDevPassword
}: ConfiguracaoProps) {
  // Controle de seção ativa
  const [configSection, setConfigSection] = useState<'empresa' | 'usuarios' | 'desenvolvedor'>('empresa');

  // Form states - Desenvolvedor
  const [newDevPass, setNewDevPass] = useState(devPassword);
  const [devPassSuccessMsg, setDevPassSuccessMsg] = useState<string | null>(null);

  // Form states - Empresa
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [email, setEmail] = useState('');
  const [slogan, setSlogan] = useState('');

  // UI Error list - Empresa
  const [formError, setFormError] = useState<string | null>(null);

  // Form states - Usuários
  const [userNome, setUserNome] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userSenha, setUserSenha] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'collaborator'>('collaborator');
  const [userEditingId, setUserEditingId] = useState<string | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  const resetForm = () => {
    setNomeFantasia('');
    setRazaoSocial('');
    setCnpj('');
    setTelefone('');
    setEndereco('');
    setEmail('');
    setSlogan('');
    setEditingId(null);
    setIsEditing(false);
    setFormError(null);
  };

  const resetUserForm = () => {
    setUserNome('');
    setUserUsername('');
    setUserSenha('');
    setUserRole('collaborator');
    setUserEditingId(null);
    setIsEditingUser(false);
    setUserFormError(null);
  };

  const handleEditUserClick = (u: UserAccount) => {
    setUserEditingId(u.id);
    setUserNome(u.nome);
    setUserUsername(u.username);
    setUserSenha(u.senha);
    setUserRole(u.role);
    setIsEditingUser(true);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    const cleanUsername = userUsername.trim().toLowerCase();

    if (!userNome.trim() || !cleanUsername || !userSenha.trim()) {
      setUserFormError('Todos os campos (Nome, Login e Senha) são obrigatórios!');
      return;
    }

    if (users.some(u => u.id !== userEditingId && u.username === cleanUsername)) {
      setUserFormError('⚠️ Já existe um usuário cadastrado com este Login!');
      return;
    }

    const userData: UserAccount = {
      id: userEditingId || 'user_' + Math.random().toString(36).substr(2, 9),
      nome: userNome.trim(),
      username: cleanUsername,
      senha: userSenha.trim(),
      role: userRole,
      tenantId: userEditingId 
        ? (users.find(u => u.id === userEditingId)?.tenantId || activeCompany?.id || 'c_default') 
        : (activeCompany?.id || 'c_default')
    };

    if (userEditingId) {
      onUpdateUser(userData);
    } else {
      onAddUser(userData);
    }

    resetUserForm();
  };


  const handleEditClick = (company: CompanyConfig) => {
    setEditingId(company.id);
    setNomeFantasia(company.nomeFantasia);
    setRazaoSocial(company.razaoSocial);
    setCnpj(company.cnpj);
    setTelefone(company.telefone);
    setEndereco(company.endereco);
    setEmail(company.email);
    setSlogan(company.slogan);
    setIsEditing(true);
  };

  // Helper CNPJ, Telefone formatter masks
  const formatCNPJ = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 14) {
      return raw
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return val;
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 11) {
      if (raw.length > 10) {
        return raw.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return raw.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return val;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nomeFantasia.trim()) {
      setFormError('Por favor, defina o Nome Fantasia da empresa.');
      return;
    }

    if (companies.some(c => c.id !== editingId && c.nomeFantasia.toLowerCase() === nomeFantasia.toLowerCase().trim())) {
      setFormError('⚠️ Já existe uma empresa cadastrada com esse Nome Fantasia!');
      return;
    }

    const companyData: CompanyConfig = {
      id: editingId || 'comp_' + Math.random().toString(36).substr(2, 9),
      nomeFantasia: nomeFantasia.trim(),
      razaoSocial: razaoSocial.trim() || nomeFantasia.trim() + ' Ltda',
      cnpj: cnpj.trim() || 'Sem CNPJ',
      telefone: telefone.trim() || 'Sem Telefone',
      endereco: endereco.trim() || 'Sem Endereço',
      email: email.trim() || 'Sem E-mail',
      slogan: slogan.trim() || 'Gerenciando com Sabor e Qualidade!',
      ativo: editingId ? (companies.find(c => c.id === editingId)?.ativo || false) : (companies.length === 0)
    };

    if (editingId) {
      onUpdateCompany(companyData);
    } else {
      onAddCompany(companyData);
    }

    resetForm();
  };

  // Filtro de usuários por cliente ativo
  const [filterByActiveCompany, setFilterByActiveCompany] = useState(true);

  const activeCompany = companies.find(c => c.ativo);

  const displayedUsers = users.filter(u => {
    if (!filterByActiveCompany) return true;
    const activeId = activeCompany?.id || 'c_default';
    if (!u.tenantId) {
      // Usuários padrão do sistema ou sem tenant são exibidos em todos os clientes
      return activeId === 'c_default' || u.id === 'u_admin' || u.id === 'u_colab';
    }
    return u.tenantId === activeId;
  });

  return (
    <div className="space-y-6" id="config-panel-wrapper">
      {/* Sub-header navigation tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-rose-100 pb-2 gap-3" id="toggle-config-subtabs-container">
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0" id="toggle-config-subtabs">
          <button
            onClick={() => setConfigSection('empresa')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              configSection === 'empresa'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Building className="w-4 h-4" /> Dados da Empresa
          </button>
          <button
            onClick={() => setConfigSection('usuarios')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              configSection === 'usuarios'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <User className="w-4 h-4" /> Usuários e Senhas
          </button>
          <button
            onClick={() => setConfigSection('desenvolvedor')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              configSection === 'desenvolvedor'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Senha do Desenvolvedor
          </button>
        </div>

        {activeCompany && (
          <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-150 px-3.5 py-1.5 rounded-xl shadow-3xs shrink-0 self-start md:self-auto animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              Cliente Ativo: <strong className="text-rose-600 font-extrabold">{activeCompany.nomeFantasia}</strong>
            </span>
          </div>
        )}
      </div>

      {configSection === 'empresa' && (
        <>
          {/* Top Description Board */}
          <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-xs flex flex-col md:flex-row items-add-new items-start md:items-center justify-between gap-4 font-sans" id="config-overview-header">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </span>
                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Configuração de Perfis</div>
              </div>
              <h2 className="text-xl font-bold text-slate-950 font-serif leading-none mt-2">Dados da Empresa • Multi-Inquilino</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Configure as informações completas da empresa que utilizará este sistema. Você pode cadastrar múltiplos perfis empresariais e alternar o controle ativo para re-utilizar o ERP no balcão que desejar. Os cabeçalhos e o cupom de vendas (recibo) herdam instantaneamente os dados cadastrados.
              </p>
            </div>

            {!isEditing && (
              <button
                onClick={() => {
                  resetForm();
                  setIsEditing(true);
                }}
                id="btn-add-new-company"
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer pointer-events-auto"
              >
                <Plus className="w-4 h-4" /> Cadastrar Empresa
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
            
            {/* Left Side: Dynamic Form (Visible when isEditing is True) */}
            {isEditing ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-7 bg-white p-6 rounded-3xl border border-rose-100 shadow-md space-y-4"
                id="company-form-container"
              >
                <div className="flex items-center justify-between border-b pb-3 mb-2">
                  <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500" />
                    {editingId ? 'Editar Perfil da Empresa' : 'Cadastrar Perfil Comercial'}
                  </h3>
                  <button 
                    onClick={resetForm}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" id="company-config-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome Fantasia */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Nome Fantasia <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Doce Sabor Confeitaria"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition"
                        value={nomeFantasia}
                        onChange={e => setNomeFantasia(e.target.value)}
                      />
                    </div>

                    {/* Razão Social */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Razão Social</label>
                      <input
                        type="text"
                        placeholder="Ex: Doce Sabor Alimentos Ltda."
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition"
                        value={razaoSocial}
                        onChange={e => setRazaoSocial(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* CNPJ */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">CNPJ</label>
                      <input
                        type="text"
                        placeholder="00.000.000/0001-00"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold font-mono text-slate-850 transition"
                        value={cnpj}
                        onChange={e => setCnpj(formatCNPJ(e.target.value))}
                      />
                    </div>

                    {/* Telefone */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Telefone</label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold font-mono text-slate-850 transition"
                        value={telefone}
                        onChange={e => setTelefone(formatPhone(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">E-mail Comercial</label>
                      <input
                        type="email"
                        placeholder="contato@docesabor.com.br"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>

                    {/* Slogan */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Slogan ou Mensagem no Cupom</label>
                      <input
                        type="text"
                        placeholder="O melhor sabor da vida para você!"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition"
                        value={slogan}
                        onChange={e => setSlogan(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">Endereço Completo</label>
                    <input
                      type="text"
                      placeholder="Rua das Rosas, 123 - Centro, São Paulo - SP"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition"
                      value={endereco}
                      onChange={e => setEndereco(e.target.value)}
                    />
                  </div>

                  {/* Submit panel */}
                  <div className="flex gap-2 justify-end pt-3 border-t">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer pointer-events-auto transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer pointer-events-auto transition shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar Alterações
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-rose-100 shadow-xs space-y-4 text-center py-10">
                <Building className="w-12 h-12 text-rose-350 mx-auto animate-pulse" />
                <h3 className="text-base font-bold text-slate-800 font-serif">Nenhum formulário ativo</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Selecione "Cadastrar Empresa" ou clique em "Editar" de um perfil existente na lista ao lado para alterar os dados da empresa.
                </p>
              </div>
            )}

            {/* Right Side: Registered Companies List */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Empresas Cadastradas ({companies.length})</h3>

              <div className="space-y-3" id="companies-deck">
                {companies.map(company => (
                  <div 
                    key={company.id}
                    className={`p-4 rounded-2xl border transition-all relative ${
                      company.ativo 
                        ? 'bg-rose-50/20 border-rose-300 ring-1 ring-rose-250 shadow-sm' 
                        : 'bg-white hover:bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    {/* Active Indicator Pin */}
                    {company.ativo && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full border border-white flex items-center gap-0.5 shadow-sm">
                        <CheckCircle className="w-2.5 h-2.5" /> ATIVA
                      </span>
                    )}

                    <div className="space-y-3 text-slate-900">
                      {/* Top line with buttons */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                            <Building className={`w-4 h-4 ${company.ativo ? 'text-rose-500' : 'text-slate-400'}`} />
                            {company.nomeFantasia}
                          </h4>
                          <p className="text-[10px] text-slate-450 italic font-medium">"{company.slogan}"</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditClick(company)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-850 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                            title="Editar Informações"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {companies.length > 1 && (
                            <button
                              onClick={() => {
                                if (company.ativo) {
                                  alert('⚠️ Ative outra empresa antes de poder excluir esta empresa ativa!');
                                  return;
                                }
                                if (window.confirm(`Tem certeza que gostaria de excluir permanentemente o cadastro da empresa "${company.nomeFantasia}"?`)) {
                                  onDeleteCompany(company.id);
                                }
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                              title="Excluir Perfil comercial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Company credentials layout */}
                      <div className="space-y-1.5 text-slate-600 border-t border-dashed border-slate-100 pt-2.5 text-[11px] font-medium leading-normal">
                        <div className="flex items-center gap-1.5 text-slate-650">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span><strong>Razão:</strong> {company.razaoSocial}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-650">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span><strong>CNPJ:</strong> {company.cnpj}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-650">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span><strong>Tel:</strong> {company.telefone}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-650">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span><strong>E-mail:</strong> {company.email}</span>
                        </div>

                        <div className="flex items-start gap-1.5 text-slate-650">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span><strong>Endereço:</strong> {company.endereco}</span>
                        </div>
                      </div>

                      {/* Set active profile action button */}
                      {!company.ativo && (
                        <div className="pt-2">
                          <button
                            onClick={() => onSelectActiveCompany(company.id)}
                            className="w-full py-1.5 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-250 text-slate-600 hover:text-rose-750 text-xs font-bold rounded-xl cursor-pointer pointer-events-auto transition flex items-center justify-center gap-1 shadow-3xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Ativar este perfil comercial
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Corporate visual mockup banner */}
          {activeCompany && (
            <div className="bg-rose-50/25 p-5 rounded-3xl border border-rose-100 flex items-center justify-between gap-4 font-sans">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  <span>Simulação de Cupom Conectado:</span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
                  Vá para o <strong>Caixa / PDV</strong> e finalize uma venda. O cupom de faturamento herda automaticamente:
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px] text-rose-900 font-bold">
                  <span className="bg-white px-2 py-0.5 rounded-md border border-rose-150">{activeCompany.nomeFantasia}</span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-rose-150">CNPJ: {activeCompany.cnpj}</span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-rose-150">Endereço: {activeCompany.endereco}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {configSection === 'usuarios' && (
        <div className="space-y-6" id="usuarios-config-wrapper">
          {/* Top Description Board for Users */}
          <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans" id="users-overview-header">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                  <User className="w-5 h-5" />
                </span>
                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Configuração de Perfis</div>
              </div>
              <h2 className="text-xl font-bold text-slate-950 font-serif leading-none mt-2">Usuários e Senhas do Sistema</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Gerencie as credenciais dos operadores e administradores locais do ERP. Adicione novos colaboradores da confeitaria ou altere senhas de acesso aos cofres financeiros.
              </p>
            </div>

            {!isEditingUser && (
              <button
                onClick={() => {
                  resetUserForm();
                  setIsEditingUser(true);
                }}
                id="btn-add-new-user"
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer pointer-events-auto"
              >
                <Plus className="w-4 h-4" /> Cadastrar Novo Usuário
              </button>
            )}
          </div>

          {activeCompany && (
            <div className="bg-rose-50/40 border border-rose-150 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-sans shadow-3xs animate-fade-in" id="active-tenant-users-vault-badge">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 block">Cofre de Segurança • Filtro Ativo</span>
                  <span className="text-sm font-black text-slate-850 flex items-center gap-1.5">
                    🏢 {activeCompany.nomeFantasia}
                    <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md font-bold">Inquilino ID: {activeCompany.id}</span>
                  </span>
                </div>
              </div>
              <div className="bg-rose-100/40 border border-rose-200/40 rounded-xl py-1.5 px-3 text-rose-850 text-xs font-bold flex items-center gap-1.5 self-start md:self-auto">
                <Shield className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                <span>O cofre está exibindo e gravando senhas exclusivamente para este cliente.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
            {/* Left Side: Dynamic User Form */}
            {isEditingUser ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-7 bg-white p-6 rounded-3xl border border-rose-100 shadow-md space-y-4"
                id="user-form-container"
              >
                <div className="flex items-center justify-between border-b pb-3 mb-2">
                  <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500" />
                    {userEditingId ? 'Editar Usuário / Senha' : 'Cadastrar Operador'}
                  </h3>
                  <button 
                    onClick={resetUserForm}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {userFormError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                    <span>{userFormError}</span>
                  </div>
                )}

                <form onSubmit={handleUserSubmit} className="space-y-4" id="user-config-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome Completo */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Nome Completo <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Amanda Silva"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition"
                        value={userNome}
                        onChange={e => setUserNome(e.target.value)}
                      />
                    </div>

                    {/* Nível de Acesso (Role) */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Perfil de Acesso <span className="text-red-500">*</span></label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 transition cursor-pointer"
                        value={userRole}
                        onChange={e => setUserRole(e.target.value as 'admin' | 'collaborator')}
                      >
                        <option value="collaborator">Colaborador (Caixa, Vendas, Estoque básico)</option>
                        <option value="admin">Administrador (Gestão, Relatório Lucro/Perdas, Configurações)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Login Username */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Login de Acesso (Username) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: amanda.caixa"
                        disabled={userEditingId === 'u_admin' || userEditingId === 'u_colab'} // protege login padrão
                        className="w-full bg-slate-50 disabled:opacity-65 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold font-mono text-slate-850 transition"
                        value={userUsername}
                        onChange={e => setUserUsername(e.target.value)}
                      />
                    </div>

                    {/* Senha */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">Senha Comercial (PIN / Texto) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Informe a identificação / senha"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2 px-3 text-xs font-semibold font-mono text-slate-850 transition"
                        value={userSenha}
                        onChange={e => setUserSenha(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cliente / Tenant (Inquilino) */}
                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-150/40">
                    <label className="text-xs font-bold text-slate-600 block">Vincular ao Cliente <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        disabled // Força a vinculação automática com o cliente ativo no momento para evitar inconsistência
                        className="w-full bg-slate-100 border border-slate-250/50 rounded-xl py-2 px-3 text-xs font-semibold text-slate-500 cursor-not-allowed appearance-none"
                        value={activeCompany?.id || 'c_default'}
                      >
                        <option value={activeCompany?.id || 'c_default'}>
                          🏢 {activeCompany?.nomeFantasia || 'Cliente Padrão'}
                        </option>
                      </select>
                      <span className="absolute right-3 top-2 text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-150">
                        Vinculação Automática
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Este novo operador será cadastrado e associado de forma permanente ao cliente ativo no momento.
                    </p>
                  </div>

                  {/* Submit panel */}
                  <div className="flex gap-2 justify-end pt-3 border-t">
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer pointer-events-auto transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer pointer-events-auto transition shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar Usuário
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-rose-100 shadow-xs space-y-4 text-center py-10">
                <User className="w-12 h-12 text-rose-350 mx-auto animate-pulse" />
                <h3 className="text-base font-bold text-slate-800 font-serif">Nenhum Formulário de Usuário Ativo</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Clique em "Cadastrar Novo Usuário" ou no botão de edição de usuário correspondente ao lado para alterar dados cadastrais.
                </p>
              </div>
            )}

            {/* Right Side: List of Users */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  {filterByActiveCompany ? 'Usuários do Cliente' : 'Todos os Usuários'} ({displayedUsers.length})
                </h3>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterByActiveCompany}
                    onChange={(e) => setFilterByActiveCompany(e.target.checked)}
                    className="rounded-sm border-slate-300 text-rose-500 focus:ring-rose-500 cursor-pointer h-3.5 w-3.5"
                  />
                  Filtrar Ativo
                </label>
              </div>

              {displayedUsers.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500 space-y-3">
                  <div>
                    <p className="text-xs font-bold">Nenhum usuário cadastrado.</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Todos os novos usuários cadastrados serão associados automaticamente a <strong>{activeCompany?.nomeFantasia || 'este cliente'}</strong>.
                    </p>
                  </div>
                  {!isEditingUser && (
                    <button
                      onClick={() => {
                        resetUserForm();
                        setIsEditingUser(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-all shadow-3xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Criar Primeiro Usuário
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3" id="users-deck">
                  {displayedUsers.map(u => (
                    <div 
                      key={u.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all relative overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                              <Shield className={`w-4 h-4 ${u.role === 'admin' ? 'text-amber-500' : 'text-blue-500'}`} />
                              {u.nome}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md ${
                                u.role === 'admin' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                {u.role === 'admin' ? 'Admin' : 'Colaborador'}
                              </span>
                              {u.tenantId && (
                                <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.5 rounded-md">
                                  {companies.find(c => c.id === u.tenantId)?.nomeFantasia || u.tenantId}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditUserClick(u)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-850 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                              title="Editar Usuário"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {users.length > 2 && ( // Garante que nunca delete todos os usuários e mantenha os perfis funcionais
                              <button
                                onClick={() => {
                                  if (u.id === 'u_admin') {
                                    alert('⚠️ O usuário de Administrador Padrão não pode ser excluído por razões de auditoria.');
                                    return;
                                  }
                                  if (window.confirm(`Gostaria de excluir permanentemente o cadastro do usuário "${u.nome}"?`)) {
                                    onDeleteUser(u.id);
                                  }
                                }}
                                className="p-1.5 bg-slate-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-dashed border-slate-100 pt-2 text-[11px] space-y-1 font-medium text-slate-600 leading-normal">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span><strong>Login:</strong> <span className="font-mono bg-slate-100 px-1 py-0.2 rounded-sm">{u.username}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span><strong>Senha:</strong> <span className="font-mono bg-slate-100 px-1 py-0.2 rounded-sm">{u.senha}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {configSection === 'desenvolvedor' && (
        <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-xs max-w-2xl space-y-6 font-sans">
          <div className="flex items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-serif">Senha de Desenvolvedor</h3>
                <p className="text-xs text-slate-500">Altere a senha que dá acesso total e irrestrito a todo o sistema, sobrepassando restrições.</p>
              </div>
            </div>
            <button
              onClick={onShowInstallModal}
              className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm pointer-events-auto cursor-pointer"
            >
              <Smartphone className="w-4 h-4" /> Instalar App
            </button>
          </div>

          {devPassSuccessMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-100 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{devPassSuccessMsg}</span>
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newDevPass.trim().length < 4) {
                alert('A senha de desenvolvedor deve ter no mínimo 4 caracteres.');
                return;
              }
              if (onUpdateDevPassword) {
                onUpdateDevPassword(newDevPass.trim());
                setDevPassSuccessMsg('✅ Senha de Desenvolvedor atualizada com sucesso!');
                setTimeout(() => setDevPassSuccessMsg(null), 4000);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Nova Senha de Desenvolvedor</label>
              <input
                type="text"
                required
                placeholder="Defina a senha de desenvolvedor"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-300 rounded-xl py-2.5 px-3.5 text-xs font-bold font-mono text-slate-800 transition"
                value={newDevPass}
                onChange={e => setNewDevPass(e.target.value)}
              />
              <p className="text-[10px] text-slate-450 leading-relaxed mt-1">
                ⚠️ Guarde esta senha com cuidado. Com ela, você pode acessar e configurar qualquer inquilino/empresa sem necessitar das credenciais dos usuários locais do cliente.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm pointer-events-auto cursor-pointer"
              >
                <Save className="w-4 h-4" /> Atualizar Senha de Desenvolvedor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
