import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Lock, ClipboardList, MessageSquare,
  GripVertical, Trash2, ChevronDown, ChevronRight, Plus, Save,
} from "lucide-react";
import { saveFlowDefinition } from "@/lib/flow.functions";
import {
  type FlowDefinition, type FlowBlock, type FlowBlockType,
  type FlowNotification, BLOCK_META, defaultBlock,
} from "@/lib/flow";
import { GpsGateConfig } from "./config/GpsGateConfig";
import { PasswordGateConfig } from "./config/PasswordGateConfig";
import { FormBuilderConfig } from "./config/FormBuilderConfig";
import { MessageConfig } from "./config/MessageConfig";
import { NotificationsConfig } from "./config/NotificationsConfig";

const BLOCK_ICONS: Record<FlowBlockType, React.ElementType> = {
  gps_gate: MapPin,
  password_gate: Lock,
  form: ClipboardList,
  message: MessageSquare,
};

const PALETTE_TYPES: FlowBlockType[] = ["gps_gate", "password_gate", "form", "message"];

type Props = { qrId: string; initialDefinition: FlowDefinition };

export function FlowBuilder({ qrId, initialDefinition }: Props) {
  const qc = useQueryClient();
  const [definition, setDefinition] = useState<FlowDefinition>(initialDefinition);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { blocks, notifications } = definition;

  const setBlocks = (next: FlowBlock[]) =>
    setDefinition((d) => ({ ...d, blocks: next }));

  const setNotifications = (next: FlowNotification[]) =>
    setDefinition((d) => ({ ...d, notifications: next }));

  const addBlock = (type: FlowBlockType) => {
    const block = defaultBlock(type);
    setBlocks([...blocks, block]);
    setSelectedId(block.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const arr = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setBlocks(arr);
  };

  const updateBlockConfig = (id: string, config: FlowBlock["config"]) =>
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, config } as FlowBlock) : b)));

  const save = async () => {
    setSaving(true);
    try {
      await saveFlowDefinition({ data: { qrId, definition } });
      qc.invalidateQueries({ queryKey: ["flow-builder", qrId] });
      toast.success("Fluxo salvo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {blocks.length === 0 ? "Adicione blocos ao fluxo →" : `${blocks.length} bloco${blocks.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? "Salvando…" : "Salvar fluxo"}
        </Button>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left: palette + block list */}
        <div className="space-y-4">
          {/* Palette */}
          <Card className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blocos</p>
            <div className="space-y-1">
              {PALETTE_TYPES.map((type) => {
                const Icon = BLOCK_ICONS[type];
                const meta = BLOCK_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium leading-none">{meta.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{meta.description}</p>
                    </div>
                    <Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Block list */}
          {blocks.length > 0 && (
            <Card className="p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sequência</p>
              <div className="space-y-1">
                {blocks.map((block, i) => {
                  const Icon = BLOCK_ICONS[block.type];
                  const isSelected = block.id === selectedId;
                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedId(isSelected ? null : block.id)}
                      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate text-xs font-medium">{BLOCK_META[block.type].label}</span>
                      <div className="hidden items-center gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px]">↑</button>
                        <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px]">↓</button>
                        <button onClick={() => removeBlock(block.id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right: config panel */}
        <Card className="p-4">
          <Tabs defaultValue="config">
            <TabsList className="mb-4">
              <TabsTrigger value="config">Configurar bloco</TabsTrigger>
              <TabsTrigger value="notifications">Webhooks</TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              {!selectedBlock ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Selecione um bloco na lista para configurá-lo.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center gap-2">
                    {(() => { const Icon = BLOCK_ICONS[selectedBlock.type]; return <Icon className="h-4 w-4 text-primary" />; })()}
                    <p className="text-sm font-semibold">{BLOCK_META[selectedBlock.type].label}</p>
                  </div>
                  {selectedBlock.type === "gps_gate" && (
                    <GpsGateConfig config={selectedBlock.config} onChange={(c) => updateBlockConfig(selectedBlock.id, c)} />
                  )}
                  {selectedBlock.type === "password_gate" && (
                    <PasswordGateConfig config={selectedBlock.config} onChange={(c) => updateBlockConfig(selectedBlock.id, c)} />
                  )}
                  {selectedBlock.type === "form" && (
                    <FormBuilderConfig config={selectedBlock.config} onChange={(c) => updateBlockConfig(selectedBlock.id, c)} />
                  )}
                  {selectedBlock.type === "message" && (
                    <MessageConfig config={selectedBlock.config} onChange={(c) => updateBlockConfig(selectedBlock.id, c)} />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsConfig notifications={notifications} onChange={setNotifications} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
