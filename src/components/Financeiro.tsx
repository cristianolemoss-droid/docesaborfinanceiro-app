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
  LogIn,
  Printer,
  Share2,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface FinanceiroProps {
  transactions: Transaction[];
  onAddTransaction: (newTx: Transaction) => void;
  userRole?: 'admin' | 'collaborator' | 'developer' | null;
  lossRecords?: LossRecord[];
  sales?: Sale[];
  users?: UserAccount[];
  onLogin?: (role: 'admin' | 'collaborator' | 'developer', user?: UserAccount) => void;
  devPassword?: string;
  companyName?: string;
}

export default function Financeiro({ 
  transactions, 
  onAddTransaction, 
  userRole, 
  lossRecords = [], 
  sales = [],
  users = [],
  onLogin,
  devPassword,
  companyName
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

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'filter' | 'today' | 'all'>('filter');
  const [copySuccess, setCopySuccess] = useState(false);

  const getReportData = () => {
    let dataList = [...transactions];
    let titleStr = "Histórico Geral Completo";

    if (reportType === 'filter') {
      dataList = filteredTransactions;
      titleStr = `Livro Caixa Filtrado (${filterType === 'todos' ? 'Lançamentos' : filterType === 'receita' ? 'Receitas' : 'Despesas'} - ${selectedCategory})`;
    } else if (reportType === 'today') {
      const todayStr = getOffsetDateString(0);
      dataList = transactions.filter(t => t.data === todayStr);
      titleStr = `Livro Caixa do Dia (${formatDateBR(todayStr)})`;
    }

    // Sort by date descending
    dataList = [...dataList].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    let income = 0;
    let expense = 0;
    dataList.forEach(t => {
      const val = Number(t.valor) || 0;
      if (t.tipo === 'receita') income += val;
      else expense += val;
    });

    if (reportType === 'today' || reportType === 'all' || (reportType === 'filter' && filterType !== 'receita')) {
      const todayStr = getOffsetDateString(0);
      const relevantLosses = reportType === 'today' 
        ? lossRecords.filter(loss => loss.data === todayStr)
        : (reportType === 'filter' ? [] : lossRecords);
      
      const transactionOrigemIds = new Set(dataList.map(t => t.origemId).filter(Boolean));
      relevantLosses.forEach(loss => {
        if (!transactionOrigemIds.has(loss.id)) {
          expense += Number(loss.custoTotal) || 0;
        }
      });
    }

    const net = income - expense;

    return {
      dataList,
      title: titleStr,
      sums: { income, expense, net }
    };
  };

  const generatePDF = (title: string, dataList: Transaction[], sums: { income: number; expense: number; net: number }) => {
    const doc = new jsPDF();
    
    const margin = 15;
    let y = 20;
    
    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(companyName || 'Doce Sabor Confeitaria', margin, y);
    
    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title, margin, y);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, y + 5);
    
    y += 12;
    // Divider
    doc.setDrawColor(244, 63, 94); // rose-500
    doc.setLineWidth(0.5);
    doc.line(margin, y, 210 - margin, y);
    
    y += 10;
    
    // Summary boxes
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, y, 180, 22, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('RESUMO FINANCEIRO', margin + 5, y + 6);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Entradas: R$ ${sums.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y + 14);
    doc.text(`Total Saídas: R$ ${sums.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 65, y + 14);
    
    doc.setFont('Helvetica', 'bold');
    if (sums.net >= 0) {
      doc.setTextColor(22, 101, 52); // green-800
    } else {
      doc.setTextColor(153, 27, 27); // red-800
    }
    doc.text(`Saldo Líquido: R$ ${sums.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 125, y + 14);
    
    y += 30;
    
    // Table header
    doc.setFillColor(244, 63, 94); // rose-500
    doc.roundedRect(margin, y, 180, 8, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DATA', margin + 4, y + 5.5);
    doc.text('DESCRIÇÃO', margin + 28, y + 5.5);
    doc.text('CATEGORIA', margin + 110, y + 5.5);
    doc.text('VALOR', margin + 155, y + 5.5);
    
    y += 8;
    
    // Table rows
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    
    dataList.forEach((tx, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        
        doc.setFillColor(244, 63, 94); // rose-500
        doc.roundedRect(margin, y, 180, 8, 1, 1, 'F');
        
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('DATA', margin + 4, y + 5.5);
        doc.text('DESCRIÇÃO', margin + 28, y + 5.5);
        doc.text('CATEGORIA', margin + 110, y + 5.5);
        doc.text('VALOR', margin + 155, y + 5.5);
        
        y += 8;
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
      }
      
      if (idx % 2 === 1) {
        doc.setFillColor(254, 242, 242); // rose-50
        doc.rect(margin, y, 180, 7.5, 'F');
      }
      
      doc.setFontSize(8.5);
      doc.text(formatDateBR(tx.data), margin + 4, y + 5);
      
      let desc = tx.descricao || '';
      if (desc.length > 40) {
        desc = desc.substring(0, 38) + '...';
      }
      doc.text(desc, margin + 28, y + 5);
      
      let cat = tx.categoria || '';
      if (cat.length > 22) {
        cat = cat.substring(0, 20) + '...';
      }
      doc.text(cat, margin + 110, y + 5);
      
      const isReceita = tx.tipo === 'receita';
      doc.setFont('Helvetica', 'bold');
      if (isReceita) {
        doc.setTextColor(21, 128, 61); // green-700
        doc.text(`+ R$ ${tx.valor.toFixed(2)}`, margin + 155, y + 5);
      } else {
        doc.setTextColor(220, 38, 38); // red-600
        doc.text(`- R$ ${tx.valor.toFixed(2)}`, margin + 155, y + 5);
      }
      
      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'normal');
      
      y += 7.5;
    });
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado via Sistema Doce Sabor - Painel Administrativo`, margin, 287);
    
    doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleCopySummaryText = (title: string, dataList: Transaction[], sums: { income: number; expense: number; net: number }) => {
    let text = `📊 *RELATÓRIO FINANCEIRO - ${companyName || 'Doce Sabor'}*\n`;
    text += `📅 Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
    text += `📝 Tipo: ${title}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `💰 *RESUMO GERAL:*\n`;
    text += `🟢 Entradas: R$ ${sums.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `🔴 Saídas: R$ ${sums.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `💎 Saldo Líquido: R$ ${sums.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📋 *LANÇAMENTOS RECENTES:*\n`;
    
    if (dataList.length === 0) {
      text += `Nenhum lançamento encontrado.\n`;
    } else {
      dataList.slice(0, 30).forEach(tx => {
        const icon = tx.tipo === 'receita' ? '🟢' : '🔴';
        text += `${icon} *${formatDateBR(tx.data)}* - R$ ${tx.valor.toFixed(2)}\n`;
        text += `└ _${tx.descricao}_ [${tx.categoria}]\n`;
      });
      if (dataList.length > 30) {
        text += `\n...e mais ${dataList.length - 30} lançamentos no relatório completo.`;
      }
    }
    
    text += `\n\n_Gerado automaticamente pelo Sistema de Gestão Confeitaria._`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Set default selected user
  useEffect(() => {
    if (users && users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const handleInlineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanPass = password.trim();
    if (devPassword && cleanPass === devPassword) {
      if (onLogin) {
        onLogin('developer', {
          id: 'u_developer',
          username: 'desenvolvedor',
          nome: 'Desenvolvedor do Sistema',
          senha: devPassword,
          role: 'developer'
        });
        setShowLoginModal(false);
        setPassword('');
      }
      return;
    }

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

              <button
                id="btn-fin-report"
                onClick={() => setShowReportModal(true)}
                className="flex-1 sm:flex-none border border-rose-250 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors pointer-events-auto shadow-xs"
              >
                <Printer className="w-4 h-4 shrink-0" /> Relatório
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

        {showReportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto no-print"
            id="report-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border max-w-2xl w-full font-sans my-8"
              id="report-modal-card"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Printer className="w-5 h-5 text-rose-500" />
                  Imprimir e Compartilhar Relatório
                </h3>
                <button 
                  id="btn-report-modal-close" 
                  onClick={() => setShowReportModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Seletor de Escopo do Relatório */}
              <div className="space-y-3 mb-6">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Selecione o Escopo do Relatório:
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl text-xs font-bold border border-slate-150">
                  <button
                    type="button"
                    onClick={() => setReportType('filter')}
                    className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      reportType === 'filter' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Filtro Atual ({filteredTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('today')}
                    className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      reportType === 'today' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Hoje ({transactions.filter(t => t.data === getOffsetDateString(0)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('all')}
                    className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      reportType === 'all' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Tudo ({transactions.length})
                  </button>
                </div>
              </div>

              {/* Preview da Impressão (Scrollable) */}
              <div className="border rounded-2xl bg-slate-50 p-4 max-h-72 overflow-y-auto mb-6 text-slate-800 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Pré-visualização do Relatório:
                </span>
                
                {(() => {
                  const { title: rTitle, dataList: rData, sums: rSums } = getReportData();
                  return (
                    <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-2xs font-sans text-xs">
                      {/* Cabecalho Simulado */}
                      <div className="border-b pb-3 mb-4 text-center md:text-left md:flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-rose-600 uppercase">
                            {companyName || 'Doce Sabor Confeitaria'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold font-sans">Relatório Administrativo de Caixa</p>
                        </div>
                        <div className="text-right mt-2 md:mt-0 font-mono text-[9px] text-slate-400 font-bold">
                          <div>Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
                          <div>Período: {rTitle}</div>
                        </div>
                      </div>

                      {/* Resumo Financeiro */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border mb-4 text-[10px]">
                        <div>
                          <span className="text-slate-500 uppercase block font-bold font-sans">Receitas (+)</span>
                          <span className="text-xs font-black text-emerald-700 font-mono">
                            R$ {rSums.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase block font-bold font-sans">Despesas (-)</span>
                          <span className="text-xs font-black text-rose-700 font-mono">
                            R$ {rSums.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase block font-bold font-sans">Saldo</span>
                          <span className={`text-xs font-black font-mono ${rSums.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            R$ {rSums.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Lista Simplificada */}
                      <div className="space-y-1.5 font-sans">
                        <div className="grid grid-cols-4 font-extrabold text-[9px] uppercase text-slate-400 border-b pb-1">
                          <span>Data</span>
                          <span className="col-span-2">Descrição</span>
                          <span className="text-right">Valor</span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                          {rData.length === 0 ? (
                            <p className="text-center text-slate-400 py-4 italic">Nenhum lançamento.</p>
                          ) : (
                            rData.map(tx => (
                              <div key={tx.id} className="grid grid-cols-4 py-1.5 text-[9.5px] items-center">
                                <span className="font-mono font-medium text-slate-500">{formatDateBR(tx.data)}</span>
                                <span className="col-span-2 font-semibold text-slate-800 truncate">{tx.descricao}</span>
                                <span className={`text-right font-mono font-bold ${tx.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {tx.tipo === 'receita' ? '+' : '-'} R$ {tx.valor.toFixed(2)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between pt-4 border-t">
                {/* Botão de WhatsApp / Copiar */}
                <button
                  type="button"
                  onClick={() => {
                    const { title, dataList, sums } = getReportData();
                    handleCopySummaryText(title, dataList, sums);
                  }}
                  className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-xl transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-emerald-600" />
                      <span>Compartilhar (WhatsApp)</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all pointer-events-auto cursor-pointer font-bold"
                  >
                    Fechar
                  </button>
                  
                  {/* Download PDF */}
                  <button
                    type="button"
                    onClick={() => {
                      const { title, dataList, sums } = getReportData();
                      generatePDF(title, dataList, sums);
                    }}
                    className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar PDF</span>
                  </button>

                  {/* Print trigger */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="py-2.5 px-5 font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AREA DE IMPRESSÃO - OCULTA NA TELA, SÓ APARECE NA IMPRESSORA */}
      <div id="printable-report-area" className="hidden print:block bg-white p-8 font-sans text-xs text-slate-900 leading-relaxed">
        {(() => {
          const { title: rTitle, dataList: rData, sums: rSums } = getReportData();
          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-rose-600 uppercase tracking-tight">
                    {companyName || 'Doce Sabor Confeitaria'}
                  </h1>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Relatório Oficial de Caixa & Histórico Geral</p>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono font-medium">
                  <div>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</div>
                  <div className="font-bold text-slate-700">Período: {rTitle}</div>
                </div>
              </div>

              {/* Sumários */}
              <div className="grid grid-cols-3 gap-4 border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Faturamento (Entradas)</span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    R$ {rSums.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Custos e Saídas (Despesas)</span>
                  <span className="text-base font-black text-rose-700 font-mono">
                    R$ {rSums.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Resultado de Exercício (Saldo Líquido)</span>
                  <span className={`text-base font-black font-mono ${rSums.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    R$ {rSums.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Tabela de transações */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b pb-1">Movimentações do Período</h3>
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2 pr-2">Data</th>
                      <th className="py-2">Descrição</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nenhum lançamento no escopo selecionado.</td>
                      </tr>
                    ) : (
                      rData.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2 pr-2 font-mono whitespace-nowrap text-slate-500">{formatDateBR(tx.data)}</td>
                          <td className="py-2 font-semibold text-slate-900">{tx.descricao}</td>
                          <td className="py-2 text-slate-600">{tx.categoria}</td>
                          <td className={`py-2 text-right font-mono font-bold ${tx.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {tx.tipo === 'receita' ? '+' : '-'} R$ {tx.valor.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rodapé institucional */}
              <div className="border-t pt-4 mt-8 flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                <span>Doce Sabor - Sistema de Gestão Inteligente</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          );
        })()}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
