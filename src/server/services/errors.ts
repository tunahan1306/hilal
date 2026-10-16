export class DomainError extends Error {
  constructor(message: string, readonly code: string = "domain_error") {
    super(message);
  }
}

export class PublishBlockedError extends DomainError {
  constructor(readonly failed: string[]) {
    super(`Yayın ön koşulları sağlanmadı: ${failed.join("; ")}`, "publish_blocked");
  }
}

export class RateLimitedError extends DomainError {
  constructor() {
    super("Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.", "rate_limited");
  }
}
