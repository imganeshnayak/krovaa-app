import { API_BASE_URL } from '@/lib/apiBaseUrl';

export interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  label: string;
  amount: number;
  description?: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface WalletData {
  balance: number;
  pending: number;
  earned: number;
  transactions: Transaction[];
}

export interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

async function authRequest<TResponse>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  token: string,
  body?: Record<string, unknown>
) {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = (await response.json()) as { error?: string } & TResponse;

    if (!response.ok) {
      return { error: data.error || 'Something went wrong.', data: null };
    }

    return { data: data as TResponse, error: null };
  } catch {
    return { error: `Unable to reach the wallet server at ${url}.`, data: null };
  }
}

export async function getWalletData(token: string): Promise<{ error: string | null; data: WalletData | null }> {
  const response = await authRequest<WalletData>(
    '/api/profile/wallet',
    'GET',
    token
  );

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to fetch wallet data', data: null };
  }

  return { error: null, data: response.data };
}

export async function createTransaction(
  token: string,
  transaction: {
    type: 'incoming' | 'outgoing';
    label: string;
    amount: number;
    description?: string;
    status?: 'completed' | 'pending' | 'failed';
    relatedId?: string;
    relatedModel?: string;
  }
): Promise<{ error: string | null; data: { transaction: Transaction; balance: number } | null }> {
  const response = await authRequest<{ transaction: Transaction; balance: number }>(
    '/api/profile/wallet/transaction',
    'POST',
    token,
    transaction
  );

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to create transaction', data: null };
  }

  return { error: null, data: response.data };
}

export async function sendMoney(
  token: string,
  recipientUserCode: string,
  amount: number,
  description?: string
): Promise<{ error: string | null; data: { transaction: Transaction; balance: number } | null }> {
  const response = await authRequest<{ transaction: Transaction; balance: number }>(
    '/api/profile/wallet/send',
    'POST',
    token,
    { recipientUserCode, amount, description }
  );

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to send money', data: null };
  }

  return { error: null, data: response.data };
}

export async function topUpWallet(
  token: string,
  amount: number,
  description?: string
): Promise<{ error: string | null; data: { transaction: Transaction; balance: number } | null }> {
  const response = await authRequest<{ transaction: Transaction; balance: number }>(
    '/api/profile/wallet/topup',
    'POST',
    token,
    { amount, description }
  );

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to top up wallet', data: null };
  }

  return { error: null, data: response.data };
}

export async function getAllTransactions(
  token: string,
  options?: {
    page?: number;
    limit?: number;
    type?: 'incoming' | 'outgoing';
    status?: 'completed' | 'pending' | 'failed';
  }
): Promise<{ error: string | null; data: { transactions: Transaction[]; pagination: TransactionPagination } | null }> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.type) params.set('type', options.type);
  if (options?.status) params.set('status', options.status);

  const queryString = params.toString();
  const path = `/api/profile/wallet/transactions${queryString ? `?${queryString}` : ''}`;

  const response = await authRequest<{ transactions: Transaction[]; pagination: TransactionPagination }>(
    path,
    'GET',
    token
  );

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to fetch transactions', data: null };
  }

  return { error: null, data: response.data };
}

export async function getTransactionById(
  token: string,
  transactionId: string
): Promise<{ error: string | null; data: Transaction | null }> {
  const response = await authRequest<Transaction>(
    `/api/profile/wallet/transaction/${transactionId}`,
    'GET',
    token
  );

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to fetch transaction', data: null };
  }

  return { error: null, data: response.data };
}

export default {
  getWalletData,
  createTransaction,
  sendMoney,
  topUpWallet,
  getAllTransactions,
  getTransactionById,
};
