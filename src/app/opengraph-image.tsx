import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// Paylaşım kartı: marka işareti ve kelime marka. Kişi fotoğrafı içermez (mahremiyet).
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "linear-gradient(135deg, #190D1B 0%, #2a1230 55%, #512039 100%)", color: "#FFF1F5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 32 32"><path fill="#D9A76B" d="M19.5 3.2A13 13 0 1 0 28.8 22 11 11 0 1 1 19.5 3.2Z" /></svg>
          <div style={{ fontSize: 112, letterSpacing: -4, display: "flex" }}>{SITE.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 44, color: "#E66A9B", display: "flex" }}>{SITE.tagline}</div>
          <div style={{ fontSize: 28, color: "#D9A76B", display: "flex" }}>Yalnızca 18 yaş ve üzeri</div>
        </div>
      </div>
    ),
    size,
  );
}
