/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  INITIAL_INVENTORY, 
  INITIAL_LOSS_RECORDS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SALES 
} from './utils/initialData';
import { InventoryItem, LossRecord, Transaction, Sale, CompanyConfig, UserAccount, OpenOrder } from './types';
import Dashboard from './components/Dashboard';
import PDV from './components/PDV';
import Estoque from './components/Estoque';
import Financeiro from './components/Financeiro';
import LockScreen from './components/LockScreen';
import Configuracao from './components/Configuracao';
import MultiTenantManager from './components/MultiTenantManager';
import DeveloperLockScreen from './components/DeveloperLockScreen';
import { 
  Cake, 
  LayoutDashboard, 
  Store, 
  Database, 
  Coins, 
  RefreshCw,
  Heart,
  Lock,
  Unlock,
  User,
  LogOut,
  Sparkles,
  Cloud,
  CloudLightning,
  CloudOff,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Info,
  X,
  CheckCircle2,
  AlertTriangle,
  ServerCrash,
  Settings,
  TrendingUp,
  ShoppingCart,
  Package,
  Smartphone,
  Monitor,
  Apple,
  Chrome
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured, getSupabaseConfig, getSupabaseCredentials, saveSupabaseCredentials } from './utils/supabaseClient';
import { 
  downloadAllFromSupabase, 
  uploadAllToSupabase, 
  testSupabaseConnection, 
  syncSingleSale, 
  syncSingleTransaction, 
  syncSingleLoss, 
  syncAllInventoryItems, 
  deleteSingleSale,
  deleteTransactionsByOrigin,
  fetchProfilesFromSupabase,
  registerProfileInSupabase,
  deleteProfileFromSupabase,
  getActiveTenantId,
  setActiveTenantId,
  SUPABASE_SQL_SETUP_CODE 
} from './utils/supabaseDb';

const INITIAL_COMPANY: CompanyConfig = {
  id: 'c_default',
  nomeFantasia: 'Doce Sabor Financeiro',
  razaoSocial: 'Doce Sabor Confeitaria Ltda',
  cnpj: '12.345.678/0001-90',
  telefone: '(11) 98765-4321',
  endereco: 'Av. das Cerejeiras, 1500 - São Paulo/SP',
  email: 'contato@docesabor.com.br',
  slogan: 'Adoçando momentos felizes com controle e excelência!',
  ativo: true
};

const INITIAL_USERS: UserAccount[] = [
  { id: 'u_admin', username: 'admin', nome: 'Administrador Confeitaria', senha: '1234', role: 'admin' },
  { id: 'u_colab', username: 'colab', nome: 'Colaborador Caixa', senha: 'colab', role: 'collaborator' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pdv' | 'estoque' | 'financeiro' | 'configuracao'>('dashboard');
  const [userRole, setUserRole] = useState<'admin' | 'collaborator' | 'developer' | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [devPassword, setDevPassword] = useState<string>(() => {
    const cached = localStorage.getItem('developer_password');
    if (!cached || cached === 'dev1234') {
      return 'Cris@551866';
    }
    return cached;
  });

  // Helper for tenant-specific storage keys
  const getTenantStorageKey = (baseKey: string) => {
    const tenantId = localStorage.getItem('supabase_active_tenant_id') || 'c_default';
    return `${baseKey}_${tenantId}`;
  };

  const handleUpdateDevPassword = (newPass: string) => {
    setDevPassword(newPass);
    localStorage.setItem('developer_password', newPass);
  };

  // Core State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lossRecords, setLossRecords] = useState<LossRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [companies, setCompanies] = useState<CompanyConfig[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // PWA states and setup
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installDeviceTab, setInstallDeviceTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt capturado!');
    };
    window.addEventListener('beforeinstallprompt', handler);

    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallPWAClick = async () => {
    if (!deferredPrompt) {
      alert("Siga o tutorial visual que abrimos para você instalar em seu computador ou celular!");
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Resposta do usuário para a instalação: ${outcome}`);
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Erro ao acionar prompt de instalação:', err);
    }
  };

  // Supabase Integration UI States
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [supabaseLogs, setSupabaseLogs] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tempSupabaseUrl, setTempSupabaseUrl] = useState('');
  const [tempSupabaseAnonKey, setTempSupabaseAnonKey] = useState('');

  useEffect(() => {
    if (showSupabaseModal) {
      const { url, anonKey } = getSupabaseCredentials();
      setTempSupabaseUrl(url);
      setTempSupabaseAnonKey(anonKey);
    }
  }, [showSupabaseModal]);

  // Load from Supabase (if available) or LocalStorage fallback
  useEffect(() => {
    async function loadInitialData() {
      // Load company profile list
      const cachedCompanies = localStorage.getItem('bakery_companies');
      if (cachedCompanies) {
        setCompanies(JSON.parse(cachedCompanies));
      } else {
        setCompanies([INITIAL_COMPANY]);
        localStorage.setItem('bakery_companies', JSON.stringify([INITIAL_COMPANY]));
      }

      // Load user accounts list
      const cachedUsers = localStorage.getItem('bakery_users');
      let activeUsers = INITIAL_USERS;
      if (cachedUsers) {
        activeUsers = JSON.parse(cachedUsers);
        setUsers(activeUsers);
      } else {
        setUsers(INITIAL_USERS);
        localStorage.setItem('bakery_users', JSON.stringify(INITIAL_USERS));
      }

      // Load tenant-specific data
      // (Moved to after session restore to ensure correct tenant ID is used)
      
      // If Supabase is configured, fetch profiles right away to enrich our users list
      const configured = isSupabaseConfigured();
      if (configured) {
        try {
          const dbProfiles = await fetchProfilesFromSupabase();
          if (dbProfiles && dbProfiles.length > 0) {
            const mappedDbUsers: UserAccount[] = dbProfiles.map(p => ({
              id: p.id,
              username: p.username,
              nome: p.nome,
              senha: p.senha || '1234',
              role: p.role as 'admin' | 'collaborator',
              tenantId: p.tenant_id
            }));

            // Merge with local activeUsers list so they don't overwrite each other
            const mergedUsers = [...activeUsers];
            mappedDbUsers.forEach(du => {
              const existingIdx = mergedUsers.findIndex(mu => mu.id === du.id || mu.username === du.username);
              if (existingIdx >= 0) {
                mergedUsers[existingIdx] = { ...mergedUsers[existingIdx], ...du };
              } else {
                mergedUsers.push(du);
              }
            });
            activeUsers = mergedUsers;
            setUsers(mergedUsers);
            localStorage.setItem('bakery_users', JSON.stringify(mergedUsers));
          }
        } catch (err) {
          console.error('Erro ao buscar perfis do Supabase no boot:', err);
        }
      }

      // Restore logged-in session if available
      const cachedLoggedUserId = localStorage.getItem('logged_user_id');
      const cachedLoggedUserRole = localStorage.getItem('logged_user_role');
      if (cachedLoggedUserId && cachedLoggedUserRole) {
        setUserRole(cachedLoggedUserRole as any);
        const found = activeUsers.find((u: any) => u.id === cachedLoggedUserId);
        if (found) {
          setCurrentUser(found);
          if (found.tenantId) {
            localStorage.setItem('supabase_active_tenant_id', found.tenantId);
          }
        }
      }

      // Re-load tenant-specific data (now that tenant ID is set from session)
      const cachedInventory = localStorage.getItem(getTenantStorageKey('bakery_inventory'));
      setInventory(cachedInventory ? JSON.parse(cachedInventory) : INITIAL_INVENTORY);
      
      const cachedLosses = localStorage.getItem(getTenantStorageKey('bakery_losses'));
      setLossRecords(cachedLosses ? JSON.parse(cachedLosses) : INITIAL_LOSS_RECORDS);
      
      const cachedTransactions = localStorage.getItem(getTenantStorageKey('bakery_transactions'));
      setTransactions(cachedTransactions ? JSON.parse(cachedTransactions) : INITIAL_TRANSACTIONS);
      
      const cachedSales = localStorage.getItem(getTenantStorageKey('bakery_sales'));
      setSales(cachedSales ? JSON.parse(cachedSales) : INITIAL_SALES);
      
      const cachedOrders = localStorage.getItem(getTenantStorageKey('bakery_open_orders'));
      setOpenOrders(cachedOrders ? JSON.parse(cachedOrders) : []);

      if (configured) {
        setSupabaseLogs('Supabase detectado! Tentando carregar tabelas de nuvem...');
        const res = await downloadAllFromSupabase();
        if (res.success && res.inventory && res.lossRecords && res.sales && res.transactions) {
          setInventory(res.inventory);
          setLossRecords(res.lossRecords);
          setTransactions(res.transactions);
          setSales(res.sales);
          setSupabaseConnected(true);
          setSupabaseLogs('Conectado com sucesso! Dados carregados da nuvem Supabase em tempo real.');
          
          // Sync LocalStorage for offline speed and buffer redudancy
          localStorage.setItem(getTenantStorageKey('bakery_inventory'), JSON.stringify(res.inventory));
          localStorage.setItem(getTenantStorageKey('bakery_losses'), JSON.stringify(res.lossRecords));
          localStorage.setItem(getTenantStorageKey('bakery_transactions'), JSON.stringify(res.transactions));
          localStorage.setItem(getTenantStorageKey('bakery_sales'), JSON.stringify(res.sales));
          setIsLoaded(true);
          return;
        } else {
          setSupabaseConnected(false);
          const errMsg = res.error || 'Erro de leitura nas tabelas';
          setSupabaseLogs(`Supabase configurado, mas sem resposta: ${errMsg}. Rodou o script SQL de tabelas? Utilizando cache offline local por segurança!`);
        }
      } else {
        setSupabaseLogs('Modo Offline Ativo. Crie chaves de conexão no settings para sincronizar com Supabase!');
      }

      setIsLoaded(true);
    }

    loadInitialData();
  }, []);

  // Sync to LocalStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(getTenantStorageKey('bakery_inventory'), JSON.stringify(inventory));
    localStorage.setItem(getTenantStorageKey('bakery_losses'), JSON.stringify(lossRecords));
    localStorage.setItem(getTenantStorageKey('bakery_transactions'), JSON.stringify(transactions));
    localStorage.setItem(getTenantStorageKey('bakery_sales'), JSON.stringify(sales));
    
    // Global data
    localStorage.setItem('bakery_companies', JSON.stringify(companies));
    localStorage.setItem('bakery_users', JSON.stringify(users));
    
    localStorage.setItem(getTenantStorageKey('bakery_open_orders'), JSON.stringify(openOrders));
  }, [inventory, lossRecords, transactions, sales, companies, users, openOrders, isLoaded]);

  // Derived active company
  const activeCompany = companies.find(c => c.ativo) || INITIAL_COMPANY;

  // Refresh data for the active tenant dynamically
  const refreshDataForActiveTenant = async () => {
    // 1. Try to load from Supabase if configured
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      setSyncStatusText('Carregando dados do Cliente...');
      try {
        const res = await downloadAllFromSupabase();
        if (res.success && res.inventory && res.lossRecords && res.sales && res.transactions) {
          setInventory(res.inventory);
          setLossRecords(res.lossRecords);
          setTransactions(res.transactions);
          setSales(res.sales);
          setSupabaseConnected(true);
          setSupabaseLogs(`Conectado! Dados carregados para o Cliente [${getActiveTenantId()}] em tempo real.`);
          
          // Save to cache
          localStorage.setItem(getTenantStorageKey('bakery_inventory'), JSON.stringify(res.inventory));
          localStorage.setItem(getTenantStorageKey('bakery_losses'), JSON.stringify(res.lossRecords));
          localStorage.setItem(getTenantStorageKey('bakery_transactions'), JSON.stringify(res.transactions));
          localStorage.setItem(getTenantStorageKey('bakery_sales'), JSON.stringify(res.sales));
        } else {
          console.error('Falha ao baixar dados do inquilino:', res.error);
          setSupabaseLogs(`Erro ao carregar dados do Cliente: ${res.error}`);
        }
      } catch (e: any) {
        console.error(e);
        setSupabaseLogs(`Erro crítico de sincronia: ${e.message}`);
      } finally {
        setIsSyncing(false);
        setSyncStatusText(null);
      }
    }

    // 2. Load from LocalStorage (as fallback or primary in offline mode)
    const cachedInventory = localStorage.getItem(getTenantStorageKey('bakery_inventory'));
    setInventory(cachedInventory ? JSON.parse(cachedInventory) : INITIAL_INVENTORY);
    
    const cachedLosses = localStorage.getItem(getTenantStorageKey('bakery_losses'));
    setLossRecords(cachedLosses ? JSON.parse(cachedLosses) : INITIAL_LOSS_RECORDS);
    
    const cachedTransactions = localStorage.getItem(getTenantStorageKey('bakery_transactions'));
    setTransactions(cachedTransactions ? JSON.parse(cachedTransactions) : INITIAL_TRANSACTIONS);
    
    const cachedSales = localStorage.getItem(getTenantStorageKey('bakery_sales'));
    setSales(cachedSales ? JSON.parse(cachedSales) : INITIAL_SALES);
    
    const cachedOrders = localStorage.getItem(getTenantStorageKey('bakery_open_orders'));
    setOpenOrders(cachedOrders ? JSON.parse(cachedOrders) : []);
  };

  // Handle login success and persist session
  const handleLoginSuccess = (role: 'admin' | 'collaborator', user?: UserAccount) => {
    setUserRole(role);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('logged_user_id', user.id);
      localStorage.setItem('logged_user_role', role);
      if (user.tenantId) {
        localStorage.setItem('supabase_active_tenant_id', user.tenantId);
      } else {
        localStorage.removeItem('supabase_active_tenant_id');
      }
      
      // Fetch fresh data for the newly logged-in tenant!
      setTimeout(() => {
        refreshDataForActiveTenant();
      }, 50);
    }
  };

  // Handle logout and clear session/data to isolate tenants
  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    localStorage.removeItem('logged_user_id');
    localStorage.removeItem('logged_user_role');
    localStorage.removeItem('supabase_active_tenant_id');
    
    // Clear core state to isolate data between tenants completely
    setInventory([]);
    setLossRecords([]);
    setTransactions([]);
    setSales([]);
    setOpenOrders([]);
    
    // Clear local storage cache
    localStorage.removeItem(getTenantStorageKey('bakery_inventory'));
    localStorage.removeItem(getTenantStorageKey('bakery_losses'));
    localStorage.removeItem(getTenantStorageKey('bakery_transactions'));
    localStorage.removeItem(getTenantStorageKey('bakery_sales'));
    localStorage.removeItem(getTenantStorageKey('bakery_open_orders'));
    
    setSupabaseLogs('Sessão encerrada por segurança. Faça login com outro usuário.');
  };

  // Handle inventory updates elegantly with safe Supabase triggers
  const handleUpdateInventory = (updated: InventoryItem[]) => {
    setInventory(updated);
    if (isSupabaseConfigured() && supabaseConnected) {
      setSyncStatusText('Sincronizando com Supabase...');
      syncAllInventoryItems(updated)
        .then(success => {
          if (success) {
            setSyncStatusText(null);
          } else {
            setSyncStatusText('Erro: Falha ao sincronizar com Supabase.');
          }
        })
        .catch(err => {
          console.error('Erro de sincronização em tempo real de inventário:', err);
          setSyncStatusText('Erro crítico de sincronização.');
        });
    }
  };

  // CALLBACK: Reset Database
  const handleResetDatabase = () => {
    if (window.confirm('Deseja redefinir todo o sistema com as configurações e dados de demonstração originais? Isso limpará vendas feitas hoje.')) {
      setInventory(INITIAL_INVENTORY);
      setLossRecords(INITIAL_LOSS_RECORDS);
      setTransactions(INITIAL_TRANSACTIONS);
      setSales(INITIAL_SALES);
      setActiveTab('dashboard');

      if (isSupabaseConfigured() && supabaseConnected) {
        setSyncStatusText('Reiniciando dados também no Supabase...');
        uploadAllToSupabase(INITIAL_INVENTORY, INITIAL_LOSS_RECORDS, INITIAL_SALES, INITIAL_TRANSACTIONS)
          .then(res => {
            if (res.success) {
              setSupabaseLogs('Sucesso! Banco de Dados Supabase zerado e resetado aos dados padrão.');
              setSyncStatusText(null);
            } else {
              setSupabaseLogs(`Reset local feito, mas falhou ao enviar para Supabase: ${res.error}`);
              setSyncStatusText(null);
            }
          });
      }
    }
  };

  // USER CRUD HANDLERS
  const handleAddUser = (user: UserAccount) => {
    const updatedUser = {
      ...user,
      tenantId: user.tenantId || getActiveTenantId()
    };
    setUsers(prev => [...prev, updatedUser]);

    if (isSupabaseConfigured() && supabaseConnected) {
      registerProfileInSupabase(
        updatedUser.id,
        updatedUser.username,
        updatedUser.nome,
        updatedUser.role,
        updatedUser.tenantId,
        updatedUser.senha
      ).catch(err => console.error('Erro ao sincronizar novo usuário com o Supabase:', err));
    }
  };

  const handleUpdateUser = (user: UserAccount) => {
    const updatedUser = {
      ...user,
      tenantId: user.tenantId || getActiveTenantId()
    };
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

    if (isSupabaseConfigured() && supabaseConnected) {
      registerProfileInSupabase(
        updatedUser.id,
        updatedUser.username,
        updatedUser.nome,
        updatedUser.role,
        updatedUser.tenantId,
        updatedUser.senha
      ).catch(err => console.error('Erro ao sincronizar atualização de usuário com o Supabase:', err));
    }
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));

    if (isSupabaseConfigured() && supabaseConnected) {
      deleteProfileFromSupabase(id).catch(err => console.error('Erro ao excluir usuário no Supabase:', err));
    }
  };

  // CALLBACK: Venda finalizada no PDV
  const handleCompleteSale = (completedSale: Sale, updatedInventory: InventoryItem[]) => {
    // 1. Adicionar à lista de vendas
    setSales(prev => {
      const updatedArr = [...prev, completedSale];
      if (isSupabaseConfigured() && supabaseConnected) {
        syncSingleSale(completedSale).catch(err => console.error(err));
      }
      return updatedArr;
    });

    // 2. Atualizar inventário
    handleUpdateInventory(updatedInventory);

    // 3. Cadastrar receita correspondente no Livro Caixa financeiro
    const itemsDescription = completedSale.itens
      .map(item => `${item.quantidade}x ${item.nome}`)
      .join(', ');

    const financeTx: Transaction = {
      id: 't_sale_' + completedSale.id,
      data: completedSale.data,
      tipo: 'receita',
      categoria: 'Vendas PDV',
      valor: completedSale.total,
      descricao: `Venda PDV [Cod: ${completedSale.id.replace('sale_', '').toUpperCase()}] - ${itemsDescription}`,
      origemId: completedSale.id
    };

    setTransactions(prev => {
      const updatedArr = [...prev, financeTx];
      if (isSupabaseConfigured() && supabaseConnected) {
        syncSingleTransaction(financeTx).catch(err => console.error(err));
      }
      return updatedArr;
    });
  };

  // CALLBACK: Cancelar/Excluir uma venda no PDV com recarga automática de estoque
  const handleCancelSale = (saleId: string) => {
    const saleToCancel = sales.find(s => s.id === saleId);
    if (!saleToCancel) return;

    // 1. Restaurar estoque de produtos e de seus componentes (ingredientes) correspondentes
    const updatedInventory = [...inventory];
    saleToCancel.itens.forEach(saleItem => {
      const productInInv = updatedInventory.find(i => i.id === saleItem.itemId);
      if (productInInv) {
        // Restaurar estoque do produto final
        productInInv.quantidade = productInInv.quantidade + saleItem.quantidade;

        // Se o produto final tiver receita e componentes
        if (productInInv.receitaIngredientes && productInInv.receitaIngredientes.length > 0) {
          productInInv.receitaIngredientes.forEach(recipeIngredient => {
            const ingredientInInv = updatedInventory.find(i => i.id === recipeIngredient.ingredienteId);
            if (ingredientInInv) {
              const totalIngredientUsed = recipeIngredient.quantidade * saleItem.quantidade;
              // Devolve ao estoque
              ingredientInInv.quantidade = ingredientInInv.quantidade + totalIngredientUsed;
            }
          });
        }
      }
    });

    // 2. Atualizar inventário localmente e sincronizar
    handleUpdateInventory(updatedInventory);

    // 3. Remover venda da lista local
    setSales(prev => prev.filter(s => s.id !== saleId));

    // 4. Remover transações correspondentes do livro caixa local
    setTransactions(prev => prev.filter(t => t.id !== 't_sale_' + saleId && t.origemId !== saleId));

    // 5. Sincronizar exclusão com Supabase se estiver conectado
    if (isSupabaseConfigured() && supabaseConnected) {
      deleteSingleSale(saleId).catch(err => console.error('Erro ao deletar venda no Supabase:', err));
      deleteTransactionsByOrigin(saleId).catch(err => console.error('Erro ao deletar transações no Supabase:', err));
    }
  };

  // CALLBACK: Descarte / Perda de Perecível registrada no Estoque
  const handleAddLossRecord = (newLoss: LossRecord, expenseTransaction: Transaction) => {
    setLossRecords(prev => {
      const updatedArr = [...prev, newLoss];
      if (isSupabaseConfigured() && supabaseConnected) {
        syncSingleLoss(newLoss).catch(err => console.error(err));
      }
      return updatedArr;
    });

    setTransactions(prev => {
      const updatedArr = [...prev, expenseTransaction];
      if (isSupabaseConfigured() && supabaseConnected) {
        syncSingleTransaction(expenseTransaction).catch(err => console.error(err));
      }
      return updatedArr;
    });
  };

  // CALLBACK: Adição manual de receita/despesa operacionale
  const handleAddTransactionManual = (newTx: Transaction) => {
    setTransactions(prev => {
      const updatedArr = [...prev, newTx];
      if (isSupabaseConfigured() && supabaseConnected) {
        syncSingleTransaction(newTx).catch(err => console.error(err));
      }
      return updatedArr;
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <Cake className="w-10 h-10 text-rose-450 animate-bounce mx-auto" />
          <h2 className="text-sm font-semibold text-slate-700">Carregando sistema de confeitaria...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-slate-800 font-sans flex flex-col justify-between" id="applet-viewport">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-rose-100 sticky top-0 z-40 shadow-xs" id="main-applet-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          {/* Logo e Nome */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
                {activeCompany.nomeFantasia} <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-sm">ERP & PDV</span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeCompany.slogan || "Gestão Financeira & Alerta de Validade de Insumos"}</p>
            </div>
          </div>

          {/* Navegação principal de abas Desktop */}
          <nav className="hidden md:flex bg-slate-50 border rounded-xl p-1" id="nav-tabs-desktop">
            {[
              { id: 'dashboard', label: 'Estatísticas', icon: TrendingUp },
              { id: 'pdv', label: 'Vendas / PDV', icon: ShoppingCart },
              { id: 'estoque', label: 'Insumos / Validades', icon: Package },
              { id: 'financeiro', label: 'Livro Caixa', icon: Coins },
              { id: 'configuracao', label: 'Configurações', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-desktop-lnk-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer pointer-events-auto ${
                    isActive 
                      ? 'bg-white text-slate-900 shadow-3xs border-b border-slate-50' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Perfil e Controle de Acesso */}
          <div className="flex items-center gap-2" id="header-identity-controls">
            {userRole ? (
              <div 
                className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 py-1.5 px-2.5 rounded-xl text-xs font-bold animate-fade-in"
                id="header-role-badge"
              >
                {userRole === 'admin' ? (
                  <span className="flex items-center gap-1 text-rose-800">
                    <span className="text-[11.5px]">👑 Admin</span>
                  </span>
                ) : userRole === 'developer' ? (
                  <span className="flex items-center gap-1 text-teal-800">
                    <span className="text-[11.5px]">🛠️ Desenvolvedor</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-700">
                    <span className="text-[11.5px]">🧑‍🍳 {currentUser?.nome || 'Colaborador'}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="p-1 hover:bg-rose-100/90 hover:text-rose-900 rounded-lg transition-all ml-1 cursor-pointer pointer-events-auto"
                  title="Bloquear painel / Sair"
                  id="btn-role-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  // Ir para uma aba protegida força o prompt de login
                  setActiveTab('financeiro');
                }}
                className="bg-slate-50 hover:bg-rose-50 border border-rose-105 hover:border-rose-200 text-slate-600 hover:text-rose-750 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer pointer-events-auto"
                title="Fazer login com senha para acessar áreas restritas"
                id="btn-header-lock-status"
              >
                <Lock className="w-3.5 h-3.5 text-rose-450 animate-pulse" />
                <span>Restrito</span>
              </button>
            )}

            {/* Supabase Link Button */}
            <button 
              id="btn-header-supabase-sync"
              onClick={() => setShowSupabaseModal(true)}
              className={`text-xs font-bold py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer pointer-events-auto ${
                supabaseConnected 
                  ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/70 text-emerald-800' 
                  : (isSupabaseConfigured() ? 'bg-amber-50 border-amber-250 text-amber-800 hover:bg-amber-100' : 'bg-rose-50/40 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-slate-600 hover:text-rose-750')
              }`}
              title="Sincronização e Conexão Supabase"
            >
              <Database className={`w-3.5 h-3.5 ${supabaseConnected ? 'text-emerald-600 animate-pulse' : 'text-rose-450'}`} />
              <span className="hidden leading-none lg:inline">
                {supabaseConnected ? 'Supabase Conectado' : 'Supabase (Nuvem)'}
              </span>
            </button>

            {/* Botão de reset de simulação */}
            <button 
              id="btn-general-reset-cache"
              onClick={handleResetDatabase}
              className="text-xs bg-slate-50 hover:bg-rose-50/20 border border-slate-200 hover:border-rose-150 text-slate-500 hover:text-rose-700 font-medium py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-colors pointer-events-auto shadow-3xs cursor-pointer"
              title="Recarregar dados originais da demonstração"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Resetar Dados</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação Mobile (Exibida somente em telas pequenas) */}
        <div className="md:hidden border-t border-rose-50 bg-slate-50/50 p-2 overflow-x-auto flex gap-1.5" id="nav-tabs-mobile">
          {[
            { id: 'dashboard', label: 'Estatísticas', icon: TrendingUp },
            { id: 'pdv', label: 'PDV', icon: ShoppingCart },
            { id: 'estoque', label: 'Validades', icon: Package },
            { id: 'financeiro', label: 'Caixa', icon: Coins },
            { id: 'configuracao', label: 'Ajustes', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-mobile-lnk-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors pointer-events-auto shrink-0 ${
                  isActive 
                    ? 'bg-rose-505 bg-rose-500 text-white' 
                    : 'bg-white hover:bg-slate-100 text-slate-600 border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ÁREA COMPONENTE COMPATÍVEL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full animate-fade-in" id="main-content-display">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${userRole}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {activeTab === 'dashboard' && (
              (userRole === 'admin' || userRole === 'developer') ? (
                <Dashboard 
                  inventory={inventory}
                  transactions={transactions}
                  sales={sales}
                  lossRecords={lossRecords}
                  onNavigate={(tab) => setActiveTab(tab)}
                  openOrders={openOrders}
                  onUpdateOpenOrders={setOpenOrders}
                  tenantId={getActiveTenantId()}
                />
              ) : (
                <LockScreen 
                  requiredRole="admin"
                  onLogin={handleLoginSuccess}
                  onNavigateToPublic={() => setActiveTab('pdv')}
                  companyName={activeCompany.nomeFantasia}
                  users={users}
                  devPassword={devPassword}
                  tenantId={getActiveTenantId()}
                  onAddUser={handleAddUser}
                />
              )
            )}

            {activeTab === 'pdv' && (
              userRole ? (
                <PDV 
                  inventory={inventory}
                  onCompleteSale={handleCompleteSale}
                  activeCompany={activeCompany}
                  sales={sales}
                  onCancelSale={handleCancelSale}
                  users={users}
                  openOrders={openOrders}
                  onUpdateOpenOrders={setOpenOrders}
                />
              ) : (
                <LockScreen 
                  requiredRole="any"
                  onLogin={handleLoginSuccess}
                  onNavigateToPublic={() => setActiveTab('pdv')}
                  companyName={activeCompany.nomeFantasia}
                  users={users}
                  devPassword={devPassword}
                  tenantId={getActiveTenantId()}
                  onAddUser={handleAddUser}
                />
              )
            )}

            {activeTab === 'estoque' && (
              userRole ? (
                <Estoque 
                  inventory={inventory}
                  onUpdateInventory={handleUpdateInventory}
                  onAddLossRecord={handleAddLossRecord}
                />
              ) : (
                <LockScreen 
                  requiredRole="any"
                  onLogin={handleLoginSuccess}
                  onNavigateToPublic={() => setActiveTab('pdv')}
                  companyName={activeCompany.nomeFantasia}
                  users={users}
                  devPassword={devPassword}
                  tenantId={getActiveTenantId()}
                  onAddUser={handleAddUser}
                />
              )
            )}

            {activeTab === 'financeiro' && (
              userRole ? (
                <Financeiro 
                  transactions={transactions}
                  onAddTransaction={handleAddTransactionManual}
                  userRole={userRole}
                  lossRecords={lossRecords}
                  sales={sales}
                  users={users}
                  onLogin={handleLoginSuccess}
                  devPassword={devPassword}
                  companyName={activeCompany?.nomeFantasia}
                />
              ) : (
                <LockScreen 
                  requiredRole="any"
                  onLogin={handleLoginSuccess}
                  onNavigateToPublic={() => setActiveTab('pdv')}
                  companyName={activeCompany.nomeFantasia}
                  users={users}
                  devPassword={devPassword}
                  tenantId={getActiveTenantId()}
                  onAddUser={handleAddUser}
                />
              )
            )}

            {activeTab === 'configuracao' && (
              userRole === 'developer' ? (
                <Configuracao 
                  companies={companies}
                  onAddCompany={(c) => {
                    setCompanies(prev => [...prev, c]);
                  }}
                  onUpdateCompany={(c) => {
                    setCompanies(prev => prev.map(company => company.id === c.id ? c : company));
                  }}
                  onDeleteCompany={(id) => {
                    setCompanies(prev => prev.filter(c => c.id !== id));
                  }}
                  onSelectActiveCompany={(id) => {
                    setCompanies(prev => prev.map(c => ({
                      ...c,
                      ativo: c.id === id
                    })));
                    setActiveTenantId(id);
                  }}
                  users={users}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  devPassword={devPassword}
                  onUpdateDevPassword={handleUpdateDevPassword}
                  onShowInstallModal={() => setShowInstallModal(true)}
                />
              ) : (
                <LockScreen 
                  requiredRole="admin"
                  onLogin={handleLoginSuccess}
                  onNavigateToPublic={() => setActiveTab('pdv')}
                  companyName={activeCompany.nomeFantasia}
                  users={users}
                  devPassword={devPassword}
                  tenantId={getActiveTenantId()}
                  onAddUser={handleAddUser}
                />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* RODAPÉ DO APPLET */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800" id="main-applet-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-semibold text-slate-300">© 2026 {activeCompany.nomeFantasia} - Confeitaria Inteligente</p>
            <p className="text-[11px] text-slate-550">Módulo de Sincronização, Configurações e Baixas Automáticas V2.0</p>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-sans">
            <span>Sincronizado via Supabase</span>
            <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></div>
            <Heart className="w-3.5 h-3.5 text-rose-550 fill-rose-500 text-rose-500 shrink-0" />
          </div>
        </div>
      </footer>

      {/* MODAL CONFIGURAÇÃO SUPABASE */}
      <AnimatePresence>
        {showSupabaseModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-rose-100 max-w-2xl w-full p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Botão Fechar */}
              <button
                onClick={() => setShowSupabaseModal(false)}
                className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all pointer-events-auto cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Cabeçalho */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl relative">
                  <Database className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-serif">Sincronização Supabase</h3>
                  <p className="text-xs text-slate-500">Conecte o ERP da confeitaria {activeCompany.nomeFantasia} a um banco de dados na nuvem.</p>
                </div>
              </div>

              {/* Status da Conectividade */}
              <div className="flex items-start gap-4 p-4 rounded-2xl border bg-slate-50/50">
                <div className="mt-0.5">
                  {supabaseConnected ? (
                    <CloudLightning className="w-6 h-6 text-emerald-600 shrink-0 animate-pulse" />
                  ) : (
                    <CloudOff className="w-6 h-6 text-slate-400 shrink-0" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-450 tracking-wider">Status da Ligação:</span>
                    {supabaseConnected ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                        CONECTADO (CLOUD)
                      </span>
                    ) : (
                      <span className="bg-slate-150 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-slate-250">
                        OFFLINE (LOCAL STORAGE)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-mono text-[11px] bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                    {supabaseLogs}
                  </p>
                </div>
              </div>

              {/* Form de Configuração de Chaves */}
              <div className="space-y-3 bg-stone-50/60 p-4 rounded-2xl border border-stone-200 shadow-3xs">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-rose-500" />
                  Conexão Direta ao Banco (Auto-Sincronismo)
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Insira abaixo as credenciais de acesso ao seu cluster Supabase. Elas serão salvas automaticamente no seu navegador e não se perderão quando o app for reaberto.
                </p>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Project URL (Link do Projeto)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 shadow-3xs"
                      placeholder="https://xxxx.supabase.co"
                      value={tempSupabaseUrl}
                      onChange={(e) => setTempSupabaseUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">API Anon Public Key (Chave Anon)</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-stone-250 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 shadow-3xs resize-none"
                      placeholder="eyJhbGci..."
                      value={tempSupabaseAnonKey}
                      onChange={(e) => setTempSupabaseAnonKey(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const DEFAULT_URL = 'https://xagcalqteqxgpbcatpai.supabase.co';
                        const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZ2NhbHF0ZXF4Z3BiY2F0cGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODMzODUsImV4cCI6MjA5NzE1OTM4NX0.tw_YPRZCAeUXL-vUMJZB8q3us_h8D27h938IY3mmTdg';
                        setTempSupabaseUrl(DEFAULT_URL);
                        setTempSupabaseAnonKey(DEFAULT_ANON_KEY);
                      }}
                      className="text-[11px] text-stone-600 hover:text-rose-600 bg-white hover:bg-stone-100 border border-stone-300 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer text-center"
                    >
                      Preencher Chaves de Acesso
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tempSupabaseUrl.trim() || !tempSupabaseAnonKey.trim()) {
                          alert("⚠️ Por favor, digite as chaves ou clique em Preencher Chaves de Acesso!");
                          return;
                        }
                        saveSupabaseCredentials(tempSupabaseUrl, tempSupabaseAnonKey);
                        alert("⚡ Credenciais salvas com sucesso no armazenamento do navegador! O sistema será recarregado automaticamente para ativar a conexão em nuvem.");
                        window.location.reload();
                      }}
                      className="text-[11px] text-white bg-rose-500 hover:bg-rose-600 py-1.5 px-4 rounded-xl font-black transition-all cursor-pointer shadow-sm text-center active:scale-[0.98]"
                    >
                      Salvar Chaves e Reconectar ➔
                    </button>
                  </div>
                </div>
              </div>

              {/* Área de Ações */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Controle e Sincronismo de Dados</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    disabled={isSyncing}
                    onClick={async () => {
                      setIsSyncing(true);
                      setSyncStatusText("Pingando Supabase...");
                      const res = await testSupabaseConnection();
                      setIsSyncing(false);
                      setSyncStatusText(null);
                      alert(res.details);
                      if (res.success && !res.details.includes('falta criar')) {
                        setSupabaseConnected(true);
                      }
                    }}
                    className="border border-slate-205 flex items-center justify-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50 text-xs py-2.5 px-3 rounded-xl font-bold cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing && syncStatusText?.includes("Pingando") ? "animate-spin" : ""}`} />
                    Testar Conexão
                  </button>

                  <button
                    disabled={isSyncing}
                    onClick={async () => {
                      if (!isSupabaseConfigured()) {
                        alert("⚠️ Configure as chaves de ambiente primeiro!");
                        return;
                      }
                      if (window.confirm("Atenção! Isso substituirá seus dados locais atuais com a última versão salva nas tabelas do Supabase. Deseja continuar?")) {
                        setIsSyncing(true);
                        setSyncStatusText("Baixando dados...");
                        const res = await downloadAllFromSupabase();
                        setIsSyncing(false);
                        setSyncStatusText(null);
                        if (res.success && res.inventory && res.lossRecords && res.sales && res.transactions) {
                          setInventory(res.inventory);
                          setLossRecords(res.lossRecords);
                          setSales(res.sales);
                          setTransactions(res.transactions);
                          setSupabaseConnected(true);
                          setSupabaseLogs("Conectado e sincronizado com sucesso! Todos os dados cloud foram carregados.");
                          alert("🎉 Dados baixados do Supabase com sucesso!");
                        } else {
                          alert(`❌ Falha ao baixar: ${res.error || "Tabelas não criadas no Supabase."}`);
                        }
                      }
                    }}
                    className="border border-teal-200 flex items-center justify-center gap-1.5 text-teal-700 bg-teal-50/40 hover:bg-teal-50 text-xs py-2.5 px-3 rounded-xl font-bold cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isSyncing && syncStatusText?.includes("Baixando") ? "animate-bounce" : ""}`} />
                    Baixar Nuvem ➔ Local
                  </button>

                  <button
                    disabled={isSyncing}
                    onClick={async () => {
                      if (!isSupabaseConfigured()) {
                        alert("⚠️ Configure as chaves de ambiente primeiro!");
                        return;
                      }
                      if (window.confirm("Isso atualizará/mesclará suas tabelas do Supabase com os dados locais atuais. Deseja continuar?")) {
                        setIsSyncing(true);
                        setSyncStatusText("Enviando dados...");
                        const res = await uploadAllToSupabase(inventory, lossRecords, sales, transactions);
                        setIsSyncing(false);
                        setSyncStatusText(null);
                        if (res.success) {
                          setSupabaseConnected(true);
                          setSupabaseLogs("Dados locais sincronizados e enviados para o cluster do Supabase.");
                          alert("⬆️ Dados enviados para o Supabase com sucesso total!");
                        } else {
                          alert(`❌ Falha ao enviar: ${res.error}`);
                        }
                      }
                    }}
                    className="border border-emerald-250 flex items-center justify-center gap-1.5 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-55 text-xs py-2.5 px-3 rounded-xl font-bold cursor-pointer transition-all disabled:opacity-50"
                  >
                    <CloudLightning className="w-3.5 h-3.5" />
                    Enviar Local ➔ Nuvem
                  </button>
                </div>

                {isSyncing && syncStatusText && (
                  <div className="p-3 bg-amber-50 text-amber-850 rounded-xl border border-amber-100 flex items-center gap-2 text-xs font-bold animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Processando ação crítica: {syncStatusText}</span>
                  </div>
                )}
              </div>

              {/* Multi-Tenant Control Panel */}
              <MultiTenantManager 
                onAddUserLocal={handleAddUser} 
                users={users} 
                supabaseConnected={supabaseConnected} 
              />

              {/* Guia de Configuração e Chaves */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Como Ligar Seu Supabase</h4>
                <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">1</span>
                    <p className="text-slate-650 leading-relaxed">
                      Crie uma conta e um projeto gratuito no <strong className="text-rose-700 hover:underline"><a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Console do Supabase</a></strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">2</span>
                    <p className="text-slate-650 leading-relaxed">
                      Defina as variáveis de ambiente em <strong>Settings (Símbolo de Engrenagem) &gt; Secrets</strong> do AI Studio:
                      <br />
                      <strong className="font-mono bg-slate-100 border px-1 rounded-sm text-[10.5px]">VITE_SUPABASE_URL</strong> (URL do seu projeto)
                      <br />
                      <strong className="font-mono bg-slate-100 border px-1 rounded-sm text-[10.5px]">VITE_SUPABASE_ANON_KEY</strong> (Filtro API anon)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">3</span>
                    <p className="text-slate-650 leading-relaxed">
                      Abra o <strong>SQL Editor</strong> do seu Supabase, crie uma nova query, cole o script de tabelas abaixo e clique em <strong>Run</strong>!
                    </p>
                  </div>
                </div>
              </div>

              {/* SQL Script Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-rose-500" />
                    Script SQL Setup das Tabelas
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SETUP_CODE);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="text-[10px] bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 hover:border-rose-200 border py-1 px-3 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-all pointer-events-auto"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-650" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? "Copiado!" : "Copiar Script SQL"}
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-3.5 bg-slate-900 text-slate-200 font-mono text-[10px] leading-relaxed rounded-2xl border border-slate-800 h-40 overflow-y-auto">
                    {SUPABASE_SQL_SETUP_CODE}
                  </pre>
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none rounded-b-2xl"></div>
                </div>
              </div>

              {/* Botão de Fechar embaixo */}
              <div className="pt-2 border-t border-rose-50 flex justify-end">
                <button
                  onClick={() => setShowSupabaseModal(false)}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer pointer-events-auto transition-colors"
                >
                  Concluir
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Instalação do PWA */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto" id="pwa-install-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-rose-100 shadow-2xl relative space-y-5 text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowInstallModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                id="btn-close-pwa-modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Instalar Aplicativo</h3>
                  <p className="text-xs text-slate-500">Tenha o Doce Sabor sempre à mão no computador ou celular</p>
                </div>
              </div>

              {/* IFRAME WARNING BANNER */}
              {window.self !== window.top && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex gap-2 text-amber-850 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Atenção: Modo de Prévia Detectado!</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Você está visualizando o sistema dentro de uma janela de testes (Iframe). Navegadores como Google Chrome e Safari <strong>bloqueiam a instalação de aplicativos</strong> dentro de frames de visualização.
                  </p>
                  <div className="pt-1">
                    <a
                      href={window.location.origin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-3.5 rounded-xl transition-all cursor-pointer shadow-3xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir em Tela Cheia para Instalar
                    </a>
                  </div>
                </div>
              )}

              {/* NATIVE INSTALLATION PROMPT BUTTON (If available) */}
              {deferredPrompt ? (
                <div className="p-4 bg-rose-50/30 border border-rose-100 rounded-2xl space-y-2.5 text-center">
                  <p className="text-xs text-slate-600 leading-normal">
                    Seu navegador é totalmente compatível e está pronto para instalar o aplicativo agora mesmo!
                  </p>
                  <button
                    onClick={handleInstallPWAClick}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 animate-bounce" />
                    Instalar Aplicativo Agora
                  </button>
                </div>
              ) : (
                <div className="text-[11px] bg-slate-50 p-3 rounded-2xl border text-slate-500 text-center leading-relaxed">
                  💡 Se o botão de instalação automática não aparecer, siga as orientações manuais abaixo para o seu dispositivo.
                </div>
              )}

              {/* TABS SELECTOR */}
              <div className="border-b border-slate-100 flex gap-1 p-0.5 bg-slate-50 rounded-xl" id="pwa-tabs-list">
                {[
                  { id: 'android', label: 'Celular Android', icon: Smartphone },
                  { id: 'ios', label: 'iPhone (iOS)', icon: Apple },
                  { id: 'desktop', label: 'Computador', icon: Monitor }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = installDeviceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setInstallDeviceTab(tab.id as any)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white text-slate-800 shadow-3xs border border-slate-100'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TUTORIAL CONTENT */}
              <div className="space-y-4 pt-1">
                {installDeviceTab === 'android' && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">1</span>
                      <p>Certifique-se de estar usando o navegador <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">2</span>
                      <p>Toque nos <strong>três pontinhos (⋮)</strong> localizados no canto superior direito do seu navegador.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">3</span>
                      <p>Procure e toque na opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">4</span>
                      <p>Confirme a instalação. O aplicativo aparecerá na sua lista de apps do celular com ícone próprio e carregamento rápido!</p>
                    </div>
                  </div>
                )}

                {installDeviceTab === 'ios' && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                    <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl text-[11px] leading-relaxed text-rose-900 font-medium">
                      ⚠️ <strong>Nota para iPhone:</strong> A Apple exige que a instalação de PWAs seja feita exclusivamente através do navegador oficial <strong>Safari</strong>.
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">1</span>
                      <p>Abra este site utilizando obrigatoriamente o navegador <strong>Safari</strong>.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">2</span>
                      <p>Toque no ícone de <strong>Compartilhar</strong> (o quadrado com uma seta apontando para cima na barra inferior do Safari).</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">3</span>
                      <p>Role a lista de opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (representado por um ícone de mais ➕).</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">4</span>
                      <p>Dê um nome para o aplicativo se desejar e toque em <strong>Adicionar</strong> no canto superior direito.</p>
                    </div>
                  </div>
                )}

                {installDeviceTab === 'desktop' && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">1</span>
                      <p>Utilize o navegador <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> no seu computador.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">2</span>
                      <p>Olhe para a <strong>barra de endereços do navegador</strong> (onde fica o link no topo). No lado direito, clique no ícone de <strong>instalar</strong> (parece um monitor com uma setinha para baixo ou um ícone de mais ➕).</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="bg-rose-100 text-rose-700 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0">3</span>
                      <p>Alternativamente, clique nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome, vá em <strong>"Salvar e compartilhar"</strong> e depois em <strong>"Instalar página como app..."</strong>.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Fechar */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer pointer-events-auto transition-colors"
                >
                  Entendi
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
