import { beforeEach, describe, expect, it } from "vitest";
import { featureDecisionProblems, isFeaturePermitted, type CountryFeaturePolicy } from "@/domain/policy";
import type { Admin } from "@/domain/types";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { getPolicyGate, recordFeaturePolicyDecision } from "@/server/services/policy";

beforeEach(resetDemoStore);

const owner: Admin = { id: "admin-0001", email: "admin@demo.local", displayName: "Demo", role: "owner", mfaEnrolled: true, createdAt: "" };
const moderator: Admin = { ...owner, id: "mod-1", role: "moderator" };
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe("ülke×özellik politika kuralı (saf)", () => {
  const p = (over: Partial<CountryFeaturePolicy>): CountryFeaturePolicy => ({
    countryCode: "nl",
    feature: "digital_content",
    status: "permitted",
    reviewDue: day(10),
    decisionId: "d",
    ...over,
  });
  it("varsayılan ve incelenmemiş ülke×özellik çifti kapalıdır", () => {
    expect(isFeaturePermitted(undefined)).toBe(false);
    expect(isFeaturePermitted(p({ status: "not_reviewed" }))).toBe(false);
    expect(isFeaturePermitted(p({ status: "prohibited" }))).toBe(false);
  });
  it("izin, geçerli gözden geçirme tarihi ister; tarih geçince kapanır", () => {
    expect(isFeaturePermitted(p({}))).toBe(true);
    expect(isFeaturePermitted(p({ reviewDue: null }))).toBe(false);
    expect(isFeaturePermitted(p({ reviewDue: day(-1) }))).toBe(false);
  });
  it("izin kararı kanıt ve tarih ister", () => {
    expect(featureDecisionProblems({ status: "permitted", approverName: "Av. X", evidenceRef: null, reviewDue: day(30) })).toHaveLength(1);
    expect(featureDecisionProblems({ status: "permitted", approverName: "Av. X", evidenceRef: "REF-1", reviewDue: null })).toHaveLength(1);
    expect(featureDecisionProblems({ status: "not_reviewed", approverName: "Av. X", evidenceRef: null, reviewDue: null })).toEqual([]);
  });
});

describe("politika motoru (bellek deposu + servis)", () => {
  it("demo: hiçbir yeni modül özelliği için karar yok; her şey kapalı (fail-closed)", async () => {
    const policies = await createMemoryRepository().listCountryFeaturePolicies();
    expect(policies.every((x) => x.status === "not_reviewed")).toBe(true);
    const gate = getPolicyGate();
    expect(await gate.isPermitted("tr", "digital_content")).toBe(false);
    expect(await gate.isPermittedBatch("tr", ["digital_content", "private_messaging"])).toEqual({
      digital_content: false,
      private_messaging: false,
    });
  });

  it("yalnızca sahip karar kaydedebilir; izin kanıt ister; onay için ülke+özellik yazılmalı", async () => {
    const ok = {
      countryCode: "nl" as const,
      feature: "digital_content" as const,
      status: "permitted" as const,
      approverName: "Av. Test",
      evidenceRef: "REF-NL-1",
      reviewDue: day(90),
      restrictions: "",
      note: "",
      confirm: "nl:digital_content",
    };
    await expect(recordFeaturePolicyDecision(moderator, ok)).rejects.toThrow(/sahip/);
    await expect(recordFeaturePolicyDecision(owner, { ...ok, evidenceRef: "" })).rejects.toThrow(/kanıt/);
    await expect(recordFeaturePolicyDecision(owner, { ...ok, confirm: "de:digital_content" })).rejects.toThrow(/ülke kodu/);
    const d = await recordFeaturePolicyDecision(owner, ok);
    expect(d.decidedBy).toBe(owner.id);
    expect(await getPolicyGate().isPermitted("nl", "digital_content")).toBe(true);
    // Özellik bazlı izolasyon: aynı ülkenin başka bir özelliği etkilenmemeli.
    expect(await getPolicyGate().isPermitted("nl", "private_messaging")).toBe(false);
  });

  it("onay geri çekilince özellik anında kapanır (durum geçmişi korunur)", async () => {
    const ok = {
      countryCode: "de" as const,
      feature: "paid_subscriptions" as const,
      status: "permitted" as const,
      approverName: "Av. Test",
      evidenceRef: "REF-DE-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "de:paid_subscriptions",
    };
    await recordFeaturePolicyDecision(owner, ok);
    expect(await getPolicyGate().isPermitted("de", "paid_subscriptions")).toBe(true);
    await recordFeaturePolicyDecision(owner, { ...ok, status: "not_reviewed", evidenceRef: "", reviewDue: "", note: "geri çekildi" });
    expect(await getPolicyGate().isPermitted("de", "paid_subscriptions")).toBe(false);
    const decisions = await createMemoryRepository().listCountryFeatureDecisions("de", "paid_subscriptions");
    expect(decisions).toHaveLength(2);
  });
});
