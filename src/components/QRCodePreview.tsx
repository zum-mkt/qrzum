import { useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon } from "lucide-react";

interface Props {
  value: string;
  color?: string;
  name?: string;
  size?: number;
}

export function QRCodePreview({ value, color = "#000000", name = "qr-code", size = 256 }: Props) {
  const svgRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadSVG = () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={svgRef} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-border">
        <QRCodeSVG value={value} size={size} fgColor={color} bgColor="#ffffff" level="H" includeMargin={false} />
      </div>
      {/* hidden high-res canvas for PNG export */}
      <div ref={canvasRef} className="hidden">
        <QRCodeCanvas value={value} size={1024} fgColor={color} bgColor="#ffffff" level="H" includeMargin={false} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={downloadPNG}>
          <ImageIcon className="mr-2 h-4 w-4" /> PNG
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSVG}>
          <Download className="mr-2 h-4 w-4" /> SVG
        </Button>
      </div>
    </div>
  );
}