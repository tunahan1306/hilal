import { beforeEach, describe, expect, it } from "vitest";
import { PAYMENT_TRANSACTION_KINDS, PAYMENT_TRANSACTION_STATUSES } from "@/domain/billing";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { PaymentsDisabledError, getPaymentProvider } from "@/server/payments";

beforeEach(resetDemoStore);

describe("Modül F — PaymentProvider (saf)", () => {
  it("arayüz genişletildikten sonra da her zaman devre dışı hatası fırlatır", () => {
    expect(() => getPaymentProvider()).toThrow(PaymentsDisabledError);
  });

  it("işlem türü/durumu sabitleri 02a_DATA_MODEL.md ile birebir", () => {
    expect(PAYMENT_TRANSACTION_KINDS).toEqual(["subscription_charge", "tip", "ppv_purchase", "payout", "refund"]);
    expect(PAYMENT_TRANSACTION_STATUSES).toEqual(["pending", "succeeded", "failed", "refunded", "chargeback"]);
  });
});

describe("ödeme defteri (bellek deposu) — yalnızca şema/test amaçlı, hiçbir Server Action çağırmaz", () => {
  it("idempotency_key tekilliği aynı depoda da uygulanır", async () => {
    const repo = createMemoryRepository();
    await repo.addPaymentTransaction({
      kind: "tip",
      payerId: "user-1",
      payeeCreatorId: null,
      amountMinorUnits: 500,
      currency: "try",
      status: "succeeded",
      providerName: "test-provider",
      externalRef: "ext-1",
      idempotencyKey: "idem-1",
      metadata: {},
    });
    await expect(
      repo.addPaymentTransaction({
        kind: "tip",
        payerId: "user-1",
        payeeCreatorId: null,
        amountMinorUnits: 500,
        currency: "try",
        status: "succeeded",
        providerName: "test-provider",
        externalRef: "ext-1",
        idempotencyKey: "idem-1",
        metadata: {},
      }),
    ).rejects.toThrow(/idempotencyKey/);
  });

  it("listPaymentTransactions payerId/payeeCreatorId/kind'e göre filtreler", async () => {
    const repo = createMemoryRepository();
    await repo.addPaymentTransaction({ kind: "tip", payerId: "user-1", payeeCreatorId: null, amountMinorUnits: 100, currency: "try", status: "succeeded", providerName: "p", externalRef: null, idempotencyKey: "a", metadata: {} });
    await repo.addPaymentTransaction({ kind: "payout", payerId: null, payeeCreatorId: "creator-1", amountMinorUnits: 200, currency: "try", status: "pending", providerName: "p", externalRef: null, idempotencyKey: "b", metadata: {} });
    expect(await repo.listPaymentTransactions({ payerId: "user-1" })).toHaveLength(1);
    expect(await repo.listPaymentTransactions({ payeeCreatorId: "creator-1" })).toHaveLength(1);
    expect(await repo.listPaymentTransactions({ kind: "tip" })).toHaveLength(1);
    expect(await repo.listPaymentTransactions()).toHaveLength(2);
  });

  it("recordWebhookEvent (provider_name, external_event_id) üzerinde idempotenttir; aynı olay tekrar işlenmez", async () => {
    const repo = createMemoryRepository();
    const first = await repo.recordWebhookEvent({ providerName: "test-provider", externalEventId: "evt-1", payload: { ok: true } });
    expect(first.isNew).toBe(true);
    const second = await repo.recordWebhookEvent({ providerName: "test-provider", externalEventId: "evt-1", payload: { ok: true, retried: true } });
    expect(second.isNew).toBe(false);
    expect(second.event.id).toBe(first.event.id);

    expect(first.event.processedAt).toBeNull();
    await repo.markWebhookEventProcessed(first.event.id, new Date().toISOString());
    const reports = await repo.recordWebhookEvent({ providerName: "test-provider", externalEventId: "evt-1", payload: {} });
    expect(reports.event.processedAt).not.toBeNull();
  });

  it("getPaymentTransactionByIdempotencyKey bulunamazsa null döner", async () => {
    const repo = createMemoryRepository();
    expect(await repo.getPaymentTransactionByIdempotencyKey("yok")).toBeNull();
  });
});
