"use client";
import { useState } from "react";
import type { CardProfile } from "@/domain/types";
import { serializeFilters, type ProfileFilters } from "@/domain/filters";
import { ProfileGrid } from "./profile-grid";
import { Button } from "@/components/ui/button";
type Batch = { items: CardProfile[]; nextCursor: string | null };
export function ProgressiveProfiles({ initial, filters }: { initial: Batch; filters: ProfileFilters }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function load() {
    if (pending || !cursor) return;
    setPending(true); setError(false);
    try {
      const params = new URLSearchParams(serializeFilters(filters));
      params.set("cursor", cursor);
      const response = await fetch(`/api/discovery?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const batch: Batch = await response.json();
      setItems((previous) => [...previous, ...batch.items.filter((p) => !previous.some((v) => v.id === p.id))]);
      setCursor(batch.nextCursor);
    } catch { setError(true); } finally { setPending(false); }
  }
  return <div className="space-y-6" aria-busy={pending}>
    <ProfileGrid profiles={items} priorityCount={2} />
    <p className="sr-only" role="status">{items.length} profil gösteriliyor.</p>
    {error ? <p role="alert" className="text-sm text-destructive">Profiller yüklenemedi. Tekrar deneyin.</p> : null}
    {cursor ? <div className="flex justify-center"><Button variant="outline" onClick={load} disabled={pending}>{pending ? "Yükleniyor…" : error ? "Tekrar dene" : "Daha fazla göster"}</Button></div> : null}
  </div>;
}
