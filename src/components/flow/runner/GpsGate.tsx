import { useEffect, useState } from "react";
import { MapPin, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haversineMeters, type GpsGateConfig } from "@/lib/flow";

type Props = { config: GpsGateConfig; onPass: () => void };

type State = "requesting" | "checking" | "blocked" | "error";

export function GpsGate({ config, onPass }: Props) {
  const [state, setState] = useState<State>("requesting");
  const [distance, setDistance] = useState<number | null>(null);

  const check = () => {
    setState("requesting");
    if (!navigator.geolocation) {
      setState("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState("checking");
        const dist = haversineMeters(
          pos.coords.latitude, pos.coords.longitude,
          config.lat, config.lng,
        );
        setDistance(Math.round(dist));
        if (dist <= config.radius_m) {
          onPass();
        } else {
          setState("blocked");
        }
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  useEffect(() => { check(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      {state === "requesting" || state === "checking" ? (
        <>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div>
            <p className="font-semibold">Verificando localização…</p>
            <p className="mt-1 text-sm text-muted-foreground">Autorize o acesso à localização quando solicitado.</p>
          </div>
        </>
      ) : state === "blocked" ? (
        <>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">
              {config.error_message || "Você não está na localização correta."}
            </p>
            {distance !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                Você está a ~{distance} m (necessário ≤{config.radius_m} m).
              </p>
            )}
          </div>
          <Button variant="outline" onClick={check}>Tentar novamente</Button>
        </>
      ) : (
        <>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
            <MapPin className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="font-semibold">Não foi possível obter a localização.</p>
            <p className="mt-1 text-sm text-muted-foreground">Verifique as permissões do navegador.</p>
          </div>
          <Button variant="outline" onClick={check}>Tentar novamente</Button>
        </>
      )}
    </div>
  );
}
