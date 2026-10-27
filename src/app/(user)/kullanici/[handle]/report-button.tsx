"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_CATEGORY_LABELS, REPORT_CATEGORIES } from "@/domain/types";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { reportContentAction, type SocialState } from "../../social/actions";

/**
 * Modül E — Modül B/C içeriği şikâyeti (bkz. src/server/services/content-moderation.ts).
 * Giriş gerektirmez; admin-küratörlü ürünün profil şikâyet formuyla aynı duruş.
 */
export function ReportButton({ contentType, contentId }: { contentType: "user_profile" | "post"; contentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SocialState, FormData>(reportContentAction, null);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted-foreground underline underline-offset-4">
        Şikâyet et
      </button>
    );
  }
  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="mt-2 grid gap-2 rounded-md border border-hairline p-3" noValidate>
      <input type="hidden" name="contentType" value={contentType} />
      <input type="hidden" name="contentId" value={contentId} />
      <select name="category" required className="h-8 rounded-md border border-input bg-transparent px-2 text-xs">
        {REPORT_CATEGORIES.map((c) => (
          <option key={c} value={c}>{REPORT_CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <Textarea name="description" required minLength={10} maxLength={1000} rows={2} placeholder="Açıklama (en az 10 karakter)" className="text-xs" />
      {state ? <p role="alert" className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
          Gönder
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Vazgeç</Button>
      </div>
    </form>
  );
}
