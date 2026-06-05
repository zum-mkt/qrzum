import type { PixelConfig } from "./qr";

/**
 * Inject tracking pixel scripts into <head> and fire a "qr_scan" event on each.
 * Idempotent per pixel-id (won't double-load if called twice with same ID).
 * Returns a promise that resolves after the suggested wait window so the caller
 * can `await` it before redirecting.
 */
export async function firePixels(p: PixelConfig, eventLabel = "qr_scan"): Promise<void> {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, any>;
  const loaded: string[] = (w.__qrz_loaded ||= []);
  const has = (k: string) => loaded.includes(k);
  const mark = (k: string) => loaded.push(k);

  const inject = (id: string, src: string) => {
    if (has(id)) return;
    mark(id);
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };

  // --- GA4 ---
  if (p.ga4Id) {
    inject(`ga:${p.ga4Id}`, `https://www.googletagmanager.com/gtag/js?id=${p.ga4Id}`);
    w.dataLayer = w.dataLayer || [];
    w.gtag = w.gtag || function () { w.dataLayer.push(arguments); };
    w.gtag("js", new Date());
    w.gtag("config", p.ga4Id, { send_page_view: false });
    w.gtag("event", eventLabel, { event_category: "qr", event_label: p.ga4Id });
  }

  // --- GTM ---
  if (p.gtmId) {
    inject(`gtm:${p.gtmId}`, `https://www.googletagmanager.com/gtm.js?id=${p.gtmId}`);
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: eventLabel, "gtm.start": Date.now() });
  }

  // --- Meta Pixel ---
  if (p.metaPixelId) {
    if (!has(`fb:base`)) {
      mark(`fb:base`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (function (f: any, b: Document, e: string, v: string) {
        if (f.fbq) return;
        const n: any = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        const t = b.createElement(e) as HTMLScriptElement;
        t.async = true; t.src = v;
        b.head.appendChild(t);
      })(w, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    }
    if (!has(`fb:${p.metaPixelId}`)) {
      mark(`fb:${p.metaPixelId}`);
      w.fbq("init", p.metaPixelId);
    }
    w.fbq("track", "PageView");
    w.fbq("trackCustom", "QRScan");
  }

  // --- TikTok Pixel ---
  if (p.tiktokPixelId) {
    if (!has(`tt:base`)) {
      mark(`tt:base`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (function (w2: any, d: Document, t: string) {
        w2.TiktokAnalyticsObject = t;
        const ttq: any = (w2[t] = w2[t] || []);
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
        ttq.setAndDefer = function (target: any, method: string) {
          target[method] = function () { target.push([method].concat(Array.prototype.slice.call(arguments, 0))); };
        };
        for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (id: string) {
          const e = ttq._i[id] || [];
          for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
          return e;
        };
        ttq.load = function (e: string) {
          const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
          ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = {};
          const o = d.createElement("script") as HTMLScriptElement;
          o.type = "text/javascript"; o.async = true; o.src = r + "?sdkid=" + e + "&lib=" + t;
          d.head.appendChild(o);
        };
      })(w, document, "ttq");
    }
    if (!has(`tt:${p.tiktokPixelId}`)) {
      mark(`tt:${p.tiktokPixelId}`);
      w.ttq.load(p.tiktokPixelId);
      w.ttq.page();
    }
    w.ttq.track("ClickButton", { content_name: eventLabel });
  }

  // --- LinkedIn Insight Tag ---
  if (p.linkedinPartnerId) {
    if (!has(`li:base`)) {
      mark(`li:base`);
      w._linkedin_partner_id = p.linkedinPartnerId;
      w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || [];
      w._linkedin_data_partner_ids.push(p.linkedinPartnerId);
      inject("li:script", "https://snap.licdn.com/li.lms-analytics/insight.min.js");
    }
  }

  // --- X / Twitter Pixel ---
  if (p.twitterPixelId) {
    if (!has(`tw:base`)) {
      mark(`tw:base`);
      if (!w.twq) {
        const twq: any = function () {
          twq.exe ? twq.exe.apply(twq, arguments) : twq.queue.push(arguments);
        };
        twq.version = "1.1";
        twq.queue = [];
        w.twq = twq;
        const a = document.createElement("script");
        a.async = true;
        a.src = "https://static.ads-twitter.com/uwt.js";
        document.head.appendChild(a);
      }
    }
    if (!has(`tw:${p.twitterPixelId}`)) {
      mark(`tw:${p.twitterPixelId}`);
      w.twq("config", p.twitterPixelId);
    }
    w.twq("event", "tw-" + p.twitterPixelId + "-qr_scan", {});
  }

  // --- Pinterest Tag ---
  if (p.pinterestTagId) {
    if (!has(`pin:base`)) {
      mark(`pin:base`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (function (e: any) {
        if (!e.pintrk) {
          const n: any = (e.pintrk = function () { n.queue.push(Array.prototype.slice.call(arguments)); });
          n.queue = []; n.version = "3.0";
          const t = document.createElement("script") as HTMLScriptElement;
          t.async = true; t.src = "https://s.pinimg.com/ct/core.js";
          document.head.appendChild(t);
        }
      })(w);
    }
    if (!has(`pin:${p.pinterestTagId}`)) {
      mark(`pin:${p.pinterestTagId}`);
      w.pintrk("load", p.pinterestTagId);
      w.pintrk("page");
    }
    w.pintrk("track", "lead");
  }

  // Give pixels a moment to actually send their beacons.
  await new Promise((r) => setTimeout(r, 400));
}