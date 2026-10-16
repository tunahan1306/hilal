"use client";

import { useEffect } from "react";
import { trackProfileViewAction } from "@/app/(site)/actions";

export function ViewTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    const t = setTimeout(() => void trackProfileViewAction(profileId).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [profileId]);
  return null;
}
