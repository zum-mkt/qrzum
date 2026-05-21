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