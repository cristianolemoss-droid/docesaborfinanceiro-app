/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTenantValidator } from './hooks/useTenantValidator';
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
  Chrome,
  QrCode,
  Share2
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
  deleteSingleTransaction,
  deleteTransactionsByOrigin,
  fetchProfilesFromSupabase,
  registerProfileInSupabase,
  deleteProfileFromSupabase,
  getActiveTenantId,
  setActiveTenantId,
  SUPABASE_SQL_SETUP_CODE,
  uploadMirrorToSupabase,
  downloadMirrorFromSupabase
} from './utils/supabaseDb';
import {
  getLocalInventory,
  getLocalLossRecords,
  getLocalSales,
  getLocalTransactions,
  saveLocalInventoryBulk,
  saveLocalLossRecordsBulk,
  saveLocalSalesBulk,
  saveLocalTransactionsBulk,
  clearLocalDbForTenant
} from './utils/localDb';

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
  const [loadedTenantId, setLoadedTenantId] = useState<string | null>(null);
  const [devPassword, setDevPassword] = useState<string>(() => {
    const cached = localStorage.getItem('developer_password');
    if (!cached || cached === 'dev1234') {
      return 'Cris@551866';
    }
    return cached;
  });

  useTenantValidator(loadedTenantId, () => refreshDataForActiveTenant());

  // Helper for tenant-specific storage keys
  const getTenantStorageKey = (baseKey: string) => {
    const tenantId = getActiveTenantId();
    return `${baseKey}_${tenantId}`;
  };

  const safeLocalStorageSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [supabaseLogs, setSupabaseLogs] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMirrorSyncing, setIsMirrorSyncing] = useState(false);
  const [tempSupabaseUrl, setTempSupabaseUrl] = useState('');
  const [tempSupabaseAnonKey, setTempSupabaseAnonKey] = useState('');
  const [shareUrl, setShareUrl] = useState('https://ais-pre-4qykl3wqmdg5x2wpet7vud-585518200419.us-east1.run.app');
  const [isShareUrlCopied, setIsShareUrlCopied] = useState(false);

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

      const activeTenantId = getActiveTenantId();

      // Load data from IndexedDB locally first for instant launch
      try {
        const [localInv, localLoss, localSal, localTx] = await Promise.all([
          getLocalInventory(activeTenantId),
          getLocalLossRecords(activeTenantId),
          getLocalSales(activeTenantId),
          getLocalTransactions(activeTenantId)
        ]);

        setInventory(localInv);
        setLossRecords(localLoss);
        setSales(localSal);
        setTransactions(localTx);
      } catch (err) {
        console.error('[IndexedDB] Erro ao carregar dados locais no boot:', err);
        // LocalStorage legacy fallback
        const cachedInventory = localStorage.getItem(getTenantStorageKey('bakery_inventory'));
        setInventory(cachedInventory ? JSON.parse(cachedInventory) : INITIAL_INVENTORY);
        const cachedLosses = localStorage.getItem(getTenantStorageKey('bakery_losses'));
        setLossRecords(cachedLosses ? JSON.parse(cachedLosses) : INITIAL_LOSS_RECORDS);
        const cachedTransactions = localStorage.getItem(getTenantStorageKey('bakery_transactions'));
        setTransactions(cachedTransactions ? JSON.parse(cachedTransactions) : INITIAL_TRANSACTIONS);
        const cachedSales = localStorage.getItem(getTenantStorageKey('bakery_sales'));
        setSales(cachedSales ? JSON.parse(cachedSales) : INITIAL_SALES);
      }

      const cachedOrders = localStorage.getItem(getTenantStorageKey('bakery_open_orders'));
      setOpenOrders(cachedOrders ? JSON.parse(cachedOrders) : []);

      // If Supabase is configured, fetch latest data asynchronously
      if (configured) {
        setSupabaseLogs('Supabase detectado! Buscando espelho mais recente...');
        try {
          const res = await downloadMirrorFromSupabase();
          if (res.success && res.inventory && res.lossRecords && res.sales && res.transactions) {
            setInventory(res.inventory);
            setLossRecords(res.lossRecords);
            setTransactions(res.transactions);
            setSales(res.sales);
            setSupabaseConnected(true);
            setSupabaseLogs('Conectado com sucesso! Dados sincronizados via espelho de alta performance.');
            
            // Update IndexedDB
            await Promise.all([
              saveLocalInventoryBulk(res.inventory, activeTenantId),
              saveLocalLossRecordsBulk(res.lossRecords, activeTenantId),
              saveLocalSalesBulk(res.sales, activeTenantId),
              saveLocalTransactionsBulk(res.transactions, activeTenantId)
            ]);
          } else {
            // Fallback to legacy individual tables load
            console.warn('[boot] Espelho não encontrado, tentando tabelas individuais legadas...');
            const legacyRes = await downloadAllFromSupabase();
            if (legacyRes.success && legacyRes.inventory && legacyRes.lossRecords && legacyRes.sales && legacyRes.transactions) {
              setInventory(legacyRes.inventory);
              setLossRecords(legacyRes.lossRecords);
              setTransactions(legacyRes.transactions);
              setSales(legacyRes.sales);
              setSupabaseConnected(true);
              setSupabaseLogs('Conectado com sucesso via tabelas legadas. Migrando dados para o espelho...');
              
              // Sync IndexedDB
              await Promise.all([
                saveLocalInventoryBulk(legacyRes.inventory, activeTenantId),
                saveLocalLossRecordsBulk(legacyRes.lossRecords, activeTenantId),
                saveLocalSalesBulk(legacyRes.sales, activeTenantId),
                saveLocalTransactionsBulk(legacyRes.transactions, activeTenantId)
              ]);

              // Upload mirror
              await uploadMirrorToSupabase(legacyRes.inventory, legacyRes.lossRecords, legacyRes.sales, legacyRes.transactions);
            } else {
              setSupabaseConnected(false);
              const errMsg = res.error || legacyRes.error || 'Erro de leitura nas tabelas';
              setSupabaseLogs(`Supabase offline ou sem resposta: ${errMsg}. Rodando local-first com IndexedDB.`);
            }
          }
        } catch (err: any) {
          console.error('Erro de conexão ao carregar dados do Supabase:', err);
          setSupabaseLogs(`Erro de sincronia Supabase: ${err.message}. Operando local-first via IndexedDB.`);
        }
      } else {
        setSupabaseLogs('Modo Local-First Ativo. Configure as chaves do Supabase para espelhamento em nuvem.');
      }

      setIsLoaded(true);
    }

    loadInitialData();
  }, []);

  // Sync memory state to local caches (IndexedDB and LocalStorage) whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    const tenantId = getActiveTenantId();

    // 1. Save to LocalStorage (legacy fallback cache)
    safeLocalStorageSetItem(getTenantStorageKey('bakery_inventory'), JSON.stringify(inventory));
    safeLocalStorageSetItem(getTenantStorageKey('bakery_losses'), JSON.stringify(lossRecords));
    safeLocalStorageSetItem(getTenantStorageKey('bakery_transactions'), JSON.stringify(transactions));
    safeLocalStorageSetItem(getTenantStorageKey('bakery_sales'), JSON.stringify(sales));
    
    localStorage.setItem('bakery_companies', JSON.stringify(companies));
    localStorage.setItem('bakery_users', JSON.stringify(users));
    safeLocalStorageSetItem(getTenantStorageKey('bakery_open_orders'), JSON.stringify(openOrders));

    // 2. Save to Dexie IndexedDB (Local-First primary storage)
    saveLocalInventoryBulk(inventory, tenantId).catch(err => console.error('[IndexedDB] Erro ao salvar inventário:', err));
    saveLocalLossRecordsBulk(lossRecords, tenantId).catch(err => console.error('[IndexedDB] Erro ao salvar perdas:', err));
    saveLocalSalesBulk(sales, tenantId).catch(err => console.error('[IndexedDB] Erro ao salvar vendas:', err));
    saveLocalTransactionsBulk(transactions, tenantId).catch(err => console.error('[IndexedDB] Erro ao salvar transações:', err));
  }, [inventory, lossRecords, transactions, sales, companies, users, openOrders, isLoaded]);

  // Background cloud mirror sync (debounced to avoid flooding Supabase egress)
  useEffect(() => {
    if (!isLoaded || !isSupabaseConfigured() || !supabaseConnected) return;

    setIsMirrorSyncing(true);
    const handler = setTimeout(async () => {
      try {
        const res = await uploadMirrorToSupabase(inventory, lossRecords, sales, transactions);
        if (res.success) {
          setSupabaseLogs('Espelho em nuvem sincronizado com sucesso! (Tráfego de egress otimizado)');
        } else {
          console.warn('[Mirror Sync] Falha ao sincronizar espelho:', res.error);
          setSupabaseLogs(`Falha na sincronização em segundo plano: ${res.error}`);
        }
      } catch (err: any) {
        console.error('[Mirror Sync] Erro:', err);
      } finally {
        setIsMirrorSyncing(false);
      }
    }, 4000); // Debounce of 4 seconds

    return () => clearTimeout(handler);
  }, [inventory, lossRecords, transactions, sales, isLoaded, supabaseConnected]);

  // Derived active company
  const activeCompany = companies.find(c => c.ativo) || INITIAL_COMPANY;

  // Refresh data for the active tenant dynamically
  const refreshDataForActiveTenant = async () => {
    const tenantId = getActiveTenantId();
    setIsSyncing(true);
    setSyncStatusText('Carregando dados do Cliente...');
    
    try {
      // 1. Prime state from IndexedDB immediately for instant load
      const [localInv, localLoss, localSal, localTx] = await Promise.all([
        getLocalInventory(tenantId),
        getLocalLossRecords(tenantId),
        getLocalSales(tenantId),
        getLocalTransactions(tenantId)
      ]);

      setInventory(localInv);
      setLossRecords(localLoss);
      setSales(localSal);
      setTransactions(localTx);
      setLoadedTenantId(tenantId);

      // 2. Try to pull fresh mirror from Supabase if configured
      if (isSupabaseConfigured()) {
        setSupabaseLogs('Buscando espelho mais recente do Supabase...');
        const res = await downloadMirrorFromSupabase();
        
        if (res.success && res.inventory && res.lossRecords && res.sales && res.transactions) {
          setInventory(res.inventory);
          setLossRecords(res.lossRecords);
          setTransactions(res.transactions);
          setSales(res.sales);
          setSupabaseConnected(true);
          setSupabaseLogs(`Sincronizado! Dados carregados do espelho do Cliente [${tenantId}] com sucesso.`);
          
          // Overwrite local IndexedDB with the latest downloaded cloud mirror
          await Promise.all([
            saveLocalInventoryBulk(res.inventory, tenantId),
            saveLocalLossRecordsBulk(res.lossRecords, tenantId),
            saveLocalSalesBulk(res.sales, tenantId),
            saveLocalTransactionsBulk(res.transactions, tenantId)
          ]);
        } else {
          // Fallback to legacy individual tables download
          console.warn('[refresh] Espelho não encontrado ou falhou, tentando tabelas individuais...');
          const legacyRes = await downloadAllFromSupabase();
          if (legacyRes.success && legacyRes.inventory && legacyRes.lossRecords && legacyRes.sales && legacyRes.transactions) {
            setInventory(legacyRes.inventory);
            setLossRecords(legacyRes.lossRecords);
            setTransactions(legacyRes.transactions);
            setSales(legacyRes.sales);
            setSupabaseConnected(true);
            setSupabaseLogs(`Conectado via tabelas legadas! Migrando dados para o formato espelho.`);
            
            // Sync IndexedDB
            await Promise.all([
              saveLocalInventoryBulk(legacyRes.inventory, tenantId),
              saveLocalLossRecordsBulk(legacyRes.lossRecords, tenantId),
              saveLocalSalesBulk(legacyRes.sales, tenantId),
              saveLocalTransactionsBulk(legacyRes.transactions, tenantId)
            ]);
            
            // Save the mirror to Supabase for the first time
            await uploadMirrorToSupabase(legacyRes.inventory, legacyRes.lossRecords, legacyRes.sales, legacyRes.transactions);
          } else {
            console.error('Falha ao baixar dados do inquilino:', res.error || legacyRes.error);
            setSupabaseLogs(`Utilizando cache local. Erro ao ler nuvem: ${res.error || legacyRes.error}`);
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setSupabaseLogs(`Erro crítico de sincronia: ${e.message}`);
    } finally {
      setIsSyncing(false);
      setSyncStatusText(null);
    }
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
    setSales(prev => [...prev, completedSale]);

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

    setTransactions(prev => [...prev, financeTx]);
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
  };

  // CALLBACK: Descarte / Perda de Perecível registrada no Estoque
  const handleAddLossRecord = (newLoss: LossRecord, expenseTransaction: Transaction) => {
    setLossRecords(prev => [...prev, newLoss]);
    setTransactions(prev => [...prev, expenseTransaction]);
  };

  // CALLBACK: Adição manual de receita/despesa operacionale
  const handleAddTransactionManual = (newTx: Transaction) => {
    setTransactions(prev => [...prev, newTx]);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.origemId && tx.origemId.startsWith('sale_')) {
      handleCancelSale(tx.origemId);
      return;
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
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

            {/* Share / Install Button */}
            <button 
              id="btn-header-share"
              onClick={() => setShowShareModal(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer pointer-events-auto"
              title="Compartilhar Link ou Gerar QR Code para Tablet/Celular"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden leading-none sm:inline">Compartilhar App</span>
            </button>

            {/* Supabase Link Button */}
            <button 
              id="btn-header-supabase-sync"
              onClick={() => {
                // Protege acesso ao modal de Supabase com senha de desenvolvedor
                setShowPasswordModal(true);
              }}
              className={`text-xs font-bold py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer pointer-events-auto ${
                supabaseConnected 
                  ? (isMirrorSyncing ? 'bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100/70' : 'bg-emerald-50 border border-emerald-300 hover:bg-emerald-100/70 text-emerald-800')
                  : (isSupabaseConfigured() ? 'bg-amber-50 border border-amber-250 text-amber-800 hover:bg-amber-100' : 'bg-rose-50/40 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-slate-600 hover:text-rose-750')
              }`}
              title="Sincronização e Conexão Supabase"
            >
              <Database className={`w-3.5 h-3.5 ${isMirrorSyncing ? 'text-blue-500 animate-spin' : (supabaseConnected ? 'text-emerald-600 animate-pulse' : 'text-rose-450')}`} />
              <span className="hidden leading-none lg:inline">
                {isMirrorSyncing ? 'Sincronizando espelho...' : (supabaseConnected ? 'Supabase Conectado' : 'Supabase (Nuvem)')}
              </span>
            </button>
            
            {showPasswordModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Acesso Restrito</h3>
                  <p className="text-sm text-slate-600 mb-4">Digite a senha de desenvolvedor para acessar configurações do Supabase.</p>
                  <input 
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full p-2 border rounded-xl mb-4"
                    placeholder="Senha"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (passwordInput === devPassword) {
                          setShowPasswordModal(false);
                          setShowSupabaseModal(true);
                          setPasswordInput('');
                        } else {
                          alert('Senha incorreta.');
                        }
                      }}
                      className="flex-1 bg-rose-500 text-white py-2 rounded-xl"
                    >
                      Acessar
                    </button>
                    <button 
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPasswordInput('');
                      }}
                      className="flex-1 bg-slate-100 py-2 rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}


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
                  userRole={userRole}
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
                  onDeleteTransaction={handleDeleteTransaction}
                  devPassword={devPassword}
                  companyName={activeCompany?.nomeFantasia}
                  inventory={inventory}
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
                      if (window.confirm("Atenção! Isso substituirá seus dados locais atuais com a última versão salva no espelho do Supabase. Deseja continuar?")) {
                        setIsSyncing(true);
                        setSyncStatusText("Baixando espelho...");
                        
                        let res = await downloadMirrorFromSupabase();
                        let usedLegacy = false;
                        
                        if (!res.success) {
                          setSyncStatusText("Buscando tabelas individuais (fallback)...");
                          const legacyRes = await downloadAllFromSupabase();
                          if (legacyRes.success) {
                            res = legacyRes;
                            usedLegacy = true;
                          }
                        }

                        setIsSyncing(false);
                        setSyncStatusText(null);
                        
                        if (res.success && res.inventory && res.lossRecords && res.sales && res.transactions) {
                          const activeTenantId = getActiveTenantId();
                          setInventory(res.inventory);
                          setLossRecords(res.lossRecords);
                          setSales(res.sales);
                          setTransactions(res.transactions);
                          setSupabaseConnected(true);
                          setSupabaseLogs(usedLegacy 
                            ? "Conectado e migrado com sucesso via tabelas legadas." 
                            : "Conectado e sincronizado com sucesso via Espelho."
                          );
                          
                          // Overwrite IndexedDB
                          await Promise.all([
                            saveLocalInventoryBulk(res.inventory, activeTenantId),
                            saveLocalLossRecordsBulk(res.lossRecords, activeTenantId),
                            saveLocalSalesBulk(res.sales, activeTenantId),
                            saveLocalTransactionsBulk(res.transactions, activeTenantId)
                          ]);

                          if (usedLegacy) {
                            // Automatically upload as mirror for subsequent lightning-fast reads
                            await uploadMirrorToSupabase(res.inventory, res.lossRecords, res.sales, res.transactions);
                          }

                          alert("🎉 Dados baixados do Supabase com sucesso!");
                        } else {
                          alert(`❌ Falha ao baixar: ${res.error || "Tabelas ou espelho não configurados no Supabase."}`);
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
                      if (window.confirm("Isso atualizará seu espelho em nuvem no Supabase com os dados locais atuais. Deseja continuar?")) {
                        setIsSyncing(true);
                        setSyncStatusText("Enviando espelho...");
                        const res = await uploadMirrorToSupabase(inventory, lossRecords, sales, transactions);
                        setIsSyncing(false);
                        setSyncStatusText(null);
                        if (res.success) {
                          setSupabaseConnected(true);
                          setSupabaseLogs("Dados locais sincronizados e enviados em formato de espelho consolidado.");
                          alert("⬆️ Espelho de dados enviado para o Supabase com tráfego zero de egress!");
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
                userRole={userRole}
              />

              {/* QR Code de Compartilhamento & Instalação PWA */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-3xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Compartilhar & Instalar no Tablet / Celular</h4>
                    <p className="text-xs text-slate-500">Gere e escaneie o QR Code abaixo para sincronizar dispositivos no seu Supabase Conectado!</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-center bg-white p-4 rounded-2xl border border-slate-100">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shrink-0">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
                        alt="QR Code de Instalação"
                        className="w-40 h-40 object-contain select-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Escaneie para Instalar</span>
                  </div>

                  {/* Informações de Link e PWA */}
                  <div className="flex-1 space-y-3 w-full text-left">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Link de Compartilhamento:</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={shareUrl}
                          onChange={(e) => setShareUrl(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                          placeholder="Digite o link do app para gerar o QR"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            setIsShareUrlCopied(true);
                            setTimeout(() => setIsShareUrlCopied(false), 2000);
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-[0.98]"
                        >
                          {isShareUrlCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          {isShareUrlCopied ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShareUrl('https://ais-pre-4qykl3wqmdg5x2wpet7vud-585518200419.us-east1.run.app')}
                          className="text-[10px] text-slate-500 hover:text-rose-600 underline font-semibold"
                        >
                          Usar Link de Produção (Pre-Built)
                        </button>
                        <span className="text-[10px] text-slate-350">•</span>
                        <button
                          onClick={() => setShareUrl(window.location.origin)}
                          className="text-[10px] text-slate-500 hover:text-rose-600 underline font-semibold"
                        >
                          Usar Link Atual (Dinâmico)
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-teal-50/45 border border-teal-100 rounded-xl space-y-1.5 text-[11px] leading-relaxed">
                      <h5 className="font-extrabold text-teal-850 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        Como instalar no Tablet / Celular:
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-slate-650 font-sans pl-1">
                        <li><strong>Android (Chrome):</strong> Toque nos 3 pontinhos no topo direito e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                        <li><strong>iOS / iPad (Safari):</strong> Toque no botão de <strong>"Compartilhar"</strong> (ícone de seta pra cima) e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                        <li><strong>Modo Offline Ativo:</strong> Uma vez instalado, o aplicativo rodará offline e carregará os dados instantaneamente, sincronizando tudo com o seu <strong>Supabase</strong> em tempo real!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

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

      {/* MODAL DE COMPARTILHAMENTO & QR CODE */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="share-qrcode-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-rose-100 max-w-lg w-full p-6 shadow-2xl relative space-y-6 text-left"
            >
              {/* Botão Fechar */}
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all pointer-events-auto cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Cabeçalho */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl relative">
                  <QrCode className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-serif">Copiar & Compartilhar Aplicativo</h3>
                  <p className="text-xs text-slate-500">Instale no tablet/celular e sincronize dados via Supabase em tempo real!</p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
                    alt="QR Code de Instalação"
                    className="w-44 h-44 object-contain select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Aponte a câmera para abrir</span>
              </div>

              {/* Campo de link e botões */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Link do Aplicativo:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono text-slate-750 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    placeholder="Link de Compartilhamento"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setIsShareUrlCopied(true);
                      setTimeout(() => setIsShareUrlCopied(false), 2000);
                    }}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-3xs"
                  >
                    {isShareUrlCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    {isShareUrlCopied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                
                {/* Botões rápidos de alternância de link */}
                <div className="flex gap-3 pt-1 justify-center">
                  <button
                    onClick={() => setShareUrl('https://ais-pre-4qykl3wqmdg5x2wpet7vud-585518200419.us-east1.run.app')}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline font-semibold"
                  >
                    Link de Produção (Recomendado)
                  </button>
                  <span className="text-[11px] text-slate-350">•</span>
                  <button
                    onClick={() => setShareUrl(window.location.origin)}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline font-semibold"
                  >
                    Link da Sessão Atual
                  </button>
                </div>
              </div>

              {/* Como instalar */}
              <div className="p-4 bg-teal-50/45 border border-teal-100 rounded-2xl space-y-2 text-xs leading-relaxed text-left">
                <h5 className="font-extrabold text-teal-850 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  Instruções para Instalação no Tablet:
                </h5>
                <ul className="list-disc list-inside space-y-1.5 text-slate-650 font-sans pl-1">
                  <li><strong>No Android (Chrome / Samsung Internet):</strong> Toque nos 3 pontinhos do menu e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li><strong>No iPad / iOS (Safari):</strong> Toque no ícone de <strong>Compartilhar</strong> (seta para cima) e escolha <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li><strong>Sincronia Offline:</strong> Após instalado, você verá o ícone na tela inicial do tablet como um aplicativo nativo super leve!</li>
                </ul>
              </div>

              {/* Botão Concluir */}
              <div className="pt-2 border-t border-rose-50 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-5 rounded-xl transition-all"
                >
                  Fechar
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
