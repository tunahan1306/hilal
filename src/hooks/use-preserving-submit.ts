"use client";

import { startTransition, type FormEvent } from "react";

/**
 * React 19, `action` ile gönderilen formu işlem bitince otomatik sıfırlar; bu,
 * doğrulama hatasında kullanıcının yazdıklarını siler. JavaScript açıkken
 * gönderimi elle tetikleyip sıfırlamayı engeller (JS kapalıyken `action`
 * özelliği yine çalışır).
 */
export function preservingSubmit(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}
