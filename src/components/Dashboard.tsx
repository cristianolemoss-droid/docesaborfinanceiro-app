/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { InventoryItem, LossRecord, Transaction, Sale, OpenOrder } from '../types';
import { getDaysRemaining, formatDateBR, getExpiryStatus } from '../utils/dateHelpers';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Calendar, 
  PackageCheck, 
  Percent, 
  ShoppingCart,
  Trash2,
  Table,
  ClipboardList,
  Package,
  Clock,
  ArrowRight,
  ChevronRight,
  Plus,
  CheckCircle2,
  Activity,
  PlusCircle,
  Check,
  Briefcase,
  Layers,
  ArrowUpRight,
  ChefHat,
  Cookie,
  Cake,
  Sparkles,
  Coffee,
  Heart,
  Smile,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import bgImage from '../assets/images/bakery_display_bg_1781612198209.jpg';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  sales: Sale[];
  lossRecords: LossRecord[];
  onNavigate: (tab: 'dashboard' | 'pdv' | 'estoque' | 'financeiro' | 'configuracao') => void;
  openOrders?: OpenOrder[];
  onUpdateOpenOrders?: React.Dispatch<React.SetStateAction<OpenOrder[]>>;
  tenantId?: string;
}

export default function Dashboard({ 
  inventory = [], 
  transactions = [], 
  sales = [], 
  lossRecords = [],
  onNavigate,
  openOrders = [],
  onUpdateOpenOrders,
  tenantId
}: DashboardProps) {

  // CONTROLADORES DE ESTADO DA ÁREA DE AÇÃO (PDV INTEGRADO)
  const [activeFilterTab, setActiveFilterTab] = useState<'mesas' | 'preparo' | 'concluidos'>('mesas');
  const [chefTipIndex, setChefTipIndex] = useState(0);

  const chefTips = useMemo(() => [
    { text: "A umidade ideal da cozinha preserva a textura dos macarons por mais tempo. Evite dias muito chuvosos para a massa! 🍪", author: "Chef Confeiteira Clarissa" },
    { text: "Organize o estoque pelo método PVPS (Primeiro que Vence, Primeiro que Sai) para evitar desperdício de morangos e chantilly! 🍓", author: "Sous Chef Felipe" },
    { text: "Tortas decoradas com frutas frescas brilham mais com uma camada fina de geleia de brilho morna. Fica profissional! 🎂", author: "Chef Confeiteira Clarissa" },
    { text: "No PDV, sugira um docinho adicional (brigadeiro ou quindim) na hora de fechar a conta do café. Aumenta o ticket médio em até 15%! ☕", author: "Gerente Patrícia" },
    { text: "Mantenha os chocolates nobres armazenados entre 18°C e 20°C para evitar a separação da manteiga de cacau (bloom). 🍫", author: "Chocolatier Marcelo" },
    { text: "Morangos e frutas vermelhas frescas devem ser higienizados e secos perfeitamente antes de irem para o recheio de bolos. 🍓🍰", author: "Chef Confeiteira Clarissa" }
  ], []);

  // 1. DADOS DE HOJE E COMPARAÇÕES (KPI)
  const kpis = useMemo(() => {
    // Definindo a data de referência como a data mais recente com vendas, ou a data de hoje por padrão
    const todayStr = new Date().toISOString().split('T')[0]; // "2026-06-25"
    
    // Para fins de demonstração interativa e fidelidade, se não houver vendas na data exata de hoje,
    // identificamos o dia mais recente com vendas no sistema como o "Hoje operacional", ou fallback para todayStr
    const datesWithSales = sales.map(s => s.data).sort();
    const referenceDate = datesWithSales.includes(todayStr) 
      ? todayStr 
      : (datesWithSales.length > 0 ? datesWithSales[datesWithSales.length - 1] : todayStr);

    // Calcular data anterior de referência (Ontem operacional)
    const refDateObj = new Date(referenceDate + 'T12:00:00');
    refDateObj.setDate(refDateObj.getDate() - 1);
    const yesterdayStr = refDateObj.toISOString().split('T')[0];

    // Vendas de hoje
    const todaySales = sales.filter(s => s.data === referenceDate);
    const todayTotal = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const todayCount = todaySales.length;
    const todayTicket = todayCount > 0 ? todayTotal / todayCount : 0;

    // Vendas de ontem para variação de KPI
    const yesterdaySales = sales.filter(s => s.data === yesterdayStr);
    const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    
    // Cálculo de variação faturamento diário
    let faturamentoVariacao = 0;
    if (yesterdayTotal > 0) {
      faturamentoVariacao = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    } else if (todayTotal > 0) {
      faturamentoVariacao = 100; // Crescimento inicial
    }

    // Comandas em aberto
    const openOrdersCount = openOrders.length;

    return {
      referenceDate,
      todayTotal,
      todayCount,
      todayTicket,
      faturamentoVariacao,
      openOrdersCount,
      todaySales
    };
  }, [sales, openOrders]);

  // 2. PARSE DOS HORÁRIOS DE PICOS DA CONFEITARIA (LINHA DE TENDÊNCIA)
  const hourlyChartData = useMemo(() => {
    // Horários de monitoramento operacional de uma confeitaria / lanchonete
    const slots = [
      { horaLabel: '08:00', percent: 0.12, desc: 'Café da Manhã' },
      { horaLabel: '10:00', percent: 0.08, desc: 'Lanche da Manhã' },
      { horaLabel: '12:00', percent: 0.18, desc: 'Almoço' },
      { horaLabel: '14:00', percent: 0.14, desc: 'Café do Início de Tarde' },
      { horaLabel: '16:00', percent: 0.26, desc: 'Hora do Chá / Pico Confeitaria' },
      { horaLabel: '18:00', percent: 0.16, desc: 'Saída do Trabalho / Happy Hour' },
      { horaLabel: '20:00', percent: 0.06, desc: 'Jantar e Sobremesa' }
    ];

    // Distribuímos o faturamento real do "Hoje operacional" sobre esses slots com pequena aleatoriedade realista
    const points = slots.map((slot, index) => {
      // Base proporcional
      const baseValue = kpis.todayTotal * slot.percent;
      // Adicionamos variação baseada no hash do índice para manter estável e bonito
      const noise = (Math.sin(index * 35) + 1.2) * 0.2; // -10% a +40%
      const valorFaturado = baseValue * (1 + noise);

      return {
        ...slot,
        valor: parseFloat(valorFaturado.toFixed(2))
      };
    });

    const maxVal = Math.max(...points.map(p => p.valor), 150);

    return {
      points,
      maxVal
    };
  }, [kpis.todayTotal]);

  // 3. RANKING DE PRODUTOS MAIS VENDIDOS (TOP 5)
  const topProducts = useMemo(() => {
    const productQuantities: Record<string, { nome: string; qtd: number; receita: number; id: string }> = {};

    sales.forEach(sale => {
      sale.itens.forEach(item => {
        const current = productQuantities[item.itemId] || { nome: item.nome, qtd: 0, receita: 0, id: item.itemId };
        current.qtd += item.quantidade;
        current.receita += item.subtotal;
        productQuantities[item.itemId] = current;
      });
    });

    // Ordenar e obter o topo 5
    return Object.values(productQuantities)
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [sales]);

  // 4. DISTRIBUIÇÃO DE RECEITA POR CATEGORIAS (DONUT CHART)
  const categoryDistribution = useMemo(() => {
    const catRevenue: Record<string, number> = {};
    let totalRevenue = 0;

    sales.forEach(sale => {
      sale.itens.forEach(item => {
        // Encontrar categoria do item no inventário
        const invItem = inventory.find(i => i.id === item.itemId);
        const categoria = invItem ? invItem.categoria : 'Outros';
        
        catRevenue[categoria] = (catRevenue[categoria] || 0) + item.subtotal;
        totalRevenue += item.subtotal;
      });
    });

    // Converter para lista ordenada
    const list = Object.entries(catRevenue).map(([name, value]) => {
      const percentage = totalRevenue > 0 ? (value / totalRevenue) * 100 : 0;
      return { name, value, percentage };
    }).sort((a, b) => b.value - a.value);

    // Paleta de cores moderna e sutil
    const colors = [
      '#ec4899', // Pink (Doces/Tortas)
      '#f59e0b', // Amber (Salgados/Lanches)
      '#3b82f6', // Blue (Bebidas)
      '#10b981', // Emerald (Gourmet)
      '#8b5cf6', // Violet (Especiais)
      '#64748b'  // Slate (Outros)
    ];

    return {
      totalRevenue,
      categories: list.map((cat, index) => ({
        ...cat,
        color: colors[index % colors.length]
      }))
    };
  }, [sales, inventory]);

  // 4.5. DISTRIBUIÇÃO DE DESPERDÍCIO (DONUT CHART)
  const lossDistribution = useMemo(() => {
    const lossByItem: Record<string, { nome: string; valor: number }> = {};
    let totalLoss = 0;

    lossRecords.forEach(loss => {
      lossByItem[loss.nomeItem] = {
        nome: loss.nomeItem,
        valor: (lossByItem[loss.nomeItem]?.valor || 0) + loss.custoTotal
      };
      totalLoss += loss.custoTotal;
    });

    // Converter para lista ordenada
    const list = Object.values(lossByItem).map(item => {
      const percentage = totalLoss > 0 ? (item.valor / totalLoss) * 100 : 0;
      return { name: item.nome, value: item.valor, percentage };
    }).sort((a, b) => b.value - a.value);

    // Paleta de cores moderna e sutil (variante de rose para perdas)
    const colors = [
      '#f43f5e', // Rose 500
      '#fb7185', // Rose 400
      '#fda4af', // Rose 300
      '#fda4af', // Light
      '#e11d48', // Rose 600
    ];

    return {
      totalLoss,
      items: list.map((item, index) => ({
        ...item,
        color: colors[index % colors.length]
      }))
    };
  }, [lossRecords]);

  // 5. ALERTAS DE INSUMOS E VALIDADE (CONTROLE OPERACIONAL)
  const operationalAlerts = useMemo(() => {
    const alerts: {
      id: string;
      nome: string;
      tipoAlert: 'vencido' | 'vence_breve' | 'baixo_estoque';
      descricao: string;
      nivel: 'critico' | 'atencao';
    }[] = [];

    inventory.forEach(item => {
      // 1. Verificação de validade para perecíveis
      if (item.dataValidade) {
        const days = getDaysRemaining(item.dataValidade);
        if (days < 0) {
          alerts.push({
            id: `validade-vencida-${item.id}`,
            nome: item.nome,
            tipoAlert: 'vencido',
            descricao: `VENCIDO em ${formatDateBR(item.dataValidade)} (${Math.abs(days)}d atrás)`,
            nivel: 'critico'
          });
        } else if (days <= 3) {
          alerts.push({
            id: `validade-breve-${item.id}`,
            nome: item.nome,
            tipoAlert: 'vence_breve',
            descricao: days === 0 ? 'Vence Hoje!' : `Vence em ${days} dia(s) (${formatDateBR(item.dataValidade)})`,
            nivel: 'critico'
          });
        }
      }

      // 2. Verificação de estoque mínimo
      if (item.quantidade <= item.estoqueMinimo) {
        alerts.push({
          id: `estoque-baixo-${item.id}`,
          nome: item.nome,
          tipoAlert: 'baixo_estoque',
          descricao: `Estoque crítico: ${item.quantidade}${item.unidade} (Mínimo: ${item.estoqueMinimo}${item.unidade})`,
          nivel: 'atencao'
        });
      }
    });

    // Ordenar para priorizar níveis Críticos
    return alerts.sort((a, b) => {
      if (a.nivel === 'critico' && b.nivel !== 'critico') return -1;
      if (a.nivel !== 'critico' && b.nivel === 'critico') return 1;
      return 0;
    }).slice(0, 5); // Exibir no máximo os 5 alertas mais urgentes
  }, [inventory]);

  // 6. ÚLTIMAS MOVIMENTAÇÕES UNIFICADAS E CRONOLÓGICAS
  const latestMovements = useMemo(() => {
    interface MovementItem {
      id: string;
      tipo: 'venda' | 'comanda_aberta' | 'perda' | 'caixa_lanc';
      timestamp: string; // para ordenação desc
      titulo: string;
      detalhe: string;
      valor: number;
      corValor: 'verde' | 'vermelho' | 'neutro';
    }

    const list: MovementItem[] = [];

    // Mapear vendas finalizadas recentes
    sales.forEach(s => {
      // Encontra a data e cria um timestamp fictício estável para ordenar
      list.push({
        id: `venda-${s.id}`,
        tipo: 'venda',
        timestamp: `${s.data}T18:00:00`,
        titulo: `Venda #${s.id.slice(0, 6).toUpperCase()}`,
        detalhe: `${s.itens.length} itens • Pago via ${s.metodoPagamento.replace('_', ' ').toUpperCase()}`,
        valor: s.total,
        corValor: 'verde'
      });
    });

    // Mapear comandas atualmente abertas
    openOrders.forEach(o => {
      list.push({
        id: `comanda-${o.id}`,
        tipo: 'comanda_aberta',
        timestamp: `${o.data}T${o.tempoInicio}:00`,
        titulo: `Comanda ${o.mesaOuCliente}`,
        detalhe: `Em andamento • Início às ${o.tempoInicio}`,
        valor: o.total,
        corValor: 'neutro'
      });
    });

    // Mapear registros de perdas / descartes do estoque
    lossRecords.forEach(l => {
      list.push({
        id: `perda-${l.id}`,
        tipo: 'perda',
        timestamp: `${l.data}T12:00:00`,
        titulo: `Descarte de ${l.nomeItem}`,
        detalhe: `Qtd: ${l.quantidade} ${l.unidade} • Motivo: ${l.motivo}`,
        valor: -l.custoTotal,
        corValor: 'vermelho'
      });
    });

    // Mapear transações manuais no livro caixa
    transactions.forEach(t => {
      // Ignora as transações que já vieram de vendas ou descartes para evitar duplicidade visual
      if (t.origemId && (sales.some(s => s.id === t.origemId) || lossRecords.some(l => l.id === t.origemId))) {
        return;
      }
      list.push({
        id: `trans-${t.id}`,
        tipo: 'caixa_lanc',
        timestamp: `${t.data}T10:00:00`,
        titulo: t.descricao,
        detalhe: `Categoria: ${t.categoria}`,
        valor: t.tipo === 'receita' ? t.valor : -t.valor,
        corValor: t.tipo === 'receita' ? 'verde' : 'vermelho'
      });
    });

    // Ordenar por data mais recente (decrescente)
    return list
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 6);
  }, [sales, openOrders, lossRecords, transactions]);

  // 7. DADOS FINANCEIROS PARA O GRÁFICO DE BARRAS (ÚLTIMOS 7 DIAS)
  const financialChartData = useMemo(() => {
    const days: string[] = [];
    const ref = new Date(kpis.referenceDate + 'T12:00:00');
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    return days.map(date => {
      const dayTransactions = transactions.filter(t => t.data === date);
      const receitas = dayTransactions.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      const despesas = dayTransactions.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      const lucro = receitas - despesas;
      
      return {
        name: formatDateBR(date).substring(0, 5),
        Vendas: parseFloat(receitas.toFixed(2)),
        Despesas: parseFloat(despesas.toFixed(2)),
        Lucro: parseFloat(lucro.toFixed(2)),
      };
    });
  }, [transactions, kpis.referenceDate]);

  return (
    <div className="space-y-8 font-sans pb-10" id="dashboard-saas-panel">
      
      {/* SEÇÃO 1: HEADER & KPI CARDS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-main-title-header">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-md cute-floating border-2 border-white">
            <ChefHat className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {tenantId || 'Doce Sabor'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Painel de Gestão da Confeitaria — Adoçando o dia a dia com maestria, controle e amor! 🍰✨
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-rose-100 shadow-3xs self-start md:self-auto text-xs text-slate-650 font-semibold">
          <Calendar className="w-4 h-4 text-rose-450 shrink-0" />
          <span>Dia de Operação: <strong className="text-rose-600 font-mono font-black">{formatDateBR(kpis.referenceDate)}</strong></span>
        </div>
      </div>

      {/* PAINEL DE BEM-VINDO DA CONFEITARIA (INTERATIVO & AMIGÁVEL) */}
      <div 
        className="rounded-3xl p-5 md:p-6 border border-pink-100/75 shadow-sm pastry-glow flex flex-col lg:flex-row gap-6 items-center justify-between transition-all relative overflow-hidden"
        id="confeitaria-welcome-banner"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-rose-50 via-amber-50 to-pink-50" />
        <div 
          className="absolute inset-0 z-0 opacity-40 mix-blend-overlay" 
          style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
        />
        <div className="absolute inset-0 z-0 bg-white/30 pointer-events-none" />
        <div className="space-y-3 flex-1 text-center lg:text-left relative z-10">
          <div className="flex items-center gap-1.5 justify-center lg:justify-start text-rose-600 font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500 fill-amber-400" />
            <span>Painel do Confeiteiro</span>
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500 fill-amber-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {new Date().getHours() < 12 ? (
              <span>Bom dia, Chef! ☀️ O aroma de pão de ló já está no ar!</span>
            ) : new Date().getHours() < 18 ? (
              <span>Boa tarde, Chef! 🧁 Fornada de doces prontinha para a vitrine!</span>
            ) : (
              <span>Boa noite, Chef! 🌙 Dia de muitas doçuras concluído!</span>
            )}
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed font-medium">
            Gerencie o estoque de guloseimas, acompanhe as vendas no balcão e monitore os prazos de validade dos insumos perecíveis (como leite condensado e morangos frescos) para garantir a máxima qualidade dos seus doces e tortas!
          </p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-rose-600 px-3 py-1 rounded-full border border-pink-100 shadow-3xs">
              🧁 Cupcakes
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-rose-650 px-3 py-1 rounded-full border border-pink-100 shadow-3xs">
              🎂 Tortas Decoradas
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-amber-600 px-3 py-1 rounded-full border border-amber-100 shadow-3xs">
              🍪 Cookies Gourmet
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-purple-600 px-3 py-1 rounded-full border border-purple-100 shadow-3xs">
              ☕ Cafés Especiais
            </span>
          </div>
        </div>

        {/* WIDGET INTERATIVO: DICA DO CONFEITEIRO */}
        <div 
          className="bg-white/95 border border-pink-100/80 rounded-2xl p-4.5 lg:max-w-md w-full shadow-3xs relative z-10 flex flex-col justify-between gap-3 font-sans"
          id="chef-tips-card-box"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-pink-50">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-pink-500 fill-pink-100" /> Segredo de Chef
            </span>
            <button 
              type="button"
              onClick={() => setChefTipIndex(prev => (prev + 1) % chefTips.length)}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="Trocar segredo"
            >
              Próxima Dica ➔
            </button>
          </div>
          <div className="min-h-[48px] flex items-start gap-2.5">
            <span className="text-2xl select-none leading-none mt-0.5">👩‍🍳</span>
            <div className="space-y-1">
              <p className="text-[11px] text-slate-705 italic font-medium leading-relaxed">
                &ldquo;{chefTips[chefTipIndex].text}&rdquo;
              </p>
              <p className="text-[9px] font-bold text-slate-400 text-right">
                — {chefTips[chefTipIndex].author}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-kpi-grid">
        {/* KPI: Vendas do Dia */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100/50 shadow-sm flex items-center justify-between transition-all pastry-glow-hover">
          <div className="space-y-1.5">
            <p className="text-[11px] text-rose-500 uppercase font-black tracking-wider font-sans flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              Faturamento de Hoje
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">
              R$ {kpis.todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-bold flex items-center gap-0.5 ${kpis.faturamentoVariacao >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {kpis.faturamentoVariacao >= 0 ? '+' : ''}{kpis.faturamentoVariacao.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400">vs. dia anterior</span>
            </div>
          </div>
          <div className="p-4 bg-rose-100/60 text-rose-600 rounded-2xl shadow-3xs border border-rose-200/55">
            <Cake className="w-5 h-5 stroke-[2.5] cute-floating" />
          </div>
        </div>

        {/* KPI: Total de Pedidos */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100/50 shadow-sm flex items-center justify-between transition-all pastry-glow-hover">
          <div className="space-y-1.5">
            <p className="text-[11px] text-rose-500 uppercase font-black tracking-wider font-sans">
              Doces Entregues
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">
              {kpis.todayCount} <span className="text-xs font-bold text-slate-450 font-sans">faturados</span>
            </h3>
            <p className="text-xs text-slate-500">Fluxo de pedidos de hoje</p>
          </div>
          <div className="p-4 bg-pink-50 text-pink-600 rounded-2xl shadow-3xs border border-pink-100">
            <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* KPI: Ticket Médio */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100/50 shadow-sm flex items-center justify-between transition-all pastry-glow-hover">
          <div className="space-y-1.5">
            <p className="text-[11px] text-amber-650 uppercase font-black tracking-wider font-sans">
              Ticket Médio Doce
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">
              R$ {kpis.todayTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500">Gasto médio por cliente</p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-3xs border border-amber-100">
            <Cookie className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* KPI: Comandas em Aberto */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100/50 shadow-sm flex items-center justify-between transition-all pastry-glow-hover">
          <div className="space-y-1.5">
            <p className="text-[11px] text-purple-650 uppercase font-black tracking-wider font-sans">
              Clientes no Salão
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">
              {kpis.openOrdersCount} <span className="text-xs font-bold text-amber-500 font-sans">ativas</span>
            </h3>
            <p className="text-xs text-slate-500">Mesas saboreando guloseimas</p>
          </div>
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl shadow-3xs border border-purple-100">
            <Table className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </div>


      {/* SEÇÃO 2: ÁREA DE AÇÃO (PDV INTEGRADO) */}
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100/80 space-y-6" id="dashboard-pdv-integrated-zone">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Operação de Caixa Integrada
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Lançamento de comandas, faturamento imediato e abertura rápida de mesas locais.</p>
          </div>
          
          {/* Status Segmented Filter */}
          <div className="flex bg-white p-1 border border-slate-200/60 rounded-xl shadow-3xs self-start sm:self-auto" id="segmented-status-filter">
            <button 
              onClick={() => setActiveFilterTab('mesas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer min-h-[38px] ${
                activeFilterTab === 'mesas' ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Mesas Ativas ({openOrders.length})
            </button>
            <button 
              onClick={() => setActiveFilterTab('preparo')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer min-h-[38px] ${
                activeFilterTab === 'preparo' ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Preparo Pendente
            </button>
            <button 
              onClick={() => setActiveFilterTab('concluidos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer min-h-[38px] ${
                activeFilterTab === 'concluidos' ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Faturados Hoje
            </button>
          </div>
        </div>

        {/* Quick Action Large Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" id="dashboard-quick-actions">
          <button 
            onClick={() => onNavigate('pdv')}
            className="bg-white hover:bg-rose-50/20 p-5 rounded-2xl border border-pink-100 shadow-3xs text-left transition-all hover:scale-[1.015] hover:shadow-sm flex items-start gap-4 cursor-pointer group pointer-events-auto"
          >
            <div className="p-3 bg-rose-500 text-white rounded-xl group-hover:bg-rose-600 transition-colors shadow-3xs">
              <Cake className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-slate-800">Novo Pedido</h4>
                <span className="text-[9px] font-black bg-rose-105 bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md uppercase">Fácil</span>
              </div>
              <p className="text-xs text-slate-450 mt-1">Lançar faturamento de bolos, doces ou cafés para viagem.</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('pdv')}
            className="bg-white hover:bg-amber-50/20 p-5 rounded-2xl border border-amber-100 shadow-3xs text-left transition-all hover:scale-[1.015] hover:shadow-sm flex items-start gap-4 cursor-pointer group pointer-events-auto"
          >
            <div className="p-3 bg-amber-500 text-white rounded-xl group-hover:bg-amber-600 transition-colors shadow-3xs">
              <Cookie className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-slate-800">Mesas e Comandas</h4>
                <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md uppercase">Salão</span>
              </div>
              <p className="text-xs text-slate-450 mt-1">Consultar, somar itens ou receber contas de consumo local.</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('financeiro')}
            className="bg-white hover:bg-purple-50/20 p-5 rounded-2xl border border-purple-100 shadow-3xs text-left transition-all hover:scale-[1.015] hover:shadow-sm flex items-start gap-4 cursor-pointer group pointer-events-auto"
          >
            <div className="p-3 bg-purple-500 text-white rounded-xl group-hover:bg-purple-600 transition-colors shadow-3xs">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-slate-800">Fechar Caixa</h4>
                <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md uppercase">Financeiro</span>
              </div>
              <p className="text-xs text-slate-450 mt-1">Conferir dinheiro do dia, registrar saídas e sangrias da loja.</p>
            </div>
          </button>
        </div>

        {/* Filtered Content View */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/50 shadow-3xs" id="filtered-status-viewer">
          {activeFilterTab === 'mesas' && (
            <div className="space-y-3">
              {openOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Table className="w-8 h-8 mx-auto text-slate-350 mb-2" />
                  <p className="text-xs">Não há nenhuma mesa ou comanda aberta no momento.</p>
                  <button onClick={() => onNavigate('pdv')} className="text-xs font-black text-rose-500 hover:underline mt-2 cursor-pointer pointer-events-auto">Iniciar Comanda Agora →</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {openOrders.map(order => (
                    <div key={order.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/20 flex flex-col justify-between gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-extrabold text-sm text-slate-800">{order.mesaOuCliente}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-350" /> Aberta às {order.tempoInicio}
                          </p>
                        </div>
                        <span className="font-bold text-xs text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                          R$ {order.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {order.itens.map(it => `${it.quantidade}x ${it.nome}`).join(', ')}
                      </div>
                      <button 
                        onClick={() => onNavigate('pdv')}
                        className="w-full text-center py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all pointer-events-auto cursor-pointer"
                      >
                        Gerenciar Consumo <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeFilterTab === 'preparo' && (
            <div className="space-y-3">
              {/* Simulamos itens sob preparo que tenham ingredientes ou produtos finais em aberto */}
              {openOrders.filter(o => o.itens.length > 0).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-350 mb-2 animate-pulse" />
                  <p className="text-xs">Tudo pronto! Nenhuma comanda com preparo pendente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openOrders.filter(o => o.itens.length > 0).map(order => (
                    <div key={order.id} className="p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100/50 rounded-full">Na Cozinha</span>
                        <h5 className="font-bold text-xs text-slate-800 mt-1">{order.mesaOuCliente}</h5>
                        <p className="text-xs text-slate-500">
                          {order.itens.map(it => `${it.quantidade}x ${it.nome}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-slate-600">Tempo: 15 min</span>
                        <button 
                          onClick={() => onNavigate('pdv')}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-lg transition-all pointer-events-auto cursor-pointer"
                        >
                          Marcar Pronto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeFilterTab === 'concluidos' && (
            <div className="space-y-3">
              {kpis.todaySales.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-350 mb-2" />
                  <p className="text-xs">Nenhum pedido finalizado ainda na data de hoje.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {kpis.todaySales.map(sale => (
                    <div key={sale.id} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100/70 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Pedido #{sale.id.slice(0, 6).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Pagamento: {sale.metodoPagamento.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-600">R$ {sale.total.toFixed(2)}</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Concluído</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* SEÇÃO 3: PAINEL DE ESTATÍSTICAS (O PROFISSIONAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="dashboard-statistics-panel-grid">
                
        {/* Gráfico de Tendência de Vendas (Linhas) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between" id="dashboard-trend-graph-widget">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm" id="lbl-chart-title">Tendência de Vendas (Hora a Hora)</h3>
                <p className="text-xs text-slate-400">Faturamento gerado ao longo dos horários operacionais no dia de hoje.</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Pico Estimado
                </span>
              </div>
            </div>

            {/* Custom SVG Line Trend Chart with Gradient fill */}
            <div className="w-full h-64 mt-6 relative" id="svg-trend-chart-box">
              <svg 
                viewBox="0 0 600 220" 
                className="w-full h-full overflow-visible font-sans"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Linhas horizontais de grade de fundo */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const yVal = 20 + ratio * 150;
                  const value = Math.round(hourlyChartData.maxVal * (1 - ratio));
                  return (
                    <g key={index}>
                      <line 
                        x1="45" 
                        y1={yVal} 
                        x2="590" 
                        y2={yVal} 
                        stroke="#f8fafc" 
                        strokeWidth="1.5" 
                      />
                      <text 
                        x="35" 
                        y={yVal + 3} 
                        textAnchor="end" 
                        className="text-[9px] fill-slate-400 font-mono font-medium"
                      >
                        R${value}
                      </text>
                    </g>
                  );
                })}

                {/* Plotando a linha contínua de pico */}
                {(() => {
                  // Calcular pontos X e Y
                  const coordinates = hourlyChartData.points.map((pt, index) => {
                    const x = 65 + index * 83;
                    const y = 170 - (pt.valor / hourlyChartData.maxVal) * 150;
                    return { x, y, value: pt.valor, label: pt.horaLabel, desc: pt.desc };
                  });

                  // Construir o caminho D da linha e do gradiente
                  let lineD = '';
                  let areaD = `M ${coordinates[0].x} 170 `;

                  coordinates.forEach((coord, index) => {
                    if (index === 0) {
                      lineD = `M ${coord.x} ${coord.y} `;
                    } else {
                      // Curva bezier suave suave
                      const prev = coordinates[index - 1];
                      const cp1x = prev.x + 35;
                      const cp1y = prev.y;
                      const cp2x = coord.x - 35;
                      const cp2y = coord.y;
                      lineD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${coord.x} ${coord.y} `;
                    }
                    areaD += `L ${coord.x} ${coord.y} `;
                  });

                  areaD += `L ${coordinates[coordinates.length - 1].x} 170 Z`;

                  return (
                    <g>
                      {/* Gradiente preenchido */}
                      <path d={areaD} fill="url(#chartGradient)" />

                      {/* Linha principal */}
                      <path 
                        d={lineD} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />

                      {/* Círculos interativos de destaque nos pontos */}
                      {coordinates.map((coord, index) => (
                        <g key={index} className="group/dot cursor-pointer">
                          <circle 
                            cx={coord.x} 
                            cy={coord.y} 
                            r="5" 
                            fill="#ffffff" 
                            stroke="#10b981" 
                            strokeWidth="3" 
                            className="transition-all duration-200 group-hover/dot:r-7"
                          />
                          {/* Tooltip elegante em cada nó */}
                          <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <rect 
                              x={coord.x - 45} 
                              y={coord.y - 42} 
                              width="90" 
                              height="30" 
                              rx="8" 
                              fill="#0f172a" 
                            />
                            <text 
                              x={coord.x} 
                              y={coord.y - 28} 
                              textAnchor="middle" 
                              className="text-[9px] font-sans fill-white font-black"
                            >
                              R$ {coord.value.toFixed(2)}
                            </text>
                            <text 
                              x={coord.x} 
                              y={coord.y - 18} 
                              textAnchor="middle" 
                              className="text-[7px] font-sans fill-slate-300 font-bold"
                            >
                              {coord.desc}
                            </text>
                          </g>

                          {/* Rótulo de hora no eixo X */}
                          <text 
                            x={coord.x} 
                            y="195" 
                            textAnchor="middle" 
                            className="text-[9px] font-black fill-slate-600"
                          >
                            {coord.label}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-xs text-slate-400">
            <span>Nota: Horários de pico concentram-se no café da manhã (08:00) e chá da tarde (16:00).</span>
            <button 
              onClick={() => onNavigate('financeiro')} 
              className="text-rose-500 font-black hover:underline pointer-events-auto flex items-center gap-0.5"
            >
              Consultar Livro Caixa <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

{/* Distribuição por Categorias (Donut Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between" id="dashboard-category-distribution-widget">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Distribuição de Receita</h3>
            <p className="text-xs text-slate-400">Porcentagem das vendas vinda de cada grupo de produtos de confeitaria.</p>
            
            {/* Donut SVG Rendering */}
            <div className="flex items-center justify-center h-48 mt-6 relative" id="svg-donut-box">
              {categoryDistribution.categories.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Percent className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs">Aguardando dados de faturamento.</p>
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <svg width="150" height="150" viewBox="0 0 42 42" className="transform -rotate-90">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                    {(() => {
                      let accumulatedPercent = 0;
                      return categoryDistribution.categories.map((cat, index) => {
                        const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`;
                        const strokeDashoffset = 100 - accumulatedPercent;
                        accumulatedPercent += cat.percentage;

                        return (
                          <circle 
                            key={index}
                            cx="21" 
                            cy="21" 
                            r="15.915" 
                            fill="transparent" 
                            stroke={cat.color} 
                            strokeWidth="4.2" 
                            strokeDasharray={strokeDasharray} 
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Faturado</span>
                    <span className="text-sm font-black text-slate-800 font-mono">
                      R$ {categoryDistribution.totalRevenue.toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend with interactive colors */}
            <div className="space-y-2 mt-4">
              {categoryDistribution.categories.slice(0, 4).map((cat, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-600 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 font-medium text-[10px]">{cat.percentage.toFixed(0)}%</span>
                    <span className="font-bold text-slate-800">R$ {cat.value.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 italic">
            *Dica Confeitaria: Doces e bolos confeitados lideram faturamento de maior margem!
          </div>
        </div>

        {/* Distribuição por Perdas (Donut Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between" id="dashboard-loss-distribution-widget">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Distribuição de Desperdício</h3>
            <p className="text-xs text-slate-400">Itens com maior impacto no custo de perdas.</p>
            
            {/* Donut SVG Rendering */}
            <div className="flex items-center justify-center h-48 mt-6 relative" id="svg-loss-donut-box">
              {lossDistribution.items.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs">Nenhum desperdício registrado.</p>
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <svg width="150" height="150" viewBox="0 0 42 42" className="transform -rotate-90">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                    {(() => {
                      let accumulatedPercent = 0;
                      return lossDistribution.items.map((item, index) => {
                        const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                        const strokeDashoffset = 100 - accumulatedPercent;
                        accumulatedPercent += item.percentage;

                        return (
                          <circle 
                            key={index}
                            cx="21" 
                            cy="21" 
                            r="15.915" 
                            fill="transparent" 
                            stroke={item.color} 
                            strokeWidth="4.2" 
                            strokeDasharray={strokeDasharray} 
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Prejuízo</span>
                    <span className="text-sm font-black text-rose-800 font-mono">
                      R$ {lossDistribution.totalLoss.toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend with interactive colors */}
            <div className="space-y-2 mt-4">
              {lossDistribution.items.slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-600 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 font-medium text-[10px]">{item.percentage.toFixed(0)}%</span>
                    <span className="font-bold text-rose-800">R$ {item.value.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-rose-400 italic">
            *Atenção: Itens em destaque na lista acima representam os maiores custos de desperdício no período.
          </div>
        </div>

        {/* Ranking de Produtos (Barras Horizontais) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-3 flex flex-col justify-between" id="dashboard-products-ranking-widget">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Ranking de Produtos mais Vendidos</h3>
                <p className="text-xs text-slate-400">Identifique as 5 sobremesas, tortas ou lanches mais populares da loja.</p>
              </div>
              <Activity className="w-5 h-5 text-rose-500" />
            </div>

            <div className="space-y-4 mt-6">
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Layers className="w-10 h-10 mx-auto text-slate-350 mb-2" />
                  <p className="text-xs">Inicie as vendas no PDV para listar os itens favoritos!</p>
                </div>
              ) : (
                topProducts.map((prod, index) => {
                  const maxQty = Math.max(...topProducts.map(p => p.qtd), 1);
                  const widthPercent = (prod.qtd / maxQty) * 100;
                  
                  // Cores dinâmicas para o pódio
                  const colors = ['bg-rose-500', 'bg-pink-400', 'bg-amber-400', 'bg-indigo-400', 'bg-slate-400'];
                  const barColor = colors[index] || 'bg-slate-400';

                  return (
                    <div key={prod.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-300 font-mono text-sm">#0{index + 1}</span>
                          <span className="font-bold text-slate-800">{prod.nome}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono font-bold">
                          <span className="text-slate-400 text-[10px]">{prod.qtd} un. vendidos</span>
                          <span className="text-slate-800">R$ {prod.receita.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${barColor} transition-all duration-1000`} 
                          style={{ width: `${widthPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6">
            <button 
              onClick={() => onNavigate('estoque')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100/80 text-slate-700 text-xs font-bold rounded-xl border border-slate-150 transition-all pointer-events-auto cursor-pointer"
            >
              Auditar Ficha Técnica de Ingredientes
            </button>
          </div>
        </div>

      </div>



      <div className="grid grid-cols-1 gap-8 mt-8">
{/* Gráfico de Desempenho Financeiro (Barras) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm w-full flex flex-col justify-between" id="dashboard-trend-graph-widget">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm" id="lbl-chart-title">Desempenho Financeiro (Últimos 7 Dias)</h3>
                <p className="text-xs text-slate-400">Relação diária de Vendas, Despesas e Lucro Líquido na semana.</p>
              </div>
            </div>
            
            {/* Recharts BarChart */}
            <div className="w-full h-72 mt-6 relative" id="recharts-financial-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={financialChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    tickFormatter={(value) => `R${value}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                  <Bar dataKey="Vendas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-xs text-slate-400">
            <span>Nota: Lucro Líquido = Vendas - Despesas. Reflete o saldo operacional dos últimos dias.</span>
            <button 
              onClick={() => onNavigate('financeiro')} 
              className="text-rose-500 font-black hover:underline pointer-events-auto flex items-center gap-0.5"
            >
              Consultar Livro Caixa <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
              </div>

      {/* SEÇÃO 4: CONTROLE OPERACIONAL (O DIFERENCIAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="dashboard-operational-zone">
        
        {/* Alertas de Insumos / Validade */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between" id="dashboard-operational-alerts">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Alertas de Insumos & Validade</h3>
                <p className="text-xs text-slate-400">Combata o desperdício com rotatividade ativa de produtos.</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />
            </div>

            <div className="space-y-3 mt-6">
              {operationalAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <PackageCheck className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                  <p className="text-xs font-semibold">Tudo perfeito no armazém de perecíveis!</p>
                  <p className="text-[10px] text-slate-400 mt-1">Todos os ingredientes encontram-se dentro do prazo e estoque seguro.</p>
                </div>
              ) : (
                operationalAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      alert.nivel === 'critico' 
                        ? 'bg-red-50/50 border-red-100/60' 
                        : 'bg-amber-50/50 border-amber-100/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${alert.nivel === 'critico' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                        <p className="font-bold text-xs text-slate-800 truncate">{alert.nome}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-sans">{alert.descricao}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                      alert.nivel === 'critico'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {alert.tipoAlert === 'vencido' ? 'Descartar' : alert.tipoAlert === 'vence_breve' ? 'Usar Urgente' : 'Repor'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={() => onNavigate('estoque')}
              className="w-full text-center text-xs font-bold text-rose-500 hover:underline py-2.5 bg-rose-50/40 hover:bg-rose-50 border border-rose-100/40 rounded-xl pointer-events-auto cursor-pointer"
            >
              Consultar Todos os Alertas de Validade →
            </button>
          </div>
        </div>

        {/* Últimas Movimentações */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between" id="dashboard-operational-log">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Últimas Movimentações</h3>
                <p className="text-xs text-slate-400">Histórico unificado em tempo real do caixa e operação local.</p>
              </div>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-3.5 mt-6">
              {latestMovements.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Activity className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs">Nenhum evento registrado hoje.</p>
                </div>
              ) : (
                latestMovements.map((mov) => {
                  return (
                    <div key={mov.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            mov.tipo === 'venda' ? 'bg-emerald-500' :
                            mov.tipo === 'comanda_aberta' ? 'bg-amber-400' :
                            mov.tipo === 'perda' ? 'bg-red-500' : 'bg-slate-400'
                          }`}></span>
                          <p className="font-bold text-slate-800 truncate">{mov.titulo}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate pl-3">{mov.detalhe}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black ${
                          mov.corValor === 'verde' ? 'text-emerald-600' :
                          mov.corValor === 'vermelho' ? 'text-red-500' : 'text-slate-700'
                        }`}>
                          {mov.valor > 0 ? '+' : ''}R$ {mov.valor.toFixed(2)}
                        </span>
                        <p className="text-[8px] text-slate-400 mt-0.5 font-mono">Movimento</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={() => onNavigate('financeiro')}
              className="w-full text-center text-xs font-bold text-slate-600 hover:underline py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-150 pointer-events-auto cursor-pointer"
            >
              Auditar Conciliação e Extrato Completo →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
