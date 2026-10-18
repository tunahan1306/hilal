"use client";

import { useEffect } from "react";
import { trackProfileViewAction } from "@/server/actions/public";

export function ViewTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    const t = setTimeout(() => void trackProfileViewAction(profileId).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [profileId]);
  return null;
}
