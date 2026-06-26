/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { InventoryItem, LossRecord, Transaction } from '../types';
import { getDaysRemaining, formatDateBR, getExpiryStatus } from '../utils/dateHelpers';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Search, 
  X, 
  ArrowDownCircle, 
  ArrowRightCircle, 
  ShieldCheck,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to resolve beautiful realistic product images based on category or name
function getItemImage(item: InventoryItem): string {
  if (item.imagem) {
    return item.imagem;
  }
  const name = item.nome.toLowerCase();
  const cat = item.categoria.toLowerCase();
  
  if (name.includes('velvet')) {
    return 'https://images.unsplash.com/photo-1616031036253-7cde99ff30ef?w=400&auto=format&fit=crop&q=80'; // Slice of Red Velvet Cake
  }
  if (name.includes('pote') || name.includes('ninho')) {
    return 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80'; // Cake in a pot / Glass dessert
  }
  if (name.includes('brigadeiro') || name.includes('gourmet')) {
    return 'https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=400&auto=format&fit=crop&q=80'; // Brigadeiro truffle
  }
  if (name.includes('cupcake')) {
    return 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=400&auto=format&fit=crop&q=80'; // Cupcake
  }
  if (name.includes('holandesa') || name.includes('torta holandesa')) {
    return 'https://images.unsplash.com/photo-1519869325930-281384150729?w=400&auto=format&fit=crop&q=80'; // Pie / Torta
  }
  if (name.includes('cheesecake')) {
    return 'https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=400&auto=format&fit=crop&q=80'; // Cheesecake
  }
  if (cat.includes('bolo') || name.includes('bolo')) {
    return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80'; // Cake
  }
  if (cat.includes('doce') || name.includes('doce') || name.includes('torta')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80'; // Pastry
  }
  if (cat.includes('bebida') || name.includes('refrigerante') || name.includes('coca') || name.includes('café') || name.includes('suco') || name.includes('água')) {
    return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80'; // Refreshment / Coffee
  }
  if (name.includes('lanche') || name.includes('salgado') || name.includes('misto') || name.includes('pão')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80'; // Savory / Hamburger
  }
  return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
}

const IMAGE_PRESETS = [
  { name: 'Bolo de Chocolate', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80' },
  { name: 'Red Velvet Cake', url: 'https://images.unsplash.com/photo-1616031036253-7cde99ff30ef?w=400&auto=format&fit=crop&q=80' },
  { name: 'Muffin Cupcake', url: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=400&auto=format&fit=crop&q=80' },
  { name: 'Brigadeiro / Trufa', url: 'https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=400&auto=format&fit=crop&q=80' },
  { name: 'Torta de Limão / Frutas', url: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=400&auto=format&fit=crop&q=80' },
  { name: 'Cheesecake', url: 'https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=400&auto=format&fit=crop&q=80' },
  { name: 'Salgados / Hambúrguer', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
  { name: 'Café / Bebidas / Refresco', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80' },
];

interface EstoqueProps {
  inventory: InventoryItem[];
  onUpdateInventory: (updatedInventory: InventoryItem[]) => void;
  onAddLossRecord: (newLoss: LossRecord, expenseTransaction: Transaction) => void;
}

export default function Estoque({ inventory, onUpdateInventory, onAddLossRecord }: EstoqueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'ingrediente' | 'produto_final'>('todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [selectedItemForLoss, setSelectedItemForLoss] = useState<InventoryItem | null>(null);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    nome: '',
    tipo: 'ingrediente' as 'ingrediente' | 'produto_final',
    quantidade: '',
    unidade: 'kg' as 'kg' | 'un' | 'L' | 'g' | 'ml',
    custoUnitario: '',
    precoVenda: '',
    estoqueMinimo: '',
    dataFabricacao: '',
    dataValidade: '',
    categoria: '',
    imagem: ''
  });

  // Loss Form State
  const [lossData, setLossData] = useState({
    quantidade: '',
    motivo: 'Validade Vencida' as 'Validade Vencida' | 'Dano físico' | 'Erro na Produção' | 'Outro'
  });

  // Edit Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState({
    nome: '',
    tipo: 'ingrediente' as 'ingrediente' | 'produto_final',
    quantidade: '',
    unidade: 'kg' as 'kg' | 'un' | 'L' | 'g' | 'ml',
    custoUnitario: '',
    precoVenda: '',
    estoqueMinimo: '',
    dataFabricacao: '',
    dataValidade: '',
    categoria: '',
    imagem: ''
  });

  // Categorias únicas
  const categories = useMemo(() => {
    const list = inventory.map(i => i.categoria);
    return ['Todas', ...Array.from(new Set(list))];
  }, [inventory]);

  // Categorias únicas existentes para preenchimento rápido (evitando digitação manual repetida)
  const existingCategories = useMemo(() => {
    const list = inventory.map(i => i.categoria ? i.categoria.trim() : '').filter(Boolean);
    return Array.from(new Set(list));
  }, [inventory]);

  // Filtragem
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'todos' || item.tipo === filterType;
      const matchCat = selectedCategory === 'Todas' || item.categoria === selectedCategory;
      return matchSearch && matchType && matchCat;
    });
  }, [inventory, searchTerm, filterType, selectedCategory]);

  // Adicionar novo item
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.nome || !newItem.quantidade || !newItem.custoUnitario || !newItem.dataValidade || !newItem.categoria) {
      alert('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    const itemObj: InventoryItem = {
      id: 'item_' + Date.now().toString(),
      nome: newItem.nome,
      tipo: newItem.tipo,
      quantidade: parseFloat(newItem.quantidade),
      unidade: newItem.unidade,
      custoUnitario: parseFloat(newItem.custoUnitario),
      precoVenda: newItem.tipo === 'produto_final' ? parseFloat(newItem.precoVenda || '0') : undefined,
      estoqueMinimo: parseFloat(newItem.estoqueMinimo || '0'),
      dataFabricacao: newItem.dataFabricacao || undefined,
      dataValidade: newItem.dataValidade,
      categoria: newItem.categoria,
      imagem: newItem.imagem || undefined
    };

    onUpdateInventory([...inventory, itemObj]);
    setShowAddModal(false);
    
    // reset form
    setNewItem({
      nome: '',
      tipo: 'ingrediente',
      quantidade: '',
      unidade: 'kg',
      custoUnitario: '',
      precoVenda: '',
      estoqueMinimo: '',
      dataFabricacao: '',
      dataValidade: '',
      categoria: '',
      imagem: ''
    });
  };

  // Upload local de imagem e conversão para Base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, imagem: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Abrir modal de edição com dados populados
  const openEditModal = (item: InventoryItem) => {
    setSelectedItemForEdit(item);
    setEditItem({
      nome: item.nome,
      tipo: item.tipo,
      quantidade: item.quantidade.toString(),
      unidade: item.unidade,
      custoUnitario: item.custoUnitario.toString(),
      precoVenda: item.precoVenda ? item.precoVenda.toString() : '',
      estoqueMinimo: item.estoqueMinimo.toString(),
      dataFabricacao: item.dataFabricacao || '',
      dataValidade: item.dataValidade,
      categoria: item.categoria,
      imagem: item.imagem || ''
    });
    setShowEditModal(true);
  };

  // Enviar alterações do produto/lote
  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForEdit) return;
    if (!editItem.nome || !editItem.quantidade || !editItem.custoUnitario || !editItem.dataValidade || !editItem.categoria) {
      alert('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    const updatedInventory = inventory.map(item => {
      if (item.id === selectedItemForEdit.id) {
        return {
          ...item,
          nome: editItem.nome,
          tipo: editItem.tipo,
          quantidade: parseFloat(editItem.quantidade || '0'),
          unidade: editItem.unidade,
          custoUnitario: parseFloat(editItem.custoUnitario || '0'),
          precoVenda: editItem.tipo === 'produto_final' ? parseFloat(editItem.precoVenda || '0') : undefined,
          estoqueMinimo: parseFloat(editItem.estoqueMinimo || '0'),
          dataFabricacao: editItem.dataFabricacao || undefined,
          dataValidade: editItem.dataValidade,
          categoria: editItem.categoria,
          imagem: editItem.imagem || undefined
        };
      }
      return item;
    });

    onUpdateInventory(updatedInventory);
    setShowEditModal(false);
    setSelectedItemForEdit(null);
  };

  // Upload local de imagem para edição
  const handleEditImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditItem(prev => ({ ...prev, imagem: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Abrir modal de perda para um item específico
  const openLossModal = (item: InventoryItem) => {
    setSelectedItemForLoss(item);
    setLossData({ quantidade: '', motivo: 'Validade Vencida' });
    setShowLossModal(true);
  };

  // Enviar descarte / registro de perda (Integração Financeira)
  const handleLossSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForLoss) return;
    
    const lossQty = parseFloat(lossData.quantidade);
    if (isNaN(lossQty) || lossQty <= 0) {
      alert('Insira uma quantidade de perda válida!');
      return;
    }

    if (lossQty > selectedItemForLoss.quantidade) {
      alert('Quantidade de perda não pode exceder o estoque disponível!');
      return;
    }

    // Calcular custo real da perda
    const totalLostCost = lossQty * selectedItemForLoss.custoUnitario;

    // Criar registro de perda
    const lossRecordId = 'loss_' + Date.now().toString();
    const newLoss: LossRecord = {
      id: lossRecordId,
      itemId: selectedItemForLoss.id,
      nomeItem: selectedItemForLoss.nome,
      quantidade: lossQty,
      unidade: selectedItemForLoss.unidade,
      data: newDateIsoString(),
      motivo: lossData.motivo,
      custoTotal: totalLostCost
    };

    // Criar despesa financeira automatica (Integração Finaça-Estoque!)
    const expenseTransaction: Transaction = {
      id: 't_loss_' + Date.now().toString(),
      data: newDateIsoString(),
      tipo: 'despesa',
      categoria: 'Desperdício de Estoque',
      valor: totalLostCost,
      descricao: `Perda: ${lossQty}${selectedItemForLoss.unidade} de ${selectedItemForLoss.nome} (${lossData.motivo})`,
      origemId: lossRecordId
    };

    // Atualizar inventário retirando a quantidade descartada
    const updatedInventory = inventory.map(item => {
      if (item.id === selectedItemForLoss.id) {
        return {
          ...item,
          quantidade: Math.max(item.quantidade - lossQty, 0)
        };
      }
      return item;
    });

    onUpdateInventory(updatedInventory);
    onAddLossRecord(newLoss, expenseTransaction);
    setShowLossModal(false);
    setSelectedItemForLoss(null);
  };

  // Excluir item de estoque por completo
  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Tem certeza que deseja remover este item permanentemente do acervo/estoque?')) {
      const updated = inventory.filter(i => i.id !== itemId);
      onUpdateInventory(updated);
    }
  };

  // Helper para data atual formatada localmente
  const newDateIsoString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="space-y-6" id="estoque-panel-wrapper">
      
      {/* Barra superior com contador e botão de inserção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="estoque-header-actions">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-500" /> Controle de Estoque Perecível
          </h2>
          <p className="text-xs text-slate-500">Monitoramento ativo de lotes, datas de validade de insumos e produtos prontos.</p>
        </div>
        
        <button
          id="btn-estoque-add-trigger"
          onClick={() => setShowAddModal(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-3 px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all pointer-events-auto shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" /> Adicionar Lote / Item
        </button>
      </div>

      {/* Caixa de filtros e pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-rose-50 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between" id="estoque-filters">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            id="inp-estoque-search"
            type="text" 
            placeholder="Buscar por lote, insumo, morango, bolo..."
            className="w-full bg-slate-50 text-xs text-slate-800 pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-rose-400 focus:bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2" id="estoque-filter-buttons">
          {/* Seletor de Tipo */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border" id="sel-estoque-type">
            <button
              id="btn-filter-type-todos"
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors pointer-events-auto ${
                filterType === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              id="btn-filter-type-ing"
              onClick={() => setFilterType('ingrediente')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors pointer-events-auto ${
                filterType === 'ingrediente' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Insumos (Fórmula)
            </button>
            <button
              id="btn-filter-type-prod"
              onClick={() => setFilterType('produto_final')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors pointer-events-auto ${
                filterType === 'produto_final' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Finais (Venda)
            </button>
          </div>

          {/* Seletor Categoria */}
          <select
            id="sel-estoque-category"
            className="bg-white border rounded-lg text-xs font-semibold px-2 py-1.5 focus:outline-hidden text-slate-700 pointer-events-auto"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela Principal / Lista de Itens */}
      <div className="bg-white rounded-2xl border border-rose-50 shadow-xs overflow-hidden" id="estoque-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="estoque-data-table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Nome do Lote / Insumo</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-center">Quantidade</th>
                <th className="py-3 px-4">Custo Unit.</th>
                <th className="py-3 px-4">R$ Venda</th>
                <th className="py-3 px-4 text-center">Alertas de Validade</th>
                <th className="py-3 px-4 text-right">Ações de Perda / Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-sans text-slate-700">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400" id="estoque-empty-row">
                    Nenhum item do estoque foi encontrado correspondente aos filtros ativos.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const status = getExpiryStatus(item.dataValidade);
                  const isLow = item.quantidade <= item.estoqueMinimo;
                  const isExpired = getDaysRemaining(item.dataValidade) < 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors" id={`estoque-row-${item.id}`}>
                      {/* Nome */}
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-150 relative shrink-0 shadow-3xs">
                            <img 
                              src={getItemImage(item)} 
                              alt={item.nome}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{item.nome}</span>
                            <span className="text-[10px] font-mono text-slate-400">Cod: {item.id}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Tipo */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold ${
                          item.tipo === 'ingrediente' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.tipo === 'ingrediente' ? 'Insumo' : 'Venda'}
                        </span>
                      </td>

                      {/* Categoria */}
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {item.categoria}
                      </td>

                      {/* Quantidade */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-mono font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                            {item.quantidade} {item.unidade}
                          </span>
                          {isLow && (
                            <span className="text-[9px] text-red-500 font-medium flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Baixo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Custo unitário */}
                      <td className="py-4 px-4 font-mono">
                        R$ {item.custoUnitario.toFixed(2)}
                      </td>

                      {/* Preço de Venda */}
                      <td className="py-4 px-4 font-mono font-semibold text-slate-800">
                        {item.tipo === 'produto_final' && item.precoVenda 
                          ? `R$ ${item.precoVenda.toFixed(2)}` 
                          : '-'
                        }
                      </td>

                      {/* Alertas de validade */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.badgeClass}`}>
                            {status.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Expira: {formatDateBR(item.dataValidade)}
                          </span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-estoque-edit-${item.id}`}
                            onClick={() => openEditModal(item)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors pointer-events-auto"
                            title="Editar informações do produto/lote"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </button>

                          <button
                            id={`btn-estoque-loss-${item.id}`}
                            onClick={() => openLossModal(item)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors pointer-events-auto"
                            title="Registrar descarte/perda deste item"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" /> Descartar
                          </button>
                          
                          <button
                            id={`btn-estoque-delete-${item.id}`}
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors pointer-events-auto"
                            title="Excluir item permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA ADICIONAR LOTE / ITEM */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="add-item-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border max-w-xl w-full max-h-[90vh] overflow-y-auto"
              id="estoque-add-modal-card"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-rose-500" /> Adicionar Novo Lote ao Estoque
                </h3>
                <button 
                  id="btn-add-modal-close" 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddItemSubmit} className="space-y-4 text-xs" id="frm-add-item">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome do Item */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-700">Nome do Item / Lote (Obrigatório)</label>
                    <input 
                      id="inp-add-nome"
                      type="text" 
                      placeholder="Ex: Torta de Pistache com Frutas do Bosque"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
                      value={newItem.nome}
                      onChange={e => setNewItem({ ...newItem, nome: e.target.value })}
                    />
                  </div>

                  {/* Tipo de Item */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tipo do Item</label>
                    <select
                      id="sel-add-tipo"
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white pointer-events-auto"
                      value={newItem.tipo}
                      onChange={e => setNewItem({ ...newItem, tipo: e.target.value as 'ingrediente' | 'produto_final' })}
                    >
                      <option value="ingrediente">Insumo / Ingrediente Perecível</option>
                      <option value="produto_final">Produto Final Pronto para PDV</option>
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Categoria (Obrigatório)</label>
                    <input 
                      id="inp-add-categoria"
                      type="text" 
                      placeholder="Ex: Frutas, Laticínios, Bolos & Fatias"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
                      value={newItem.categoria}
                      onChange={e => setNewItem({ ...newItem, categoria: e.target.value })}
                    />
                    {existingCategories.length > 0 && (
                      <div className="pt-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Selecionar categoria cadastrada:</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {existingCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setNewItem({ ...newItem, categoria: cat })}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer pointer-events-auto ${
                                newItem.categoria.trim().toLowerCase() === cat.trim().toLowerCase()
                                  ? 'bg-rose-500 text-white border-rose-600 shadow-3xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Quantidade Inicial (Obrigatório)</label>
                    <input 
                      id="inp-add-quantidade"
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 5"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
                      value={newItem.quantidade}
                      onChange={e => setNewItem({ ...newItem, quantidade: e.target.value })}
                    />
                  </div>

                  {/* Unidade */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Unidade de Medida</label>
                    <select
                      id="sel-add-unidade"
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white pointer-events-auto"
                      value={newItem.unidade}
                      onChange={e => setNewItem({ ...newItem, unidade: e.target.value as 'kg' | 'un' | 'L' | 'g' | 'ml' })}
                    >
                      <option value="kg">Quilogramas (kg)</option>
                      <option value="un">Ununidades (un)</option>
                      <option value="L">Litros (L)</option>
                      <option value="g">Gramas (g)</option>
                      <option value="ml">Mililitros (ml)</option>
                    </select>
                  </div>

                  {/* Custo Unitário */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Custo Unitário de Produção / Entrada (Obrigatório)</label>
                    <input 
                      id="inp-add-custo-unit"
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 14.50"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
                      value={newItem.custoUnitario}
                      onChange={e => setNewItem({ ...newItem, custoUnitario: e.target.value })}
                    />
                  </div>

                  {/* Preço de Venda */}
                  {newItem.tipo === 'produto_final' ? (
                    <div className="space-y-1">
                      <label className="font-bold text-rose-500">Preço de Venda no PDV (Obrigatório)</label>
                      <input 
                        id="inp-add-preco-venda"
                        type="number" 
                        step="0.01"
                        placeholder="Ex: 35.00"
                        required={newItem.tipo === 'produto_final'}
                        className="w-full bg-rose-50/40 border border-rose-250 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
                        value={newItem.precoVenda}
                        onChange={e => setNewItem({ ...newItem, precoVenda: e.target.value })}
                      />
                    </div>
                  ) : <div className="hidden md:block"></div>}

                  {/* Estoque Mínimo de Alerta */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Margem Mínima de Estoque (Aviso)</label>
                    <input 
                      id="inp-add-estoque-min"
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 2"
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
                      value={newItem.estoqueMinimo}
                      onChange={e => setNewItem({ ...newItem, estoqueMinimo: e.target.value })}
                    />
                  </div>

                  {/* Data de Fabricação */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Data de Produção / Fabricação</label>
                    <input 
                      id="inp-add-data-fab"
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white font-mono"
                      value={newItem.dataFabricacao}
                      onChange={e => setNewItem({ ...newItem, dataFabricacao: e.target.value })}
                    />
                  </div>

                  {/* Data de Validade */}
                  <div className="space-y-1">
                    <label className="font-bold text-red-500">Data de Validade Final (Obrigatório)</label>
                    <input 
                      id="inp-add-data-val"
                      type="date" 
                      required
                      className="w-full bg-red-50/20 border border-red-250 py-2 px-3 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white font-mono"
                      value={newItem.dataValidade}
                      onChange={e => setNewItem({ ...newItem, dataValidade: e.target.value })}
                    />
                  </div>

                  {/* Gestão de Imagem Relacionada */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        Imagem Relacionada ao Lote / Produto (Opcional)
                      </span>
                      {newItem.imagem && (
                        <button
                          type="button"
                          onClick={() => setNewItem({ ...newItem, imagem: '' })}
                          className="text-red-500 hover:text-red-600 font-extrabold text-[10px] uppercase tracking-wider"
                        >
                          Limpar Imagem
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      {/* Box de Preview */}
                      <div className="col-span-1 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 h-20 w-20 mx-auto rounded-2xl overflow-hidden relative shadow-3xs">
                        {newItem.imagem ? (
                          <img 
                            src={newItem.imagem} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center p-2 text-slate-400">
                            <span className="text-[9px] font-bold block">Sem Imagem</span>
                            <span className="text-[7px] mt-0.5 block">Padrão Ativo</span>
                          </div>
                        )}
                      </div>

                      {/* Inputs de Upload e Link */}
                      <div className="sm:col-span-3 space-y-2">
                        {/* File Selector */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                            Upload de Arquivo (Dispositivo)
                          </label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                          />
                        </div>

                        {/* URL Paste */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                            Ou Colar Link da Imagem (URL)
                          </label>
                          <input 
                            type="url" 
                            placeholder="https://exemplo.com/foto-do-bolo.jpg"
                            className="w-full bg-white border border-slate-200 py-1 px-2.5 rounded-lg text-[10px] text-slate-800 focus:outline-hidden focus:border-rose-300"
                            value={newItem.imagem}
                            onChange={e => setNewItem({ ...newItem, imagem: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Sugestões Rápidas de Imagens Realistas:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {IMAGE_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewItem({ ...newItem, imagem: p.url })}
                            className={`p-1 rounded-lg border transition-all text-center hover:scale-105 ${
                              newItem.imagem === p.url 
                                ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-300/20' 
                                : 'border-slate-200 bg-white hover:border-slate-350'
                            }`}
                            title={p.name}
                          >
                            <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-100">
                              <img 
                                src={p.url} 
                                alt={p.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="block text-[7px] truncate mt-0.5 text-slate-400 font-extrabold uppercase">
                              {p.name.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t" id="add-modal-btn-row">
                  <button
                    type="button"
                    id="btn-add-modal-cancel"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all pointer-events-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-add-modal-submit"
                    className="py-2.5 px-6 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all pointer-events-auto"
                  >
                    Salvar Lote
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PARA REGISTRAR PERDA / DESCARTE */}
      <AnimatePresence>
        {showLossModal && selectedItemForLoss && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="loss-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border max-w-sm w-full"
              id="estoque-loss-modal"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-950 text-base flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Registrar Perda de Insumo
                </h3>
                <button 
                  id="btn-loss-modal-close" 
                  onClick={() => setShowLossModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="bg-amber-50 text-amber-900 rounded-xl p-3 mb-4 text-xs" id="loss-item-details">
                <p className="font-bold">{selectedItemForLoss.nome}</p>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>Qtd Atual: {selectedItemForLoss.quantidade} {selectedItemForLoss.unidade}</span>
                  <span>Custo Unitário: R$ {selectedItemForLoss.custoUnitario.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleLossSubmit} className="space-y-4 text-xs" id="frm-loss-submit">
                {/* Quantidade Perdida */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Quantidade Descartada / Perdida ({selectedItemForLoss.unidade})</label>
                  <input 
                    id="inp-loss-qty"
                    type="number" 
                    step="0.01"
                    placeholder={`Ex: 1.5`}
                    required
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono"
                    value={lossData.quantidade}
                    onChange={e => setLossData({ ...lossData, quantidade: e.target.value })}
                  />
                </div>

                {/* Motivo do Descarte */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Selecione o Motivo do Descarte</label>
                  <select
                    id="sel-loss-motivo"
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-bold text-slate-700 pointer-events-auto"
                    value={lossData.motivo}
                    onChange={e => setLossData({ ...lossData, motivo: e.target.value as any })}
                  >
                    <option value="Validade Vencida">Validade Vencida / Expiração</option>
                    <option value="Dano físico">Ingrediente estragado / Dano físico</option>
                    <option value="Erro na Produção">Erro de receita / Queima na Produção</option>
                    <option value="Outro">Outro Motivo</option>
                  </select>
                </div>

                {/* Previsualização de Custo do Prejuízo */}
                {parseFloat(lossData.quantidade) > 0 && (
                  <div className="p-3 bg-red-50 text-red-900 border border-red-100 rounded-xl flex justify-between items-center" id="loss-cost-preview">
                    <span className="font-semibold text-[10px] uppercase">Custo do Prejuízo Financeiro:</span>
                    <span className="font-mono font-bold">
                      R$ {(parseFloat(lossData.quantidade) * selectedItemForLoss.custoUnitario).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-3 border-t" id="loss-modal-btn-row">
                  <button
                    type="button"
                    id="btn-loss-modal-cancel"
                    onClick={() => setShowLossModal(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all pointer-events-auto"
                  >
                    Desistir
                  </button>
                  <button
                    type="submit"
                    id="btn-loss-modal-submit"
                    className="py-2.5 px-5 bg-rose-500 hover:bg-rose-600 font-bold text-white rounded-xl transition-all pointer-events-auto shadow-sm"
                  >
                    Confirmar Descarte (Lançar Despesa)
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PARA EDITAR LOTE / ITEM */}
      <AnimatePresence>
        {showEditModal && selectedItemForEdit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="edit-item-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border max-w-xl w-full max-h-[90vh] overflow-y-auto"
              id="estoque-edit-modal-card"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" /> Editar Item / Lote do Estoque
                </h3>
                <button 
                  id="btn-edit-modal-close" 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedItemForEdit(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleEditItemSubmit} className="space-y-4 text-xs" id="frm-edit-item">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome do Item */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-700">Nome do Item / Lote (Obrigatório)</label>
                    <input 
                      id="inp-edit-nome"
                      type="text" 
                      placeholder="Ex: Bolo de Chocolate com Morango"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-medium text-slate-950"
                      value={editItem.nome}
                      onChange={e => setEditItem({ ...editItem, nome: e.target.value })}
                    />
                  </div>

                  {/* Tipo de Item */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tipo do Item</label>
                    <select
                      id="sel-edit-tipo"
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-bold text-slate-700 pointer-events-auto"
                      value={editItem.tipo}
                      onChange={e => setEditItem({ ...editItem, tipo: e.target.value as any })}
                    >
                      <option value="ingrediente">Insumo / Matéria-Prima</option>
                      <option value="produto_final">Produto Pronto para Venda (PDV)</option>
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Categoria (Obrigatório)</label>
                    <input 
                      id="inp-edit-categoria"
                      type="text" 
                      placeholder="Ex: Bolos, Doces, Bebidas, Salgados"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-medium text-slate-950"
                      value={editItem.categoria}
                      onChange={e => setEditItem({ ...editItem, categoria: e.target.value })}
                    />
                    {existingCategories.length > 0 && (
                      <div className="pt-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Selecionar categoria cadastrada:</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {existingCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setEditItem({ ...editItem, categoria: cat })}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer pointer-events-auto ${
                                editItem.categoria.trim().toLowerCase() === cat.trim().toLowerCase()
                                  ? 'bg-rose-500 text-white border-rose-600 shadow-3xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Quantidade Atual no Estoque</label>
                    <div className="flex gap-2">
                      <input 
                        id="inp-edit-quantidade"
                        type="number" 
                        step="0.01"
                        placeholder="Ex: 10"
                        required
                        className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono text-slate-950"
                        value={editItem.quantidade}
                        onChange={e => setEditItem({ ...editItem, quantidade: e.target.value })}
                      />
                      <select
                        id="sel-edit-unidade"
                        className="bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-bold text-slate-700 pointer-events-auto"
                        value={editItem.unidade}
                        onChange={e => setEditItem({ ...editItem, unidade: e.target.value as any })}
                      >
                        <option value="kg">kg</option>
                        <option value="un">un</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                  </div>

                  {/* Alerta de Estoque Mínimo */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Estoque Mínimo (Alerta de Baixo Estoque)</label>
                    <input 
                      id="inp-edit-estoqueMinimo"
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 2"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono text-slate-950"
                      value={editItem.estoqueMinimo}
                      onChange={e => setEditItem({ ...editItem, estoqueMinimo: e.target.value })}
                    />
                  </div>

                  {/* Custo Unitário */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Custo Unitário de Produção / Compra (R$)</label>
                    <input 
                      id="inp-edit-custoUnitario"
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 4.50"
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono text-slate-950"
                      value={editItem.custoUnitario}
                      onChange={e => setEditItem({ ...editItem, custoUnitario: e.target.value })}
                    />
                  </div>

                  {/* Preço de Venda (Apenas se for produto_final) */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      Preço de Venda ao Público (R$) {editItem.tipo === 'ingrediente' && <span className="text-slate-400 font-normal">(Insumos não vendem)</span>}
                    </label>
                    <input 
                      id="inp-edit-precoVenda"
                      type="number" 
                      step="0.01"
                      placeholder="Ex: 12.00"
                      disabled={editItem.tipo === 'ingrediente'}
                      required={editItem.tipo === 'produto_final'}
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono text-slate-950 disabled:bg-slate-100 disabled:opacity-50"
                      value={editItem.precoVenda}
                      onChange={e => setEditItem({ ...editItem, precoVenda: e.target.value })}
                    />
                  </div>

                  {/* Datas de Fabricação e Validade */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Data de Fabricação (Opcional)</label>
                    <input 
                      id="inp-edit-dataFabricacao"
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono text-slate-950"
                      value={editItem.dataFabricacao}
                      onChange={e => setEditItem({ ...editItem, dataFabricacao: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Data de Validade (Obrigatório)</label>
                    <input 
                      id="inp-edit-dataValidade"
                      type="date" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg font-mono text-slate-950"
                      value={editItem.dataValidade}
                      onChange={e => setEditItem({ ...editItem, dataValidade: e.target.value })}
                    />
                  </div>

                  {/* Gestão de Imagem Relacionada */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        Alterar Imagem Relacionada ao Lote / Produto (Opcional)
                      </span>
                      {editItem.imagem && (
                        <button
                          type="button"
                          onClick={() => setEditItem({ ...editItem, imagem: '' })}
                          className="text-red-500 hover:text-red-600 font-extrabold text-[10px] uppercase tracking-wider"
                        >
                          Remover Imagem
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      {/* Box de Preview */}
                      <div className="col-span-1 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 h-20 w-20 mx-auto rounded-2xl overflow-hidden relative shadow-3xs">
                        {editItem.imagem ? (
                          <img 
                            src={editItem.imagem} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center p-2 text-slate-400">
                            <span className="text-[9px] font-bold block">Sem Imagem</span>
                            <span className="text-[7px] mt-0.5 block">Padrão Ativo</span>
                          </div>
                        )}
                      </div>

                      {/* Inputs de Upload e Link */}
                      <div className="sm:col-span-3 space-y-2">
                        {/* File Selector */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                            Carregar Nova Imagem (Upload)
                          </label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleEditImageFileChange}
                            className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                          />
                        </div>

                        {/* URL Paste */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                            Link da Imagem (URL)
                          </label>
                          <input 
                            type="url" 
                            placeholder="https://exemplo.com/foto-do-bolo.jpg"
                            className="w-full bg-white border border-slate-200 py-1 px-2.5 rounded-lg text-[10px] text-slate-800 focus:outline-hidden focus:border-rose-300"
                            value={editItem.imagem}
                            onChange={e => setEditItem({ ...editItem, imagem: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Escolher entre Sugestões Rápidas:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {IMAGE_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditItem({ ...editItem, imagem: p.url })}
                            className={`p-1 rounded-lg border transition-all text-center hover:scale-105 ${
                              editItem.imagem === p.url 
                                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300/20' 
                                : 'border-slate-200 bg-white hover:border-slate-350'
                            }`}
                            title={p.name}
                          >
                            <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-100">
                              <img 
                                src={p.url} 
                                alt={p.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="block text-[7px] truncate mt-0.5 text-slate-400 font-extrabold uppercase">
                              {p.name.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t" id="edit-modal-btn-row">
                  <button
                    type="button"
                    id="btn-edit-modal-cancel"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedItemForEdit(null);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all pointer-events-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-edit-modal-submit"
                    className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all pointer-events-auto"
                  >
                    Salvar Alterações
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
