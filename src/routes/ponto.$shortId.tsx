import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/ponto/$shortId")({
  component: PontoPage,
});

type Step = "loading" | "pin" | "confirming" | "success" | "error";

type PontoInfo = {
  qrId: string;
  title: string;
  userId: string;
};

type EmployeeInfo = {
  id: string;
  name: string;
  role: string | null;
};

function PontoPage() {
  const { shortId } = Route.useParams();
  const [step, setStep] = useState<Step>("loading");
  const [ponto, setPonto] = useState<PontoInfo | null>(null);
  const [pin, setPin] = useState("");
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [punchType, setPunchType] = useState<"in" | "out">("in");
  const [lastPunchedAt, setLastPunchedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  // Load QR ponto info
  useEffect(() => {
    supabase.rpc("resolve_ponto", { p_short_id: shortId }).then(({ data, error }) => {
      if (error || !data || data.length === 0) {
        setErrorMsg("QR Code não encontrado ou não é um ponto de registro.");
        setStep("error");
        return;
      }
      const row = data[0] as any;
      if (!row.active) {
        setErrorMsg("Este ponto de registro está desativado.");
        setStep("error");
        return;
      }
      setPonto({ qrId: row.qr_id, title: row.title, userId: row.user_id });
      setStep("pin");
      setTimeout(() => pinRef.current?.focus(), 100);
    });

    // Get geolocation in background
    navigator.geolocation?.getCurrentPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => {},
      { maximumAge: 60000, timeout: 5000 },
    );
  }, [shortId]);

  const handlePinSubmit = async () => {
    if (pin.length < 4 || !ponto) return;
    setStep("confirming");

    // Resolve employee by PIN
    const { data: empData } = await supabase.rpc("resolve_employee_by_pin", {
      p_user_id: ponto.userId,
      p_pin: pin,
    });

    if (!empData || empData.length === 0) {
      setErrorMsg("PIN não encontrado. Verifique com o responsável.");
      setStep("error");
      return;
    }

    const emp = empData[0] as any;
    setEmployee({ id: emp.id, name: emp.name, role: emp.role });

    // Check last punch to determine in/out
    const { data: lastData } = await supabase.rpc("last_punch", { p_employee_id: emp.id });
    const last = lastData?.[0] as any;

    if (last?.type === "in") {
      setPunchType("out");
      setLastPunchedAt(last.punched_at);
    } else {
      setPunchType("in");
      setLastPunchedAt(null);
    }

    setStep("confirming");
  };

  const handleConfirm = async () => {
    if (!ponto || !employee) return;
    setStep("loading");

    const res = await fetch("/api/ponto/punch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee.id,
        qrId: ponto.qrId,
        type: punchType,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        accuracy: geo?.accuracy ?? null,
      }),
    });

    if (!res.ok) {
      setErrorMsg("Erro ao registrar ponto. Tente novamente.");
      setStep("error");
      return;
    }

    setStep("success");
  };

  const reset = () => {
    setPin("");
    setEmployee(null);
    setErrorMsg("");
    setStep("pin");
    setTimeout(() => pinRef.current?.focus(), 100);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto">
            <Clock className="h-7 w-7" />
          </div>
          {ponto && <h1 className="text-lg font-semibold text-foreground mt-3">{ponto.title}</h1>}
          <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
          <p className="text-3xl font-bold tabular-nums text-foreground">{timeStr}</p>
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* PIN Entry */}
        {step === "pin" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Seu PIN</label>
              <input
                ref={pinRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
                placeholder="• • • • • •"
                className="w-full rounded-xl border border-border bg-card px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4}
              className="w-full rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 transition-opacity"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Confirm punch */}
        {step === "confirming" && employee && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-1">
              <p className="text-lg font-semibold text-foreground">{employee.name}</p>
              {employee.role && <p className="text-xs text-muted-foreground">{employee.role}</p>}
              {lastPunchedAt && punchType === "out" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Entrada registrada às {new Date(lastPunchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className={`w-full rounded-xl py-5 text-base font-bold text-white flex items-center justify-center gap-2.5 transition-colors ${
                punchType === "in"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {punchType === "in"
                ? <><LogIn className="h-5 w-5" /> Registrar Entrada</>
                : <><LogOut className="h-5 w-5" /> Registrar Saída</>
              }
            </button>

            <button
              onClick={reset}
              className="w-full text-sm text-muted-foreground underline underline-offset-2"
            >
              Não sou eu
            </button>
          </div>
        )}

        {/* Success */}
        {step === "success" && employee && (
          <div className="space-y-4 text-center">
            <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto ${
              punchType === "in" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-500"
            }`}>
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-foreground">
                {punchType === "in" ? "Entrada registrada!" : "Saída registrada!"}
              </p>
              <p className="text-sm text-muted-foreground">{employee.name} · {timeStr}</p>
            </div>
            <button
              onClick={reset}
              className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground"
            >
              Registrar outro funcionário
            </button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="space-y-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            {ponto && (
              <button
                onClick={reset}
                className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/50">QRzum · Registro de Presença</p>
      </div>
    </div>
  );
}
