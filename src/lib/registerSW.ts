// Guarded service-worker registration. Refuses in dev, iframe previews,
// and Lovable preview hosts. Provides ?sw=off kill-switch.

export async function registerSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isLovablePreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" || host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
  const off = url.searchParams.get("sw") === "off";

  const refused = !import.meta.env.PROD || inIframe || isLovablePreview || off;

  if (refused) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => (r.active?.scriptURL || "").endsWith("/sw.js"))
          .map((r) => r.unregister()),
      );
    } catch { /* ignore */ }
    return;
  }

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js");
    wb.register().catch(() => {});
  } catch { /* ignore */ }
}