// Modül F — Ödemeler ve Faturalama (yalnızca mock/şema; bkz. src/server/payments.ts
// başlığındaki tasarım kararı notu). payment_transactions / webhook_events kaynak:
// 20261027000006_payments_billing.sql. Gerçek bir sağlayıcı sözleşme imzalanana kadar
// bu tabloları yazan hiçbir Server Action yoktur — PaymentProvider her zaman
// PaymentsDisabledError fırlatır (bkz. src/server/services/creator.ts subscribeToTier).

export const PAYMENT_TRANSACTION_KINDS = ["subscription_charge", "tip", "ppv_purchase", "payout", "refund"] as const;
export type PaymentTransactionKind = (typeof PAYMENT_TRANSACTION_KINDS)[number];

export const PAYMENT_TRANSACTION_STATUSES = ["pending", "succeeded", "failed", "refunded", "chargeback"] as const;
export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];

/**
 * Ödeme defteri — büyük ölçüde yalnızca eklenir. Bir iade, orijinal satırın
 * GÜNCELLENMESİ değil, metadata'sında orijinali referans veren YENİ bir satırdır
 * (bkz. 02a_DATA_MODEL.md "payment_transactions" notu) — audit_logs'un değişmezlik
 * sezgisiyle aynı, ancak burada bir kısıtla değil kuralla uygulanır.
 */
export type PaymentTransaction = {
  id: string;
  kind: PaymentTransactionKind;
  payerId: string | null;
  payeeCreatorId: string | null;
  amountMinorUnits: number;
  currency: string;
  status: PaymentTransactionStatus;
  providerName: string;
  externalRef: string | null;
  /** Sağlayıcı çağrısından ÖNCE üretilir; webhook'un en-az-bir-kez teslimatı asla çift bakiye değişikliğine yol açmaz. */
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
export type NewPaymentTransaction = Omit<PaymentTransaction, "id" | "createdAt">;

/** (provider_name, external_event_id) tekilliği — bir sağlayıcı webhook'unun en-az-bir-kez teslimatı için idempotency garantisi. */
export type WebhookEvent = {
  id: string;
  providerName: string;
  externalEventId: string;
  payload: Record<string, unknown>;
  processedAt: string | null;
  createdAt: string;
};
export type NewWebhookEvent = Omit<WebhookEvent, "id" | "processedAt" | "createdAt">;
