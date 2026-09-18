import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sugestao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { responderSugestao } = await import("@/lib/sugestao.server");
        return responderSugestao(request);
      },
    },
  },
});
