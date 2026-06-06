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
import { BarChart3, MousePointerClick, TrendingUp, Trophy } from "lucide-react";
import { QR_TYPE_LABELS } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — QRFlow" }] }),
  component: AnalyticsPage,
});

type Range = 7 | 30 | 90;

type Scan = { qr_id: string; scanned_at: string };
type LinkRow = { id: string; title: string; type: string; short_id: string };

function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - range);
    return d.toISOString();
  }, [range]);

  const sincePrev = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - range * 2);
    return d.toISOString();
  }, [range]);

  const { data: links } = useQuery({
    queryKey: ["qr_links_titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_links")
        .select("id,title,type,short_id");
      if (error) throw error;
      return data as LinkRow[];
    },
  });

  const { data: scans, isLoading } = useQuery({
    queryKey: ["qr_scans", range],
    queryFn: async () => {
      const { data, error } = await (supabase.from("qr_scans") as any)
        .select("qr_id,scanned_at")
        .gte("scanned_at", sincePrev)
        .order("scanned_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Scan[];
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
      } else previous.push(s);
    });
    // group by day for current range
    const days = new Map<string, number>();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      days.set(d.toISOString().slice(0, 10), 0);
    }
    current.forEach((s) => {
      const k = s.scanned_at.slice(0, 10);
      if (days.has(k)) days.set(k, (days.get(k) || 0) + 1);
    });
    const byDay = Array.from(days.entries()).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
    // top QRs
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Visão geral dos seus scans</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {([7, 30, 90] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<MousePointerClick className="h-5 w-5" />} label={`Scans últimos ${range}d`} value={current.length} />
        <Stat icon={<BarChart3 className="h-5 w-5" />} label="Scans hoje" value={today} />
        <Stat
          icon={<TrendingUp className="h-5 w-5" />}
          label="vs período anterior"
          value={`${growth >= 0 ? "+" : ""}${growth}%`}
        />
        <Stat
          icon={<Trophy className="h-5 w-5" />}
          label="Top QR"
          value={topQr?.link?.title ?? "—"}
          small
        />
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium">Scans por dia</h2>
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
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
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
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && top.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                Nenhum scan registrado ainda. Compartilhe seus QR Codes para começar a ver dados aqui.
              </TableCell></TableRow>
            )}
            {top.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.link!.title}</TableCell>
                <TableCell className="text-muted-foreground">{QR_TYPE_LABELS[r.link!.type] ?? r.link!.type}</TableCell>
                <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                <TableCell className="text-right">
                  <Link to="/analytics/$qrId" params={{ qrId: r.id }} className="text-sm text-primary hover:underline">
                    Ver detalhes
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

function Stat({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: number | string; small?: boolean }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`${small ? "truncate text-base font-medium" : "text-2xl font-semibold tabular-nums"}`}>{value}</p>
      </div>
    </Card>
  );
}