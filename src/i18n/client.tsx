"use client";

import { createContext, use } from "react";
import type { Locale } from "./config";
import { getMessages, type Messages } from "./messages";

const I18nContext = createContext<{ lang: Locale; m: Messages } | null>(null);

/** Kök layout'ta bir kez kurulur; istemci bileşenleri dili ve sözlüğü buradan alır. */
export function I18nProvider({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  return <I18nContext value={{ lang, m: getMessages(lang) }}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error("useI18n, I18nProvider içinde kullanılmalı");
  return ctx;
}
