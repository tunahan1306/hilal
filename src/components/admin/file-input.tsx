"use client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";

/**
 * Boyut sınırını istemcide uygular: Server Action gövde sınırını (6 MB) aşan
 * dosyalar sunucuya hiç gönderilmez ve kullanıcı anında bilgilendirilir.
 */
export function FileInput({ maxBytes, ...props }: Omit<React.ComponentProps<typeof Input>, "type"> & { maxBytes: number }) {
  return (
    <Input
      {...props}
      type="file"
      onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        if (file && file.size > maxBytes) {
          toast.error(`Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla ${Math.round(maxBytes / 1024 / 1024)} MB yükleyebilirsiniz.`);
          e.currentTarget.value = "";
        }
        props.onChange?.(e);
      }}
    />
  );
}
