/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, LossRecord, Sale, UserAccount } from '../types';
import { formatDateBR, getOffsetDateString } from '../utils/dateHelpers';
import { 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  FileText, 
  Calendar,
  X,
  PlusCircle,
  MinusCircle,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  User,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FinanceiroProps {
  transactions: Transaction[];
  onAddTransaction: (newTx: Transaction) => void;
  userRole?: 'admin' | 'collaborator' | null;
  lossRecords?: LossRecord[];
  sales?: Sale[];
  users?: UserAccount[];
  onLogin?: (role: 'admin' | 'collaborator', user?: UserAccount) => void;
}

export default function Financeiro({ 
  transactions, 
  onAddTransaction, 
  userRole, 
  lossRecords = [], 
  sales = [],
  users = [],
  onLogin
}: FinanceiroProps) {
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeModalType, setActiveModalType] = useState<'receita' | 'despesa'>('receita');

  // Inline Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Set default selected user
  useEffect(() => {
    if (users && users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const handleInlineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!users || users.length === 0) return;

    if (!selectedUserId) {
      setLoginError('Selecione um usuário.');
      return;
    }

    const match = users.find(u => u.id === selectedUserId);
    if (!match) {
      setLoginError('Usuário não encontrado.');
      return;
    }

    if (match.senha !== password.trim()) {
      setLoginError('Senha incorreta! Tente novamente.');
      return;
    }

    if (onLogin) {
      onLogin(match.role, match);
      setShowLoginModal(false);
      setPassword('');
    }
  };

  // New Transaction Form State
  const [formTx, setFormTx] = useState({
    valor: '',
    categoria: '',
    descricao: '',
    data: ''
  });

  // Categorias únicas presentes nas transações
  const categories = useMemo(() => {
    const list = transactions.map(t => t.categoria);
    return ['Todas', ...Array.from(new Set(list))];
  }, [transactions]);

  // Lista de Categorias Sugeridas para receita/despesa
  const suggestedCategories = {
    receita: ['Vendas PDV', 'Vendas Encomenda', 'Aulas/Workshops', 'Outras Receitas'],
    despesa: ['Matéria-Prima', 'Equipamentos', 'Desperdício de Estoque', 'Aluguel', 'Energia / Água', 'Salários / MEI', 'Taxas e Tarifas', 'Embalagens']
  };

  // Filtragem
  const filteredTransactions = useMemo(() => {
    // Ordenado por data decrescente (mais recente primeiro)
    const sorted = [...transactions].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    if (userRole === 'collaborator') {
      const todayStr = getOffsetDateString(0);
      return sorted.filter(t => t.data === todayStr && t.tipo === 'receita' && t.categoria === 'Vendas PDV');
    }

    if (userRole === null) {
      const todayStr = getOffsetDateString(0);
      return sorted.filter(t => t.data === todayStr).filter(t => {
        const matchType = filterType === 'todos' || t.tipo === filterType;
        const matchCat = selectedCategory === 'Todas' || t.categoria === selectedCategory;
        return matchType && matchCat;
      });
    }
    
    return sorted.filter(t => {
      const matchType = filterType === 'todos' || t.tipo === filterType;
      const matchCat = selectedCategory === 'Todas' || t.categoria === selectedCategory;
      return matchType && matchCat;
    });
  }, [transactions, filterType, selectedCategory, userRole]);

  // Métricas do resumo financeiro
  const summary = useMemo(() => {
    let totalIncomes = 0;
    let totalExpenses = 0;
    let todaySalesTotal = 0;
    const todayStr = getOffsetDateString(0);

    // Se usuário normal (null) ou colaborador, filtramos apenas hoje
    const relevantTransactions = userRole === null 
      ? transactions.filter(t => t.data === todayStr)
      : transactions;

    relevantTransactions.forEach(t => {
      const val = Number(t.valor) || 0;
      if (t.tipo === 'receita') {
        totalIncomes += val;
        if (t.data === todayStr && t.categoria === 'Vendas PDV') {
          todaySalesTotal += val;
        }
      } else {
        totalExpenses += val;
      }
    });

    // Reconciliação inteligente com as perdas registradas em estoque (descarte)
    const transactionOrigemIds = new Set(
      relevantTransactions
        .filter(t => t.tipo === 'despesa' || t.tipo !== 'receita')
        .map(t => t.origemId)
        .filter(Boolean)
    );

    const relevantLossRecords = userRole === null
      ? lossRecords.filter(loss => loss.data === todayStr)
      : lossRecords;

    relevantLossRecords.forEach(loss => {
      if (!transactionOrigemIds.has(loss.id)) {
        totalExpenses += Number(loss.custoTotal) || 0;
      }
    });

    const subtotal = totalIncomes - totalExpenses;

    return {
      totalIncomes,
      totalExpenses,
      subtotal,
      todaySalesTotal
    };
  }, [transactions, lossRecords, userRole]);

  // Submissão do Formulário
  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTx.valor || !formTx.categoria || !formTx.descricao) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const valueNum = parseFloat(formTx.valor);
    if (isNaN(valueNum) || valueNum <= 0) {
      alert('O valor inserido deve ser maior que zero!');
      return;
    }

    const txDate = formTx.data || new Date().toISOString().split('T')[0];

    const newTxObj: Transaction = {
      id: 't_' + Date.now().toString(),
      data: txDate,
      tipo: activeModalType,
      categoria: formTx.categoria,
      valor: valueNum,
      descricao: formTx.descricao
    };

    onAddTransaction(newTxObj);
    setShowAddModal(false);

    // Reset Form
    setFormTx({
      valor: '',
      categoria: '',
      descricao: '',
      data: ''
    });
  };

  const openFormModal = (type: 'receita' | 'despesa') => {
    setActiveModalType(type);
    setFormTx({
      valor: '',
      categoria: suggestedCategories[type][0],
      descricao: '',
      data: new Date().toISOString().split('T')[0]
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6" id="financeiro-panel-wrapper">
      
      {/* Resumos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="financeiro-summary-cards">
        {/* Total Receitas */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between pastry-glow" id="fin-metric-incomes">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {userRole === 'collaborator' ? 'Vendas do Dia (Hoje)' : userRole === null ? 'Receita de Hoje' : 'Entradas Confeitadas'}
            </span>
            <h3 className="text-2xl font-black text-rose-600 font-mono">
              R$ {(userRole === 'collaborator' ? summary.todaySalesTotal : summary.totalIncomes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">
              {userRole === 'collaborator' || userRole === null ? 'Apenas faturamento de hoje' : 'Fluxo de Caixa Positivo'}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Despesas */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between pastry-glow relative overflow-hidden" id="fin-metric-expenses">
          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {userRole === null ? 'Saídas / Custos de Hoje' : 'Custos, Perdas e Taxas'}
            </span>
            {userRole === 'collaborator' ? (
              <div className="space-y-1 pt-1">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-350" /> Acesso Reservado
                </h3>
                <span className="text-[10px] text-slate-400 block">Requer Admin</span>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-black text-slate-800 font-mono">
                  R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-[11px] text-amber-600 font-medium font-sans">
                  {userRole === null ? 'Apenas custos de hoje' : 'Inclui descarte de perecíveis'}
                </span>
              </>
            )}
          </div>
          <div className="p-3.5 bg-rose-50 text-rose-500 rounded-xl">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Saldo Líquido consolidado */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between pastry-glow relative overflow-hidden" id="fin-metric-net">
          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {userRole === null ? 'Saldo de Hoje' : 'Saldo Líquido'}
            </span>
            {userRole === 'collaborator' ? (
              <div className="space-y-1 pt-1">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-350" /> Acesso Reservado
                </h3>
                <span className="text-[10px] text-slate-400 block">Requer Admin</span>
              </div>
            ) : (
              <>
                <h3 className={`text-2xl font-black font-mono ${summary.subtotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  R$ {summary.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold font-sans">
                  {userRole === null ? 'Resultado líq. de hoje' : 'Lucro da operação confeitada'}
                </span>
              </>
            )}
          </div>
          <div className={`p-3.5 rounded-xl ${userRole === 'collaborator' ? 'bg-slate-50 text-slate-400' : (summary.subtotal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-rose-600')}`}>
            {userRole === 'collaborator' ? <Lock className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Título de seção de transações e filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-rose-100 pb-4" id="financeiro-table-header">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-serif">
            <FileText className="w-5 h-5 text-rose-500" /> 
            {userRole === null ? 'Livro Caixa (Modo Consulta Diária)' : userRole === 'collaborator' ? 'Diário de Vendas do Caixa' : 'Livro Caixa e Histórico Geral'}
          </h2>
          <p className="text-xs text-slate-500">
            {userRole === null
              ? 'Exibindo faturamento e custos da data atual de acesso. Histórico de outros dias está ocultado.'
              : userRole === 'collaborator' 
                ? 'Visualize as faturas de venda de balcão geradas hoje no seu terminal.' 
                : 'Acompanhe receitas do PDV, despesas operacionais e custos de descartes automáticos.'}
          </p>
        </div>

        {/* Shortcuts / Login Trigger */}
        <div className="flex gap-2 shrink-0 animate-fade-in" id="financeiro-quick-buttons">
          {userRole === null ? (
            <button
              id="btn-fin-invite-login"
              onClick={() => setShowLoginModal(true)}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-800 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors pointer-events-auto"
              title="Fazer login para ver histórico de outros dias"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver Histórico Completo</span>
            </button>
          ) : userRole === 'collaborator' ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              Perfil Colaborador Ativo
            </div>
          ) : (
            <>
              <button
                id="btn-fin-manual-receita"
                onClick={() => openFormModal('receita')}
                className="flex-1 sm:flex-none border border-emerald-250 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors pointer-events-auto"
              >
                <PlusCircle className="w-4 h-4 shrink-0" /> Receita
              </button>
              
              <button
                id="btn-fin-manual-despesa"
                onClick={() => openFormModal('despesa')}
                className="flex-1 sm:flex-none border border-rose-250 bg-rose-50/55 hover:bg-rose-100/50 text-rose-600 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors pointer-events-auto"
              >
                <MinusCircle className="w-4 h-4 shrink-0" /> Despesa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Caixa de filtros */}
      <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between" id="financeiro-filters">
        {userRole === null ? (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50/30 p-2 sm:p-0 rounded-xl sm:bg-transparent">
            <span className="text-xs text-amber-850 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
              Exibindo apenas lançamentos de hoje: <strong className="font-mono text-slate-800">{formatDateBR(getOffsetDateString(0))}</strong>
            </span>
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-md border border-amber-200 pointer-events-auto cursor-pointer transition-all shrink-0 animate-pulse"
            >
              DESBLOQUEAR HISTÓRICO COMPLETO
            </button>
          </div>
        ) : userRole === 'collaborator' ? (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
              Exibindo apenas vendas concluídas em: <strong className="font-mono text-slate-800">{formatDateBR(getOffsetDateString(0))} (Hoje)</strong>
            </span>
            <span className="text-[10px] bg-rose-50 text-rose-700 font-extrabold px-2 py-1 rounded-md border border-rose-150">
              CUSTOS E SALDOS TOTALIZADOS OCULTADOS POR SEGURANÇA
            </span>
          </div>
        ) : (
          <>
            <div className="flex bg-slate-100 rounded-lg p-0.5 border text-xs" id="sel-fin-tx-type">
              <button 
                id="btn-fin-filter-type-todos"
                onClick={() => setFilterType('todos')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors pointer-events-auto ${
                  filterType === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos lançamentos
              </button>
              <button 
                id="btn-fin-filter-type-rec"
                onClick={() => setFilterType('receita')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors pointer-events-auto ${
                  filterType === 'receita' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Somente Receitas
              </button>
              <button 
                id="btn-fin-filter-type-des"
                onClick={() => setFilterType('despesa')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors pointer-events-auto ${
                  filterType === 'despesa' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Somente Despesas / Perdas
              </button>
            </div>

            {/* Filtro de Categoria */}
            <div className="flex items-center gap-2 text-xs" id="sel-fin-cat-wrapper">
              <span className="font-bold text-slate-600 hidden md:inline">Categoria:</span>
              <select
                id="sel-fin-category-filter"
                className="bg-white border rounded-lg font-semibold px-2 py-1.5 focus:outline-hidden text-slate-700 pointer-events-auto cursor-pointer"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Fluxone de Transações na Tabela */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-xs overflow-hidden font-sans" id="financeiro-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="financeiro-transactions-table">
            <thead>
              <tr className="bg-rose-50/40 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-rose-100">
                <th className="py-3.5 px-4 font-sans">Data</th>
                <th className="py-3.5 px-4 font-sans">Descrição</th>
                <th className="py-3.5 px-4 font-sans">Categoria</th>
                <th className="py-3.5 px-4 text-rose-500 font-sans">Origem / Integração</th>
                <th className="py-3.5 px-4 text-right font-sans">Valor do Lançamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50 text-xs text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400" id="financeiro-empty-row">
                    Nenhuma movimentação financeira encontrada correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-rose-50/10 transition-colors" id={`fin-row-${tx.id}`}>
                    {/* Data */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                      {formatDateBR(tx.data)}
                    </td>

                    {/* Descricao */}
                    <td className="py-3.5 px-4 font-sans max-w-xs md:max-w-sm">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900 leading-tight">
                        <span>{tx.descricao}</span>
                        {tx.origemId && tx.origemId.startsWith('sale_') && sales && (
                          (() => {
                            const sale = sales.find(s => s.id === tx.origemId);
                            if (sale && sale.mesaOuCliente) {
                              return (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide border border-amber-200 font-sans shadow-3xs uppercase">
                                  {sale.mesaOuCliente}
                                </span>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                      {tx.origemId && tx.origemId.startsWith('sale_') && sales && (
                        (() => {
                          const sale = sales.find(s => s.id === tx.origemId);
                          if (sale && sale.itens && sale.itens.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px] text-rose-600 font-medium">
                                <span className="text-slate-400 font-sans text-[9px] uppercase tracking-wider block mr-1 mt-0.5">Faturado:</span>
                                {sale.itens.map((it, idx) => (
                                  <span key={idx} className="bg-rose-50 border border-rose-100/40 px-1 py-0.2 rounded-xs whitespace-nowrap">
                                    {it.quantidade}x {it.nome}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="py-3.5 px-4">
                      <span className="bg-rose-50 text-rose-700 border border-rose-100/60 px-2 py-1 rounded-md text-[10px] font-bold uppercase font-sans">
                        {tx.categoria}
                      </span>
                    </td>

                    {/* Origem / Integração */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      {tx.origemId ? (
                        tx.origemId.startsWith('sale_') ? (
                          <span className="text-emerald-600 font-semibold text-[10px] flex items-center gap-1 font-sans">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Venda PDV
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px] flex items-center gap-1 font-sans">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span> Perda de Perecível
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px] italic font-sans">Lançamento Direto</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-mono font-bold text-sm ${tx.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {tx.tipo === 'receita' ? '+' : '-'} R$ {tx.valor.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ADIÇÃO DE TRANSAÇÃO MANUAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="tx-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border max-w-sm w-full"
              id="fin-add-modal-card"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                  <DollarSign className={`w-5 h-5 ${activeModalType === 'receita' ? 'text-emerald-600' : 'text-rose-500'}`} />
                  Lançar {activeModalType === 'receita' ? 'Entrada (Receita)' : 'Saída (Despesa)'}
                </h3>
                <button 
                  id="btn-tx-modal-close" 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitTx} className="space-y-4 text-xs" id="frm-tx-submit">
                
                {/* Valor */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Valor em Reais R$ (Obrigatório)</label>
                  <input 
                    id="inp-tx-valor"
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    required
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-hidden focus:bg-white text-base font-bold font-mono text-slate-900"
                    value={formTx.valor}
                    onChange={e => setFormTx({ ...formTx, valor: e.target.value })}
                  />
                </div>

                {/* Categorias */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Categoria (Selecione ou digite uma nova)</label>
                  <select
                    id="sel-tx-categoria"
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-hidden focus:bg-white font-bold pointer-events-auto"
                    value={formTx.categoria}
                    onChange={e => setFormTx({ ...formTx, categoria: e.target.value })}
                  >
                    {suggestedCategories[activeModalType].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Descrição */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Breve Descrição do Lançamento</label>
                  <input 
                    id="inp-tx-desc"
                    type="text" 
                    placeholder="Ex: Compra de embalagens para bolos, conta de luz..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-hidden focus:bg-white"
                    value={formTx.descricao}
                    onChange={e => setFormTx({ ...formTx, descricao: e.target.value })}
                  />
                </div>

                {/* Data */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Data do Fato Gerador</label>
                  <input 
                    id="inp-tx-data"
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl focus:outline-hidden focus:bg-white font-mono"
                    value={formTx.data}
                    onChange={e => setFormTx({ ...formTx, data: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t" id="tx-modal-btn-row">
                  <button
                    type="button"
                    id="btn-tx-modal-cancel"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all pointer-events-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-tx-modal-submit"
                    className={`py-2.5 px-5 font-bold text-white rounded-xl transition-all pointer-events-auto ${
                      activeModalType === 'receita' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-500 hover:bg-rose-600'
                    }`}
                  >
                    Lançar Movimentação
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="inline-login-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border max-w-sm w-full font-sans"
              id="inline-login-card"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-1000 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
                  Acesso Restrito
                </h3>
                <button 
                  id="btn-inline-login-close" 
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginError(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Digite sua credencial de colaborador ou administrador para visualizar o histórico de datas passadas e cadastrar novas transações.
              </p>

              <form onSubmit={handleInlineLogin} className="space-y-4 text-xs" id="frm-inline-login">
                {users && users.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-rose-500" /> Selecione o Usuário
                    </label>
                    <select
                      className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2 px-3 font-semibold text-slate-800 text-xs transition-all cursor-pointer pointer-events-auto"
                      value={selectedUserId}
                      onChange={e => {
                        setSelectedUserId(e.target.value);
                        setLoginError(null);
                      }}
                    >
                      {users.map(u => (
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
                      id="inp-inline-login-password"
                      type={showPassword ? 'text' : 'password'} 
                      className="w-full bg-rose-50/20 border border-rose-100 focus:border-rose-300 focus:bg-white focus:outline-hidden rounded-xl py-2.5 pl-3.5 pr-10 font-mono text-center font-bold text-slate-800 text-base transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setLoginError(null);
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

                {loginError && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-xs text-red-700 font-semibold" id="inline-login-error">
                    <span className="shrink-0">⚠️</span>
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-3 border-t font-sans" id="inline-login-btn-row">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all pointer-events-auto cursor-pointer font-bold"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all pointer-events-auto cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    Autenticar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
