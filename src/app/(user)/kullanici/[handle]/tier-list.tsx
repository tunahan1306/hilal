"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreatorSubscriptionTier } from "@/domain/creator";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { subscribeAction, type CreatorState } from "../../creator/actions";

/** Abone ol butonu — bkz. subscribeToTier yorumu: PaymentProvider devre dışı olduğu için bu işlem bugün her zaman başarısız olur. */
export function TierList({ tiers, canSubscribe }: { tiers: CreatorSubscriptionTier[]; canSubscribe: boolean }) {
  const [state, action, pending] = useActionState<CreatorState, FormData>(subscribeAction, null);
  return (
    <div className="mt-3 grid gap-2">
      <ul className="grid gap-2 text-sm">
        {tiers.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
            <span>
              {t.name} — {t.priceAmount} {t.priceCurrency.toUpperCase()}
              {t.description ? <span className="block text-xs text-muted-foreground">{t.description}</span> : null}
            </span>
            {canSubscribe ? (
              <form action={action} onSubmit={preservingSubmit(action)}>
                <input type="hidden" name="tierId" value={t.id} />
                <Button type="submit" variant="outline" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  Abone ol
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </div>
  );
}
