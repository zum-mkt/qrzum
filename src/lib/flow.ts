// ─── Block types ─────────────────────────────────────────────────────────────

export type FlowBlockType = "gps_gate" | "password_gate" | "form" | "message";

export type GpsGateConfig = {
  lat: number;
  lng: number;
  radius_m: number;
  error_message?: string;
};

export type PasswordGateConfig = {
  /** SHA-256 hex digest of the plaintext password */
  password_hash: string;
  hint?: string;
};

export type FormFieldType = "text" | "textarea" | "choice" | "rating" | "checkbox_list";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** For choice / checkbox_list */
  options?: string[];
  /** For choice: allow multiple selections */
  multiple?: boolean;
  /** For rating: max stars (default 5) */
  max?: number;
};

export type FormConfig = {
  title?: string;
  submit_label?: string;
  fields: FormField[];
};

export type MessageConfig = {
  title: string;
  body?: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
};

export type FlowBlock =
  | { id: string; type: "gps_gate"; config: GpsGateConfig }
  | { id: string; type: "password_gate"; config: PasswordGateConfig }
  | { id: string; type: "form"; config: FormConfig }
  | { id: string; type: "message"; config: MessageConfig };

// ─── Notifications ────────────────────────────────────────────────────────────

export type FlowNotification = {
  webhook_url: string;
  /** Which events trigger this webhook */
  on: ("submit" | "view")[];
};

// ─── Full definition ──────────────────────────────────────────────────────────

export type FlowDefinition = {
  blocks: FlowBlock[];
  notifications: FlowNotification[];
};

export const emptyFlow = (): FlowDefinition => ({ blocks: [], notifications: [] });

// ─── Block metadata (labels, icons, defaults) ─────────────────────────────────

export const BLOCK_META: Record<FlowBlockType, { label: string; description: string }> = {
  gps_gate:      { label: "Validação GPS",   description: "Exige que o scanner esteja dentro de um raio geográfico" },
  password_gate: { label: "Validação Senha", description: "Exige uma senha antes de prosseguir" },
  form:          { label: "Formulário",      description: "Coleta respostas: texto, múltipla escolha, avaliação…" },
  message:       { label: "Mensagem",        description: "Tela final com título, texto e botão de ação" },
};

export function defaultBlock(type: FlowBlockType): FlowBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "gps_gate":
      return { id, type, config: { lat: 0, lng: 0, radius_m: 100, error_message: "Você não está na localização correta." } };
    case "password_gate":
      return { id, type, config: { password_hash: "", hint: "" } };
    case "form":
      return { id, type, config: { title: "Formulário", submit_label: "Enviar", fields: [] } };
    case "message":
      return { id, type, config: { title: "Obrigado!", body: "Sua resposta foi registrada." } };
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
