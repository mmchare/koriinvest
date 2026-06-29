import { createFileRoute } from "@tanstack/react-router";

const LOGO_PATH = "/__l5e/assets-v1/8671dbff-55d4-4fbe-8e7d-514a28d53898/kri-logo.png";

export const Route = createFileRoute("/api/public/token-metadata")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const body = {
          name: "KORI",
          symbol: "KRI",
          description:
            "KORI ($KRI) — token utilitaire de l'écosystème KORI Invest. Récompenses, vaults de staking et roue de la fortune pour l'Afrique de l'Ouest et Centrale.",
          image: origin + LOGO_PATH,
          external_url: "https://koriinvest.lovable.app",
          attributes: [
            { trait_type: "Network", value: "Solana" },
            { trait_type: "Ecosystem", value: "KORI" },
          ],
          properties: {
            files: [{ uri: origin + LOGO_PATH, type: "image/png" }],
            category: "image",
          },
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
