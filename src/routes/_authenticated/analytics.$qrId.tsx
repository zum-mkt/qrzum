import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
  head: () => ({ meta: [{ title: "Analytics do QR — QRFlow" }] }),
  component: QrAnalytics,
});

type Scan = {
  id: string; scanned_at: string;
  country: string | null; city: string | null;
  device: string | null; os: string | null; browser: string | null;
  referrer: string | null; visitor_hash: string | null;
};

function QrAnalytics() {
  const { qrId } = Route.useParams();

  const { data: link } = useQuery({
    queryKey: ["qr_link", qrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_links")
        .select("id,title,type,short_id,active,clicks")
        .eq("id", qrId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: scans, isLoading } = useQuery({
    queryKey: ["qr_scans_for", qrId],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data, error } = await (supabase.from("qr_scans") as any)
        .select("id,scanned_at,country,city,device,os,browser,referrer,visitor_hash")
        .eq("qr_id", qrId)
        .gte("scanned_at", since.toISOString())
        .order("scanned_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Scan[];
    },
  });

  const { byDay, byCountry, byDevice, uniquesTotal } = useMemo(() => {
    const days = new Map<string, { count: number; set: Set<string> }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      days.set(d.toISOString().slice(0, 10), { count: 0, set: new Set() });
    }
    const country = new Map<string, number>();
    const device = new Map<string, number>();
    const allUniques = new Set<string>();
    (scans ?? []).forEach((s) => {
      const k = s.scanned_at.slice(0, 10);
      const slot = days.get(k);
      if (slot) {
        slot.count += 1;
        if (s.visitor_hash) slot.set.add(s.visitor_hash);
      }
      if (s.visitor_hash) allUniques.add(s.visitor_hash);
      const c = s.country || "Desconhecido";
      country.set(c, (country.get(c) || 0) + 1);
      const d = s.device || "desktop";
      device.set(d, (device.get(d) || 0) + 1);
    });
    return {
      byDay: Array.from(days.entries()).map(([date, v]) => ({ date: date.slice(5), count: v.count, uniques: v.set.size })),
      byCountry: Array.from(country.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      byDevice: Array.from(device.entries()).map(([name, value]) => ({ name, value })),
      uniquesTotal: allUniques.size,
    };
  }, [scans]);

  const exportCsv = () => {
    const rows = scans ?? [];
    const head = ["scanned_at", "country", "city", "device", "os", "browser", "referrer"];
    const body = rows.map((r) => head.map((k) =>
      JSON.stringify((r as any)[k] ?? "")
    ).join(","));
    const csv = [head.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scans-${link?.short_id ?? qrId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/analytics" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Analytics
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{link?.title ?? "Carregando..."}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {link && <Badge variant="secondary">{QR_TYPE_LABELS[link.type] ?? link.type}</Badge>}
            {link && <code className="rounded bg-muted px-2 py-0.5 text-xs">{link.short_id}</code>}
            {link && (
              <span className={link.active ? "text-green-600" : "text-amber-600"}>
                {link.active ? "Ativo" : "Pausado"}
              </span>
            )}
            <span>· Total: <span className="font-medium text-foreground">{link?.clicks ?? 0}</span></span>
            <span className="inline-flex items-center gap-1">· <Users className="h-3 w-3" /> Únicos: <span className="font-medium text-foreground">{uniquesTotal}</span></span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!scans || scans.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium">Scans nos últimos 30 dias</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Line type="monotone" dataKey="count" name="Scans" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="uniques" name="Únicos" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium">Top países</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={byCountry} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} className="text-xs" />
                <YAxis type="category" dataKey="name" width={80} className="text-xs" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium">Dispositivos</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={byDevice}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/40 p-3 text-sm font-medium">Últimos scans</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Browser</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && (scans?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Nenhum scan registrado ainda.
              </TableCell></TableRow>
            )}
            {(scans ?? []).slice(0, 50).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(s.scanned_at).toLocaleString()}</TableCell>
                <TableCell>{s.country ?? "—"}</TableCell>
                <TableCell>{s.city ?? "—"}</TableCell>
                <TableCell>{s.device ?? "—"}</TableCell>
                <TableCell>{s.os ?? "—"}</TableCell>
                <TableCell>{s.browser ?? "—"}</TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{s.referrer ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}