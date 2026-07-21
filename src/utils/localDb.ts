import Dexie, { Table } from 'dexie';
import { InventoryItem, LossRecord, Transaction, Sale } from '../types';
import { INITIAL_INVENTORY, INITIAL_LOSS_RECORDS, INITIAL_TRANSACTIONS, INITIAL_SALES } from './initialData';

export class DoceAtelierDatabase extends Dexie {
  inventory!: Table<InventoryItem & { tenantId: string }, string>;
  lossRecords!: Table<LossRecord & { tenantId: string }, string>;
  transactions!: Table<Transaction & { tenantId: string }, string>;
  sales!: Table<Sale & { tenantId: string }, string>;

  constructor() {
    super('DoceAtelierDB');
    this.version(1).stores({
      inventory: 'id, tenantId, nome, tipo, categoria',
      lossRecords: 'id, tenantId, itemId, nomeItem, data',
      transactions: 'id, tenantId, data, tipo, categoria, origemId',
      sales: 'id, tenantId, data, metodoPagamento',
    });
  }
}

export const localDb = new DoceAtelierDatabase();

/**
 * Ensures the local database has initial/seed data if it's currently empty for this tenant
 */
export async function seedLocalDbIfEmpty(tenantId: string): Promise<void> {
  const invCount = await localDb.inventory.where('tenantId').equals(tenantId).count();
  if (invCount === 0) {
    console.log(`[localDb] Semeando dados iniciais para o inquilino: ${tenantId}`);
    
    // Seed inventory
    const inventoryWithTenant = INITIAL_INVENTORY.map(item => ({ ...item, tenantId }));
    await localDb.inventory.bulkAdd(inventoryWithTenant);

    // Seed losses
    const lossesWithTenant = INITIAL_LOSS_RECORDS.map(record => ({ ...record, tenantId }));
    await localDb.lossRecords.bulkAdd(lossesWithTenant);

    // Seed transactions
    const txsWithTenant = INITIAL_TRANSACTIONS.map(tx => ({ ...tx, tenantId }));
    await localDb.transactions.bulkAdd(txsWithTenant);

    // Seed sales
    const salesWithTenant = INITIAL_SALES.map(sale => ({ ...sale, tenantId }));
    await localDb.sales.bulkAdd(salesWithTenant);
  }
}

/**
 * Clear local DB data for a specific tenant
 */
export async function clearLocalDbForTenant(tenantId: string): Promise<void> {
  await localDb.transaction('rw', [localDb.inventory, localDb.lossRecords, localDb.transactions, localDb.sales], async () => {
    await localDb.inventory.where('tenantId').equals(tenantId).delete();
    await localDb.lossRecords.where('tenantId').equals(tenantId).delete();
    await localDb.transactions.where('tenantId').equals(tenantId).delete();
    await localDb.sales.where('tenantId').equals(tenantId).delete();
  });
}

/**
 * CRUD operations for local-first retrieval
 */
export async function getLocalInventory(tenantId: string): Promise<InventoryItem[]> {
  await seedLocalDbIfEmpty(tenantId);
  const items = await localDb.inventory.where('tenantId').equals(tenantId).toArray();
  return items.map(({ tenantId: _, ...rest }) => rest as InventoryItem);
}

export async function getLocalLossRecords(tenantId: string): Promise<LossRecord[]> {
  await seedLocalDbIfEmpty(tenantId);
  const records = await localDb.lossRecords.where('tenantId').equals(tenantId).toArray();
  return records.map(({ tenantId: _, ...rest }) => rest as LossRecord);
}

export async function getLocalSales(tenantId: string): Promise<Sale[]> {
  await seedLocalDbIfEmpty(tenantId);
  const records = await localDb.sales.where('tenantId').equals(tenantId).toArray();
  return records.map(({ tenantId: _, ...rest }) => rest as Sale);
}

export async function getLocalTransactions(tenantId: string): Promise<Transaction[]> {
  await seedLocalDbIfEmpty(tenantId);
  const records = await localDb.transactions.where('tenantId').equals(tenantId).toArray();
  return records.map(({ tenantId: _, ...rest }) => rest as Transaction);
}

/**
 * Bulk overwrite operations to keep IndexedDB synchronized with memory states
 */
export async function saveLocalInventoryBulk(items: InventoryItem[], tenantId: string): Promise<void> {
  const itemsWithTenant = items.map(item => ({ ...item, tenantId }));
  await localDb.transaction('rw', localDb.inventory, async () => {
    await localDb.inventory.where('tenantId').equals(tenantId).delete();
    await localDb.inventory.bulkPut(itemsWithTenant);
  });
}

export async function saveLocalLossRecordsBulk(records: LossRecord[], tenantId: string): Promise<void> {
  const recordsWithTenant = records.map(record => ({ ...record, tenantId }));
  await localDb.transaction('rw', localDb.lossRecords, async () => {
    await localDb.lossRecords.where('tenantId').equals(tenantId).delete();
    await localDb.lossRecords.bulkPut(recordsWithTenant);
  });
}

export async function saveLocalSalesBulk(sales: Sale[], tenantId: string): Promise<void> {
  const salesWithTenant = sales.map(sale => ({ ...sale, tenantId }));
  await localDb.transaction('rw', localDb.sales, async () => {
    await localDb.sales.where('tenantId').equals(tenantId).delete();
    await localDb.sales.bulkPut(salesWithTenant);
  });
}

export async function saveLocalTransactionsBulk(transactions: Transaction[], tenantId: string): Promise<void> {
  const transactionsWithTenant = transactions.map(tx => ({ ...tx, tenantId }));
  await localDb.transaction('rw', localDb.transactions, async () => {
    await localDb.transactions.where('tenantId').equals(tenantId).delete();
    await localDb.transactions.bulkPut(transactionsWithTenant);
  });
}

/**
 * Legacy CRUD operations for individual writes (also saved to IndexedDB)
 */
export async function saveLocalInventoryItem(item: InventoryItem, tenantId: string): Promise<void> {
  await localDb.inventory.put({ ...item, tenantId });
}

export async function saveLocalLossRecord(record: LossRecord, tenantId: string): Promise<void> {
  await localDb.lossRecords.put({ ...record, tenantId });
}

export async function saveLocalSale(sale: Sale, tenantId: string): Promise<void> {
  await localDb.sales.put({ ...sale, tenantId });
}

export async function saveLocalTransaction(tx: Transaction, tenantId: string): Promise<void> {
  await localDb.transactions.put({ ...tx, tenantId });
}

export async function deleteLocalSale(id: string, tenantId: string): Promise<void> {
  await localDb.sales.where('id').equals(id).and(item => item.tenantId === tenantId).delete();
}

export async function deleteLocalTransactionsByOrigin(originId: string, tenantId: string): Promise<void> {
  await localDb.transactions.where('origemId').equals(originId).and(item => item.tenantId === tenantId).delete();
}

export async function deleteLocalTransaction(id: string, tenantId: string): Promise<void> {
  await localDb.transactions.where('id').equals(id).and(item => item.tenantId === tenantId).delete();
}
