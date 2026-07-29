import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { LinkIconGlyph } from "@/components/LinkIconPicker";
import type { LinkItem, LinksTheme, LinksTextureId } from "@/lib/qr";

const RADIUS_CLASS: Record<string, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
};

function textureStyle(textureId: LinksTextureId, color1: string, color2: string): CSSProperties {
  switch (textureId) {
    case "dots":
      return {
        backgroundColor: color1,
        backgroundImage: `radial-gradient(${color2} 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
      };
    case "grid":
      return {
        backgroundColor: color1,
        backgroundImage: `linear-gradient(${color2} 1px, transparent 1px), linear-gradient(90deg, ${color2} 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      };
    case "waves":
      return {
        backgroundColor: color1,
        backgroundImage: `radial-gradient(circle at 0 50%, transparent 20px, ${color2} 21px, transparent 22px), radial-gradient(circle at 40px 50%, transparent 20px, ${color2} 21px, transparent 22px)`,
        backgroundSize: "40px 40px",
      };
    case "diagonal":
    default:
      return {
        backgroundColor: color1,
        backgroundImage: `repeating-linear-gradient(45deg, ${color2} 0, ${color2} 2px, transparent 2px, transparent 14px)`,
      };
  }
}

function backgroundStyle(theme: LinksTheme | undefined): CSSProperties | undefined {
  const bg = theme?.background;
  if (!bg) return undefined;
  if (bg.type === "solid") return { backgroundColor: bg.color1 };
  if (bg.type === "gradient") return { backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.color1}, ${bg.color2})` };
  return textureStyle(bg.textureId, bg.color1, bg.color2);
}

export function LinksPageView({
  title, bio, items, theme, className,
}: {
  title: string;
  bio?: string;
  items: LinkItem[];
  theme?: LinksTheme;
  className?: string;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState(0);
  const effectsEnabled = !!theme?.effectsEnabled;
  const hasHeaderImage = !!theme?.headerImageUrl;

  useEffect(() => {
    if (!effectsEnabled || !hasHeaderImage) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = headerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setParallax(Math.max(0, -rect.top) * 0.25);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [effectsEnabled, hasHeaderImage]);

  // No theme configured: keep today's exact default look, for backward compatibility.
  if (!theme) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary p-4 ${className ?? ""}`}>
        <div className="mx-auto max-w-md pt-12">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            {bio && <p className="mt-2 text-sm text-muted-foreground">{bio}</p>}
          </div>
          <Card className="space-y-2 p-4">
            {items.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <span>{item.label}</span>
                <LinkIconGlyph icon={item.icon} url={item.url} className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
            {items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum link cadastrado.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const radiusClass = RADIUS_CLASS[theme.buttonRadius] ?? RADIUS_CLASS.md;

  return (
    <div className={`min-h-screen p-4 ${className ?? ""}`} style={backgroundStyle(theme)}>
      {effectsEnabled && (
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .zlinks-enter { animation: zlinks-fade-up 0.5s ease both; }
          }
          @keyframes zlinks-fade-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
      <div className="mx-auto max-w-md pt-8">
        {theme.headerImageUrl && (
          <div ref={headerRef} className="mb-10 -mx-4 -mt-4 h-40 overflow-hidden">
            <img
              src={theme.headerImageUrl}
              alt=""
              className="h-full w-full object-cover"
              style={effectsEnabled ? { transform: `translateY(${parallax}px)` } : undefined}
            />
          </div>
        )}
        <div className={`mb-6 text-center ${theme.headerImageUrl ? "-mt-14" : ""}`}>
          {theme.avatarUrl && (
            <img
              src={theme.avatarUrl}
              alt=""
              className="mx-auto mb-3 h-20 w-20 rounded-full border-4 border-background object-cover shadow-sm"
            />
          )}
          <h1
            className={`text-2xl font-semibold ${effectsEnabled ? "zlinks-enter" : ""}`}
            style={{ color: theme.titleColor }}
          >
            {title}
          </h1>
          {bio && (
            <p
              className={`mt-2 text-sm ${effectsEnabled ? "zlinks-enter" : ""}`}
              style={{ color: theme.bioColor, animationDelay: effectsEnabled ? "60ms" : undefined }}
            >
              {bio}
            </p>
          )}
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5 ${radiusClass} ${effectsEnabled ? "zlinks-enter" : ""}`}
              style={{
                backgroundColor: theme.buttonBgColor,
                color: theme.buttonTextColor,
                animationDelay: effectsEnabled ? `${120 + i * 60}ms` : undefined,
              }}
            >
              <span>{item.label}</span>
              <LinkIconGlyph icon={item.icon} url={item.url} className="h-4 w-4 shrink-0" />
            </a>
          ))}
          {items.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: theme.bioColor }}>
              Nenhum link cadastrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
