import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Legacy redirect path. All existing QR codes resolve via /q/<shortId>;
 * we keep that URL stable but forward to the new pixel-aware redirector.
 */
export const Route = createFileRoute("/q/$shortId")({
  component: LegacyRedirector,
});

function LegacyRedirector() {
  const { shortId } = Route.useParams();
  useEffect(() => {
    window.location.replace(`/r/${shortId}`);
  }, [shortId]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}