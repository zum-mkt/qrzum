import { useState } from "react";
import type { FlowDefinition, FlowBlock } from "@/lib/flow";
import { GpsGate } from "./runner/GpsGate";
import { PasswordGate } from "./runner/PasswordGate";
import { FormBlock } from "./runner/FormBlock";
import { MessageBlock } from "./runner/MessageBlock";

type Props = {
  qrId: string;
  title: string;
  definition: FlowDefinition;
};

type AnswerMap = Record<string, Record<string, unknown>>;

export function FlowRunner({ qrId, title, definition }: Props) {
  const blocks = definition.blocks;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const advance = () => setStep((s) => s + 1);

  const handleFormSubmit = async (blockId: string, blockAnswers: Record<string, unknown>) => {
    const merged: AnswerMap = { ...answers, [blockId]: blockAnswers };
    setAnswers(merged);

    const isLastBlock = step >= blocks.length - 1;
    if (isLastBlock || blocks[step + 1]?.type !== "form") {
      await submitAll(merged);
    } else {
      advance();
    }
  };

  const submitAll = async (finalAnswers: AnswerMap) => {
    setSubmitting(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      if (geo) { lat = geo.lat; lng = geo.lng; }
      else {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }),
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* fine, optional */ }
      }

      await fetch("/api/public/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: qrId, answers: finalAnswers, lat, lng }),
      });
    } catch { /* non-fatal */ }
    setSubmitting(false);
    setDone(true);
    advance();
  };

  if (blocks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Este fluxo não tem blocos configurados.
      </div>
    );
  }

  if (step >= blocks.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-lg font-semibold">Concluído!</p>
        <p className="text-sm text-muted-foreground">Obrigado pela sua resposta.</p>
      </div>
    );
  }

  const block: FlowBlock = blocks[step];
  const total = blocks.length;

  const renderBlock = () => {
    switch (block.type) {
      case "gps_gate":
        return (
          <GpsGate
            config={block.config}
            onPass={() => {
              if (block.config.lat && block.config.lng) {
                setGeo({ lat: block.config.lat, lng: block.config.lng });
              }
              advance();
            }}
          />
        );
      case "password_gate":
        return <PasswordGate config={block.config} onPass={advance} />;
      case "form":
        return (
          <FormBlock
            config={block.config}
            onSubmit={(a) => handleFormSubmit(block.id, a)}
            loading={submitting}
          />
        );
      case "message":
        return <MessageBlock config={block.config} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {total > 1 && (
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Passo {step + 1} de {total}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      )}
      {renderBlock()}
    </div>
  );
}
