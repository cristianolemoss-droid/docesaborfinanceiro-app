/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem, LossRecord, Transaction, Sale } from '../types';
import { getOffsetDateString } from './dateHelpers';

export const INITIAL_INVENTORY: InventoryItem[] = [
  // INGREDIENTES (Perecíveis)
  {
    id: 'ing_1',
    nome: 'Morangos Frescos Organicos',
    tipo: 'ingrediente',
    quantidade: 4.8,
    unidade: 'kg',
    custoUnitario: 18.00,
    estoqueMinimo: 1.5,
    dataFabricacao: getOffsetDateString(-2),
    dataValidade: getOffsetDateString(2), // expira em breve!
    categoria: 'Frutas'
  },
  {
    id: 'ing_2',
    nome: 'Creme de Leite Fresco',
    tipo: 'ingrediente',
    quantidade: 12,
    unidade: 'L',
    custoUnitario: 14.50,
    estoqueMinimo: 4,
    dataFabricacao: getOffsetDateString(-6),
    dataValidade: getOffsetDateString(4),
    categoria: 'Laticínios'
  },
  {
    id: 'ing_3',
    nome: 'Chantilly Premium',
    tipo: 'ingrediente',
    quantidade: 1.2, // estoque crítico!
    unidade: 'L',
    custoUnitario: 12.00,
    estoqueMinimo: 3,
    dataFabricacao: getOffsetDateString(-12),
    dataValidade: getOffsetDateString(3),
    categoria: 'Laticínios'
  },
  {
    id: 'ing_4',
    nome: 'Manteiga sem Sal',
    tipo: 'ingrediente',
    quantidade: 5.5,
    unidade: 'kg',
    custoUnitario: 32.00,
    estoqueMinimo: 2,
    dataFabricacao: getOffsetDateString(-20),
    dataValidade: getOffsetDateString(10),
    categoria: 'Mercearia'
  },
  {
    id: 'ing_5',
    nome: 'Leite Condensado Nestlé',
    tipo: 'ingrediente',
    quantidade: 36,
    unidade: 'un',
    custoUnitario: 6.20,
    estoqueMinimo: 10,
    dataFabricacao: getOffsetDateString(-10),
    dataValidade: getOffsetDateString(40),
    categoria: 'Laticínios'
  },
  {
    id: 'ing_6',
    nome: 'Chocolate Belga Callebaut 54%',
    tipo: 'ingrediente',
    quantidade: 8.5,
    unidade: 'kg',
    custoUnitario: 75.00,
    estoqueMinimo: 3,
    dataFabricacao: getOffsetDateString(-30),
    dataValidade: getOffsetDateString(120),
    categoria: 'Chocolates'
  },
  {
    id: 'ing_7',
    nome: 'Framboesas Frescas',
    tipo: 'ingrediente',
    quantidade: 0, // zerado e vencido ontem!
    unidade: 'kg',
    custoUnitario: 45.00,
    estoqueMinimo: 1,
    dataFabricacao: getOffsetDateString(-4),
    dataValidade: getOffsetDateString(-1), // vencido!
    categoria: 'Frutas'
  },

  // PRODUTOS FINAIS (Prontos para Venda)
  {
    id: 'prod_1',
    nome: 'Fatia Bolo Red Velvet',
    tipo: 'produto_final',
    quantidade: 14,
    unidade: 'un',
    custoUnitario: 6.50,
    precoVenda: 18.00,
    estoqueMinimo: 5,
    dataFabricacao: getOffsetDateString(-1),
    dataValidade: getOffsetDateString(2),
    categoria: 'Bolos & Fatias',
    receitaIngredientes: [
      { ingredienteId: 'ing_2', quantidade: 0.1 }, // 100ml creme de leite por fatia
    ]
  },
  {
    id: 'prod_2',
    nome: 'Bolo de Pote Ninho com Morango',
    tipo: 'produto_final',
    quantidade: 18,
    unidade: 'un',
    custoUnitario: 5.20,
    precoVenda: 15.00,
    estoqueMinimo: 6,
    dataFabricacao: getOffsetDateString(0),
    dataValidade: getOffsetDateString(3),
    categoria: 'Bolos de Pote',
    receitaIngredientes: [
      { ingredienteId: 'ing_1', quantidade: 0.05 }, // 50g morangos por pote
      { ingredienteId: 'ing_5', quantidade: 0.5 }, // meio leite condensado
    ]
  },
  {
    id: 'prod_3',
    nome: 'Brigadeiro Gourmet Belga 30g',
    tipo: 'produto_final',
    quantidade: 64,
    unidade: 'un',
    custoUnitario: 1.80,
    precoVenda: 4.50,
    estoqueMinimo: 20,
    dataFabricacao: getOffsetDateString(-1),
    dataValidade: getOffsetDateString(5),
    categoria: 'Doces'
  },
  {
    id: 'prod_4',
    nome: 'Cupcake Formigueiro com Ganache',
    tipo: 'produto_final',
    quantidade: 8,
    unidade: 'un',
    custoUnitario: 3.10,
    precoVenda: 9.90,
    estoqueMinimo: 4,
    dataFabricacao: getOffsetDateString(-1),
    dataValidade: getOffsetDateString(1), // expira amanhã!
    categoria: 'Doces'
  },
  {
    id: 'prod_5',
    nome: 'Torta Holandesa Divina (Inteira)',
    tipo: 'produto_final',
    quantidade: 3,
    unidade: 'un',
    custoUnitario: 28.00,
    precoVenda: 89.00,
    estoqueMinimo: 1,
    dataFabricacao: getOffsetDateString(-2),
    dataValidade: getOffsetDateString(4),
    categoria: 'Tortas Inteiras'
  },
  {
    id: 'prod_6',
    nome: 'Cheesecake de Frutas Vermelhas (Inteira)',
    tipo: 'produto_final',
    quantidade: 2,
    unidade: 'un',
    custoUnitario: 35.00,
    precoVenda: 110.00,
    estoqueMinimo: 1,
    dataFabricacao: getOffsetDateString(-1),
    dataValidade: getOffsetDateString(3),
    categoria: 'Tortas Inteiras'
  }
];

export const INITIAL_LOSS_RECORDS: LossRecord[] = [
  {
    id: 'loss_1',
    itemId: 'ing_7',
    nomeItem: 'Framboesas Frescas',
    quantidade: 1.5,
    unidade: 'kg',
    data: getOffsetDateString(-1),
    motivo: 'Validade Vencida',
    custoTotal: 67.50
  },
  {
    id: 'loss_2',
    itemId: 'prod_4',
    nomeItem: 'Cupcake Formigueiro com Ganache',
    quantidade: 4,
    unidade: 'un',
    data: getOffsetDateString(-4),
    motivo: 'Dano físico',
    custoTotal: 12.40
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // receitas passadas
  { id: 't_1', data: getOffsetDateString(-6), tipo: 'receita', categoria: 'Vendas PDV', valor: 450.00, descricao: 'Vendas do dia' },
  { id: 't_2', data: getOffsetDateString(-5), tipo: 'receita', categoria: 'Vendas PDV', valor: 590.00, descricao: 'Vendas do dia' },
  { id: 't_3', data: getOffsetDateString(-4), tipo: 'receita', categoria: 'Vendas PDV', valor: 420.00, descricao: 'Vendas do dia' },
  { id: 't_4', data: getOffsetDateString(-3), tipo: 'receita', categoria: 'Vendas PDV', valor: 680.00, descricao: 'Vendas do dia' },
  { id: 't_5', data: getOffsetDateString(-2), tipo: 'receita', categoria: 'Vendas Encomenda', valor: 350.00, descricao: 'Sinal Bolo de Casamento' },
  { id: 't_6', data: getOffsetDateString(-2), tipo: 'receita', categoria: 'Vendas PDV', valor: 720.00, descricao: 'Vendas do dia' },
  { id: 't_sale_1', data: getOffsetDateString(-1), tipo: 'receita', categoria: 'Vendas PDV', valor: 76.00, descricao: 'Venda PDV [Cod: SALE_1] - 2x Fatia Bolo Red Velvet, 10x Brigadeiro Gourmet Belga 30g', origemId: 'sale_1' },
  { id: 't_sale_2', data: getOffsetDateString(0), tipo: 'receita', categoria: 'Vendas PDV', valor: 134.00, descricao: 'Venda PDV [Cod: SALE_2] - 1x Torta Holandesa Divina (Inteira), 3x Bolo de Pote Ninho com Morango', origemId: 'sale_2' },
  
  // despesas passadas
  { id: 't_8', data: getOffsetDateString(-6), tipo: 'despesa', categoria: 'Matéria-Prima', valor: 154.00, descricao: 'Compra com distribuidora de laticínios' },
  { id: 't_9', data: getOffsetDateString(-5), tipo: 'despesa', categoria: 'Energia / Água', valor: 180.00, descricao: 'Conta de Luz Confeitaria Cozinha' },
  { id: 't_10', data: getOffsetDateString(-4), tipo: 'despesa', categoria: 'Desperdício de Estoque', valor: 12.40, descricao: 'Perda: 4x Cupcake Formigueiro' },
  { id: 't_11', data: getOffsetDateString(-3), tipo: 'despesa', categoria: 'Matéria-Prima', valor: 210.00, descricao: 'Compra de Frutas e Embalagens' },
  { id: 't_12', data: getOffsetDateString(-1), tipo: 'despesa', categoria: 'Desperdício de Estoque', valor: 67.50, descricao: 'Perda: 1.5kg Framboesas Frescas (Vencida)' },
  { id: 't_13', data: getOffsetDateString(0), tipo: 'despesa', categoria: 'Taxas e Tarifas', valor: 45.00, descricao: 'Mensalidade Software do MEI' }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale_1',
    data: getOffsetDateString(-1),
    itens: [
      { itemId: 'prod_1', nome: 'Fatia Bolo Red Velvet', quantidade: 2, precoUnitario: 18.00, subtotal: 36.00 },
      { itemId: 'prod_3', nome: 'Brigadeiro Gourmet Belga 30g', quantidade: 10, precoUnitario: 4.50, subtotal: 45.00 }
    ],
    subtotal: 81.00,
    desconto: 5.00,
    total: 76.00,
    metodoPagamento: 'pix'
  },
  {
    id: 'sale_2',
    data: getOffsetDateString(0),
    itens: [
      { itemId: 'prod_5', nome: 'Torta Holandesa Divina (Inteira)', quantidade: 1, precoUnitario: 89.00, subtotal: 89.00 },
      { itemId: 'prod_2', nome: 'Bolo de Pote Ninho com Morango', quantidade: 3, precoUnitario: 15.00, subtotal: 45.00 }
    ],
    subtotal: 134.00,
    desconto: 0,
    total: 134.00,
    metodoPagamento: 'cartao_credito'
  }
];
