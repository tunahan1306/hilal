"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { m } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={m.theme.label}>
          <Sun className="size-[1.1rem] dark:hidden" aria-hidden />
          <Moon className="hidden size-[1.1rem] dark:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light"><Sun aria-hidden /> {m.theme.light}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon aria-hidden /> {m.theme.dark}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor aria-hidden /> {m.theme.system}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
