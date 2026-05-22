import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const generateShortId = customAlphabet(alphabet, 7);

export function buildQrUrl(shortId: string) {
  if (typeof window === "undefined") return `/q/${shortId}`;
  return `${window.location.origin}/q/${shortId}`;
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