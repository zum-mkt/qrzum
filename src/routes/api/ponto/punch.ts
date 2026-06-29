import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ponto/punch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          employeeId?: string;
          qrId?: string;
          type?: "in" | "out";
          lat?: number | null;
          lng?: number | null;
          accuracy?: number | null;
        };
        try {
          body = await request.json() as typeof body;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        if (!body.employeeId || !body.qrId || !body.type) {
          return new Response("Missing required fields", { status: 400 });
        }
        if (body.type !== "in" && body.type !== "out") {
          return new Response("Invalid type", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verify employee belongs to the QR owner (security check)
        const { data: qr } = await supabaseAdmin
          .from("qr_links")
          .select("user_id")
          .eq("id", body.qrId)
          .eq("type", "ponto")
          .maybeSingle();

        if (!qr) return new Response("QR not found", { status: 404 });

        const { data: emp } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("id", body.employeeId)
          .eq("user_id", qr.user_id)
          .eq("active", true)
          .maybeSingle();

        if (!emp) return new Response("Employee not found", { status: 404 });

        const ip = request.headers.get("CF-Connecting-IP") ??
                   request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? null;

        const { error } = await supabaseAdmin.from("time_punches").insert({
          employee_id: body.employeeId,
          qr_id: body.qrId,
          type: body.type,
          lat: body.lat ?? null,
          lng: body.lng ?? null,
          accuracy: body.accuracy ?? null,
          ip,
        });

        if (error) return new Response(error.message, { status: 500 });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
