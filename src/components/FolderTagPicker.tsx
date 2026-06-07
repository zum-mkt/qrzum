import { useState, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { fetchFolders, fetchTags, createFolder, getOrCreateTag, type Tag } from "@/lib/organize";
import { toast } from "sonner";

interface Props {
  folderId: string | null;
  onFolderChange: (v: string | null) => void;
  tagIds: string[];
  onTagsChange: (ids: string[]) => void;
}

export function FolderTagPicker({ folderId, onFolderChange, tagIds, onTagsChange }: Props) {
  const qc = useQueryClient();
  const { data: folders = [] } = useQuery({ queryKey: ["folders"], queryFn: fetchFolders });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });

  const [newFolderName, setNewFolderName] = useState("");
  const [newTagInput, setNewTagInput] = useState("");

  const addFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const f = await createFolder(newFolderName.trim());
      setNewFolderName("");
      qc.invalidateQueries({ queryKey: ["folders"] });
      onFolderChange(f.id);
      toast.success("Pasta criada");
    } catch (e: any) { toast.error(e.message); }
  };

  const addTag = async () => {
    const v = newTagInput.trim();
    if (!v) return;
    try {
      const tag = await getOrCreateTag(v);
      setNewTagInput("");
      qc.invalidateQueries({ queryKey: ["tags"] });
      if (!tagIds.includes(tag.id)) onTagsChange([...tagIds, tag.id]);
    } catch (e: any) { toast.error(e.message); }
  };

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  };

  const selectedTags: Tag[] = tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t);

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Pasta</Label>
        <select
          value={folderId ?? ""}
          onChange={(e) => onFolderChange(e.target.value || null)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Sem pasta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nova pasta..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFolder())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addFolder}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex min-h-10 flex-wrap gap-1 rounded-md border border-input bg-background p-2">
          {selectedTags.length === 0 && (
            <span className="text-xs text-muted-foreground">Nenhuma tag</span>
          )}
          {selectedTags.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1">
              {t.name}
              <button type="button" onClick={() => onTagsChange(tagIds.filter((x) => x !== t.id))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Nova tag (Enter)..."
            onKeyDown={onTagKey}
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags
              .filter((t) => !tagIds.includes(t.id))
              .slice(0, 12)
              .map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => onTagsChange([...tagIds, t.id])}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:border-primary"
                >
                  + {t.name}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
