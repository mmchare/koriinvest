import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";

export type SolanaConfig = {
  network: "devnet" | "mainnet-beta";
  rpcUrl: string;
  mintAddress: string;
  treasuryPubkey: string;
  decimals: number;
  metadataUri: string;
  metadataName: string;
  metadataSymbol: string;
};

export async function loadSolanaConfig(): Promise<SolanaConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_config").select("key,value");
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.key, row.value ?? "");
  const network = (map.get("solana_network") || "devnet") as "devnet" | "mainnet-beta";
  return {
    network,
    rpcUrl: map.get("solana_rpc_url") || clusterApiUrl(network),
    mintAddress: map.get("kri_mint_address") || "",
    treasuryPubkey: map.get("kri_treasury_pubkey") || "",
    decimals: Number(map.get("kri_decimals") || 4),
    metadataUri: map.get("kri_metadata_uri") || "",
    metadataName: map.get("kri_metadata_name") || "",
    metadataSymbol: map.get("kri_metadata_symbol") || "",
  };
}


export function getConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Loads the treasury keypair: prefers KORI_TREASURY_SECRET_KEY env var (base58),
 * otherwise reads encrypted secret from app_config and decrypts.
 */
export async function loadTreasuryKeypair(): Promise<Keypair> {
  const envSecret = process.env.KORI_TREASURY_SECRET_KEY;
  if (envSecret && envSecret.length > 10) {
    return Keypair.fromSecretKey(bs58.decode(envSecret));
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", "kri_treasury_secret_encrypted")
    .maybeSingle();
  if (!data?.value) throw new Error("Treasury non configurée. Lance le setup Solana dans l'admin.");
  const { decryptSecret } = await import("./crypto.server");
  const decoded = decryptSecret(data.value);
  return Keypair.fromSecretKey(bs58.decode(decoded));
}

export function pubkey(s: string): PublicKey {
  return new PublicKey(s);
}

/**
 * Loads the public (non-secret) Solana config through an RLS-safe RPC.
 * Works without the service role key (e.g. self-hosted deployments).
 */
export async function loadSolanaConfigVia(client: {
  rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>;
}): Promise<SolanaConfig> {
  const { data } = await client.rpc("get_solana_public_config");
  const map = (data ?? {}) as Record<string, string>;
  const network = ((map["solana_network"] || "devnet") as "devnet" | "mainnet-beta");
  return {
    network,
    rpcUrl: map["solana_rpc_url"] || clusterApiUrl(network),
    mintAddress: map["kri_mint_address"] || "",
    treasuryPubkey: map["kri_treasury_pubkey"] || "",
    decimals: Number(map["kri_decimals"] || 4),
    metadataUri: map["kri_metadata_uri"] || "",
    metadataName: map["kri_metadata_name"] || "",
    metadataSymbol: map["kri_metadata_symbol"] || "",
  };
}
