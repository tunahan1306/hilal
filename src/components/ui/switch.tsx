"use client";
import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
function Switch({ className, size = "default", ...props }: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: "sm" | "default" }) {
  return <SwitchPrimitive.Root data-slot="switch" data-size={size} className={cn("peer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-input transition-colors after:absolute after:-inset-2 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary", className)} {...props}>
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-[1.25rem]" />
  </SwitchPrimitive.Root>;
}
export { Switch };
