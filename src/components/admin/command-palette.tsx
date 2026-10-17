"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { normalizeTr } from "@/domain/text";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./admin-nav";

type Command = { id: string; label: string; hint?: string; href: string; icon?: React.ComponentType<{ className?: string }> };

const ACTIONS: Command[] = [
  { id: "new-profile", label: "Yeni profil oluştur", href: "/admin/profiller/yeni", icon: Plus, hint: "N" },
  { id: "review-queue", label: "İnceleme bekleyen profiller", href: "/admin/profiller?durum=in_review" },
  { id: "open-reports", label: "Açık şikâyetler", href: "/admin/sikayetler" },
];

/**
 * Komut paleti (⌘K / Ctrl+K) ve klavye kısayolları:
 * - "g" ardından p/r/s/i: pano, profiller, şikâyetler, iletişim
 * - "n": yeni profil
 * Metin alanlarında yazarken kısayollar devre dışıdır.
 */
export function CommandPalette({ profiles }: { profiles: { id: string; name: string; meta: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const gPressed = useRef<number>(0);

  const commands = useMemo<Command[]>(() => {
    const nav = ADMIN_NAV.map((n) => ({ id: n.href, label: n.label, href: n.href, icon: n.icon, hint: n.shortcut }));
    const prof = profiles.map((p) => ({ id: `p-${p.id}`, label: p.name, hint: p.meta, href: `/admin/profiller/${p.id}` }));
    const all = [...ACTIONS, ...nav, ...prof];
    const nq = normalizeTr(q);
    return nq ? all.filter((c) => normalizeTr(`${c.label} ${c.hint ?? ""}`).includes(nq)).slice(0, 12) : [...ACTIONS, ...nav];
  }, [profiles, q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "g") {
        gPressed.current = Date.now();
        return;
      }
      const map: Record<string, string> = { p: "/admin", r: "/admin/profiller", s: "/admin/sikayetler", i: "/admin/iletisim" };
      if (Date.now() - gPressed.current < 900 && map[e.key]) {
        gPressed.current = 0;
        router.push(map[e.key]);
      } else if (e.key === "n") {
        router.push("/admin/profiller/yeni");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  function go(c: Command) {
    setOpen(false);
    setQ("");
    router.push(c.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-64 items-center gap-2 rounded-md border border-hairline bg-paper px-2.5 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground md:flex"
      >
        <Search className="size-3.5" aria-hidden /> Ara veya komut çalıştır
        <kbd className="ml-auto rounded-sm border border-hairline px-1 font-mono text-[0.6875rem]">⌘K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex size-10 items-center justify-center rounded-md md:hidden" aria-label="Ara veya komut çalıştır">
        <Search className="size-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQ(""); setActive(0); } }}>
        <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Komut paleti</DialogTitle>
          <DialogDescription className="sr-only">Sayfalara gidin, profil arayın veya işlem başlatın.</DialogDescription>
          <div className="flex items-center gap-2 border-b border-hairline px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, commands.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter" && commands[active]) { e.preventDefault(); go(commands[active]); }
              }}
              placeholder="Profil adı, sayfa veya işlem…"
              aria-label="Komut ara"
              role="combobox"
              aria-expanded
              aria-controls="cmd-list"
              aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id="cmd-list" role="listbox" aria-label="Komutlar" className="max-h-80 overflow-y-auto p-1.5">
            {commands.length === 0 ? <li className="px-3 py-8 text-center text-sm text-muted-foreground">Sonuç yok</li> : null}
            {commands.map((c, i) => {
              const Icon = c.icon;
              return (
                <li
                  key={c.id}
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c)}
                  className={cn("flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm", i === active && "bg-secondary")}
                >
                  {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : <span className="size-4" />}
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint ? <span className="text-xs text-muted-foreground">{c.hint}</span> : null}
                  {i === active ? <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
