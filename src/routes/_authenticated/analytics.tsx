import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { BarChart3, MousePointerClick, TrendingUp, Trophy, Users } from "lucide-react";
import { QR_TYPE_LABELS } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — zum" }] }),
  component: AnalyticsPage,
});

// Hardcoded chart colors — oklch() CSS vars don't resolve in SVG attributes
const C1 = "#c4882a"; // primary amber
const C2 = "#9ca3af"; // muted gray

type Range = 7 | 30 | 90;
type Scan = { qr_id: string; scanned_at: string; visitor_hash: string | null };
type LinkRow = { id: string; title: string; type: string; short_id: string };

function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);

  const since = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - range); return d.toISOString();
  }, [range]);

  const sincePrev = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - range * 2); return d.toISOString();
  }, [range]);

  const { data: links } = useQuery({
    queryKey: ["qr_links_titles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_links").select("id,title,type,short_id");
      if (error) throw error;
      return data as LinkRow[];
    },
  });

  const { data: scans, isLoading } = useQuery({
    queryKey: ["qr_scans", range],
    queryFn: async () => {
      const { data, error } = await (supabase.from("qr_scans") as any)
        .select("qr_id,scanned_at,visitor_hash")
        .gte("scanned_at", sincePrev)
        .order("scanned_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Scan[];
    },
  });

  const { data: uniquesTotal = 0 } = useQuery({
    queryKey: ["qr_unique_total", range],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("qr_unique_visitors", { p_days: range });
      if (error) return 0;
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.uniques || 0), 0);
    },
  });

  const byId = useMemo(() => {
    const m = new Map<string, LinkRow>();
    (links ?? []).forEach((l) => m.set(l.id, l));
    return m;
  }, [links]);

  const { current, previous, today, byDay, top } = useMemo(() => {
    const sinceDate = new Date(since).getTime();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const todayMs = startToday.getTime();
    const current: Scan[] = [];
    const previous: Scan[] = [];
    let today = 0;

    (scans ?? []).forEach((s) => {
      const t = new Date(s.scanned_at).getTime();
      if (t >= sinceDate) {
        current.push(s);
        if (t >= todayMs) today += 1;
      } else {
        previous.push(s);
      }
    });

    // Build day buckets for the chart
    const days = new Map<string, { count: number; set: Set<string> }>();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      // Use local date string to avoid UTC mismatch
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.set(key, { count: 0, set: new Set() });
    }

    current.forEach((s) => {
      // Parse local date from the ISO timestamp
      const d = new Date(s.scanned_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const slot = days.get(key);
      if (slot) {
        slot.count += 1;
        if (s.visitor_hash) slot.set.add(s.visitor_hash);
      }
    });

    const byDay = Array.from(days.entries()).map(([date, v]) => ({
      date: date.slice(5), // MM-DD
      count: v.count,
      uniques: v.set.size,
    }));

    const counts = new Map<string, number>();
    current.forEach((s) => counts.set(s.qr_id, (counts.get(s.qr_id) || 0) + 1));
    const top = Array.from(counts.entries())
      .map(([id, count]) => ({ id, count, link: byId.get(id) }))
      .filter((r) => r.link)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { current, previous, today, byDay, top };
  }, [scans, since, range, byId]);

  const growth = previous.length === 0
    ? (current.length > 0 ? 100 : 0)
    : Math.round(((current.length - previous.length) / previous.length) * 100);
  const topQr = top[0];

  const hasData = current.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Visão geral dos seus scans</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {([7, 30, 90] as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "ghost"} onClick={() => setRange(r)}>
              {r}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<MousePointerClick className="h-5 w-5" />} label={`Scans últimos ${range}d`} value={current.length} />
        <StatCard icon={<Users className="h-5 w-5" />} label={`Visitantes únicos ${range}d`} value={uniquesTotal} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Scans hoje" value={today} />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="vs período anterior"
          value={`${growth >= 0 ? "+" : ""}${growth}%`}
        />
      </div>

      {topQr && (
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label={`Top QR — ${topQr.count} scans`}
          value={topQr.link?.title ?? "—"}
          small
        />
      )}

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium">Scans por dia</h2>
        {!hasData && !isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Nenhum scan registrado neste período.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval={range === 7 ? 0 : range === 30 ? 4 : 9}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Scans"
                  stroke={C1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: C1 }}
                />
                <Line
                  type="monotone"
                  dataKey="uniques"
                  name="Únicos"
                  stroke={C2}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: C2 }}
                />
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

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/40 p-3 text-sm font-medium">
          Top 10 QR Codes — últimos {range}d
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Scans</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            )}
            {!isLoading && top.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhum scan registrado ainda. Compartilhe seus QR Codes para começar a ver dados aqui.
                </TableCell>
              </TableRow>
            )}
            {top.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.link!.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{QR_TYPE_LABELS[r.link!.type] ?? r.link!.type}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{r.count}</TableCell>
                <TableCell className="text-right">
                  <Link
                    to="/analytics/$qrId"
                    params={{ qrId: r.id }}
                    className="text-sm font-medium hover:underline"
                    style={{ color: C1 }}
                  >
                    Ver detalhes →
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, small }: {
  icon: React.ReactNode; label: string; value: number | string; small?: boolean;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={small ? "truncate text-base font-medium" : "text-2xl font-semibold tabular-nums"}>
          {value}
        </p>
      </div>
    </Card>
  );
}
