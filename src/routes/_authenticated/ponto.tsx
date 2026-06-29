import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Clock, Plus, Trash2, UserCheck, Download,
  LogIn, LogOut, Search, QrCode, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/ponto")({
  component: PontoDashboard,
});

type Employee = {
  id: string;
  name: string;
  role: string | null;
  pin: string;
  active: boolean;
};

type Punch = {
  id: string;
  punched_at: string;
  type: "in" | "out";
  lat: number | null;
  lng: number | null;
  employees: { name: string; role: string | null } | null;
  qr_links: { title: string; short_id: string } | null;
};

type PontoQr = { id: string; title: string; short_id: string };

function PontoDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [pontoQrs, setPontoQrs] = useState<PontoQr[]>([]);
  const [loading, setLoading] = useState(true);

  // Employee form
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterQr, setFilterQr] = useState("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [empRes, punchRes, qrRes] = await Promise.all([
      supabase.from("employees").select("*").order("name"),
      supabase
        .from("time_punches")
        .select("id, punched_at, type, lat, lng, employees(name, role), qr_links(title, short_id)")
        .order("punched_at", { ascending: false })
        .limit(500),
      supabase.from("qr_links").select("id, title, short_id").eq("type", "ponto").order("title"),
    ]);
    setEmployees((empRes.data as Employee[]) ?? []);
    setPunches((punchRes.data as unknown as Punch[]) ?? []);
    setPontoQrs((qrRes.data as PontoQr[]) ?? []);
    setLoading(false);
  }

  const generatePin = () => {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    setNewPin(pin);
  };

  const addEmployee = async () => {
    if (!newName.trim() || newPin.length < 4) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("employees").insert({
      user_id: user!.id,
      name: newName.trim(),
      role: newRole.trim() || null,
      pin: newPin,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "PIN já existe. Use outro." : error.message);
    } else {
      toast.success("Funcionário adicionado");
      setNewName(""); setNewRole(""); setNewPin("");
      await loadAll();
    }
    setSaving(false);
  };

  const toggleEmployee = async (emp: Employee) => {
    await supabase.from("employees").update({ active: !emp.active }).eq("id", emp.id);
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: !e.active } : e));
    toast.success(emp.active ? "Funcionário desativado" : "Funcionário reativado");
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Excluir funcionário? Os registros de ponto serão mantidos.")) return;
    await supabase.from("employees").delete().eq("id", id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast.success("Removido");
  };

  // Filter punches
  const filteredPunches = useMemo(() => {
    return punches.filter(p => {
      const date = p.punched_at.slice(0, 10);
      if (date !== filterDate) return false;
      if (filterQr !== "all" && p.qr_links?.short_id !== filterQr) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.employees?.name.toLowerCase().includes(q) || p.qr_links?.title.toLowerCase().includes(q);
      }
      return true;
    });
  }, [punches, filterDate, filterQr, search]);

  const exportCSV = () => {
    const rows = [
      ["Funcionário", "Cargo", "Local", "Tipo", "Data", "Hora", "Lat", "Lng"],
      ...filteredPunches.map(p => [
        p.employees?.name ?? "",
        p.employees?.role ?? "",
        p.qr_links?.title ?? "",
        p.type === "in" ? "Entrada" : "Saída",
        new Date(p.punched_at).toLocaleDateString("pt-BR"),
        new Date(p.punched_at).toLocaleTimeString("pt-BR"),
        p.lat ?? "",
        p.lng ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ponto-${filterDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayIn = filteredPunches.filter(p => p.type === "in").length;
  const todayOut = filteredPunches.filter(p => p.type === "out").length;

  if (loading) return <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro de Ponto</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie funcionários e acompanhe os registros de presença.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* QR Pontos disponíveis */}
      {pontoQrs.length === 0 ? (
        <Card className="p-6 border-dashed text-center space-y-2">
          <QrCode className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum QR de Ponto criado ainda</p>
          <p className="text-xs text-muted-foreground">
            Crie um QR Code do tipo <strong>Ponto</strong> na tela de criação para começar.
          </p>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {pontoQrs.map(qr => (
            <a
              key={qr.id}
              href={`/ponto/${qr.short_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/50 transition-colors"
            >
              <QrCode className="h-3.5 w-3.5 text-primary" />
              {qr.title}
              <span className="text-muted-foreground">↗</span>
            </a>
          ))}
        </div>
      )}

      <Tabs defaultValue="registros">
        <TabsList>
          <TabsTrigger value="registros">Registros</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários ({employees.filter(e => e.active).length})</TabsTrigger>
        </TabsList>

        {/* REGISTROS */}
        <TabsContent value="registros" className="space-y-4 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{filteredPunches.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{todayIn}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Entradas</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{todayOut}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Saídas</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
            <select
              value={filterQr}
              onChange={e => setFilterQr(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">Todos os locais</option>
              {pontoQrs.map(q => <option key={q.id} value={q.short_id}>{q.title}</option>)}
            </select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredPunches.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>

          {/* Punch list */}
          {filteredPunches.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhum registro para esta data.
            </Card>
          ) : (
            <div className="space-y-1">
              {filteredPunches.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    p.type === "in" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-500"
                  }`}>
                    {p.type === "in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.employees?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.employees?.role ? `${p.employees.role} · ` : ""}
                      {p.qr_links?.title ?? ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {new Date(p.punched_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <Badge variant={p.type === "in" ? "default" : "secondary"} className="text-[10px]">
                      {p.type === "in" ? "Entrada" : "Saída"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FUNCIONÁRIOS */}
        <TabsContent value="funcionarios" className="space-y-4 mt-4">
          {/* Add employee form */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" /> Adicionar funcionário
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Maria Silva"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo (opcional)</Label>
                <Input
                  placeholder="Atendente"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PIN (4–6 dígitos) *</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="ex: 1234"
                    maxLength={6}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className="h-9 text-sm font-mono flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={generatePin} className="shrink-0">
                    Gerar
                  </Button>
                </div>
              </div>
            </div>
            <Button
              onClick={addEmployee}
              disabled={!newName.trim() || newPin.length < 4 || saving}
              size="sm"
            >
              {saving ? "Salvando…" : "Adicionar"}
            </Button>
          </Card>

          {/* Employee list */}
          {employees.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhum funcionário cadastrado.
            </Card>
          ) : (
            <div className="space-y-1">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    emp.active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.role ? `${emp.role} · ` : ""}
                      PIN: <span className="font-mono">{emp.pin}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={emp.active ? "default" : "secondary"} className="text-[10px]">
                      {emp.active ? "Ativo" : "Inativo"}
                    </Badge>
                    <button
                      onClick={() => toggleEmployee(emp)}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      {emp.active ? "Desativar" : "Reativar"}
                    </button>
                    <button onClick={() => deleteEmployee(emp.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
