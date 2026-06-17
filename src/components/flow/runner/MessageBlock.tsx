import type { MessageConfig } from "@/lib/flow";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function MessageBlock({ config }: { config: MessageConfig }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      {config.image_url ? (
        <img src={config.image_url} alt="" className="h-32 w-32 rounded-xl object-cover" />
      ) : (
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold">{config.title}</h2>
        {config.body && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{config.body}</p>}
      </div>
      {config.cta_url && config.cta_label && (
        <a href={config.cta_url} target="_blank" rel="noreferrer">
          <Button>{config.cta_label}</Button>
        </a>
      )}
    </div>
  );
}
