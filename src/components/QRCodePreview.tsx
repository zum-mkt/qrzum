import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, FileImage } from "lucide-react";
import { defaultFrameText, type FrameStyle } from "@/lib/qr";
import type { DotStyle, CornerSquareStyle, CornerDotStyle } from "@/components/QRStyleFields";

const PAD = 24;
const LABEL_H = 56;
const EXPORT_SIZE = 1024;

interface Props {
  value: string;
  color?: string;
  bgColor?: string;
  logoUrl?: string | null;
  frameStyle?: FrameStyle;
  frameText?: string | null;
  dotStyle?: DotStyle;
  cornerSquareStyle?: CornerSquareStyle;
  cornerDotStyle?: CornerDotStyle;
  gradientEnabled?: boolean;
  gradientType?: "linear" | "radial";
  gradientAngle?: number;
  gradientColor2?: string;
  name?: string;
  size?: number;
}

function frameDims(size: number, frame: FrameStyle) {
  if (frame === "none") return { w: size, h: size, qrX: 0, qrY: 0 };
  return { w: size + PAD * 2, h: size + PAD * 2 + LABEL_H, qrX: PAD, qrY: PAD };
}

function frameLabel(frame: FrameStyle, frameText?: string | null): string {
  const custom = (frameText ?? "").trim();
  if (custom) return custom;
  return defaultFrameText(frame);
}

function buildGradient(color1: string, color2: string, type: "linear" | "radial", angleDeg: number) {
  return {
    type,
    rotation: type === "linear" ? (angleDeg * Math.PI) / 180 : 0,
    colorStops: [
      { offset: 0, color: color1 },
      { offset: 1, color: color2 },
    ],
  };
}

function buildQROpts(
  value: string,
  size: number,
  color: string,
  bgColor: string,
  logoUrl: string | null | undefined,
  dotStyle: DotStyle,
  cornerSquareStyle: CornerSquareStyle,
  cornerDotStyle: CornerDotStyle,
  type: "canvas" | "svg" = "canvas",
  gradientEnabled?: boolean,
  gradientType?: "linear" | "radial",
  gradientAngle?: number,
  gradientColor2?: string,
) {
  const grad =
    gradientEnabled && gradientColor2
      ? buildGradient(color, gradientColor2, gradientType ?? "linear", gradientAngle ?? 45)
      : undefined;

  return {
    type,
    width: size,
    height: size,
    data: value,
    image: logoUrl ?? undefined,
    dotsOptions: grad
      ? { type: dotStyle, gradient: grad }
      : { color, type: dotStyle },
    cornersSquareOptions: grad
      ? { type: cornerSquareStyle, gradient: grad }
      : { color, type: cornerSquareStyle },
    cornersDotOptions: grad
      ? { type: cornerDotStyle, gradient: grad }
      : { color, type: cornerDotStyle },
    backgroundOptions: { color: bgColor },
    imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: 0.3 },
    qrOptions: { errorCorrectionLevel: "H" as const },
  } as any;
}

function drawFrameOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  frame: FrameStyle,
  label: string,
  labelH: number,
) {
  if (frame === "none") return;
  const scale = w / 256;
  const stroke = 4 * scale;
  const x0 = stroke / 2;
  const y0 = stroke / 2;
  const rw = w - stroke;
  const rh = h - labelH - stroke;

  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;

  if (frame === "rounded") {
    roundRect(ctx, x0, y0, rw, rh, 20 * scale); ctx.stroke();
  } else if (frame === "rounded-card") {
    ctx.lineWidth = stroke * 1.6;
    roundRect(ctx, x0, y0, rw, rh, 28 * scale); ctx.stroke();
  } else if (frame === "url-pill") {
    roundRect(ctx, x0, y0, rw, rh, Math.min(rw, rh) / 2); ctx.stroke();
  } else if (frame === "tap-to-pay") {
    roundRect(ctx, x0, y0, rw, rh, 16 * scale); ctx.stroke();
  } else if (frame === "scan-me") {
    const len = 36 * scale;
    const x1 = w - stroke, y1 = h - labelH - stroke;
    ctx.beginPath();
    ctx.moveTo(stroke, stroke + len); ctx.lineTo(stroke, stroke); ctx.lineTo(stroke + len, stroke);
    ctx.moveTo(x1 - len, stroke); ctx.lineTo(x1, stroke); ctx.lineTo(x1, stroke + len);
    ctx.moveTo(stroke, y1 - len); ctx.lineTo(stroke, y1); ctx.lineTo(stroke + len, y1);
    ctx.moveTo(x1 - len, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - len);
    ctx.stroke();
  } else if (frame === "arrow") {
    ctx.strokeRect(x0, y0, rw, rh);
  }

  if (label) {
    ctx.fillStyle = color;
    ctx.font = `700 ${22 * scale}px system-ui,-apple-system,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, h - labelH / 2);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function frameShapeSvg(frame: FrameStyle, W: number, H: number, color: string, labelH: number): string {
  const w = W - 4, h = H - labelH - 4;
  if (frame === "rounded") return `<rect x="2" y="2" width="${w}" height="${h}" rx="20" ry="20" fill="none" stroke="${color}" stroke-width="4"/>`;
  if (frame === "rounded-card") return `<rect x="2" y="2" width="${w}" height="${h}" rx="28" ry="28" fill="none" stroke="${color}" stroke-width="7"/>`;
  if (frame === "tap-to-pay") return `<rect x="2" y="2" width="${w}" height="${h}" rx="16" ry="16" fill="none" stroke="${color}" stroke-width="4"/>`;
  if (frame === "url-pill") {
    const r = Math.min(w, h) / 2;
    return `<rect x="2" y="2" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="none" stroke="${color}" stroke-width="4"/>`;
  }
  if (frame === "arrow") return `<rect x="2" y="2" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="4"/>`;
  if (frame === "scan-me") {
    const len = 36;
    const x1 = W - 2, y1 = H - labelH - 2;
    return `<path d="M2 ${2 + len} L2 2 L${2 + len} 2 M${x1 - len} 2 L${x1} 2 L${x1} ${2 + len} M2 ${y1 - len} L2 ${y1} L${2 + len} ${y1} M${x1 - len} ${y1} L${x1} ${y1} L${x1} ${y1 - len}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return "";
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

export function QRCodePreview({
  value,
  color = "#0f172a",
  bgColor = "#ffffff",
  logoUrl,
  frameStyle = "none",
  frameText = null,
  dotStyle = "square",
  cornerSquareStyle = "square",
  cornerDotStyle = "square",
  gradientEnabled = false,
  gradientType = "linear",
  gradientAngle = 45,
  gradientColor2 = "#6366f1",
  name = "qr-code",
  size = 256,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const qrInstanceRef = useRef<any>(null);

  const { w: W, h: H, qrX, qrY } = frameDims(size, frameStyle);
  const label = frameLabel(frameStyle, frameText);

  const snap = useRef({
    value, color, bgColor, logoUrl, frameStyle, frameText,
    dotStyle, cornerSquareStyle, cornerDotStyle,
    gradientEnabled, gradientType, gradientAngle, gradientColor2,
    name, size, label,
  });
  useEffect(() => {
    snap.current = {
      value, color, bgColor, logoUrl, frameStyle, frameText,
      dotStyle, cornerSquareStyle, cornerDotStyle,
      gradientEnabled, gradientType, gradientAngle, gradientColor2,
      name, size, label,
    };
  });

  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !previewRef.current) return;
      const opts = buildQROpts(
        value, size, color, bgColor, logoUrl,
        dotStyle, cornerSquareStyle, cornerDotStyle,
        "canvas", gradientEnabled, gradientType, gradientAngle, gradientColor2,
      );
      if (qrInstanceRef.current) {
        qrInstanceRef.current.update(opts);
      } else {
        qrInstanceRef.current = new QRCodeStyling(opts);
        qrInstanceRef.current.append(previewRef.current);
      }
    });
    return () => { cancelled = true; };
  }, [value, color, bgColor, logoUrl, dotStyle, cornerSquareStyle, cornerDotStyle,
      gradientEnabled, gradientType, gradientAngle, gradientColor2, size]);

  const downloadFormat = useCallback(async (format: "png" | "jpeg" | "webp" | "svg") => {
    const {
      value: v, color: c, bgColor: bg, logoUrl: logo, frameStyle: fs, frameText: ft,
      dotStyle: ds, cornerSquareStyle: css, cornerDotStyle: cds,
      gradientEnabled: ge, gradientType: gt, gradientAngle: ga, gradientColor2: gc2,
      name: n,
    } = snap.current;
    const lbl = frameLabel(fs, ft);
    const { default: QRCodeStyling } = await import("qr-code-styling");

    if (format === "svg") {
      const qr = new QRCodeStyling(buildQROpts(
        v, EXPORT_SIZE, c, bg, logo,
        ds ?? "square", css ?? "square", cds ?? "square",
        "svg", ge, gt, ga, gc2,
      ));
      const blob = await qr.getRawData("svg" as any) as Blob | null;
      if (!blob) return;
      const svgText = await blob.text();

      let finalSvg: string;
      if (fs === "none") {
        finalSvg = svgText;
      } else {
        const scaledPad = Math.round(PAD * (EXPORT_SIZE / 256));
        const scaledLabelH = Math.round(LABEL_H * (EXPORT_SIZE / 256));
        const fw = EXPORT_SIZE + scaledPad * 2;
        const fh = EXPORT_SIZE + scaledPad * 2 + scaledLabelH;
        const inner = svgText.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
        finalSvg = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}" viewBox="0 0 ${fw} ${fh}">`,
          `<rect width="${fw}" height="${fh}" fill="${bg}"/>`,
          frameShapeSvg(fs, fw, fh, c, scaledLabelH),
          `<g transform="translate(${scaledPad} ${scaledPad})">${inner}</g>`,
          lbl ? `<text x="${fw / 2}" y="${fh - scaledLabelH / 2}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,sans-serif" font-size="88" font-weight="700" fill="${c}">${escapeXml(lbl)}</text>` : "",
          "</svg>",
        ].join("\n");
      }

      const finalBlob = new Blob([finalSvg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(finalBlob);
      triggerDownload(url, `${n}.svg`);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }

    const qr = new QRCodeStyling(buildQROpts(
      v, EXPORT_SIZE, c, bg, logo,
      ds ?? "square", css ?? "square", cds ?? "square",
      "canvas", ge, gt, ga, gc2,
    ));
    const blob = await qr.getRawData("png" as any) as Blob | null;
    if (!blob) return;

    if (fs === "none") {
      if (format === "png") {
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${n}.png`);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        const img = await loadImageFromBlob(blob);
        const canvas = document.createElement("canvas");
        canvas.width = EXPORT_SIZE; canvas.height = EXPORT_SIZE;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        const mime = format === "jpeg" ? "image/jpeg" : "image/webp";
        triggerDownload(canvas.toDataURL(mime, 0.95), `${n}.${format === "jpeg" ? "jpg" : format}`);
      }
      return;
    }

    const scaledPad = Math.round(PAD * (EXPORT_SIZE / 256));
    const scaledLabelH = Math.round(LABEL_H * (EXPORT_SIZE / 256));
    const fw = EXPORT_SIZE + scaledPad * 2;
    const fh = EXPORT_SIZE + scaledPad * 2 + scaledLabelH;

    const img = await loadImageFromBlob(blob);
    const canvas = document.createElement("canvas");
    canvas.width = fw; canvas.height = fh;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, fw, fh);
    ctx.drawImage(img, scaledPad, scaledPad);
    drawFrameOnCanvas(ctx, fw, fh, c, fs, lbl, scaledLabelH);

    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const ext = format === "jpeg" ? "jpg" : format;
    triggerDownload(canvas.toDataURL(mime, 0.95), `${n}.${ext}`);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative rounded-xl shadow-sm ring-1 ring-border"
        style={{ background: bgColor, width: W + 32, height: H + 32, padding: 16 }}
      >
        <FrameOverlay frame={frameStyle} W={W} H={H} color={color} label={label} />
        <div
          ref={previewRef}
          className="absolute"
          style={{ left: qrX + 16, top: qrY + 16, width: size, height: size }}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadFormat("png")}>
          <ImageIcon className="mr-2 h-4 w-4" /> PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadFormat("jpeg")}>
          <FileImage className="mr-2 h-4 w-4" /> JPEG
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadFormat("webp")}>
          <Download className="mr-2 h-4 w-4" /> WEBP
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadFormat("svg")}>
          <Download className="mr-2 h-4 w-4" /> SVG
        </Button>
      </div>
    </div>
  );
}

function FrameOverlay({
  frame, W, H, color, label,
}: { frame: FrameStyle; W: number; H: number; color: string; label: string }) {
  if (frame === "none") return null;
  return (
    <svg
      className="pointer-events-none absolute left-4 top-4"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
    >
      {frame === "rounded" && <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} rx={20} ry={20} fill="none" stroke={color} strokeWidth={4} />}
      {frame === "rounded-card" && <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} rx={28} ry={28} fill="none" stroke={color} strokeWidth={7} />}
      {frame === "tap-to-pay" && <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} rx={16} ry={16} fill="none" stroke={color} strokeWidth={4} />}
      {frame === "url-pill" && <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} rx={Math.min(W - 4, H - LABEL_H - 4) / 2} ry={Math.min(W - 4, H - LABEL_H - 4) / 2} fill="none" stroke={color} strokeWidth={4} />}
      {frame === "scan-me" && (() => {
        const len = 36, x1 = W - 2, y1 = H - LABEL_H - 2;
        return <path d={`M2 ${2 + len} L2 2 L${2 + len} 2 M${x1 - len} 2 L${x1} 2 L${x1} ${2 + len} M2 ${y1 - len} L2 ${y1} L${2 + len} ${y1} M${x1 - len} ${y1} L${x1} ${y1} L${x1} ${y1 - len}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />;
      })()}
      {frame === "arrow" && <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} fill="none" stroke={color} strokeWidth={4} />}
      {label && (
        <text x={W / 2} y={H - LABEL_H / 2} textAnchor="middle" dominantBaseline="middle"
          fontFamily="system-ui,-apple-system,sans-serif" fontSize={22} fontWeight={700} fill={color}>
          {label}
        </text>
      )}
    </svg>
  );
}
