/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { InventoryItem, Sale, PaymentMethod, CompanyConfig, UserAccount, OpenOrder } from '../types';
import { Search, ShoppingCart, Percent, User, Receipt, Sparkles, AlertCircle, Trash2, Candy, Lock, ShieldAlert, CheckCircle, X, RefreshCw, Clock, Table, ClipboardList, Package, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDateBR } from '../utils/dateHelpers';

// Helper to resolve beautiful realistic product images based on category or name
function getProductImage(product: InventoryItem): string {
  if (product.imagem) {
    return product.imagem;
  }
  const name = product.nome.toLowerCase();
  const cat = product.categoria.toLowerCase();
  
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

interface PDVProps {
  inventory: InventoryItem[];
  onCompleteSale: (sale: Sale, updatedInventory: InventoryItem[]) => void;
  activeCompany?: CompanyConfig;
  sales?: Sale[];
  onCancelSale?: (saleId: string) => void;
  users?: UserAccount[];
  openOrders?: OpenOrder[];
  onUpdateOpenOrders?: (orders: OpenOrder[]) => void;
}

interface CartItem {
  product: InventoryItem;
  quantitySelected: number;
}

export default function PDV({ 
  inventory, 
  onCompleteSale, 
  activeCompany,
  sales = [],
  onCancelSale,
  users = [],
  openOrders = [],
  onUpdateOpenOrders
}: PDVProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cashReceived, setCashReceived] = useState<string>('');
  
  // Sale complete Modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const handleSimulatePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintSuccess(false);
    
    // Simular o tempo de envio para a impressora e impressão física
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
    }, 1800);
  };

  // Estados para aba de histórico e cancelamento de venda
  const [activeCatalogTab, setActiveCatalogTab] = useState<'products' | 'tables' | 'sales'>('products');
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Identificação do cliente / mesa & edição de comanda em aberto
  const [tableOrClient, setTableOrClient] = useState<string>('');
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [pdvTheme, setPdvTheme] = useState<'sweet_pink' | 'cozy_terracotta'>('sweet_pink');
  const [stockAlertItems, setStockAlertItems] = useState<CartItem[]>([]);

  const handleAuthAndCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelSaleId || !onCancelSale) return;

    // Verificar se a senha confere com qualquer usuário administrador (role === 'admin')
    const hasAdminAccess = users.some(u => u.role === 'admin' && u.senha === adminPassword);

    if (hasAdminAccess) {
      // Sucesso! Chamar callback do App.tsx para reverter estoque e remover do caixa
      onCancelSale(cancelSaleId);
      setSuccessMessage(`Lançamento #${cancelSaleId.replace('sale_', '').toUpperCase()} foi cancelado e os estoques correspondentes foram devolvidos!`);
      
      // Limpar formulário de autorização administrativa
      setCancelSaleId(null);
      setAdminPassword('');
      setAdminPasswordError(null);

      // Auto-limpar notificação fluorescente
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4500);
    } else {
      setAdminPasswordError('Senha de administrador incorreta!');
    }
  };

  // Filtrar apenas com o tipo "produto_final" que tenham quantidade disponível
  const availableProducts = useMemo(() => {
    return inventory.filter(item => item.tipo === 'produto_final');
  }, [inventory]);

  // Lista de categorias únicas para produtos de venda
  const categories = useMemo(() => {
    const list = availableProducts.map(p => p.categoria);
    return ['Todas', ...Array.from(new Set(list))];
  }, [availableProducts]);

  // Filtros aplicados dos produtos
  const filteredProducts = useMemo(() => {
    return availableProducts.filter(p => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      return matchSearch && matchCategory;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [availableProducts, searchTerm, selectedCategory]);

  // Identifica itens do carrinho com estoque zerado no inventário em tempo real
  const cartZeroStockItems = useMemo(() => {
    return cart.filter(item => {
      const liveProduct = inventory.find(i => i.id === item.product.id);
      return !liveProduct || liveProduct.quantidade <= 0;
    });
  }, [cart, inventory]);

  // Funções do Carrinho
  const addToCart = (product: InventoryItem) => {
    if (product.quantidade <= 0) return; // Fora de estoque

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Garantir que não ultrapassa estoque do produto final
        if (existing.quantitySelected < product.quantidade) {
          return prev.map(item => 
            item.product.id === product.id 
              ? { ...item, quantitySelected: item.quantitySelected + 1 } 
              : item
          );
        }
        return prev;
      } else {
        return [...prev, { product, quantitySelected: 1 }];
      }
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const itemInInv = inventory.find(i => i.id === productId);
    if (!itemInInv) return;

    if (quantity > itemInInv.quantidade) return; // Não há estoque suficiente

    setCart(prev => 
      prev.map(item => 
        item.product.id === productId 
          ? { ...item, quantitySelected: quantity } 
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCashReceived('');
    setTableOrClient('');
    setLoadingOrderId(null);
  };

  const handleSaveToComanda = () => {
    if (cart.length === 0) return;
    if (!tableOrClient.trim()) {
      alert('Por favor, informe a identificação da Mesa ou o nome do Cliente para salvar a comanda!');
      return;
    }

    const orderId = loadingOrderId || 'order_' + Math.random().toString(36).substr(2, 9);
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const orderItems = cart.map(item => {
      const preco = item.product.precoVenda || 0;
      return {
        itemId: item.product.id,
        nome: item.product.nome,
        quantidade: item.quantitySelected,
        precoUnitario: preco,
        subtotal: preco * item.quantitySelected
      };
    });

    // Calcula de forma segura o desconto e total da comanda
    const subtotal = cartTotals.subtotal;
    const discount = cartTotals.discount;
    const total = cartTotals.total;

    const refreshedOrder: OpenOrder = {
      id: orderId,
      mesaOuCliente: tableOrClient.trim(),
      data: dateStr,
      itens: orderItems,
      subtotal,
      desconto: discount,
      total,
      tempoInicio: loadingOrderId 
        ? (openOrders.find(o => o.id === loadingOrderId)?.tempoInicio || timeStr)
        : timeStr
    };

    let updatedOrders = [...openOrders];
    if (loadingOrderId) {
      updatedOrders = updatedOrders.map(o => o.id === loadingOrderId ? refreshedOrder : o);
    } else {
      // Verificar se já existe uma mesa de mesmo nome para evitar duplicar por erro operacional e sugerir fundir ou estender
      const existingIdx = updatedOrders.findIndex(o => o.mesaOuCliente.toLowerCase() === tableOrClient.trim().toLowerCase());
      if (existingIdx !== -1) {
        if (window.confirm(`Já existe uma comanda aberta para "${tableOrClient}". Deseja atualizar aquela comanda somando os itens atuais?`)) {
          // Fundir itens
          const existingOrder = updatedOrders[existingIdx];
          const combinedItems = [...existingOrder.itens];

          orderItems.forEach(newIt => {
            const match = combinedItems.find(ex => ex.itemId === newIt.itemId);
            if (match) {
              match.quantidade += newIt.quantidade;
              match.subtotal = match.quantidade * match.precoUnitario;
            } else {
              combinedItems.push(newIt);
            }
          });

          const newSubtotal = combinedItems.reduce((sum, it) => sum + it.subtotal, 0);
          const newTotal = newSubtotal; // Zera o desconto temporário ao fundir ou recalcula

          updatedOrders[existingIdx] = {
            ...existingOrder,
            itens: combinedItems,
            subtotal: newSubtotal,
            total: newTotal
          };
        } else {
          updatedOrders.push(refreshedOrder);
        }
      } else {
        updatedOrders.push(refreshedOrder);
      }
    }

    if (onUpdateOpenOrders) {
      onUpdateOpenOrders(updatedOrders);
    }

    setSuccessMessage(`Comanda para "${tableOrClient}" guardada com sucesso!`);
    setTimeout(() => setSuccessMessage(null), 3000);

    clearCart();
  };

  const handleLoadOpenOrder = (order: OpenOrder) => {
    const mappedCart = order.itens.map(it => {
      const product = inventory.find(p => p.id === it.itemId) || {
        id: it.itemId,
        nome: it.nome,
        tipo: 'produto_final' as const,
        quantidade: 999,
        unidade: 'un' as const,
        custoUnitario: 0,
        precoVenda: it.precoUnitario,
        estoqueMinimo: 0,
        dataValidade: '',
        categoria: 'Outros'
      };
      return {
        product,
        quantitySelected: it.quantidade
      };
    });

    setCart(mappedCart);
    setTableOrClient(order.mesaOuCliente);
    setLoadingOrderId(order.id);
    setDiscountValue(order.desconto);
    setDiscountType(order.desconto > 0 ? 'fixed' : 'percent');
    setActiveCatalogTab('products');
  };

  // Cálculos do Carrinho
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const price = item.product.precoVenda || 0;
      return sum + (price * item.quantitySelected);
    }, 0);

    let calculatedDiscount = 0;
    if (discountType === 'percent') {
      calculatedDiscount = (subtotal * discountValue) / 100;
    } else {
      calculatedDiscount = discountValue;
    }

    // Prevenir desconto maior que subtotal
    calculatedDiscount = Math.min(calculatedDiscount, subtotal);
    const total = Math.max(subtotal - calculatedDiscount, 0);

    return {
      subtotal,
      discount: calculatedDiscount,
      total
    };
  }, [cart, discountType, discountValue]);

  // Troco calculado para pagamento em dinheiro
  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'dinheiro') return 0;
    const receivedNum = parseFloat(cashReceived.replace(',', '.'));
    if (isNaN(receivedNum)) return 0;
    return Math.max(receivedNum - cartTotals.total, 0);
  }, [cashReceived, paymentMethod, cartTotals.total]);

  // FINALIZAR VENDA
  const handleCheckout = () => {
    if (cart.length === 0) return;

    // VALIDAR ESTOQUES ZERADOS (impede a finalização)
    const outOfStockItems = cart.filter(item => {
      const liveProduct = inventory.find(i => i.id === item.product.id);
      return !liveProduct || liveProduct.quantidade <= 0;
    });

    if (outOfStockItems.length > 0) {
      setStockAlertItems(outOfStockItems);
      return; // IMPEDE A FINALIZAÇÃO DA VENDA
    }

    // Criar o objeto da venda final
    const saleId = 'sale_' + Math.random().toString(36).substr(2, 9);
    const saleDate = new Date().toISOString().split('T')[0];

    const saleItems = cart.map(item => {
      const preco = item.product.precoVenda || 0;
      return {
        itemId: item.product.id,
        nome: item.product.nome,
        quantidade: item.quantitySelected,
        precoUnitario: preco,
        subtotal: preco * item.quantitySelected
      };
    });

    const newSale: Sale = {
      id: saleId,
      data: saleDate,
      itens: saleItems,
      subtotal: cartTotals.subtotal,
      desconto: cartTotals.discount,
      total: cartTotals.total,
      metodoPagamento: paymentMethod,
      mesaOuCliente: tableOrClient.trim() || undefined
    };

    // REDUZIR ESTOQUE DOS PRODUTOS FINAIS E DE SEUS INGREDIENTES
    // Copiar o estoque existente
    const updatedInventory = [...inventory];

    cart.forEach(cartItem => {
      const productInInv = updatedInventory.find(i => i.id === cartItem.product.id);
      if (productInInv) {
        // Reduzir estoque do produto final vendido
        productInInv.quantidade = Math.max(productInInv.quantidade - cartItem.quantitySelected, 0);

        // Se o produto final tiver receita e componentes (integração estoque de perecíveis!)
        if (productInInv.receitaIngredientes && productInInv.receitaIngredientes.length > 0) {
          productInInv.receitaIngredientes.forEach(recipeIngredient => {
            const ingredientInInv = updatedInventory.find(i => i.id === recipeIngredient.ingredienteId);
            if (ingredientInInv) {
              const totalIngredientUsed = recipeIngredient.quantidade * cartItem.quantitySelected;
              // Diminui ingrediente proporcionalmente
              ingredientInInv.quantidade = Math.max(ingredientInInv.quantidade - totalIngredientUsed, 0);
            }
          });
        }
      }
    });

    // Se era uma mesa com pedido em aberto, fechar e remover da lista
    if (loadingOrderId && onUpdateOpenOrders) {
      onUpdateOpenOrders(openOrders.filter(o => o.id !== loadingOrderId));
    }

    // Delegar para a tela inicial salvar a venda e recalcular o caixa financeiro
    onCompleteSale(newSale, updatedInventory);

    // Salvar estado da venda concluída para recibo em tela
    setLastCompletedSale(newSale);
    setShowReceiptModal(true);

    // Limpar Caixa de Venda
    clearCart();
  };

  return (
    <div className="space-y-4" id="pdv-main-wrapper">


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="pdv-panel-container">
        {/* Coluna Esquerda: Catalogo de Doces e Fatias */}
        <div className="lg:col-span-7 space-y-4" id="pdv-left-catalog">
          
          {/* Seletor de Abas de Operação do Caixa */}
          <div 
            className={`flex flex-col sm:flex-row p-1.5 rounded-2xl border gap-1 transition-colors ${
              pdvTheme === 'cozy_terracotta'
                ? 'bg-stone-100 border-stone-200/60'
                : 'bg-slate-100 border-rose-100/50'
            }`} 
            id="pdv-operation-tabs"
          >
            <button
              id="pdv-tab-products"
              type="button"
              onClick={() => setActiveCatalogTab('products')}
              className={`flex-1 py-3 min-h-[44px] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 pointer-events-auto ${
                activeCatalogTab === 'products'
                  ? 'bg-white text-slate-900 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              <Package className={`w-4 h-4 font-bold ${pdvTheme === 'cozy_terracotta' ? 'text-amber-600' : 'text-rose-500'}`} />
              Produtos Disponíveis
            </button>
            <button
              id="pdv-tab-tables"
              type="button"
              onClick={() => setActiveCatalogTab('tables')}
              className={`flex-1 py-3 min-h-[44px] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 pointer-events-auto ${
                activeCatalogTab === 'tables'
                  ? 'bg-white text-slate-900 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              <Table className={`w-4 h-4 font-bold ${pdvTheme === 'cozy_terracotta' ? 'text-amber-600 animate-pulse' : 'text-amber-500'}`} />
              Mesas & Comandas ({openOrders.length})
            </button>
            <button
              id="pdv-tab-sales"
              type="button"
              onClick={() => setActiveCatalogTab('sales')}
              className={`flex-1 py-3 min-h-[44px] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 pointer-events-auto ${
                activeCatalogTab === 'sales'
                  ? 'bg-white text-slate-900 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              <Receipt className={`w-4 h-4 font-bold ${pdvTheme === 'cozy_terracotta' ? 'text-amber-600' : 'text-rose-500'}`} />
              Estornar Vendas ({sales.length})
            </button>
          </div>

        {activeCatalogTab === 'products' && (
          <div className="space-y-4" id="pdv-products-tab-content">
            {/* Barra de Busca e Categorias */}
            <div 
              className={`p-4 rounded-3xl border shadow-xs space-y-4 transition-colors ${
                pdvTheme === 'cozy_terracotta'
                  ? 'bg-white border-stone-200/80'
                  : 'bg-white border-rose-50'
              }`} 
              id="pdv-filters-container"
            >
              <div className="relative">
                <Search className={`w-5 h-5 absolute left-3.5 top-3 ${
                  pdvTheme === 'cozy_terracotta' ? 'text-amber-700' : 'text-rose-450'
                }`} />
                <input 
                  id="inp-pdv-search"
                  type="text" 
                  placeholder="Pesquisar bolo, lanche, doce, fatias, sucos..."
                  className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                    pdvTheme === 'cozy_terracotta'
                      ? 'bg-stone-50 border-stone-200 focus:ring-amber-500 focus:border-amber-500 text-stone-850'
                      : 'bg-slate-50 border-slate-200 focus:ring-rose-400 text-slate-800'
                  }`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Abas de Categoria */}
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin" id="pdv-category-tabs">
                {categories.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      id={`btn-cat-${cat.replace(/\s+/g, '-')}`}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-5 py-3 min-h-[44px] text-xs font-bold rounded-full shrink-0 transition-all pointer-events-auto cursor-pointer flex items-center justify-center ${
                        isSelected 
                          ? pdvTheme === 'cozy_terracotta'
                            ? 'bg-amber-700 text-white font-black shadow-3xs'
                            : 'bg-rose-500 text-white font-bold' 
                          : pdvTheme === 'cozy_terracotta'
                            ? 'bg-stone-100 hover:bg-stone-200/85 text-stone-600 hover:text-stone-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Produtos - Estilo Terminal Touch Screen (Altamente Visual) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5" id="pdv-inventory-grid">
              {filteredProducts.length === 0 ? (
                <div 
                  className={`col-span-full rounded-3xl p-12 text-center text-slate-400 border ${
                    pdvTheme === 'cozy_terracotta' ? 'bg-stone-50/20 border-stone-200' : 'bg-white border-rose-50'
                  }`} 
                  id="pdv-empty-search"
                >
                  <AlertCircle className="w-10 h-10 mx-auto text-rose-300 mb-2" />
                  <p className="text-sm font-medium">Nenhum produto cadastrado pronto para venda foi encontrado.</p>
                  <p className="text-xs text-slate-500 mt-1">Verifique o estoque ou mude o termo de busca.</p>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const inStock = product.quantidade > 0;
                  const cartQty = cart.find(item => item.product.id === product.id)?.quantitySelected || 0;
                  const isRem = product.quantidade <= product.estoqueMinimo;

                  return (
                    <motion.div 
                      whileTap={inStock ? { scale: 0.97 } : {}}
                      key={product.id}
                      id={`pdv-item-card-${product.id}`}
                      onClick={() => inStock && addToCart(product)}
                      className={`group rounded-3xl border p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 h-full select-none ${
                        pdvTheme === 'cozy_terracotta'
                          ? inStock 
                            ? 'bg-white border-stone-200 hover:border-amber-600 hover:shadow-md hover:scale-[1.01]' 
                            : 'bg-stone-55/65 border-stone-150 opacity-55 cursor-not-allowed'
                          : inStock 
                            ? 'bg-white border-slate-150 hover:border-rose-350 hover:shadow-sm hover:scale-[1.01]' 
                            : 'bg-slate-55 border-slate-100 opacity-55 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Imagem Realista do Produto */}
                        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-stone-100 border border-stone-100/60 relative shrink-0 shadow-3xs">
                          <img 
                            src={getProductImage(product)} 
                            alt={product.nome}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Qtde no carrinho / comanda */}
                          {cartQty > 0 && (
                            <div className={`absolute -top-1 -right-1 text-white font-mono font-black text-xs w-6.5 h-6.5 rounded-full shadow-md flex items-center justify-center animate-bounce ${
                              pdvTheme === 'cozy_terracotta' ? 'bg-amber-700' : 'bg-rose-500'
                            }`}>
                              {cartQty}
                            </div>
                          )}
                          
                          {/* Alerta de Estoque Mínimo */}
                          {isRem && inStock && (
                            <div className="absolute top-1.5 left-1.5">
                              <span className="bg-amber-500 text-white font-extrabold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full shadow-3xs">
                                Baixo
                              </span>
                            </div>
                          )}

                          {/* Overlay de sem estoque */}
                          {!inStock && (
                            <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center">
                              <span className="bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-xl shadow-xs">
                                Esgotado
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadados: Categoria e Nome em Caixa Alta para fácil leitura */}
                        <div className="space-y-1 text-center">
                          <span className={`text-[9px] uppercase font-black tracking-widest block ${
                            pdvTheme === 'cozy_terracotta' ? 'text-amber-750' : 'text-rose-500'
                          }`}>{product.categoria}</span>
                          <h4 
                            className={`font-black text-[11px] sm:text-xs leading-snug uppercase tracking-tight line-clamp-2 h-8.5 flex items-center justify-center px-1 ${
                              pdvTheme === 'cozy_terracotta' ? 'text-stone-900 font-sans' : 'text-slate-900'
                            }`} 
                            title={product.nome}
                          >
                            {product.nome}
                          </h4>
                        </div>
                      </div>

                      {/* Rodapé do Produto: Preço em destaque e quantidade em estoque */}
                      <div className="pt-2.5 border-t border-stone-100 mt-2.5">
                        <div className="text-center">
                          <p className={`text-sm sm:text-base font-black font-mono leading-none tracking-tight ${
                            pdvTheme === 'cozy_terracotta' ? 'text-amber-800' : 'text-rose-650'
                          }`}>
                            R$ {product.precoVenda?.toFixed(2)}
                          </p>
                          <span className="text-[9px] text-stone-500 font-bold block mt-1">
                            Estoque: {product.quantidade} {product.unidade}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeCatalogTab === 'tables' && (() => {
          const standardTableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          
          const getOrderForTable = (num: number) => {
            return openOrders.find(o => {
              const name = o.mesaOuCliente.trim().toLowerCase();
              return name === `mesa ${num}` || name === `mesa 0${num}` || name === `m${num}` || name === `${num}`;
            });
          };

          const otherOrders = openOrders.filter(o => {
            const name = o.mesaOuCliente.trim().toLowerCase();
            const isNumberedTable = standardTableNumbers.some(num => 
              name === `mesa ${num}` || name === `mesa 0${num}` || name === `m${num}` || name === `${num}`
            );
            return !isNumberedTable;
          });

          const handleOpenNewTable = (num: number) => {
            setTableOrClient(`Mesa ${num}`);
            setCart([]);
            setLoadingOrderId(null);
            setDiscountValue(0);
            setActiveCatalogTab('products');
            setSuccessMessage(`Mesa ${num} selecionada! Escolha guloseimas no cardápio ao lado.`);
            setTimeout(() => setSuccessMessage(null), 4000);
          };

          return (
            <div className="space-y-6" id="pdv-tables-tab-content">
              {/* Explicação da Aba */}
              <div className="p-4 bg-amber-50/55 rounded-3xl border border-amber-100 text-xs text-slate-700 space-y-1.5 animate-fade-in" id="pdv-tables-info">
                <span className="font-bold text-amber-850 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" /> Floor Plan & Controle de Mesas
                </span>
                <p className="leading-relaxed">
                  Toque em qualquer mesa numerada para <strong>abrir um novo atendimento</strong>, ou clique nas mesas ocupadas (em laranja) para adicionar mais itens ou finalizar a conta no caixa!
                </p>
              </div>

              {successMessage && (
                <div id="pdv-tables-success-alert" className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Titulo Seção: Mesas do Salão */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-stone-700 tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-600 rounded-full"></span>
                  Visualização Física do Salão (Mesas de Atendimento)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" id="pdv-tables-interactive-map">
                  {standardTableNumbers.map(num => {
                    const order = getOrderForTable(num);
                    const isOccupied = !!order;
                    
                    return (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        key={num}
                        onClick={() => {
                          if (isOccupied) {
                            handleLoadOpenOrder(order);
                          } else {
                            handleOpenNewTable(num);
                          }
                        }}
                        className={`p-4 rounded-3xl border text-center flex flex-col justify-between transition-all cursor-pointer select-none ${
                          isOccupied
                            ? pdvTheme === 'cozy_terracotta'
                              ? 'bg-amber-50/70 border-amber-500 shadow-sm animate-fade-in'
                              : 'bg-rose-50/60 border-rose-450 shadow-xs animate-fade-in'
                            : 'bg-stone-50/45 border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/5 border-dashed hover:shadow-xs'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className={`px-2 py-0.5 rounded-full font-black ${
                            isOccupied 
                              ? 'bg-amber-600 text-white animate-pulse' 
                              : 'bg-stone-200 text-stone-600'
                          }`}>
                            #{num}
                          </span>
                          <span className={isOccupied ? 'text-amber-805 font-extrabold' : 'text-stone-400 font-bold'}>
                            {isOccupied ? 'Ocupada' : 'Livre'}
                          </span>
                        </div>

                        {/* Desenho Interativo de Mesa Física Detalhada (Mesa de Jantar em Planta / Top-down) */}
                        <div className="relative w-24 h-24 mx-auto my-1 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full transition-all duration-300">
                            {/* Definições de Gradientes para o visual premium de madeira */}
                            <defs>
                              {/* Gradiente de Madeira para Mesa Ativa/Ocupada */}
                              <linearGradient id={`woodGradActive-${num}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#b47b59" />
                                <stop offset="50%" stopColor="#a36a46" />
                                <stop offset="100%" stopColor="#8d5633" />
                              </linearGradient>
                              {/* Gradiente de Madeira para Mesa Livre */}
                              <linearGradient id={`woodGradFree-${num}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#d4ceb8" />
                                <stop offset="50%" stopColor="#bfae9c" />
                                <stop offset="100%" stopColor="#9a8c7a" />
                              </linearGradient>
                            </defs>

                            {/* CADEIRAS AO REDOR DA MESA */}
                            {/* Cadeira de Cima (Top Chair) */}
                            <g className="transition-all duration-300">
                              {/* Encosto de madeira curvo */}
                              <path 
                                d="M 36 18 Q 50 8 64 18" 
                                fill="none" 
                                stroke={isOccupied ? "#7c4524" : "#7c7264"} 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                              />
                              {/* Detalhe interno de palha/trama */}
                              <path 
                                d="M 40 18 Q 50 12 60 18" 
                                fill="none" 
                                stroke={isOccupied ? "#996342" : "#9b8e81"} 
                                strokeWidth="1" 
                                strokeDasharray="1.5,1.5" 
                              />
                              {/* Estofado/Almofada da cadeira (Branco/Cream) */}
                              <path 
                                d="M 38 18 C 38 24, 42 27, 50 27 C 58 27, 62 24, 62 18 Z" 
                                fill={isOccupied ? "#ffffff" : "#f1ede2"} 
                                stroke={isOccupied ? "#925936" : "#8d8174"} 
                                strokeWidth="1.5" 
                              />
                            </g>

                            {/* Cadeira de Baixo (Bottom Chair) */}
                            <g className="transition-all duration-300">
                              {/* Encosto de madeira curvo */}
                              <path 
                                d="M 36 82 Q 50 92 64 82" 
                                fill="none" 
                                stroke={isOccupied ? "#7c4524" : "#7c7264"} 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                              />
                              {/* Detalhe interno */}
                              <path 
                                d="M 40 82 Q 50 88 60 82" 
                                fill="none" 
                                stroke={isOccupied ? "#996342" : "#9b8e81"} 
                                strokeWidth="1" 
                                strokeDasharray="1.5,1.5" 
                              />
                              {/* Estofado/Almofada */}
                              <path 
                                d="M 38 82 C 38 76, 42 73, 50 73 C 58 73, 62 76, 62 82 Z" 
                                fill={isOccupied ? "#ffffff" : "#f1ede2"} 
                                stroke={isOccupied ? "#925936" : "#8d8174"} 
                                strokeWidth="1.5" 
                              />
                            </g>

                            {/* Cadeira da Esquerda (Left Chair) */}
                            <g className="transition-all duration-300">
                              {/* Encosto de madeira curvo */}
                              <path 
                                d="M 18 36 Q 8 50 18 64" 
                                fill="none" 
                                stroke={isOccupied ? "#7c4524" : "#7c7264"} 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                              />
                              {/* Detalhe interno */}
                              <path 
                                d="M 18 40 Q 12 50 18 60" 
                                fill="none" 
                                stroke={isOccupied ? "#996342" : "#9b8e81"} 
                                strokeWidth="1" 
                                strokeDasharray="1.5,1.5" 
                              />
                              {/* Estofado/Almofada */}
                              <path 
                                d="M 18 38 C 24 38, 27 42, 27 50 C 27 58, 24 62, 18 62 Z" 
                                fill={isOccupied ? "#ffffff" : "#f1ede2"} 
                                stroke={isOccupied ? "#925936" : "#8d8174"} 
                                strokeWidth="1.5" 
                              />
                            </g>

                            {/* Cadeira da Direita (Right Chair) */}
                            <g className="transition-all duration-300">
                              {/* Encosto de madeira curvo */}
                              <path 
                                d="M 82 36 Q 92 50 82 64" 
                                fill="none" 
                                stroke={isOccupied ? "#7c4524" : "#7c7264"} 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                              />
                              {/* Detalhe interno */}
                              <path 
                                d="M 82 40 Q 88 50 82 60" 
                                fill="none" 
                                stroke={isOccupied ? "#996342" : "#9b8e81"} 
                                strokeWidth="1" 
                                strokeDasharray="1.5,1.5" 
                              />
                              {/* Estofado/Almofada */}
                              <path 
                                d="M 82 38 C 76 38, 73 42, 73 50 C 73 58, 76 62, 82 62 Z" 
                                fill={isOccupied ? "#ffffff" : "#f1ede2"} 
                                stroke={isOccupied ? "#925936" : "#8d8174"} 
                                strokeWidth="1.5" 
                              />
                            </g>

                            {/* TAMPO DA MESA (Square table top with rounded corners) */}
                            <rect 
                              x="26" 
                              y="26" 
                              width="48" 
                              height="48" 
                              rx="6" 
                              fill={`url(#${isOccupied ? `woodGradActive-${num}` : `woodGradFree-${num}`})`} 
                              stroke={isOccupied ? "#7c4524" : "#7c7264"} 
                              strokeWidth="2.5" 
                              className="shadow-sm transition-all duration-300"
                            />

                            {/* Linhas de Ripples/Ripas de Madeira (Wooden slats texture) */}
                            <g opacity="0.15" stroke="#000" strokeWidth="1" strokeLinecap="round">
                              <line x1="34" y1="26" x2="34" y2="74" />
                              <line x1="42" y1="26" x2="42" y2="74" />
                              <line x1="50" y1="26" x2="50" y2="74" />
                              <line x1="58" y1="26" x2="58" y2="74" />
                              <line x1="66" y1="26" x2="66" y2="74" />
                            </g>

                            {/* ELEMENTOS DECORATIVOS EM CIMA DA MESA */}
                            {/* 1. Bule de Chá Branco (Teapot seen from top) */}
                            <g className="transition-all duration-300">
                              {/* Sombra suave abaixo do bule */}
                              <circle cx="50" cy="42" r="7" fill="#000000" opacity="0.08" />
                              {/* Corpo principal do bule */}
                              <circle 
                                cx="50" 
                                cy="42" 
                                r="6" 
                                fill={isOccupied ? "#ffffff" : "#f6f4ed"} 
                                stroke={isOccupied ? "#d1c9bd" : "#beb8ad"} 
                                strokeWidth="1" 
                              />
                              {/* Alça do bule */}
                              <path 
                                d="M 50 36 L 50 32" 
                                fill="none" 
                                stroke={isOccupied ? "#eae6dc" : "#d8d3c5"} 
                                strokeWidth="1.5" 
                                strokeLinecap="round" 
                              />
                              {/* Bico do bule */}
                              <path 
                                d="M 50 48 L 50 51" 
                                fill="none" 
                                stroke={isOccupied ? "#eae6dc" : "#d8d3c5"} 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                              />
                              {/* Pegador da tampa do bule */}
                              <circle cx="50" cy="42" r="1.5" fill="#e1dbcf" />
                            </g>

                            {/* 2. Xícara de Chá Escura (Teacup seen from top) */}
                            <g className="transition-all duration-300">
                              {/* Sombra */}
                              <circle cx="50" cy="58" r="4.5" fill="#000000" opacity="0.1" />
                              {/* Pires/Pires da xícara */}
                              <circle 
                                cx="50" 
                                cy="58" 
                                r="4" 
                                fill={isOccupied ? "#473d31" : "#5d5449"} 
                                stroke={isOccupied ? "#352d24" : "#4a4237"} 
                                strokeWidth="0.8" 
                              />
                              {/* Xícara em si */}
                              <circle 
                                cx="50" 
                                cy="58" 
                                r="2.5" 
                                fill={isOccupied ? "#312a22" : "#423b32"} 
                              />
                              {/* Alça da xícara */}
                              <path 
                                d="M 47.5 58 Q 45 58 45 59.5" 
                                fill="none" 
                                stroke={isOccupied ? "#473d31" : "#5d5449"} 
                                strokeWidth="0.8" 
                              />
                              {/* Conteúdo líquido (Café/Chá) */}
                              <circle cx="50" cy="58" r="1.5" fill="#201306" />
                            </g>

                            {/* 3. Indicador Dinâmico central / Prato no centro com o Número da Mesa */}
                            <g>
                              {/* Base do prato central */}
                              <circle cx="50" cy="50" r="11" fill={isOccupied ? "#ffffff" : "#fcfaf4"} stroke={isOccupied ? "#dcd2be" : "#ccc4b4"} strokeWidth="1" className="shadow-xs" />
                              <circle cx="50" cy="50" r="8" fill="none" stroke={isOccupied ? "#f2e9d7" : "#e0dacb"} strokeWidth="1" />
                              {/* Texto do número da mesa */}
                              <text 
                                x="50" 
                                y="53.5" 
                                textAnchor="middle" 
                                className="font-sans font-black select-none pointer-events-none" 
                                fontSize="9" 
                                fill={isOccupied ? "#7c4524" : "#5d5449"}
                              >
                                {num}
                              </text>
                            </g>
                          </svg>

                          {/* Se ocupada, colocamos um brilho pulsante sutil ao redor da mesa para dar um charme interativo incrível */}
                          {isOccupied && (
                            <span className="absolute inset-2 border-2 border-amber-400 rounded-3xl animate-ping opacity-15 pointer-events-none" />
                          )}
                        </div>

                        {isOccupied ? (
                          <div className="space-y-2 mt-1">
                            <div className="text-center">
                              <p className="text-[10px] text-stone-500 truncate max-w-full font-bold">
                                {order.mesaOuCliente.replace(`Mesa ${num}`, '').replace(`mesa ${num}`, '').trim() || 'Sem nome'}
                              </p>
                              <span className="text-sm font-black font-mono text-stone-900 block">
                                R$ {order.total.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex gap-1 pt-1 justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadOpenOrder(order);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-1 rounded-lg text-[10px] flex-1 pointer-events-auto"
                                title="Lançar mais itens na mesa"
                              >
                                + Itens
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadOpenOrder(order);
                                  setTimeout(() => {
                                    document.getElementById('pdv-checkout-panel')?.scrollIntoView({ behavior: 'smooth' });
                                  }, 150);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-1 rounded-lg text-[10px] flex-1 pointer-events-auto"
                                title="Fechar e receber pagamento"
                              >
                                Cobrar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] text-stone-400 font-bold">
                            + Abrir Mesa
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Seção de Atendimentos Avulsos (Balcão, Delivery ou Clientes avulsos) */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <h3 className="text-xs font-black uppercase text-stone-700 tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-rose-500 rounded-full"></span>
                  Comandas Individuais, Balcão & Viagem
                </h3>

                {otherOrders.length === 0 ? (
                  <div className="bg-stone-50/60 p-6 text-center rounded-3xl border border-stone-200/80 text-stone-400 text-xs">
                    Nenhuma comanda avulsa ou balcão aberta no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="pdv-tables-listed-grid">
                    {otherOrders.map(order => (
                      <div 
                        key={order.id}
                        id={`pdv-table-card-${order.id}`}
                        className={`bg-white border rounded-3xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-3xs ${
                          loadingOrderId === order.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-stone-200 hover:border-amber-500 hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                              <h4 className="font-extrabold text-stone-900 text-sm truncate max-w-[130px]">{order.mesaOuCliente}</h4>
                            </div>
                            <span className="text-[10px] text-amber-850 font-mono flex items-center gap-1 bg-amber-50 border border-amber-100/50 rounded-md px-2 py-0.5 font-bold shrink-0">
                              <Clock className="w-3 h-3 text-amber-600" /> {order.tempoInicio}
                            </span>
                          </div>

                          {/* Itens do pedido */}
                          <div className="bg-stone-50/70 p-2.5 text-[10px] text-stone-600 font-mono rounded-xl divide-y divide-stone-100 max-h-32 overflow-y-auto">
                            {order.itens.reduce((acc: any[], curr) => {
                              const exist = acc.find(x => x.itemId === curr.itemId);
                              if (exist) {
                                exist.quantidade += curr.quantidade;
                                exist.subtotal += curr.subtotal;
                              } else {
                                acc.push({...curr});
                              }
                              return acc;
                            }, []).map((it, i) => (
                              <div key={i} className="py-1 flex justify-between gap-1.5">
                                <span className="truncate max-w-[150px] text-stone-700 font-bold">{it.quantidade}x {it.nome}</span>
                                <span className="font-black text-stone-850 shrink-0">R$ {it.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex flex-col space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Subtotal Acumulado</span>
                            <span className="text-sm font-black text-amber-800 font-mono">R$ {order.total.toFixed(2)}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              id={`btn-load-order-${order.id}`}
                              onClick={() => handleLoadOpenOrder(order)}
                              className="bg-stone-50 hover:bg-amber-50 text-stone-700 font-bold py-2 px-1.5 rounded-xl text-[11px] border border-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer pointer-events-auto"
                              title="Editar comanda para lançar mais guloseimas"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-500" />
                              Lançar + Itens
                            </button>

                            <button
                              type="button"
                              id={`btn-pay-order-${order.id}`}
                              onClick={() => {
                                handleLoadOpenOrder(order);
                                setTimeout(() => {
                                  document.getElementById('pdv-checkout-panel')?.scrollIntoView({ behavior: 'smooth' });
                                }, 150);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-1.5 rounded-xl text-[11px] border border-amber-600/15 transition-all flex items-center justify-center gap-1 cursor-pointer pointer-events-auto shadow-3xs"
                              title="Descer comanda ao balcão para checkout"
                            >
                              <ShoppingCart className="w-3 h-3 text-white" />
                              Cobrar e Fechar
                            </button>
                          </div>

                          <button
                            type="button"
                            id={`btn-cancel-order-${order.id}`}
                            onClick={() => {
                              if (window.confirm(`Deseja realmente cancelar a comanda de "${order.mesaOuCliente}"? Os itens em aberto serão limpos de sua lista.`)) {
                                if (onUpdateOpenOrders && openOrders) {
                                  onUpdateOpenOrders(openOrders.filter(o => o.id !== order.id));
                                  if (loadingOrderId === order.id) {
                                    clearCart();
                                  }
                                  setSuccessMessage(`Comanda de "${order.mesaOuCliente}" foi devidamente cancelada.`);
                                  setTimeout(() => setSuccessMessage(null), 3500);
                                }
                              }
                            }}
                            className="w-full py-1 text-slate-400 hover:text-red-500 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer pointer-events-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Excluir comanda sem cobrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {activeCatalogTab === 'sales' && (
          <div className="space-y-4" id="pdv-sales-history">
            {/* Barra Informativa de Auditoria */}
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-rose-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Auditoria e Controle de Segurança
              </span>
              <p className="leading-relaxed">
                Todas as exclusões e estornos de caixa exigem a <strong>senha mestre de um administrador</strong>. A exclusão remove a receita correspondente do livro caixa e faz o estorno total dos ingredientes e produtos fáceis ao estoque.
              </p>
            </div>

            {/* Alerta de Sucesso Flutuante interno */}
            {successMessage && (
              <div id="pdv-cancel-success-alert" className="p-3.5 bg-emerald-500 text-white rounded-xl text-xs font-bold leading-tight shadow-md flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {sales.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-rose-50 text-slate-400" id="pdv-no-sales-to-display">
                <Receipt className="w-12 h-12 mx-auto text-rose-200 mb-2.5" />
                <p className="text-xs font-bold text-slate-700">Nenhum lançamento de caixa registrado hoje.</p>
                <p className="text-[11px] text-slate-400 mt-1">Insira e fature novos pedidos na tela anterior para poder visualizá-los e estorná-los aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="pdv-sales-listed-grid">
                {[...sales].reverse().map(sale => {
                  return (
                    <div 
                      key={sale.id}
                      id={`pdv-sale-ticket-${sale.id}`}
                      className="bg-white border border-slate-100 hover:border-rose-150 p-4 rounded-2xl shadow-3xs flex flex-col justify-between space-y-4 hover:shadow-xs transition-shadow"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <div>
                            <span className="text-[10px] font-mono font-black text-rose-500 uppercase tracking-widest block">
                              #{sale.id.replace('sale_', '').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {formatDateBR(sale.data)}
                            </span>
                          </div>
                          <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-200/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
                            {sale.metodoPagamento.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Tabela de Itens Comprados */}
                        <div className="bg-slate-50/75 p-2 text-[10px] text-slate-600 font-mono rounded-lg divide-y divide-slate-100">
                          {sale.itens.map((it, i) => (
                            <div key={i} className="py-1 flex justify-between gap-1.5">
                              <span className="truncate max-w-[130px]">{it.quantidade}x {it.nome}</span>
                              <span className="font-semibold text-slate-800">R$ {it.subtotal.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-slate-400">Total Faturado</p>
                          <p className="text-sm font-bold text-rose-600 font-mono">R$ {sale.total.toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          id={`btn-estornar-${sale.id}`}
                          onClick={() => {
                            setCancelSaleId(sale.id);
                            setAdminPassword('');
                            setAdminPasswordError(null);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1 pointer-events-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" /> Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coluna Direita: Carrinho e Fechamento */}
      <div 
        className={`lg:col-span-5 rounded-3xl border p-5 flex flex-col justify-between transition-all ${
          pdvTheme === 'cozy_terracotta'
            ? 'bg-white border-stone-200 shadow-sm'
            : 'bg-white border-rose-50 shadow-xs'
        }`} 
        id="pdv-right-cart"
      >
        
        {/* Cabecalho do carrinho */}
        <div>
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
            pdvTheme === 'cozy_terracotta' ? 'border-stone-150' : 'border-rose-100'
          }`}>
            <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2 font-sans">
              <ShoppingCart className={`w-5 h-5 ${pdvTheme === 'cozy_terracotta' ? 'text-amber-700' : 'text-rose-500'}`} /> Sacola do Caixa
            </h3>
            {cart.length > 0 && (
              <button 
                id="btn-pdv-clear"
                onClick={clearCart}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-1.5 min-h-[38px] rounded-xl flex items-center gap-1 text-xs font-black transition-all border border-red-200/50 pointer-events-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar Sacola
              </button>
            )}
          </div>

          {/* Identificação de Mesa ou Cliente para Comandas */}
          <div 
            className={`mb-4 border rounded-2xl p-3.5 space-y-2 transition-all ${
              pdvTheme === 'cozy_terracotta'
                ? 'bg-amber-50/15 border-amber-200/60'
                : 'bg-amber-50/20 border-amber-100'
            }`} 
            id="pdv-client-id-panel"
          >
            <div className="flex justify-between items-center">
              <label htmlFor="inp-pdv-table-or-client" className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                <User className={`w-3.5 h-3.5 ${pdvTheme === 'cozy_terracotta' ? 'text-amber-700' : 'text-amber-550'}`} />
                Identificar Mesa ou Cliente
              </label>
              {loadingOrderId && (
                <span className={`text-[9px] text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 animate-pulse ${
                  pdvTheme === 'cozy_terracotta' ? 'bg-amber-600' : 'bg-amber-500'
                }`}>
                  <RefreshCw className="w-2 h-2 animate-spin" /> Editando Comanda
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="inp-pdv-table-or-client"
                type="text"
                placeholder="Ex: Mesa 4, Mariana, Balcão 1..."
                className={`w-full pr-8 pl-3.5 py-2.5 border rounded-xl text-xs font-bold transition-all ${
                  pdvTheme === 'cozy_terracotta'
                    ? 'bg-white border-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-stone-900 placeholder:text-stone-400'
                    : 'bg-white border-slate-200 focus:border-amber-450 focus:ring-1 focus:ring-amber-400 text-slate-800 placeholder:text-slate-400'
                }`}
                value={tableOrClient}
                onChange={e => setTableOrClient(e.target.value)}
              />
              {tableOrClient && (
                <button
                  type="button"
                  id="btn-clear-table-client"
                  onClick={() => setTableOrClient('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 p-0.5 pointer-events-auto cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {loadingOrderId && (
              <p className={`text-[9px] font-semibold leading-none ${pdvTheme === 'cozy_terracotta' ? 'text-amber-800' : 'text-amber-700'}`}>
                Salvar comanda atualizará &ldquo;{tableOrClient}&rdquo; na lista de Mesas.
              </p>
            )}
          </div>

          {/* Lista de Itens do Carrinho */}
          <div className="space-y-3 min-h-60 max-h-80 overflow-y-auto pr-1" id="pdv-cart-list">
            {cartZeroStockItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 space-y-1 animate-pulse" id="pdv-stock-warning-banner">
                <div className="flex items-center gap-1.5 text-red-700">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="text-xs font-extrabold">Alerta de Reposição</span>
                </div>
                <p className="text-[10px] text-red-600 leading-normal font-medium">
                  Há item(ns) selecionado(s) com estoque zerado. A finalização está bloqueada até repor o item.
                </p>
              </div>
            )}
            {cart.length === 0 ? (
              <div className="py-14 text-center text-slate-400" id="pdv-cart-empty-placeholder">
                <ShoppingCart className={`w-12 h-12 mx-auto mb-2.5 ${pdvTheme === 'cozy_terracotta' ? 'text-stone-200' : 'text-rose-200'}`} />
                <p className="text-xs font-extrabold text-stone-600">A sacola de compras está vazia</p>
                <p className="text-[11px] text-slate-450 mt-1 max-w-[210px] mx-auto leading-normal">Toque nos cartões de produtos ao lado para incluir na venda.</p>
              </div>
            ) : (
              cart.map(item => {
                const liveProduct = inventory.find(i => i.id === item.product.id);
                const isOutOfStock = !liveProduct || liveProduct.quantidade <= 0;
                return (
                  <div 
                    key={item.product.id} 
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors ${
                      isOutOfStock
                        ? 'bg-red-50/50 border-red-200 hover:bg-red-50 hover:border-red-300'
                        : pdvTheme === 'cozy_terracotta'
                          ? 'bg-stone-50/60 border-stone-100 hover:bg-amber-50/20 hover:border-amber-500/20'
                          : 'bg-slate-50 border-slate-50 group hover:bg-rose-50/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isOutOfStock ? 'text-red-950 font-black' : pdvTheme === 'cozy_terracotta' ? 'text-stone-900' : 'text-slate-800'}`}>{item.product.nome}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-500 font-mono">
                          R$ {item.product.precoVenda?.toFixed(2)}/un
                        </span>
                        {isOutOfStock && (
                          <span className="text-[9px] font-black text-red-750 bg-red-100/70 px-2 py-0.5 rounded-md mt-1 self-start border border-red-200/50 uppercase tracking-wider">
                            🚫 Estoque Esgotado! Reponha este item.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        id={`btn-cart-minus-${item.product.id}`}
                        onClick={() => updateQuantity(item.product.id, item.quantitySelected - 1)}
                        className={`flex items-center justify-center font-black pointer-events-auto transition-all cursor-pointer shadow-3xs ${
                          pdvTheme === 'cozy_terracotta'
                            ? 'w-11 h-11 bg-white hover:bg-amber-100 text-stone-800 hover:text-amber-800 rounded-xl text-lg border border-stone-250 active:scale-90'
                            : 'w-11 h-11 bg-white hover:bg-rose-100 text-slate-700 hover:text-rose-600 rounded-xl text-lg border border-slate-200 active:scale-90'
                        }`}
                      >
                        -
                      </button>
                      <span className="text-sm font-mono font-bold w-6 text-center">{item.quantitySelected}</span>
                      <button 
                        id={`btn-cart-plus-${item.product.id}`}
                        disabled={isOutOfStock}
                        onClick={() => updateQuantity(item.product.id, item.quantitySelected + 1)}
                        className={`flex items-center justify-center font-black pointer-events-auto transition-all cursor-pointer shadow-3xs ${
                          isOutOfStock
                            ? 'w-11 h-11 bg-stone-100 text-stone-305 rounded-xl text-lg border border-stone-200 cursor-not-allowed opacity-50'
                            : pdvTheme === 'cozy_terracotta'
                              ? 'w-11 h-11 bg-white hover:bg-amber-100 text-stone-800 hover:text-amber-800 rounded-xl text-lg border border-stone-250 active:scale-90'
                              : 'w-11 h-11 bg-white hover:bg-rose-100 text-slate-700 hover:text-rose-600 rounded-xl text-lg border border-slate-200 active:scale-90'
                        }`}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right w-20 shrink-0 font-extrabold text-xs text-slate-900 font-mono">
                      R$ {((item.product.precoVenda || 0) * item.quantitySelected).toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resumos, Descontos, Pagamento e Checkout */}
        <div className={`border-t pt-4 mt-4 space-y-4 ${
          pdvTheme === 'cozy_terracotta' ? 'border-stone-150' : 'border-slate-100'
        }`} id="pdv-checkout-panel">
          
          {/* Sessão de Desconto */}
          <div 
            className={`flex flex-col gap-2 p-3 rounded-2xl ${
              pdvTheme === 'cozy_terracotta' ? 'bg-stone-50 border border-stone-150' : 'bg-slate-50'
            }`} 
            id="pdv-discount-tool"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Percent className={`w-3.5 h-3.5 ${pdvTheme === 'cozy_terracotta' ? 'text-amber-700' : 'text-rose-500'}`} /> 
                Desconto Especial
              </span>
              <div className="flex items-center bg-white rounded-lg border text-[10px] font-bold overflow-hidden">
                <button 
                  id="btn-discount-pct"
                  onClick={() => { setDiscountType('percent'); setDiscountValue(0); }}
                  className={`px-2 py-1 transition-all ${
                    discountType === 'percent' 
                      ? pdvTheme === 'cozy_terracotta' ? 'bg-amber-700 text-white font-extrabold' : 'bg-rose-500 text-white' 
                      : 'hover:bg-slate-50 text-slate-600'
                  } pointer-events-auto cursor-pointer`}
                >
                  %
                </button>
                <button 
                  id="btn-discount-cash"
                  onClick={() => { setDiscountType('fixed'); setDiscountValue(0); }}
                  className={`px-2 py-1 transition-all ${
                    discountType === 'fixed' 
                      ? pdvTheme === 'cozy_terracotta' ? 'bg-amber-700 text-white font-extrabold' : 'bg-rose-500 text-white' 
                      : 'hover:bg-slate-50 text-slate-600'
                  } pointer-events-auto cursor-pointer`}
                >
                  R$
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                id="inp-pdv-discount"
                type="number" 
                placeholder={discountType === 'percent' ? 'Ex: 10%' : 'Ex: 5,00'}
                className="w-full bg-white border border-slate-200 rounded-lg text-xs text-center py-2 px-3 focus:outline-hidden font-mono font-bold text-slate-800"
                value={discountValue || ''}
                onChange={e => setDiscountValue(Math.max(parseFloat(e.target.value) || 0, 0))}
              />
            </div>
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-1.5" id="pdv-payment-method-selector">
            <label className="text-[11px] font-black uppercase text-stone-700 font-sans tracking-wide">Meio de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'pix', label: 'Pix' },
                { key: 'dinheiro', label: 'Dinheiro' },
                { key: 'cartao_credito', label: 'C. Crédito' },
                { key: 'cartao_debito', label: 'C. Débito' }
              ].map(opt => {
                const isSelected = paymentMethod === opt.key;
                return (
                  <button
                    key={opt.key}
                    id={`btn-pay-${opt.key}`}
                    onClick={() => {
                      setPaymentMethod(opt.key as PaymentMethod);
                      if (opt.key !== 'dinheiro') setCashReceived('');
                    }}
                    className={`py-2.5 px-3 text-xs font-extrabold rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      isSelected 
                        ? pdvTheme === 'cozy_terracotta'
                          ? 'border-amber-600 bg-amber-50/55 text-amber-900 shadow-3xs scale-[1.01]'
                          : 'border-rose-500 bg-rose-50 text-rose-700'
                        : pdvTheme === 'cozy_terracotta'
                          ? 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                          : 'border-slate-250 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Se dinheiro selecionado, calcular troco */}
          {paymentMethod === 'dinheiro' && (
            <div 
              className={`p-3.5 rounded-2xl flex items-center gap-3 justify-between transition-colors ${
                pdvTheme === 'cozy_terracotta' ? 'bg-stone-50 border border-stone-150' : 'bg-slate-50'
              }`} 
              id="cash-change-calculator"
            >
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-650 block mb-1 uppercase tracking-wider">Valor Entregue R$</label>
                <input 
                  id="inp-pdv-cash-received"
                  type="text" 
                  placeholder="0,00"
                  className="w-full bg-white border border-slate-250 focus:ring-1 focus:ring-amber-500 focus:outline-hidden py-1.5 px-2.5 rounded-lg text-xs font-bold font-mono text-slate-800"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Troco</span>
                <span className={`text-base font-black font-mono ${
                  pdvTheme === 'cozy_terracotta' ? 'text-amber-800 font-extrabold' : 'text-rose-600'
                }`}>
                  R$ {changeAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Totais Finais */}
          <div 
            className={`space-y-2 border-t pt-3 transition-all ${
              pdvTheme === 'cozy_terracotta' 
                ? 'border-stone-150 bg-amber-50/10 p-3 rounded-2xl border border-amber-200/20' 
                : 'border-slate-100'
            }`} 
            id="pdv-totals-output"
          >
            <div className="flex justify-between text-xs text-stone-550 font-mono">
              <span>Subtotal:</span>
              <span>R$ {cartTotals.subtotal.toFixed(2)}</span>
            </div>
            {cartTotals.discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-mono font-bold">
                <span>Desconto concedido:</span>
                <span>- R$ {cartTotals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-extrabold text-stone-900">Total Geral:</span>
              <span className={`text-2xl font-black font-mono tracking-tight ${
                pdvTheme === 'cozy_terracotta' ? 'text-amber-800' : 'text-rose-600'
              }`}>
                R$ {cartTotals.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botões de Decisão: Guardar Comanda ou Finalizar Faturamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="pdv-checkout-actions-container">
            <button
              id="btn-pdv-hold-order"
              type="button"
              disabled={cart.length === 0}
              onClick={handleSaveToComanda}
              className={`py-3.5 px-3.5 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all shadow-xs border cursor-pointer ${
                cart.length > 0 
                  ? 'bg-amber-500 border-amber-600 hover:bg-amber-600 text-white active:scale-[0.99]'
                  : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
              }`}
              title="Guardar comanda em aberto para fechar e cobrar do cliente posteriormente"
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              {loadingOrderId ? 'Salvar Comanda' : 'Guardar Comanda'}
            </button>

            <button
              id="btn-pdv-checkout-submit"
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className={`py-3.5 px-3.5 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all shadow-md border cursor-pointer ${
                cart.length > 0 
                  ? 'bg-emerald-600 border-emerald-700 hover:bg-emerald-700 text-white active:scale-[0.99]'
                  : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
              }`}
              title="Faturar e registrar o pagamento imediato desta comanda baixando os estoques"
            >
              <ShoppingCart className="w-4 h-4 shrink-0 text-emerald-150" />
              [🛒] Finalizar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Recibo Impresso / Modal de Sucesso */}
      <AnimatePresence>
        {showReceiptModal && lastCompletedSale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
            id="receipt-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl max-w-sm w-full font-sans overflow-hidden flex flex-col"
              id="pdv-receipt-card"
            >
              {/* Cabeçalho da Impressora */}
              <div className="bg-slate-800 text-white px-4 py-3 border-b border-slate-700/60 flex justify-between items-center text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-rose-400 animate-pulse" />
                  Visualização da Impressora
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                  80mm Térmica
                </span>
              </div>

              {/* Ranhura de saída do papel */}
              <div className="bg-slate-950 p-1.5 relative flex flex-col items-center">
                <div className="w-11/12 h-1 bg-slate-900 rounded-full shadow-inner border-b border-slate-850"></div>
              </div>

              {/* Corpo do Cupom / Papel Térmico */}
              <div className="bg-slate-950 px-4 pb-4 pt-1 flex justify-center">
                <div 
                  className="bg-[#FAFAF7] border border-stone-300 shadow-md p-5 text-slate-800 font-mono text-xs w-full relative overflow-hidden transition-all duration-500"
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.03)',
                    backgroundImage: 'radial-gradient(#00000005 1px, transparent 0)',
                    backgroundSize: '4px 4px'
                  }}
                >
                  {/* Bordas denteadas simuladas no topo */}
                  <div className="absolute top-0 left-0 right-0 h-1 flex overflow-hidden">
                    {Array.from({ length: 30 }).map((_, idx) => (
                      <div key={idx} className="w-4 h-4 bg-slate-950 shrink-0 rotate-45 -translate-y-2 border-b border-r border-stone-250" />
                    ))}
                  </div>

                  {/* Stamp de Pago / Impresso */}
                  <AnimatePresence>
                    {printSuccess && (
                      <motion.div 
                        initial={{ scale: 2, opacity: 0, rotate: 0 }}
                        animate={{ scale: 1, opacity: 1, rotate: -12 }}
                        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-double border-rose-500/85 text-rose-600 font-black text-lg py-1 px-4 tracking-widest rounded-lg z-20 pointer-events-none select-none uppercase font-sans flex flex-col items-center justify-center bg-[#FAFAF7]/95 shadow-sm"
                      >
                        <span className="text-[10px] tracking-normal font-bold">CONFEITARIA</span>
                        <span>PAGO</span>
                        <span className="text-[9px] tracking-normal font-mono font-semibold">{formatDateBR(lastCompletedSale.data)}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Linha de Varredura Laser de Impressão */}
                  {isPrinting && (
                    <motion.div 
                      initial={{ top: '0%' }}
                      animate={{ top: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-rose-500 shadow-[0_0_10px_#f43f5e] z-10 pointer-events-none"
                    />
                  )}

                  {/* Overlay Escurecido durante a impressão */}
                  {isPrinting && (
                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[0.5px] z-5 flex items-center justify-center transition-all">
                      <div className="bg-white/95 p-3 rounded-xl border border-stone-100 shadow-sm flex items-center gap-2 max-w-[190px] mx-auto text-center justify-center">
                        <RefreshCw className="w-4 h-4 text-rose-500 animate-spin" />
                        <span className="text-[10px] font-sans font-extrabold text-slate-800">Imprimindo cupom...</span>
                      </div>
                    </div>
                  )}

                  {/* Conteúdo do Cupom */}
                  <div className="text-center space-y-1 mb-4 border-b border-dashed border-stone-300 pb-4 font-sans mt-2">
                    <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                      {activeCompany?.nomeFantasia || 'DOCE SABOR CONFEITARIA'}
                    </h3>
                    {activeCompany?.slogan && (
                      <p className="text-[9px] text-slate-500 italic">"{activeCompany.slogan}"</p>
                    )}
                    {activeCompany?.cnpj && activeCompany.cnpj !== 'Sem CNPJ' && (
                      <p className="text-[9px] text-slate-500 font-mono">CNPJ: {activeCompany.cnpj}</p>
                    )}
                    {activeCompany?.telefone && activeCompany.telefone !== 'Sem Telefone' && (
                      <p className="text-[9px] text-slate-500 font-mono">Tel: {activeCompany.telefone}</p>
                    )}
                    {activeCompany?.endereco && activeCompany.endereco !== 'Sem Endereço' && (
                      <p className="text-[8px] text-slate-500 text-center max-w-[220px] mx-auto leading-tight">{activeCompany.endereco}</p>
                    )}
                    <p className="text-[9px] text-slate-500 font-mono mt-2 border-t border-dashed border-stone-200 pt-2">Venda ID: #{lastCompletedSale.id.replace('sale_', '').toUpperCase()}</p>
                    <p className="text-[9px] text-slate-500 font-mono">Data: {formatDateBR(lastCompletedSale.data)} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    {lastCompletedSale.mesaOuCliente && (
                      <p className="text-[9px] bg-stone-200/60 text-slate-800 font-bold px-1.5 py-0.5 rounded inline-block mt-1">
                        Comanda: {lastCompletedSale.mesaOuCliente}
                      </p>
                    )}
                  </div>

                  {/* Lista de Itens */}
                  <div className="space-y-2 border-b border-dashed border-stone-300 pb-3 mb-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex justify-between font-bold text-slate-500 text-[9px] uppercase border-b border-stone-200 pb-1 mb-1">
                      <span>Item/Qtd</span>
                      <span>Total</span>
                    </div>
                    {lastCompletedSale.itens.map((item, id) => (
                      <div key={id} className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <span className="text-slate-900 font-bold">{item.nome}</span>
                          <div className="text-[10px] text-slate-500">{item.quantidade}x R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <span className="font-bold text-slate-950">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totais do Pedido */}
                  <div className="space-y-1 font-mono text-[11px] border-b border-dashed border-stone-300 pb-3 mb-3 text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal de Vendas:</span>
                      <span>R$ {lastCompletedSale.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {lastCompletedSale.desconto > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Descontos (-):</span>
                        <span>R$ {lastCompletedSale.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-950 font-black text-xs pt-1.5 border-t border-stone-200 mt-1">
                      <span>TOTAL A PAGAR:</span>
                      <span>R$ {lastCompletedSale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="text-center font-mono text-[10px] text-slate-500 space-y-1">
                    <p className="font-bold text-emerald-600 uppercase">Estoque de Perecíveis Sincronizado!</p>
                    <p className="italic">Doce Sabor — Adoçando seus momentos!</p>
                    <p className="text-[8px] text-slate-400">Obrigado pela preferência. Volte Sempre!</p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação na base do Modal */}
              <div className="bg-slate-800 p-4 rounded-b-3xl border-t border-slate-700 space-y-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    // Play synthesized audio
                    try {
                      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                      if (AudioContextClass) {
                        const ctx = new AudioContextClass();
                        
                        // Beep de início de impressão (som agudo rápido)
                        const osc1 = ctx.createOscillator();
                        const gain1 = ctx.createGain();
                        osc1.type = 'sine';
                        osc1.frequency.setValueAtTime(1000, ctx.currentTime);
                        gain1.gain.setValueAtTime(0.04, ctx.currentTime);
                        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                        osc1.connect(gain1);
                        gain1.connect(ctx.destination);
                        osc1.start();
                        osc1.stop(ctx.currentTime + 0.1);

                        // Sequência de barulhos de motor de passo zzt zzt zzt...
                        const steps = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
                        steps.forEach((delay, index) => {
                          const time = ctx.currentTime + delay;
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          
                          osc.type = 'sawtooth';
                          osc.frequency.setValueAtTime(140 + (index % 2) * 30, time);
                          osc.frequency.exponentialRampToValueAtTime(70, time + 0.12);
                          
                          gain.gain.setValueAtTime(0.015, time);
                          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
                          
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.start(time);
                          osc.stop(time + 0.12);
                        });

                        // Beep de conclusão
                        const endDelay = 1.6;
                        const osc2 = ctx.createOscillator();
                        const gain2 = ctx.createGain();
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(1300, ctx.currentTime + endDelay);
                        gain2.gain.setValueAtTime(0.04, ctx.currentTime + endDelay);
                        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + endDelay + 0.15);
                        osc2.connect(gain2);
                        gain2.connect(ctx.destination);
                        osc2.start(ctx.currentTime + endDelay);
                        osc2.stop(ctx.currentTime + endDelay + 0.15);
                      }
                    } catch (err) {
                      console.warn("Navegador impediu o áudio", err);
                    }
                    handleSimulatePrint();
                  }}
                  disabled={isPrinting}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    printSuccess 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500' 
                      : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-450 active:scale-[0.98]'
                  } ${isPrinting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  {isPrinting ? 'Imprimindo via Rádio...' : printSuccess ? 'Simular Outra Impressão 🖨️' : 'Simular Impressão Térmica'}
                </button>

                <button
                  id="btn-receipt-modal-close"
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setIsPrinting(false);
                    setPrintSuccess(false);
                  }}
                  className="w-full py-2.5 bg-slate-750 hover:bg-slate-700 border border-slate-650 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Fechar e Concluir Venda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação com Senha Administrativa */}
      <AnimatePresence>
        {cancelSaleId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="pdv-auth-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 border shadow-2xl max-w-sm w-full font-sans text-slate-800 space-y-4"
              id="pdv-auth-password-card"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Autorização Exigida</h3>
                <p className="text-xs text-slate-500 px-4 leading-normal">
                  Esta operação requer a <strong>senha mestre de um administrador</strong> para estornar o caixa e reabastecer o estoque.
                </p>
                <div className="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-mono inline-block">
                  CÓDIGO: #{cancelSaleId.replace('sale_', '').toUpperCase()}
                </div>
              </div>

              <form onSubmit={handleAuthAndCancel} className="space-y-4" id="frm-admin-auth">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-600 block text-center">Senha do Administrador</label>
                  <input 
                    id="inp-auth-admin-password"
                    type="password"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-400 focus:bg-white focus:outline-hidden rounded-xl py-2.5 px-3 font-mono text-center font-bold text-slate-850 text-lg transition-all"
                    placeholder="••••"
                    value={adminPassword}
                    onChange={e => {
                      setAdminPassword(e.target.value);
                      setAdminPasswordError(null);
                    }}
                    required
                    autoFocus
                  />
                </div>

                {adminPasswordError && (
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-xs text-red-700" id="auth-error-msg">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{adminPasswordError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelSaleId(null);
                      setAdminPassword('');
                      setAdminPasswordError(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer pointer-events-auto"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 hover:bg-red-650 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer pointer-events-auto flex items-center justify-center gap-1"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modal de Alerta de Estoque Zerado */}
      <AnimatePresence>
        {stockAlertItems.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            id="pdv-stock-alert-modal-backdrop"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 border shadow-2xl max-w-md w-full font-sans text-slate-800 space-y-4"
              id="pdv-stock-alert-card"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-1 border border-red-100">
                  <ShieldAlert className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">Impossível Finalizar Venda!</h3>
                <p className="text-xs text-slate-500 px-4 leading-normal">
                  Identificamos que um ou mais itens selecionados estão sem estoque (quantidade igual a zero) no sistema.
                </p>
              </div>

              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-black text-red-600 block uppercase tracking-wider">Itens a serem repostos:</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {stockAlertItems.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-red-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.product.nome}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Categoria: {item.product.categoria || 'Sem categoria'}</p>
                      </div>
                      <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-lg border border-red-200">
                        Estoque: 0 un
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-150 rounded-2xl p-3.5 flex gap-2.5 items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-amber-800 leading-tight">Mensagem ao Atendente:</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    Por favor, realize a reposição do estoque deste item antes de prosseguir com a finalização. Vá até a aba <strong>&ldquo;Estoque&rdquo;</strong> para adicionar uma nova entrada ou lote para este produto.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Remover os itens zerados do carrinho para facilitar a vida do atendente caso queira prosseguir com outros produtos
                    const idsToRemove = stockAlertItems.map(item => item.product.id);
                    setCart(prev => prev.filter(item => !idsToRemove.includes(item.product.id)));
                    setStockAlertItems([]);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-750 border border-slate-200 cursor-pointer pointer-events-auto transition-all text-center"
                >
                  Remover Zerados
                </button>
                <button
                  type="button"
                  onClick={() => setStockAlertItems([])}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer pointer-events-auto transition-all text-center"
                >
                  Entendi, vou repor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
