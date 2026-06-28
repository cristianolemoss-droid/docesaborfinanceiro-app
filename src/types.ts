/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InventoryItem {
  id: string;
  nome: string;
  tipo: 'ingrediente' | 'produto_final';
  quantidade: number;
  unidade: 'kg' | 'un' | 'L' | 'g' | 'ml';
  custoUnitario: number;
  precoVenda?: number; // Somente para produto_final
  estoqueMinimo: number;
  dataFabricacao?: string; // Formato YYYY-MM-DD
  dataValidade: string; // Formato YYYY-MM-DD (Perecíveis)
  categoria: string;
  receitaIngredientes?: { ingredienteId: string; quantidade: number }[]; // Para baixar estoque de ingredientes ao vender
  imagem?: string; // URL da imagem do produto ou base64
}

export interface LossRecord {
  id: string;
  itemId: string;
  nomeItem: string;
  quantidade: number;
  unidade: string;
  data: string;
  motivo: 'Validade Vencida' | 'Dano físico' | 'Erro na Produção' | 'Outro';
  custoTotal: number;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';

export interface Sale {
  id: string;
  data: string;
  itens: {
    itemId: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
  subtotal: number;
  desconto: number;
  total: number;
  metodoPagamento: PaymentMethod;
  mesaOuCliente?: string; // Informação da mesa ou cliente se houver faturamento
}

export interface OpenOrder {
  id: string;
  mesaOuCliente: string; // "Mesa 4", "Cliente João", etc.
  data: string;
  itens: {
    itemId: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
  subtotal: number;
  desconto: number;
  total: number;
  tempoInicio: string; // Ex: "14:35"
}

export interface Transaction {
  id: string;
  data: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  valor: number;
  descricao: string;
  origemId?: string; // ID da venda ou ID do registro de perda
}

export interface CompanyConfig {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  email: string;
  slogan: string;
  ativo: boolean;
}

export interface UserAccount {
  id: string;
  username: string; // ex: admin, colab, maria
  nome: string;     // ex: Administrador, Maria Confeiteira
  senha: string;    // senha correspondente
  role: 'admin' | 'collaborator' | 'developer';
  tenantId?: string; // ID do inquilino/cliente para suporte a multi-tenancy
}


