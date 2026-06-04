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
  return buildInternalUrl(`/q/${shortId}`);
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
};

export type FrameStyle = "none" | "rounded" | "scan-me" | "arrow";

export const FRAME_LABELS: Record<FrameStyle, string> = {
  none: "Sem moldura",
  rounded: "Arredondada",
  "scan-me": "Scan Me",
  arrow: "Com seta",
};

export type ColorPreset = { name: string; fg: string; bg: string };

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Clássico", fg: "#0f172a", bg: "#ffffff" },
  { name: "Tinta",    fg: "#1e3a8a", bg: "#ffffff" },
  { name: "Floresta", fg: "#14532d", bg: "#fefce8" },
  { name: "Vinho",    fg: "#7f1d1d", bg: "#fef3c7" },
  { name: "Solar",    fg: "#0f172a", bg: "#facc15" },
  { name: "Inverso",  fg: "#ffffff", bg: "#0f172a" },
];