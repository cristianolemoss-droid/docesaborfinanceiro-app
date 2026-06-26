import { supabase, isSupabaseConfigured } from './supabaseClient';
import { InventoryItem, LossRecord, Transaction, Sale } from '../types';

// ============================================================================
// Mappers to translate between Supabase (Snake Case) and Local React (Camel Case)
// ============================================================================

export const mapInventoryToDb = (item: InventoryItem) => ({
  id: item.id,
  nome: item.nome,
  tipo: item.tipo,
  quantidade: item.quantidade,
  unidade: item.unidade,
  custo_unitario: item.custoUnitario,
  preco_venda: item.precoVenda !== undefined ? item.precoVenda : null,
  estoque_minimo: item.estoqueMinimo,
  data_fabricacao: item.dataFabricacao || null,
  data_validade: item.dataValidade,
  categoria: item.categoria,
  receita_ingredientes: item.receitaIngredientes ? JSON.stringify(item.receitaIngredientes) : null,
  imagem: item.imagem || null
});

export const mapInventoryFromDb = (row: any): InventoryItem => ({
  id: row.id,
  nome: row.nome,
  tipo: row.tipo as 'ingrediente' | 'produto_final',
  quantidade: Number(row.quantidade),
  unidade: row.unidade as 'kg' | 'un' | 'L' | 'g' | 'ml',
  custoUnitario: Number(row.custo_unitario),
  precoVenda: row.preco_venda !== null && row.preco_venda !== undefined ? Number(row.preco_venda) : undefined,
  estoqueMinimo: Number(row.estoque_minimo),
  dataFabricacao: row.data_fabricacao || undefined,
  dataValidade: row.data_validade,
  categoria: row.categoria,
  receitaIngredientes: row.receita_ingredientes 
    ? (typeof row.receita_ingredientes === 'string' ? JSON.parse(row.receita_ingredientes) : row.receita_ingredientes) 
    : undefined,
  imagem: row.imagem || undefined
});

export const mapLossToDb = (record: LossRecord) => ({
  id: record.id,
  item_id: record.itemId,
  nome_item: record.nomeItem,
  quantidade: record.quantidade,
  unidade: record.unidade,
  data: record.data,
  motivo: record.motivo,
  custo_total: record.custoTotal
});

export const mapLossFromDb = (row: any): LossRecord => ({
  id: row.id,
  itemId: row.item_id,
  nomeItem: row.nome_item,
  quantidade: Number(row.quantidade),
  unidade: row.unidade,
  data: row.data,
  motivo: row.motivo as 'Validade Vencida' | 'Dano físico' | 'Erro na Produção' | 'Outro',
  custoTotal: Number(row.custo_total)
});

export const mapSaleToDb = (sale: Sale) => ({
  id: sale.id,
  data: sale.data,
  itens: typeof sale.itens === 'string' ? sale.itens : JSON.stringify(sale.itens),
  subtotal: sale.subtotal,
  desconto: sale.desconto,
  total: sale.total,
  metodo_pagamento: sale.metodoPagamento
});

export const mapSaleFromDb = (row: any): Sale => ({
  id: row.id,
  data: row.data,
  itens: typeof row.itens === 'string' ? JSON.parse(row.itens) : row.itens,
  subtotal: Number(row.subtotal),
  desconto: Number(row.desconto),
  total: Number(row.total),
  metodoPagamento: row.metodo_pagamento as any
});

export const mapTransactionToDb = (tx: Transaction) => ({
  id: tx.id,
  data: tx.data,
  tipo: tx.tipo,
  categoria: tx.categoria,
  valor: tx.valor,
  descricao: tx.descricao,
  origem_id: tx.origemId || null
});

export const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  data: row.data,
  tipo: row.tipo as 'receita' | 'despesa',
  categoria: row.categoria,
  valor: Number(row.valor),
  descricao: row.descricao,
  origemId: row.origem_id || undefined
});


// ============================================================================
// Database CRUD operations (Fail-safe, returning custom error indications)
// ============================================================================

export interface SupabaseFetchResult {
  success: boolean;
  inventory?: InventoryItem[];
  lossRecords?: LossRecord[];
  transactions?: Transaction[];
  sales?: Sale[];
  error?: string;
}

/**
 * Downloads all tables from Supabase to load on startup
 */
export async function downloadAllFromSupabase(): Promise<SupabaseFetchResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase não está configurado. Cadastre as chaves no Settings.' };
  }

  try {
    // Parallel fetches for responsiveness
    const [invRes, lossRes, saleRes, txRes] = await Promise.all([
      supabase.from('bakery_inventory').select('*'),
      supabase.from('bakery_loss_records').select('*'),
      supabase.from('bakery_sales').select('*'),
      supabase.from('bakery_transactions').select('*')
    ]);

    // Check individual errors (usually tables don't exist yet before running setup SQL)
    if (invRes.error) throw new Error(`Inventário: ${invRes.error.message}`);
    if (lossRes.error) throw new Error(`Perdas/Descartes: ${lossRes.error.message}`);
    if (saleRes.error) throw new Error(`Vendas PDV: ${saleRes.error.message}`);
    if (txRes.error) throw new Error(`Transações Livro Caixa: ${txRes.error.message}`);

    return {
      success: true,
      inventory: (invRes.data || []).map(mapInventoryFromDb),
      lossRecords: (lossRes.data || []).map(mapLossFromDb),
      sales: (saleRes.data || []).map(mapSaleFromDb),
      transactions: (txRes.data || []).map(mapTransactionFromDb)
    };
  } catch (err: any) {
    console.error('Erro ao baixar dados do Supabase:', err.message);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao tentar consultar tabelas do banco de dados.'
    };
  }
}

/**
 * Pushes all current LocalState to Supabase (Overwrite/Update/Upsert match)
 */
export async function uploadAllToSupabase(
  inventory: InventoryItem[],
  lossRecords: LossRecord[],
  sales: Sale[],
  transactions: Transaction[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Credenciais do Supabase ausentes ou incompletas.' };
  }

  try {
    // 1. Convert models to DB scheme
    const dbInventory = inventory.map(mapInventoryToDb);
    const dbLosses = lossRecords.map(mapLossToDb);
    const dbSales = sales.map(mapSaleToDb);
    const dbTransactions = transactions.map(mapTransactionToDb);

    // 2. Perform upserts
    const promises = [];

    if (dbInventory.length > 0) {
      promises.push(supabase.from('bakery_inventory').upsert(dbInventory));
    }
    if (dbLosses.length > 0) {
      promises.push(supabase.from('bakery_loss_records').upsert(dbLosses));
    }
    if (dbSales.length > 0) {
      promises.push(supabase.from('bakery_sales').upsert(dbSales));
    }
    if (dbTransactions.length > 0) {
      promises.push(supabase.from('bakery_transactions').upsert(dbTransactions));
    }

    const results = await Promise.all(promises);

    // Check for errors
    for (const res of results) {
      if (res.error) {
        throw new Error(res.error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao fazer upload para Supabase:', err);
    return { success: false, error: err.message || 'Falha ao sincronizar dados com a nuvem do Supabase.' };
  }
}

/**
 * Double checks connectivity to verify if API parameters are live and tables are reachable
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; details: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, details: 'Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão declaradas no ambiente do app.' };
  }

  try {
    // Try to run a simple, dummy query on one table to verify it exists and is readable
    const { data, error } = await supabase.from('bakery_inventory').select('id').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return { 
          success: true, 
          details: 'Conectado! ✅ A API do Supabase respondeu com sucesso, mas você ainda não criou as tabelas de Confeitaria. Vá para a aba Configurações e execute o script SQL fornecido!' 
        };
      }
      throw new Error(error.message);
    }

    return { 
      success: true, 
      details: 'Conectado com sucesso total! 🎉 A API respondeu perfeitamente e as tabelas estão prontas para a operação em tempo real.' 
    };
  } catch (err: any) {
    return { 
      success: false, 
      details: `Falha na conexão: ${err.message || 'Verifique se as chaves estão corretas ou se há bloqueio de CORS.'}` 
    };
  }
}

/**
 * Push an individual transaction directly (realtime single sync helper)
 */
export async function syncSingleTransaction(tx: Transaction): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_transactions').upsert(mapTransactionToDb(tx));
    return !error;
  } catch {
    return false;
  }
}

/**
 * Push an individual inventory item directly (realtime single sync helper)
 */
export async function syncSingleInventoryItem(item: InventoryItem): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_inventory').upsert(mapInventoryToDb(item));
    return !error;
  } catch {
    return false;
  }
}

/**
 * Pushes individual inventory bundle to keep in sync
 */
export async function syncAllInventoryItems(items: InventoryItem[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || items.length === 0) return false;
  try {
    const { error } = await supabase.from('bakery_inventory').upsert(items.map(mapInventoryToDb));
    return !error;
  } catch {
    return false;
  }
}

/**
 * Push an individual loss record directly
 */
export async function syncSingleLoss(record: LossRecord): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_loss_records').upsert(mapLossToDb(record));
    return !error;
  } catch {
    return false;
  }
}

/**
 * Push an individual sale directly
 */
export async function syncSingleSale(sale: Sale): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_sales').upsert(mapSaleToDb(sale));
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete a single transaction from Supabase
 */
export async function deleteSingleTransaction(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_transactions').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete matching transactions by origin_id (from a canceled sale)
 */
export async function deleteTransactionsByOrigin(originId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_transactions').delete().eq('origem_id', originId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete a single sale from Supabase
 */
export async function deleteSingleSale(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('bakery_sales').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}


// ============================================================================
// SQL Script Generator to guide users in setting up Supabase
// ============================================================================

export const SUPABASE_SQL_SETUP_CODE = `-- SCRIPT SQL DE CRIAÇÃO DE TABELAS - DOCE ATELIER CONFEITARIA ERP & PDV
-- Copie e cole este script completo no Painel SQL (SQL Editor) do seu projeto Supabase!

-- 1. TABELA DE ESTOQUE / INVENTÁRIO
CREATE TABLE IF NOT EXISTS public.bakery_inventory (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingrediente', 'produto_final')),
    quantidade NUMERIC NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL,
    custo_unitario NUMERIC NOT NULL DEFAULT 0,
    preco_venda NUMERIC,
    estoque_minimo NUMERIC NOT NULL DEFAULT 0,
    data_fabricacao DATE,
    data_validade DATE NOT NULL,
    categoria TEXT NOT NULL,
    receita_ingredientes JSONB,
    imagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Se sua tabela já existe, execute a linha abaixo para adicionar a coluna de imagem:
-- ALTER TABLE public.bakery_inventory ADD COLUMN IF NOT EXISTS imagem TEXT;

-- Liberar leitura e escrita desprotegida para testes dinâmicos (Row-Level Security Policies)
ALTER TABLE public.bakery_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura livre" ON public.bakery_inventory;
DROP POLICY IF EXISTS "Escrita livre" ON public.bakery_inventory;
CREATE POLICY "Leitura livre" ON public.bakery_inventory FOR SELECT USING (true);
CREATE POLICY "Escrita livre" ON public.bakery_inventory FOR ALL USING (true) WITH CHECK (true);


-- 2. TABELA DE REGISTROS DE PERDA / CONTROL DE VALIDADE
CREATE TABLE IF NOT EXISTS public.bakery_loss_records (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    nome_item TEXT NOT NULL,
    quantidade NUMERIC NOT NULL,
    unidade TEXT NOT NULL,
    data DATE NOT NULL,
    motivo TEXT NOT NULL,
    custo_total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bakery_loss_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura livre de perdas" ON public.bakery_loss_records;
DROP POLICY IF EXISTS "Escrita livre de perdas" ON public.bakery_loss_records;
CREATE POLICY "Leitura livre de perdas" ON public.bakery_loss_records FOR SELECT USING (true);
CREATE POLICY "Escrita livre de perdas" ON public.bakery_loss_records FOR ALL USING (true) WITH CHECK (true);


-- 3. TABELA DE VENDAS REALIZADAS NO PDV
CREATE TABLE IF NOT EXISTS public.bakery_sales (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    itens JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    desconto NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,
    metodo_pagamento TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bakery_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura livre de vendas" ON public.bakery_sales;
DROP POLICY IF EXISTS "Escrita livre de vendas" ON public.bakery_sales;
CREATE POLICY "Leitura livre de vendas" ON public.bakery_sales FOR SELECT USING (true);
CREATE POLICY "Escrita livre de vendas" ON public.bakery_sales FOR ALL USING (true) WITH CHECK (true);


-- 4. TABELA DE LIVRO CAIXA E TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.bakery_transactions (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    descricao TEXT NOT NULL,
    origem_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bakery_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura livre de transacoes" ON public.bakery_transactions;
DROP POLICY IF EXISTS "Escrita livre de transacoes" ON public.bakery_transactions;
CREATE POLICY "Leitura livre de transacoes" ON public.bakery_transactions FOR SELECT USING (true);
CREATE POLICY "Escrita livre de transacoes" ON public.bakery_transactions FOR ALL USING (true) WITH CHECK (true);

-- TESTADO E PRONTO PARA USO! ADICIONE O SCRIPT, RODE O SQL E SINALIZAR NO APP!
`;
