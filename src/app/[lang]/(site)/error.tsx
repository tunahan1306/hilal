"use client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export default function PublicError({ retry }: { error: unknown; retry: () => void }) {
  const { m } = useI18n();
  return <div className="container-page py-16" role="alert"><h1 className="font-display text-display-md">{m.error.title}</h1><p className="my-5 text-muted-foreground">{m.error.text}</p><Button onClick={retry}>{m.error.retry}</Button></div>;
}
