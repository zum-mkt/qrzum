import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Loader2, Fingerprint, MapPin, Smartphone, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/ponto/$shortId")({
  component: PontoPage,
});

type Step =
  | "loading"
  | "geo-wait"
  | "geo-blocked"
  | "pin"
  | "pin-loading"
  | "device-error"
  | "webauthn"
  | "confirming"
  | "punching"
  | "success"
  | "webauthn-register"
  | "error";

type PontoInfo = {
  qrId: string;
  title: string;
  userId: string;
  brandColor: string;
  bgColor: string;
  logoUrl: string | null;
  geoLat: number | null;
  geoLng: number | null;
  geoRadius: number | null;
};

type EmployeeInfo = {
  id: string;
  name: string;
  role: string | null;
  punchType: "in" | "out";
  lastPunchedAt: string | null;
  webauthnRequired: boolean;
  deviceFirstBind: boolean;
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDeviceId(): string {
  let id = localStorage.getItem("ponto_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ponto_device_id", id);
  }
  return id;
}

function PontoPage() {
  const { shortId } = Route.useParams();
  const [step, setStep] = useState<Step>("loading");
  const [ponto, setPonto] = useState<PontoInfo | null>(null);
  const [pin, setPin] = useState("");
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [punchToken, setPunchToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoBlocked, setGeoBlocked] = useState<{ distance: number; radius: number } | null>(null);
  const [webauthnWorking, setWebauthnWorking] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  const brand = ponto?.brandColor ?? "#0f172a";
  const bg = ponto?.bgColor ?? "#ffffff";
  const logoUrl = ponto?.logoUrl ?? null;

  // Load QR info on mount
  useEffect(() => {
    supabase.rpc("resolve_ponto", { p_short_id: shortId }).then(({ data, error }) => {
      if (error || !data || (data as any[]).length === 0) {
        setErrorMsg("QR Code não encontrado ou não é um ponto de registro.");
        setStep("error");
        return;
      }
      const row = (data as any[])[0];
      if (!row.active) {
        setErrorMsg("Este ponto de registro está desativado.");
        setStep("error");
        return;
      }

      const info: PontoInfo = {
        qrId: row.qr_id,
        title: row.title,
        userId: row.user_id,
        brandColor: row.ponto_color ?? "#0f172a",
        bgColor: row.ponto_bg_color ?? "#ffffff",
        logoUrl: row.ponto_logo_url ?? null,
        geoLat: row.geo_lat ?? null,
        geoLng: row.geo_lng ?? null,
        geoRadius: row.geo_radius ?? null,
      };
      setPonto(info);

      if (info.geoLat != null && info.geoLng != null && info.geoRadius != null) {
        setStep("geo-wait");
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const dist = Math.round(haversine(info.geoLat!, info.geoLng!, latitude, longitude));
            setGeo({ lat: latitude, lng: longitude, accuracy });
            if (dist > info.geoRadius!) {
              setGeoBlocked({ distance: dist, radius: info.geoRadius! });
              setStep("geo-blocked");
            } else {
              setStep("pin");
              setTimeout(() => pinRef.current?.focus(), 100);
            }
          },
          () => {
            setErrorMsg("Localização necessária para este ponto. Permita o acesso à localização e tente novamente.");
            setStep("error");
          },
          { maximumAge: 0, timeout: 15000, enableHighAccuracy: true },
        );
      } else {
        navigator.geolocation?.getCurrentPosition(
          (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => {},
          { maximumAge: 60000, timeout: 5000 },
        );
        setStep("pin");
        setTimeout(() => pinRef.current?.focus(), 100);
      }
    });
  }, [shortId]);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4 || !ponto) return;
    setStep("pin-loading");

    const deviceId = getDeviceId();

    const res = await fetch("/api/ponto/resolve-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrId: ponto.qrId, pin, deviceId }),
    });

    if (res.status === 401) {
      setErrorMsg("PIN não encontrado. Verifique com o responsável.");
      setStep("error");
      return;
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body.error === "device_unauthorized") {
        setStep("device-error");
        return;
      }
      setErrorMsg("Acesso negado. Contate o administrador.");
      setStep("error");
      return;
    }

    if (!res.ok) {
      setErrorMsg("Erro ao validar PIN. Tente novamente.");
      setStep("error");
      return;
    }

    const emp = await res.json();
    setEmployee({
      id: emp.employeeId,
      name: emp.name,
      role: emp.role,
      punchType: emp.punchType,
      lastPunchedAt: emp.lastPunchedAt,
      webauthnRequired: emp.webauthnRequired,
      deviceFirstBind: emp.deviceFirstBind,
    });

    if (emp.webauthnRequired) {
      setStep("webauthn");
    } else {
      setStep("confirming");
    }
  }, [pin, ponto]);

  const handleWebAuthn = useCallback(async () => {
    if (!employee) return;
    setWebauthnWorking(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      const optRes = await fetch("/api/ponto/webauthn/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id }),
      });
      if (!optRes.ok) throw new Error("Falha ao iniciar autenticação biométrica.");
      const opts = await optRes.json();

      const authResponse = await startAuthentication({ optionsJSON: opts });

      const verifyRes = await fetch("/api/ponto/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, response: authResponse }),
      });
      if (!verifyRes.ok) throw new Error("Autenticação biométrica não reconhecida.");
      const { punchToken: token } = await verifyRes.json();
      setPunchToken(token);
      setStep("confirming");
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        setErrorMsg("Autenticação biométrica cancelada. Tente novamente.");
      } else {
        setErrorMsg(e.message ?? "Falha na biometria.");
      }
      setStep("error");
    } finally {
      setWebauthnWorking(false);
    }
  }, [employee]);

  const handleConfirm = useCallback(async () => {
    if (!ponto || !employee) return;
    setStep("punching");

    const deviceId = getDeviceId();
    const res = await fetch("/api/ponto/punch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee.id,
        qrId: ponto.qrId,
        type: employee.punchType,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        accuracy: geo?.accuracy ?? null,
        deviceId,
        punchToken: punchToken ?? null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === "geo_blocked") {
        setGeoBlocked({ distance: body.distance, radius: body.radius });
        setStep("geo-blocked");
      } else if (body.error === "device_unauthorized") {
        setStep("device-error");
      } else if (body.error === "webauthn_required" || body.error === "invalid_token") {
        setErrorMsg("Autenticação biométrica inválida ou expirada. Tente novamente.");
        setStep("error");
      } else {
        setErrorMsg("Erro ao registrar ponto. Tente novamente.");
        setStep("error");
      }
      return;
    }

    setStep("success");
  }, [ponto, employee, geo, punchToken]);

  const handleRegisterBiometrics = useCallback(async () => {
    if (!employee) return;
    setWebauthnWorking(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");

      const optRes = await fetch("/api/ponto/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id }),
      });
      if (!optRes.ok) throw new Error("Falha ao iniciar cadastro biométrico.");
      const opts = await optRes.json();

      const regResponse = await startRegistration({ optionsJSON: opts });

      const verifyRes = await fetch("/api/ponto/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, response: regResponse }),
      });
      if (!verifyRes.ok) throw new Error("Falha ao salvar biometria.");

      setRegisterSuccess(true);
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") {
        setErrorMsg(e.message ?? "Falha no cadastro biométrico.");
      }
    } finally {
      setWebauthnWorking(false);
    }
  }, [employee]);

  const reset = useCallback(() => {
    setPin("");
    setEmployee(null);
    setErrorMsg("");
    setPunchToken(null);
    setGeoBlocked(null);
    setRegisterSuccess(false);
    setWebauthnWorking(false);

    if (ponto?.geoLat != null && !geo) {
      setStep("geo-wait");
    } else if (geoBlocked) {
      setStep("geo-blocked");
    } else {
      setStep("pin");
      setTimeout(() => pinRef.current?.focus(), 100);
    }
  }, [ponto, geo, geoBlocked]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: bg }}>
      <div className="w-full max-w-sm space-y-6">

        {/* Brand header */}
        <div className="text-center space-y-3">
          {logoUrl && (
            <div className="flex justify-center">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto max-w-[160px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mx-auto shadow-md"
            style={{ backgroundColor: brand }}
          >
            <Clock className="h-7 w-7 text-white" />
          </div>
          {ponto && (
            <h1 className="text-lg font-semibold mt-1" style={{ color: brand }}>{ponto.title}</h1>
          )}
          <p className="text-sm text-gray-500 capitalize">{dateStr}</p>
          <p className="text-3xl font-bold tabular-nums text-gray-900">{timeStr}</p>
        </div>

        {/* Loading */}
        {(step === "loading" || step === "punching") && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: brand }} />
          </div>
        )}

        {/* Geo wait */}
        {step === "geo-wait" && (
          <div className="text-center space-y-3 py-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mx-auto">
              <MapPin className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-700">Verificando localização...</p>
            <p className="text-xs text-gray-400">Permita o acesso à sua localização para continuar.</p>
            <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
          </div>
        )}

        {/* Geo blocked */}
        {step === "geo-blocked" && geoBlocked && (
          <div className="text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 mx-auto">
              <MapPin className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-900">Fora da área autorizada</p>
              <p className="text-sm text-gray-500">
                Você está a <span className="font-semibold text-orange-600">{geoBlocked.distance}m</span> do local.
                {" "}Raio permitido: {geoBlocked.radius}m.
              </p>
            </div>
            <p className="text-xs text-gray-400">Aproxime-se do local de registro e tente novamente.</p>
          </div>
        )}

        {/* PIN Entry */}
        {(step === "pin" || step === "pin-loading") && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Seu PIN</label>
              <input
                ref={pinRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                disabled={step === "pin-loading"}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
                placeholder="• • • • • •"
                className="w-full rounded-xl border-2 bg-white px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 placeholder:text-gray-300 focus:outline-none transition-colors disabled:opacity-50"
                style={{ borderColor: pin.length > 0 ? brand : "#e5e7eb" }}
                onFocus={e => (e.target.style.borderColor = brand)}
                onBlur={e => (e.target.style.borderColor = pin.length > 0 ? brand : "#e5e7eb")}
              />
            </div>
            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4 || step === "pin-loading"}
              className="w-full rounded-xl py-4 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: brand }}
            >
              {step === "pin-loading"
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</>
                : "Continuar"
              }
            </button>
          </div>
        )}

        {/* Device error */}
        {step === "device-error" && (
          <div className="text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto">
              <Smartphone className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-900">Dispositivo não autorizado</p>
              <p className="text-sm text-gray-500">
                Este PIN está vinculado a outro smartphone. Contate o administrador para redefinir o vínculo.
              </p>
            </div>
          </div>
        )}

        {/* WebAuthn */}
        {step === "webauthn" && employee && (
          <div className="space-y-5">
            <div
              className="rounded-2xl border-2 bg-white p-5 text-center space-y-2 shadow-sm"
              style={{ borderColor: `rgba(${hexToRgb(brand)}, 0.2)` }}
            >
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: brand }}
              >
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-base font-semibold text-gray-900">{employee.name}</p>
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
                <Fingerprint className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-gray-700">Confirme com biometria</p>
              <p className="text-xs text-gray-400">Use sua digital ou Face ID para autenticar.</p>
            </div>

            <button
              onClick={handleWebAuthn}
              disabled={webauthnWorking}
              className="w-full rounded-xl py-4 text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: brand }}
            >
              {webauthnWorking
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguardando biometria...</>
                : <><Fingerprint className="h-4 w-4" /> Autenticar</>
              }
            </button>
            <button onClick={reset} className="w-full text-sm text-gray-400 underline underline-offset-2">
              Cancelar
            </button>
          </div>
        )}

        {/* Confirm punch */}
        {step === "confirming" && employee && (
          <div className="space-y-4">
            <div
              className="rounded-2xl border-2 bg-white p-5 text-center space-y-1 shadow-sm"
              style={{ borderColor: `rgba(${hexToRgb(brand)}, 0.2)` }}
            >
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold mb-2"
                style={{ backgroundColor: brand }}
              >
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-lg font-semibold text-gray-900">{employee.name}</p>
              {employee.role && <p className="text-xs text-gray-500">{employee.role}</p>}
              {employee.lastPunchedAt && employee.punchType === "out" && (
                <p className="text-xs text-gray-400 mt-2">
                  Entrada às {new Date(employee.lastPunchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {punchToken && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Identidade verificada</span>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full rounded-xl py-5 text-base font-bold text-white flex items-center justify-center gap-2.5 shadow-sm"
              style={{ backgroundColor: employee.punchType === "in" ? "#16a34a" : "#f97316" }}
            >
              {employee.punchType === "in"
                ? <><LogIn className="h-5 w-5" /> Registrar Entrada</>
                : <><LogOut className="h-5 w-5" /> Registrar Saída</>
              }
            </button>
            <button onClick={reset} className="w-full text-sm text-gray-400 underline underline-offset-2">
              Não sou eu
            </button>
          </div>
        )}

        {/* Success */}
        {step === "success" && employee && (
          <div className="space-y-4 text-center">
            <div
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto shadow-sm"
              style={{
                backgroundColor: employee.punchType === "in" ? "#dcfce7" : "#ffedd5",
                color: employee.punchType === "in" ? "#16a34a" : "#f97316",
              }}
            >
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-gray-900">
                {employee.punchType === "in" ? "Entrada registrada!" : "Saída registrada!"}
              </p>
              <p className="text-sm text-gray-500">{employee.name} · {timeStr}</p>
            </div>

            {/* Offer biometric registration on first device bind */}
            {employee.deviceFirstBind && !registerSuccess && (
              <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <Fingerprint className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Ativar biometria?</p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      Nas próximas vezes, confirme com digital ou Face ID para mais segurança.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRegisterBiometrics}
                  disabled={webauthnWorking}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold text-white bg-indigo-600 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {webauthnWorking
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguardando...</>
                    : <><Fingerprint className="h-4 w-4" /> Cadastrar biometria</>
                  }
                </button>
              </div>
            )}
            {registerSuccess && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <ShieldCheck className="h-4 w-4" />
                Biometria cadastrada com sucesso!
              </div>
            )}

            <button
              onClick={reset}
              className="w-full rounded-xl border-2 bg-white py-3 text-sm font-medium text-gray-700 shadow-sm"
              style={{ borderColor: `rgba(${hexToRgb(brand)}, 0.25)` }}
            >
              Registrar outro funcionário
            </button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="space-y-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <p className="text-sm text-gray-500">{errorMsg}</p>
            {ponto && (
              <button
                onClick={reset}
                className="w-full rounded-xl border-2 bg-white py-3 text-sm font-medium text-gray-700 shadow-sm"
                style={{ borderColor: `rgba(${hexToRgb(brand)}, 0.25)` }}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-300">ZRCODE · Registro de Presença</p>
      </div>
    </div>
  );
}
