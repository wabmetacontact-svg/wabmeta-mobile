// src/types/wallet.ts
export interface WalletData {
  exists: boolean;
  isActive: boolean;
  hasPendingRequest: boolean;
  pendingRequest?: {
    id: string;
    status: string;
    requestedAt: string;
  } | null;
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  creditEnabled: boolean;
  creditLimit: number;
  creditUsed: number;
  availableCredit: number;
  currency: string;
  lowBalanceThreshold: number;
  maxTopUpAmount: number;
  maxMonthlyTopUp: number;
  currentMonthTopUp: number;
  totalCredited: number;
  totalDebited: number;
  lastTransactionAt: string | null;
  flagged: boolean;
  flagReason?: string | null;
}

export interface Transaction {
  id: string;
  transactionId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  description: string;
  status: string;
  metaChargeId?: string;
  metaService?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  note?: string;
  createdAt: string;
}

export interface PendingTopUp {
  id: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  status: string;
  attemptCount: number;
  createdAt: string;
  failureReason?: string;
  canRetry: boolean;
}
