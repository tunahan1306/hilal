"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { blockAction, followAction, sendMessageAction, unfollowAction, type SocialState } from "../../social/actions";

export function ProfileActions({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) {
  const [followState, follow, followPending] = useActionState<SocialState, FormData>(isFollowing ? unfollowAction : followAction, null);
  const [blockState, block, blockPending] = useActionState<SocialState, FormData>(blockAction, null);
  const [messageState, message, messagePending] = useActionState<SocialState, FormData>(sendMessageAction, null);

  return (
    <div className="mt-6 grid gap-4">
      <div className="flex flex-wrap gap-2">
        <form action={follow} onSubmit={preservingSubmit(follow)}>
          <input type="hidden" name="targetUserId" value={targetUserId} />
          <Button type="submit" variant={isFollowing ? "outline" : "default"} disabled={followPending}>
            {followPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {isFollowing ? "Takipten çık" : "Takip et"}
          </Button>
        </form>
        <form action={block} onSubmit={preservingSubmit(block)}>
          <input type="hidden" name="targetUserId" value={targetUserId} />
          <Button type="submit" variant="ghost" disabled={blockPending}>Engelle</Button>
        </form>
      </div>
      {followState ? <p role="alert" className="text-sm text-destructive">{followState.message}</p> : null}
      {blockState ? <p role="alert" className="text-sm text-destructive">{blockState.message}</p> : null}

      <form action={message} onSubmit={preservingSubmit(message)} className="grid gap-2" noValidate>
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <Textarea name="body" placeholder="Mesaj yazın…" maxLength={4000} rows={3} required />
        {messageState ? <p role="alert" className="text-sm text-destructive">{messageState.message}</p> : null}
        <Button type="submit" variant="outline" disabled={messagePending}>
          {messagePending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Mesaj gönder
        </Button>
      </form>
    </div>
  );
}
