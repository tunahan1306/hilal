// Sunucu bileşenleri: dil kök parametreden (app/[lang]) okunur; prop taşımaya gerek yok.
import { lang as rootLang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";

export async function getLocale(): Promise<Locale> {
  const l = await rootLang();
  if (!isLocale(l)) notFound();
  return l;
}

export async function getI18n(): Promise<{ lang: Locale; m: Messages }> {
  const lang = await getLocale();
  return { lang, m: getMessages(lang) };
}
