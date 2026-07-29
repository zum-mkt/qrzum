import {
  Instagram, Facebook, Twitter, Youtube, Linkedin, Github, Twitch,
  Mail, Phone, Globe, MessageCircle, Music2, Send, type LucideIcon,
} from "lucide-react";
import { detectIconFromUrl, type LinkIconId } from "@/lib/qr";

export const LINK_ICON_MAP: Record<Exclude<LinkIconId, "auto" | "none">, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  github: Github,
  twitch: Twitch,
  whatsapp: MessageCircle,
  tiktok: Music2,
  telegram: Send,
  email: Mail,
  phone: Phone,
  site: Globe,
};

export const LINK_ICON_LABELS: Record<LinkIconId, string> = {
  auto: "Automático",
  none: "Sem ícone",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X / Twitter",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  github: "GitHub",
  twitch: "Twitch",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  telegram: "Telegram",
  email: "E-mail",
  phone: "Telefone",
  site: "Site",
};

function resolveIcon(icon: LinkIconId | undefined, url: string): LucideIcon | null {
  const effective = !icon || icon === "auto" ? detectIconFromUrl(url) : icon;
  if (effective === "none") return null;
  return LINK_ICON_MAP[effective] ?? Globe;
}

export function LinkIconGlyph({
  icon, url, className,
}: { icon?: LinkIconId; url: string; className?: string }) {
  const Icon = resolveIcon(icon, url);
  if (!Icon) return null;
  return <Icon className={className ?? "h-4 w-4"} />;
}

const PICKER_OPTIONS: LinkIconId[] = [
  "auto", "site", "instagram", "facebook", "twitter", "youtube", "linkedin",
  "github", "twitch", "whatsapp", "tiktok", "telegram", "email", "phone", "none",
];

export function LinkIconPickerField({
  value, url, onChange,
}: { value: LinkIconId | undefined; url: string; onChange: (icon: LinkIconId) => void }) {
  const current = value ?? "auto";
  return (
    <div className="flex flex-wrap gap-1">
      {PICKER_OPTIONS.map((id) => {
        const active = current === id;
        const Icon = id === "auto" ? LINK_ICON_MAP[detectIconFromUrl(url)] : id === "none" ? null : LINK_ICON_MAP[id];
        return (
          <button
            key={id}
            type="button"
            title={LINK_ICON_LABELS[id]}
            onClick={() => onChange(id)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors ${
              active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"
            }`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="text-[9px]">—</span>}
          </button>
        );
      })}
    </div>
  );
}
