import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const generateShortId = customAlphabet(alphabet, 7);

export const PUBLIC_BASE_URL: string =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://qrzum.lovable.app";

export function buildInternalUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_BASE_URL}${p}`;
}

export function buildQrUrl(shortId: string) {
  // /r/<id> = pixel-aware redirector (Phase 3). /q/<id> remains as a legacy alias.
  return buildInternalUrl(`/r/${shortId}`);
}

export type VCardData = {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  company?: string;
  website?: string;
};

export function buildVCard(d: VCardData) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${d.name}`,
    d.title ? `TITLE:${d.title}` : "",
    d.company ? `ORG:${d.company}` : "",
    d.phone ? `TEL;TYPE=CELL:${d.phone}` : "",
    d.email ? `EMAIL:${d.email}` : "",
    d.website ? `URL:${d.website}` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
}

export type LinkItem = { label: string; url: string };
export type LinksData = { bio?: string; items: LinkItem[] };

export function buildWhatsAppUrl(rawPhone: string, message?: string) {
  const phone = rawPhone.replace(/\D/g, "");
  const base = `https://wa.me/${phone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export type WifiAuth = "WPA" | "WEP" | "nopass";
export function buildWifiString(ssid: string, password: string, auth: WifiAuth = "WPA", hidden = false) {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  const pwd = auth === "nopass" ? "" : `P:${esc(password)};`;
  return `WIFI:T:${auth};S:${esc(ssid)};${pwd}${hidden ? "H:true;" : ""};`;
}

export const QR_TYPE_LABELS: Record<string, string> = {
  link: "Link",
  file: "Arquivo",
  vcard: "vCard",
  whatsapp: "WhatsApp",
  wifi: "WiFi",
  video: "Vídeo",
  links: "Lista de Links",
  flow: "Fluxo Operacional",
  pdf: "PDF",
};

export type FrameStyle =
  | "none"
  | "label-bottom"
  | "rounded"
  | "rounded-card"
  | "scan-me"
  | "arrow"
  | "tap-to-pay"
  | "url-pill";

export const FRAME_LABELS: Record<FrameStyle, string> = {
  none: "Sem moldura",
  "label-bottom": "Só texto",
  rounded: "Arredondada",
  "rounded-card": "Cartão arredondado",
  "scan-me": "Scan Me",
  arrow: "Com seta",
  "tap-to-pay": "Tap to Pay",
  "url-pill": "Pill (URL)",
};

export function defaultFrameText(frame: FrameStyle): string {
  switch (frame) {
    case "scan-me": return "SCAN ME";
    case "arrow": return "↑ APONTE A CÂMERA";
    case "rounded":
    case "rounded-card":
    case "label-bottom": return "ESCANEIE";
    case "tap-to-pay": return "TAP TO PAY";
    case "url-pill": return "ABRA O LINK";
    default: return "";
  }
}

export type ColorPreset = { name: string; fg: string; bg: string };

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Clássico", fg: "#0f172a", bg: "#ffffff" },
  { name: "Tinta",    fg: "#1e3a8a", bg: "#ffffff" },
  { name: "Floresta", fg: "#14532d", bg: "#fefce8" },
  { name: "Vinho",    fg: "#7f1d1d", bg: "#fef3c7" },
  { name: "Solar",    fg: "#0f172a", bg: "#facc15" },
  { name: "Inverso",  fg: "#ffffff", bg: "#0f172a" },
];

// ===== Tracking pixels =====

export interface PixelConfig {
  ga4Id?: string | null;
  gtmId?: string | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  linkedinPartnerId?: string | null;
  twitterPixelId?: string | null;
  pinterestTagId?: string | null;
  addUtm?: boolean;
}

export const emptyPixelConfig: PixelConfig = {
  ga4Id: null, gtmId: null, metaPixelId: null, tiktokPixelId: null,
  linkedinPartnerId: null, twitterPixelId: null, pinterestTagId: null,
  addUtm: false,
};

/** Add UTM params to a URL destination if it parses as a URL. */
export function injectUtm(url: string, type: string, shortId: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "qr");
    if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", type);
    if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", shortId);
    return u.toString();
  } catch {
    return url;
  }
}

export const PIXEL_PATTERNS: Record<keyof Omit<PixelConfig, "addUtm">, { label: string; regex: RegExp; placeholder: string }> = {
  ga4Id:             { label: "Google Analytics 4",  regex: /^G-[A-Z0-9]{4,}$/i,            placeholder: "G-XXXXXXXX" },
  gtmId:             { label: "Google Tag Manager",  regex: /^GTM-[A-Z0-9]{4,}$/i,          placeholder: "GTM-XXXXXX" },
  metaPixelId:       { label: "Meta / Facebook Pixel", regex: /^\d{10,20}$/,                placeholder: "123456789012345" },
  tiktokPixelId:     { label: "TikTok Pixel",        regex: /^[A-Z0-9]{15,30}$/i,           placeholder: "CXXXXXXXXXXXXXXX" },
  linkedinPartnerId: { label: "LinkedIn Insight Tag", regex: /^\d{5,10}$/,                  placeholder: "1234567" },
  twitterPixelId:    { label: "X / Twitter Pixel",   regex: /^[a-z0-9]{5,15}$/i,            placeholder: "o1abc" },
  pinterestTagId:    { label: "Pinterest Tag",       regex: /^\d{10,20}$/,                  placeholder: "2612345678901" },
};