import React, { useState, useEffect } from 'react';
import { 
  Building, 
  UserPlus, 
  Users, 
  Key, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Globe, 
  Plus, 
  ShieldAlert,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { UserAccount } from '../types';
import { 
  registerTenantInSupabase, 
  registerProfileInSupabase, 
  fetchTenantsFromSupabase, 
  fetchProfilesFromSupabase,
  getActiveTenantId,
  setActiveTenantId,
  deleteTenantFromSupabase,
  deleteProfileFromSupabase
} from '../utils/supabaseDb';

interface MultiTenantManagerProps {
  onAddUserLocal: (user: UserAccount) => void;
  users: UserAccount[];
  supabaseConnected: boolean;
  userRole: 'admin' | 'collaborator' | 'developer' | null;
}

export default function MultiTenantManager({ onAddUserLocal, users, supabaseConnected, userRole }: MultiTenantManagerProps) {
  // Lists
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Form states - Tenant (Cliente)
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [copyCatalogFrom, setCopyCatalogFrom] = useState('none');
  const [tenantStatus, setTenantStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states - Profile (Usuário)
  const [newProfileNome, setNewProfileNome] = useState('');
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [newProfileSenha, setNewProfileSenha] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<'admin' | 'collaborator'>('collaborator');
  const [newProfileTenantId, setNewProfileTenantId] = useState('');
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active session tenant
  const [activeTenant, setActiveTenant] = useState('tenant_default');
  const [loading, setLoading] = useState(false);

  // Load Tenants and Profiles on mount or when connection status changes
  const loadData = async () => {
    if (!supabaseConnected) return;
    setLoading(true);
    try {
      const tList = await fetchTenantsFromSupabase();
      const pList = await fetchProfilesFromSupabase();
      
      setTenants(tList);
      setProfiles(pList);

      // Pre-select active tenant in form if available
      const currentActive = getActiveTenantId();
      if (tList.some(t => t.id === currentActive)) {
        setNewProfileTenantId(currentActive);
      } else if (tList.length > 0) {
        setNewProfileTenantId(tList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveTenant(getActiveTenantId());
    if (supabaseConnected) {
      loadData();
    }
  }, [supabaseConnected]);

  const handleSwitchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setActiveTenant(tenantId);
    // Reload page to apply changes in real-time or trigger app refresh
    alert(`⚡ Inquilino ativo alterado para [${tenantId}]! O sistema agora operará sob esta partição do banco de dados.`);
    window.location.reload();
  };

  const handleSaveTenant = () => {
    localStorage.setItem('saved_active_tenant_id', activeTenant);
    alert(`✅ Inquilino [${activeTenant}] salvo como padrão para esta máquina!`);
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantStatus(null);

    const cleanId = newTenantId.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanName = newTenantName.trim();

    if (!cleanId || !cleanName) {
      setTenantStatus({ type: 'error', message: 'Preencha todos os campos do Cliente/Inquilino.' });
      return;
    }

    setLoading(true);
    const res = await registerTenantInSupabase(cleanId, cleanName, copyCatalogFrom);
    setLoading(false);

    if (res.success) {
      let successMsg = `Cliente "${cleanName}" cadastrado com sucesso no Supabase!`;
      if (copyCatalogFrom !== 'none') {
        successMsg += ` Catálogo de produtos copiado com estoque zerado e sem valores.`;
      }
      setTenantStatus({ type: 'success', message: successMsg });
      setNewTenantId('');
      setNewTenantName('');
      setCopyCatalogFrom('none');
      loadData();
    } else {
      setTenantStatus({ type: 'error', message: `Erro ao cadastrar Cliente: ${res.error || 'Erro desconhecido'}` });
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!window.confirm(`⚠️ Tem certeza de que deseja EXCLUIR o cliente "${tenantName}"? \n\nEsta ação apagará permanentemente o inquilino, todas as suas contas de usuários, produtos em estoque, registros de perdas, transações financeiras e histórico de vendas vinculados a este cliente no Supabase.`)) {
      return;
    }

    setLoading(true);
    const res = await deleteTenantFromSupabase(tenantId);
    setLoading(false);

    if (res.success) {
      alert(`✅ Cliente "${tenantName}" e todas as suas dependências foram excluídos com sucesso!`);
      if (activeTenant === tenantId) {
        setActiveTenantId('tenant_default');
        setActiveTenant('tenant_default');
        window.location.reload();
      } else {
        loadData();
      }
    } else {
      alert(`❌ Erro ao excluir cliente: ${res.error || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (profileId === 'u_admin' || profileId === 'u_colab') {
      alert('⚠️ Usuários padrão do sistema não podem ser excluídos por razões de segurança.');
      return;
    }
    if (!window.confirm(`⚠️ Tem certeza de que deseja EXCLUIR o usuário "${profileName}" do Supabase?`)) {
      return;
    }

    setLoading(true);
    const res = await deleteProfileFromSupabase(profileId);
    setLoading(false);

    if (res.success) {
      alert(`✅ Usuário "${profileName}" excluído do Supabase com sucesso!`);
      loadData();
    } else {
      alert(`❌ Erro ao excluir usuário: ${res.error || 'Erro desconhecido'}`);
    }
  };

  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);

    const cleanNome = newProfileNome.trim();
    const cleanUsername = newProfileUsername.trim().toLowerCase();
    const cleanSenha = newProfileSenha.trim();

    if (!cleanNome || !cleanUsername || !cleanSenha || !newProfileTenantId) {
      setProfileStatus({ type: 'error', message: 'Preencha todos os campos do usuário.' });
      return;
    }

    // Save locally first to allow lockscreen login
    const localUser: UserAccount = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      nome: cleanNome,
      username: cleanUsername,
      senha: cleanSenha,
      role: newProfileRole,
      tenantId: newProfileTenantId
    };

    onAddUserLocal(localUser);

    setLoading(true);
    const res = await registerProfileInSupabase(
      localUser.id,
      cleanUsername,
      cleanNome,
      newProfileRole,
      newProfileTenantId,
      cleanSenha
    );
    setLoading(false);

    if (res.success) {
      setProfileStatus({ 
        type: 'success', 
        message: `Usuário "${cleanNome}" registrado no Supabase e vinculado ao inquilino com sucesso!` 
      });
      setNewProfileNome('');
      setNewProfileUsername('');
      setNewProfileSenha('');
      loadData();
    } else {
      setProfileStatus({ type: 'error', message: `Erro ao criar perfil no Supabase: ${res.error || 'Erro desconhecido'}` });
    }
  };

  return (
    <div className="bg-white border border-rose-100 rounded-3xl p-5 space-y-6 shadow-xs font-sans" id="multi-tenant-manager-root">
      <div className="flex items-center justify-between border-b border-rose-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-rose-500 animate-spin" style={{ animationDuration: '4s' }} />
            Gerenciamento de Clientes (Multi-Tenancy SaaS)
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cadastre novos clientes (inquilinos) e perfis para testar o isolamento de Row-Level Security (RLS) no Supabase.
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={!supabaseConnected || loading}
          className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-all"
        >
          {loading ? 'Carregando...' : '🔄 Recarregar'}
        </button>
      </div>

      {!supabaseConnected && (
        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-150 flex items-start gap-2 text-xs text-rose-700 animate-pulse">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Supabase Desconectado ou Chaves Padrão</p>
            <p className="text-[11px] mt-0.5 leading-relaxed">
              O gerenciador multi-tenancy requer conexão ativa com o seu cluster Supabase. Preencha as chaves válidas e conecte para começar a registrar novos inquilinos.
            </p>
          </div>
        </div>
      )}

      {/* Active Tenant Selector */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Inquilino Ativo na Sessão:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-rose-700">
              {tenants.find(t => t.id === activeTenant)?.name || activeTenant}
            </span>
            <span className="text-xs font-mono bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">
              ID: {activeTenant}
            </span>
          </div>
          <p className="text-[10px] text-slate-450 leading-relaxed">
            As novas vendas, insumos, perdas e transações criadas neste navegador serão marcadas e isoladas com este <strong>tenant_id</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <label className="text-xs font-bold text-slate-600 uppercase shrink-0">Mudar para:</label>
          <select 
            value={activeTenant}
            onChange={(e) => handleSwitchTenant(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2 py-1.5 font-bold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="tenant_default">Padrão (tenant_default)</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.id})
              </option>
            ))}
          </select>
          {userRole === 'admin' && (
            <button
              onClick={handleSaveTenant}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition-all shadow-3xs cursor-pointer"
            >
              Salvar Padrão
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Register Tenant Form */}
        <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-200">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-600" />
            <h5 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">1. Cadastrar Novo Cliente (Tenant)</h5>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Cria uma nova organização independente no banco de dados.
          </p>

          <form onSubmit={handleRegisterTenant} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Identificador Único (ID do Cliente)</label>
              <input 
                type="text"
                placeholder="Ex: padaria_doce_sonho"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                disabled={!supabaseConnected}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Fantasia / Razão</label>
              <input 
                type="text"
                placeholder="Ex: Confeitaria Doce Sonho Ltda"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                disabled={!supabaseConnected}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Copiar Catálogo de Produtos de:</label>
              <select 
                value={copyCatalogFrom}
                onChange={(e) => setCopyCatalogFrom(e.target.value)}
                disabled={!supabaseConnected || loading}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs cursor-pointer"
              >
                <option value="none">Nenhum (Começar com catálogo vazio)</option>
                <option value="tenant_default">Padrão (tenant_default)</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                💡 Copia os produtos (nomes, categorias, unidades, estoque mínimo e imagens) de outro cliente, mas com <strong>estoque zerado</strong> e <strong>sem preços ou custos</strong> para personalização própria!
              </p>
            </div>

            {tenantStatus && (
              <div className={`p-2 rounded-xl text-xs flex items-start gap-1.5 border ${
                tenantStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                {tenantStatus.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />}
                <span className="text-[10px]">{tenantStatus.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!supabaseConnected || loading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold py-1.5 rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar Cliente
            </button>
          </form>
        </div>

        {/* Register Profile Form */}
        <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-200">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <h5 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">2. Cadastrar Novo Usuário (Profile)</h5>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Cria uma nova conta de acesso associada a um de seus Clientes.
          </p>

          <form onSubmit={handleRegisterProfile} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Nome Completo</label>
                <input 
                  type="text"
                  placeholder="Ex: Carlos Mestre"
                  value={newProfileNome}
                  onChange={(e) => setNewProfileNome(e.target.value)}
                  disabled={!supabaseConnected}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Username (Login)</label>
                <input 
                  type="text"
                  placeholder="Ex: carlos"
                  value={newProfileUsername}
                  onChange={(e) => setNewProfileUsername(e.target.value)}
                  disabled={!supabaseConnected}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Senha</label>
                <input 
                  type="password"
                  placeholder="Senha"
                  value={newProfileSenha}
                  onChange={(e) => setNewProfileSenha(e.target.value)}
                  disabled={!supabaseConnected}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Cargo / Perfil</label>
                <select 
                  value={newProfileRole}
                  onChange={(e) => setNewProfileRole(e.target.value as any)}
                  disabled={!supabaseConnected}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
                >
                  <option value="collaborator">Colaborador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Vincular ao Cliente (Tenant)</label>
              <select 
                value={newProfileTenantId}
                onChange={(e) => setNewProfileTenantId(e.target.value)}
                disabled={!supabaseConnected || tenants.length === 0}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-3xs"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
                {tenants.length === 0 && <option value="">Sem clientes cadastrados ainda</option>}
              </select>
            </div>

            {profileStatus && (
              <div className={`p-2.5 rounded-xl text-xs flex flex-col gap-1.5 border ${
                profileStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                <div className="flex items-start gap-1.5">
                  {profileStatus.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />}
                  <span className="text-[10.5px] font-semibold">{profileStatus.message}</span>
                </div>
                
                {profileStatus.type === 'error' && (profileStatus.message.toLowerCase().includes('senha') || profileStatus.message.toLowerCase().includes('column') || profileStatus.message.toLowerCase().includes('schema cache')) && (
                  <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[9.5px] leading-relaxed space-y-2 border border-slate-950">
                    <p className="text-amber-400 font-sans font-extrabold uppercase tracking-wide">
                      ⚠️ SOLUÇÃO DO PROBLEMA:
                    </p>
                    <p className="text-slate-300 font-sans">
                      A tabela de usuários (<code className="text-rose-300">perfis</code>) no seu Supabase foi criada antes de adicionarmos o suporte a senhas, ou o cache de esquemas do Supabase está desatualizado.
                    </p>
                    <p className="text-slate-300 font-sans">
                      Para consertar isso em 10 segundos, faça o seguinte:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-300 font-sans">
                      <li>Abra o menu <strong className="text-white">SQL Editor</strong> no painel esquerdo do seu site do Supabase.</li>
                      <li>Crie uma nova consulta (New Query), cole os comandos abaixo e clique em <strong className="text-emerald-400">Run</strong>:</li>
                    </ol>
                    <pre className="p-2 bg-slate-950 text-emerald-400 rounded-md overflow-x-auto select-all cursor-pointer font-bold font-mono">
{`ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS senha TEXT DEFAULT '1234' NOT NULL;

NOTIFY pgrst, 'reload schema';`}
                    </pre>
                    <p className="text-[9px] text-slate-400 font-sans italic leading-tight">
                      💡 Dica: O comando NOTIFY força o Supabase a reatualizar o cache de esquemas instantaneamente para que a nova coluna seja visível no aplicativo.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!supabaseConnected || loading || tenants.length === 0}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold py-1.5 rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" /> Criar Usuário & Vincular
            </button>
          </form>
        </div>
      </div>

      {/* Tenants list table */}
      {supabaseConnected && tenants.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-rose-100">
          <h5 className="text-[11px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Clientes Cadastrados no Supabase ({tenants.length})
          </h5>
          <div className="overflow-x-auto rounded-xl border border-slate-150">
            <table className="w-full text-left text-[11px] font-sans">
              <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wide border-b border-slate-200">
                <tr>
                  <th className="p-2">Identificador (ID)</th>
                  <th className="p-2">Nome do Cliente</th>
                  <th className="p-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white text-slate-700">
                {tenants.map(t => (
                  <tr key={t.id} className={t.id === activeTenant ? 'bg-rose-50/35 font-bold text-rose-800' : ''}>
                    <td className="p-2 font-mono">{t.id}</td>
                    <td className="p-2">{t.name}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.id === activeTenant ? (
                          <span className="text-[10px] text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200 font-extrabold uppercase">Ativo</span>
                        ) : (
                          <button
                            onClick={() => handleSwitchTenant(t.id)}
                            disabled={loading}
                            className="text-[10px] font-extrabold text-slate-600 hover:text-white bg-slate-200 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center"
                          >
                            Ativar ➔
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTenant(t.id, t.name)}
                          disabled={loading}
                          className="text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-rose-200"
                          title="Excluir Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profiles list table */}
      {supabaseConnected && profiles.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-rose-100">
          <h5 className="text-[11px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Usuários / Perfis do Supabase ({profiles.length})
          </h5>
          <div className="overflow-x-auto rounded-xl border border-slate-150">
            <table className="w-full text-left text-[11px] font-sans">
              <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wide border-b border-slate-200">
                <tr>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Login (Username)</th>
                  <th className="p-2">Cargo</th>
                  <th className="p-2">Senha</th>
                  <th className="p-2">Cliente / Tenant</th>
                  <th className="p-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white text-slate-700">
                {profiles.map(p => {
                  const isUserActiveTenant = p.tenant_id === activeTenant;
                  const tenantName = tenants.find(t => t.id === p.tenant_id)?.name || p.tenant_id;
                  return (
                    <tr key={p.id} className={isUserActiveTenant ? 'bg-rose-50/20 font-medium' : ''}>
                      <td className="p-2 font-bold text-slate-800">{p.nome}</td>
                      <td className="p-2 font-mono text-slate-650">{p.username}</td>
                      <td className="p-2">
                        <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md ${
                          p.role === 'admin' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {p.role === 'admin' ? 'Admin' : 'Colaborador'}
                        </span>
                      </td>
                      <td className="p-2 font-mono bg-slate-50/50">{p.senha || '1234'}</td>
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-bold">{tenantName}</span>
                          <span className="text-[9px] font-mono text-slate-400">ID: {p.tenant_id}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => handleDeleteProfile(p.id, p.nome)}
                          disabled={loading}
                          className="text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-rose-200"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
