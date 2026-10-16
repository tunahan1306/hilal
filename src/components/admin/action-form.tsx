"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/app/admin/(panel)/actions";

/** Server Action formu: sonucu bildirim olarak gösterir, başarıda sayfayı tazeler. */
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
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    } else toast.error(state.message);
  }, [state, router, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {children({ pending, errors: state && !state.ok ? state.errors : undefined })}
    </form>
  );
}

export function FieldError({ errors, name }: { errors?: Record<string, string[]>; name: string }) {
  const msg = errors?.[name]?.[0];
  return msg ? <p className="text-sm text-destructive">{msg}</p> : null;
}
