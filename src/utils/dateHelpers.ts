/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Retorna data em formato YYYY-MM-DD com offset de dias
export function getOffsetDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Formata YYYY-MM-DD para DD/MM/YYYY
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Retorna dias restantes para expirar
export function getDaysRemaining(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDateStr);
  // Garante que o timezone não quebre o cálculo (setando para o meio-dia)
  expiry.setHours(12, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Retorna badge e cor baseado na expiração
export interface ExpiryStatus {
  label: string;
  badgeClass: string;
  iconClass: string;
  severity: 'danger' | 'warning' | 'success';
}

export function getExpiryStatus(expiryDateStr: string): ExpiryStatus {
  const days = getDaysRemaining(expiryDateStr);
  
  if (days < 0) {
    return {
      label: 'Vencido',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
      iconClass: 'text-red-500',
      severity: 'danger'
    };
  } else if (days === 0) {
    return {
      label: 'Vence Hoje',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/50 blink-fast',
      iconClass: 'text-amber-500',
      severity: 'warning'
    };
  } else if (days <= 3) {
    return {
      label: `Vence em ${days}d`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
      iconClass: 'text-amber-500',
      severity: 'warning'
    };
  } else {
    return {
      label: `Regular (${days}d)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
      iconClass: 'text-emerald-500',
      severity: 'success'
    };
  }
}
