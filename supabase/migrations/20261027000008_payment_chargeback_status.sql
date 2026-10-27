-- Modül F — payment_transaction_status enum'üne 'chargeback' eklenir.
--
-- docs/payments/PROVIDER_COMPARISON.md'de araştırılan dört sağlayıcı da (CCBill, Segpay,
-- Verotel, Epoch) chargeback'i müşteri kaynaklı iadeden (refund) AYRI bir olay olarak
-- raporluyor. Bu, salt şema hazırlığıdır: getPaymentProvider() hâlâ her zaman
-- PaymentsDisabledError fırlatır, bu migration hiçbir ödeme akışını etkinleştirmez.
--
-- NOT: ALTER TYPE ... ADD VALUE PostgreSQL'de kendi işlem bloğunda commit edilmeden aynı
-- işlem içinde kullanılamaz; bu yüzden ayrı bir migration dosyasıdır.
alter type payment_transaction_status add value if not exists 'chargeback';
