import { useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, FileText } from "lucide-react";
import type { FrameStyle } from "@/lib/qr";

interface Props {
  value: string;
  color?: string;
  bgColor?: string;
  logoUrl?: string | null;
  frameStyle?: FrameStyle;
  name?: string;
  size?: number;
}

const PAD = 24;
const LABEL_H = 56;

function frameDims(size: number, frame: FrameStyle) {
  if (frame === "none") return { w: size, h: size, qrX: 0, qrY: 0 };
  return { w: size + PAD * 2, h: size + PAD * 2 + LABEL_H, qrX: PAD, qrY: PAD };
}

function frameLabel(frame: FrameStyle): string {
  if (frame === "scan-me") return "SCAN ME";
  if (frame === "arrow") return "↑ APONTE A CÂMERA";
  if (frame === "rounded") return "ESCANEIE";
  return "";
}

export function QRCodePreview({
  value,
  color = "#0f172a",
  bgColor = "#ffffff",
  logoUrl,
  frameStyle = "none",
  name = "qr-code",
  size = 256,
}: Props) {
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const { w: W, h: H, qrX, qrY } = frameDims(size, frameStyle);
  const imageSettings = logoUrl
    ? { src: logoUrl, height: Math.round(size * 0.2), width: Math.round(size * 0.2), excavate: true }
    : undefined;

  const label = frameLabel(frameStyle);

  const drawFrame = (ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) => {
    // background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    if (frameStyle === "none") return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    const stroke = 4 * scale;
    const labelY = h - (LABEL_H * scale) / 2;

    if (frameStyle === "rounded") {
      ctx.lineWidth = stroke;
      const r = 20 * scale;
      const x = stroke / 2;
      const y = stroke / 2;
      const rw = w - stroke;
      const rh = h - LABEL_H * scale - stroke;
      roundRect(ctx, x, y, rw, rh, r);
      ctx.stroke();
    } else if (frameStyle === "scan-me") {
      ctx.lineWidth = stroke;
      const len = 36 * scale;
      const x0 = stroke;
      const y0 = stroke;
      const x1 = w - stroke;
      const y1 = h - LABEL_H * scale - stroke;
      ctx.beginPath();
      // tl
      ctx.moveTo(x0, y0 + len); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0);
      // tr
      ctx.moveTo(x1 - len, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + len);
      // bl
      ctx.moveTo(x0, y1 - len); ctx.lineTo(x0, y1); ctx.lineTo(x0 + len, y1);
      // br
      ctx.moveTo(x1 - len, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - len);
      ctx.stroke();
    } else if (frameStyle === "arrow") {
      ctx.lineWidth = stroke;
      const x = stroke / 2;
      const y = stroke / 2;
      const rw = w - stroke;
      const rh = h - LABEL_H * scale - stroke;
      ctx.strokeRect(x, y, rw, rh);
    }

    ctx.fillStyle = color;
    ctx.font = `700 ${22 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, labelY);
  };

  const composeCanvas = async (scale = 4): Promise<HTMLCanvasElement> => {
    const qrCanvas = canvasWrapRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!qrCanvas) throw new Error("QR canvas não disponível");
    const out = document.createElement("canvas");
    out.width = W * scale;
    out.height = H * scale;
    const ctx = out.getContext("2d")!;
    drawFrame(ctx, out.width, out.height, scale);
    ctx.drawImage(qrCanvas, qrX * scale, qrY * scale, size * scale, size * scale);
    return out;
  };

  const downloadPNG = async () => {
    const c = await composeCanvas(4);
    const url = c.toDataURL("image/png");
    triggerDownload(url, `${name}.png`);
  };

  const downloadSVG = () => {
    const innerSvg = svgWrapRef.current?.querySelector("svg");
    if (!innerSvg) return;
    const xml = new XMLSerializer().serializeToString(innerSvg);
    let svgString: string;
    if (frameStyle === "none") {
      svgString = xml;
    } else {
      const labelText = label
        ? `<text x="${W / 2}" y="${H - LABEL_H / 2}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="700" fill="${color}">${escapeXml(label)}</text>`
        : "";
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <rect width="${W}" height="${H}" fill="${bgColor}"/>
        ${frameShapeSvg(frameStyle, W, H, color)}
        <g transform="translate(${qrX} ${qrY})">${stripSvgWrapper(xml)}</g>
        ${labelText}
      </svg>`;
    }
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${name}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPDF = async () => {
    const c = await composeCanvas(4);
    const dataUrl = c.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a6", orientation: "portrait" });
    const pageW = 105;
    const pageH = 148;
    const margin = 12;
    const maxSide = Math.min(pageW - margin * 2, pageH - margin * 2 - 14);
    const aspect = c.width / c.height;
    const imgW = aspect >= 1 ? maxSide : maxSide * aspect;
    const imgH = aspect >= 1 ? maxSide / aspect : maxSide;
    const x = (pageW - imgW) / 2;
    const y = (pageH - imgH) / 2 - 4;
    pdf.addImage(dataUrl, "PNG", x, y, imgW, imgH);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(60);
    pdf.text(name, pageW / 2, pageH - 8, { align: "center" });
    pdf.save(`${name}.pdf`);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={svgWrapRef}
        className="relative rounded-xl p-4 shadow-sm ring-1 ring-border"
        style={{ background: bgColor, width: W + 32, height: H + 32 }}
      >
        <FrameOverlay frame={frameStyle} W={W} H={H} color={color} label={label} />
        <div className="absolute" style={{ left: qrX + 16, top: qrY + 16 }}>
          <QRCodeSVG
            value={value}
            size={size}
            fgColor={color}
            bgColor={bgColor}
            level="H"
            includeMargin={false}
            imageSettings={imageSettings}
          />
        </div>
      </div>
      <div ref={canvasWrapRef} className="hidden">
        <QRCodeCanvas
          value={value}
          size={1024}
          fgColor={color}
          bgColor={bgColor}
          level="H"
          includeMargin={false}
          imageSettings={
            logoUrl
              ? { src: logoUrl, height: Math.round(1024 * 0.2), width: Math.round(1024 * 0.2), excavate: true }
              : undefined
          }
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadPNG}>
          <ImageIcon className="mr-2 h-4 w-4" /> PNG
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSVG}>
          <Download className="mr-2 h-4 w-4" /> SVG
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPDF}>
          <FileText className="mr-2 h-4 w-4" /> PDF
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
      {frame === "rounded" && (
        <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} rx={20} ry={20} fill="none" stroke={color} strokeWidth={4} />
      )}
      {frame === "scan-me" && (() => {
        const len = 36;
        const x1 = W - 2, y1 = H - LABEL_H - 2;
        const d = `M2 ${2 + len} L2 2 L${2 + len} 2 M${x1 - len} 2 L${x1} 2 L${x1} ${2 + len} M2 ${y1 - len} L2 ${y1} L${2 + len} ${y1} M${x1 - len} ${y1} L${x1} ${y1} L${x1} ${y1 - len}`;
        return <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />;
      })()}
      {frame === "arrow" && (
        <rect x={2} y={2} width={W - 4} height={H - LABEL_H - 4} fill="none" stroke={color} strokeWidth={4} />
      )}
      {label && (
        <text
          x={W / 2}
          y={H - LABEL_H / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="system-ui,-apple-system,sans-serif"
          fontSize={22}
          fontWeight={700}
          fill={color}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

function frameShapeSvg(frame: FrameStyle, W: number, H: number, color: string): string {
  if (frame === "rounded") {
    return `<rect x="2" y="2" width="${W - 4}" height="${H - LABEL_H - 4}" rx="20" ry="20" fill="none" stroke="${color}" stroke-width="4"/>`;
  }
  if (frame === "arrow") {
    return `<rect x="2" y="2" width="${W - 4}" height="${H - LABEL_H - 4}" fill="none" stroke="${color}" stroke-width="4"/>`;
  }
  if (frame === "scan-me") {
    const len = 36;
    const x1 = W - 2, y1 = H - LABEL_H - 2;
    const d = `M2 ${2 + len} L2 2 L${2 + len} 2 M${x1 - len} 2 L${x1} 2 L${x1} ${2 + len} M2 ${y1 - len} L2 ${y1} L${2 + len} ${y1} M${x1 - len} ${y1} L${x1} ${y1} L${x1} ${y1 - len}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return "";
}

function stripSvgWrapper(xml: string): string {
  // remove outer <svg ...> and </svg> so contents can be nested
  return xml.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
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

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}