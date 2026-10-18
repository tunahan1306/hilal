"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/app/admin/(panel)/actions";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";

/**
 * Server Action formu: sonucu bildirim olarak gösterir, başarıda sayfayı tazeler.
 * - Kaydedilmemiş değişiklik varken sayfadan ayrılmadan önce uyarır.
 * - Hatalı alanları `aria-invalid` + `aria-describedby` ile hata metnine bağlar ve ilk hatalı alana odaklanır.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: (state: { pending: boolean; errors?: Record<string, string[]> }) => React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  // Başarılı kayıtta "kaydedilmemiş değişiklik" bayrağı eylem içinde temizlenir.
  const tracked = useCallback(async (prev: ActionResult, fd: FormData) => {
    const res = await action(prev, fd);
    if (res?.ok) setDirty(false);
    return res;
  }, [action]);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(tracked, null);
  useUnsavedChangesGuard(dirty && !pending);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    } else toast.error(state.message);
  }, [state, router, resetOnSuccess]);

  const errors = state && !state.ok ? state.errors : undefined;
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    for (const el of form.querySelectorAll<HTMLElement>("[aria-invalid][data-af]")) {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
      el.removeAttribute("data-af");
    }
    let first: HTMLElement | null = null;
    for (const msg of form.querySelectorAll<HTMLElement>("[data-error-for]")) {
      const field = form.querySelector<HTMLElement>(`[name="${CSS.escape(msg.dataset.errorFor!)}"]`);
      if (!field) continue;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", msg.id);
      field.setAttribute("data-af", "");
      first ??= field;
    }
    first?.focus();
  }, [errors]);

  return (
    <form ref={ref} action={formAction} onSubmit={preservingSubmit(formAction)} onInput={() => setDirty(true)} className={className} noValidate>
      {children({ pending, errors })}
    </form>
  );
}

export function FieldError({ errors, name }: { errors?: Record<string, string[]>; name: string }) {
  const id = useId();
  const msg = errors?.[name]?.[0];
  return msg ? <p id={id} data-error-for={name} className="text-sm text-destructive">{msg}</p> : null;
}
