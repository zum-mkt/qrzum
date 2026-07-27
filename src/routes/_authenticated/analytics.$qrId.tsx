import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { ArrowLeft, Download, Users } from "lucide-react";
import { QR_TYPE_LABELS } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/analytics/$qrId")({
  head: () => ({ meta: [{ title: "Analytics do QR — zum" }] }),
  component: QrAnalytics,
});

// Hardcoded chart colors — oklch() CSS vars don't resolve in SVG attributes
const C1 = "#c4882a";
const C2 = "#9ca3af";
const C3 = "#60a5fa";
const C4 = "#34d399";

type Range = 30 | 60 | 90;

type Scan = {
  id: string; scanned_at: string;
  country: string | null; city: string | null;
  device: string | null; os: string | null; browser: string | null;
  referrer: string | null; visitor_hash: string | null;
};

function QrAnalytics() {
  const { qrId } = Route.useParams();
  const [range, setRange] = useState<Range>(30);

  const { data: link, isError: linkError } = useQuery({
    queryKey: ["qr_link", qrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_links")
        .select("id,title,type,short_id,active")
        .eq("id", qrId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: scans, isLoading } = useQuery({
    queryKey: ["qr_scans_for", qrId, range],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - range);
      const { data, error } = await (supabase.from("qr_scans") as any)
        .select("id,scanned_at,country,city,device,os,browser,referrer,visitor_hash")
        .eq("qr_id", qrId)
        .gte("scanned_at", since.toISOString())
        .order("scanned_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Scan[];
    },
  });

  const { byDay, byCountry, byCity, byDevice, byOs, byBrowser, byReferrer, uniquesTotal } = useMemo(() => {
    const days = new Map<string, { count: number; set: Set<string> }>();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.set(key, { count: 0, set: new Set() });
    }

    const country = new Map<string, number>();
    const city = new Map<string, number>();
    const device = new Map<string, number>();
    const os = new Map<string, number>();
    const browser = new Map<string, number>();
    const referrer = new Map<string, number>();
    const allUniques = new Set<string>();

    (scans ?? []).forEach((s) => {
      const d = new Date(s.scanned_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const slot = days.get(key);
      if (slot) {
        slot.count += 1;
        if (s.visitor_hash) slot.set.add(s.visitor_hash);
      }
      if (s.visitor_hash) allUniques.add(s.visitor_hash);

      const inc = (m: Map<string, number>, k: string | null, fallback: string) => {
        const key = k || fallback;
        m.set(key, (m.get(key) || 0) + 1);
      };
      inc(country, s.country, "Desconhecido");
      inc(city, s.city, "Desconhecida");
      inc(device, s.device, "desktop");
      inc(os, s.os, "Desconhecido");
      inc(browser, s.browser, "Desconhecido");

      if (s.referrer) {
        let ref = s.referrer;
        try { ref = new URL(s.referrer).hostname; } catch {}
        referrer.set(ref, (referrer.get(ref) || 0) + 1);
      }
    });

    const toArr = (m: Map<string, number>, limit = 8) =>
      Array.from(m.entries()).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, limit);

    return {
      byDay: Array.from(days.entries()).map(([date, v]) => ({
        date: date.slice(5),
        count: v.count,
        uniques: v.set.size,
      })),
      byCountry: toArr(country),
      byCity: toArr(city),
      byDevice: toArr(device),
      byOs: toArr(os),
      byBrowser: toArr(browser),
      byReferrer: toArr(referrer, 10),
      uniquesTotal: allUniques.size,
    };
  }, [scans, range]);

  const totalScans = scans?.length ?? 0;

  const exportCsv = () => {
    const rows = scans ?? [];
    const head = ["scanned_at", "country", "city", "device", "os", "browser", "referrer"];
    const body = rows.map((r) => head.map((k) => JSON.stringify((r as any)[k] ?? "")).join(","));
    const csv = [head.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scans-${link?.short_id ?? qrId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tooltipStyle = {
    contentStyle: { background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 },
  };
  const tickStyle = { fontSize: 11, fill: "#6b7280" };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/analytics" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Analytics
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isLoading ? "Carregando..." : (link?.title ?? (linkError ? "QR não encontrado" : "—"))}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {link && <Badge variant="secondary">{QR_TYPE_LABELS[link.type] ?? link.type}</Badge>}
            {link && <code className="rounded bg-muted px-2 py-0.5 text-xs">{link.short_id}</code>}
            {link && (
              <span className={link.active ? "text-green-600" : "text-amber-600"}>
                {link.active ? "Ativo" : "Pausado"}
              </span>
            )}
            <span>· {range}d: <span className="font-medium text-foreground">{totalScans} scans</span></span>
            <span className="inline-flex items-center gap-1">
              · <Users className="h-3 w-3" /> <span className="font-medium text-foreground">{uniquesTotal}</span> únicos
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {([30, 60, 90] as Range[]).map((r) => (
              <Button key={r} size="sm" variant={range === r ? "default" : "ghost"} onClick={() => setRange(r)}>
                {r}d
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!scans || scans.length === 0}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Line chart */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium">Scans por dia — últimos {range} dias</h2>
        {!isLoading && totalScans === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Nenhum scan registrado neste período.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={false}
                  interval={range === 30 ? 4 : range === 60 ? 9 : 9} />
                <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} width={28} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="count" name="Scans" stroke={C1} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: C1 }} />
                <Line type="monotone" dataKey="uniques" name="Únicos" stroke={C2} strokeWidth={2}
                  strokeDasharray="4 4" dot={false} activeDot={{ r: 4, fill: C2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full" style={{ backgroundColor: C1 }} /> Scans
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5" style={{ borderTop: `2px dashed ${C2}` }} /> Únicos
          </span>
        </div>
      </Card>

      {/* Bar charts grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <MiniBar title="Top países" data={byCountry} color={C1} />
        <MiniBar title="Top cidades" data={byCity} color={C3} />
        <MiniBar title="Dispositivos" data={byDevice} color={C4} horizontal={false} />
        <MiniBar title="Sistemas operacionais" data={byOs} color={C1} horizontal={false} />
        <MiniBar title="Navegadores" data={byBrowser} color={C2} horizontal={false} />
      </div>

      {byReferrer.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/40 p-3 text-sm font-medium">Origens de tráfego</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Scans</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byReferrer.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="text-sm">{r.name}</TableCell>
                  <TableCell className="text-right font-medium">{r.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Raw scans */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/40 p-3 text-sm font-medium">
          Últimos scans ({Math.min(totalScans, 50)} de {totalScans})
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Navegador</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              )}
              {!isLoading && totalScans === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum scan registrado ainda.</TableCell>
                </TableRow>
              )}
              {(scans ?? []).slice(0, 50).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.scanned_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{s.country ?? "—"}</TableCell>
                  <TableCell>{s.city ?? "—"}</TableCell>
                  <TableCell className="capitalize">{s.device ?? "—"}</TableCell>
                  <TableCell>{s.os ?? "—"}</TableCell>
                  <TableCell>{s.browser ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{s.referrer ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function MiniBar({ title, data, color, horizontal = true }: {
  title: string;
  data: { name: string; value: number }[];
  color: string;
  horizontal?: boolean;
}) {
  const tickStyle = { fontSize: 11, fill: "#6b7280" };
  const tooltipStyle = {
    contentStyle: { background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 },
  };
  const hasData = data.length > 0;
  const h = horizontal ? Math.max(data.length * 28 + 32, 120) : 200;

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      {!hasData ? (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sem dados</div>
      ) : (
        <div style={{ height: h }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            {horizontal ? (
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <BarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} width={28} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
