"use client";
import { Button } from "@/components/ui/button";
export default function PublicError({ retry }: { error: unknown; retry: () => void }) {
  return <div className="container-page py-16" role="alert"><h1 className="font-display text-display-md">İçerik şu anda yüklenemedi.</h1><p className="my-5 text-muted-foreground">Lütfen biraz sonra tekrar deneyin.</p><Button onClick={retry}>Tekrar dene</Button></div>;
}
