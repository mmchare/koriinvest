import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// All Solana SDK calls happen inside handlers to keep them off the client bundle.

export const getMyWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { Keypair } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const { encryptSecret } = await import("./solana/crypto.server");
    const { loadSolanaConfigVia, getConnection, pubkey } = await import("./solana/config.server");

    const { data: profile, error: profErr } = await context.supabase
      .from("profiles")
      .select("solana_pubkey")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!profile) throw new Error("Profil introuvable");

    let solanaPubkey = profile.solana_pubkey;
    if (!solanaPubkey) {
      const kp = Keypair.generate();
      const encrypted = encryptSecret(bs58.encode(kp.secretKey));
      const { data: ensured, error } = await context.supabase.rpc("ensure_my_solana_wallet" as never, {
        _pubkey: kp.publicKey.toBase58(),
        _secret_encrypted: encrypted,
      } as never);
      if (error) throw new Error(error.message);
      solanaPubkey = ensured as unknown as string;
    }

    const cfg = await loadSolanaConfigVia(context.supabase as never);
    let onchainBalance = 0;
    if (cfg.mintAddress) {
      try {
        const conn = getConnection(cfg.rpcUrl);
        const resp = await conn.getParsedTokenAccountsByOwner(pubkey(solanaPubkey), {
          mint: pubkey(cfg.mintAddress),
        });
        for (const a of resp.value) {
          const ui = a.account.data.parsed.info.tokenAmount.uiAmount as number | null;
          if (ui) onchainBalance += ui;
        }
      } catch (e) {
        console.warn("onchain balance read failed", e);
      }
    }

    return {
      pubkey: solanaPubkey,
      network: cfg.network,
      mint: cfg.mintAddress,
      onchain_balance: onchainBalance,
      configured: !!cfg.mintAddress,
    };
  });

const convertSchema = z.object({ amount: z.number().positive() });

export const convertToOnchain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => convertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { loadSolanaConfigVia, getConnection, loadTreasuryKeypair, pubkey } = await import("./solana/config.server");
    const { getOrCreateAssociatedTokenAccount, transfer } = await import("@solana/spl-token");

    const cfg = await loadSolanaConfigVia(context.supabase as never);
    if (!cfg.mintAddress) throw new Error("Token $KRI pas encore déployé.");

    const { data: profile } = await context.supabase
      .from("profiles").select("solana_pubkey").eq("id", context.userId).maybeSingle();
    if (!profile?.solana_pubkey) throw new Error("Wallet Solana manquant. Ouvre l'onglet Wallet d'abord.");

    // 1. Debit balance + create PENDING tx (self-scoped RPC, includes rate limit)
    const { data: initOut, error: initErr } = await context.supabase.rpc(
      "my_initiate_onchain_withdraw" as never,
      { _amount: data.amount } as never,
    );
    if (initErr) throw new Error(initErr.message);
    const init = initOut as unknown as { ok: boolean; error?: string; tx_id?: string; min?: number };
    if (!init.ok) {
      if (init.error === "insufficient") throw new Error("Solde insuffisant");
      if (init.error === "min_amount") throw new Error(`Minimum ${init.min} KRI`);
      if (init.error === "rate_limited") throw new Error("Trop de demandes. Attends quelques minutes.");
      if (init.error === "no_wallet") throw new Error("Wallet Solana manquant.");
      throw new Error(init.error ?? "Erreur");
    }

    // 2. SPL transfer
    try {
      const treasury = await loadTreasuryKeypair();
      const conn = getConnection(cfg.rpcUrl);
      const mint = pubkey(cfg.mintAddress);
      const userPub = pubkey(profile.solana_pubkey);

      const treasuryAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, treasury.publicKey);
      const userAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, userPub);

      const lamports = BigInt(Math.round(data.amount * 10 ** cfg.decimals));
      const sig = await transfer(conn, treasury, treasuryAta.address, userAta.address, treasury, lamports);

      await context.supabase.rpc("my_confirm_onchain_withdraw" as never, { _tx: init.tx_id, _signature: sig } as never);
      return { ok: true, signature: sig };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Échec on-chain";
      await context.supabase.rpc("my_refund_onchain_withdraw" as never, { _tx: init.tx_id, _reason: msg.slice(0, 240) } as never);
      throw new Error("Transfert échoué : " + msg);
    }
  });


// ============ ADMIN FUNCTIONS ============

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("has_role" as never, { _user_id: userId, _role: "admin" } as never);
  if (!data) throw new Error("Forbidden");
}

export const adminGetSolanaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { loadSolanaConfig, getConnection, pubkey } = await import("./solana/config.server");
    const cfg = await loadSolanaConfig();
    let solBalance = 0;
    let mintSupply = 0;
    let treasuryKriBalance = 0;
    let treasuryConfigured = !!cfg.treasuryPubkey;
    if (cfg.treasuryPubkey) {
      try {
        const conn = getConnection(cfg.rpcUrl);
        const lamports = await conn.getBalance(pubkey(cfg.treasuryPubkey));
        solBalance = lamports / 1e9;
        if (cfg.mintAddress) {
          const supply = await conn.getTokenSupply(pubkey(cfg.mintAddress));
          mintSupply = supply.value.uiAmount ?? 0;
          const accs = await conn.getParsedTokenAccountsByOwner(pubkey(cfg.treasuryPubkey), {
            mint: pubkey(cfg.mintAddress),
          });
          for (const a of accs.value) {
            const ui = a.account.data.parsed.info.tokenAmount.uiAmount as number | null;
            if (ui) treasuryKriBalance += ui;
          }
        }
      } catch (e) {
        console.warn("solana status read failed", e);
      }
    }
    return { ...cfg, treasuryConfigured, solBalance, mintSupply, treasuryKriBalance };
  });

export const adminSetupTreasury = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { Keypair } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const { encryptSecret } = await import("./solana/crypto.server");

    const { data: existing } = await supabaseAdmin
      .from("app_config").select("value").eq("key", "kri_treasury_pubkey").maybeSingle();
    if (existing?.value) throw new Error("Treasury déjà configurée");

    const kp = Keypair.generate();
    const pub = kp.publicKey.toBase58();
    const encSecret = encryptSecret(bs58.encode(kp.secretKey));

    await supabaseAdmin.from("app_config").upsert([
      { key: "kri_treasury_pubkey", value: pub },
      { key: "kri_treasury_secret_encrypted", value: encSecret },
    ]);
    return { ok: true, pubkey: pub };
  });

export const adminAirdropDevnet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { loadSolanaConfig, getConnection, pubkey } = await import("./solana/config.server");
    const cfg = await loadSolanaConfig();
    if (cfg.network !== "devnet") throw new Error("Airdrop devnet uniquement");
    if (!cfg.treasuryPubkey) throw new Error("Treasury manquante");
    const conn = getConnection(cfg.rpcUrl);
    const sig = await conn.requestAirdrop(pubkey(cfg.treasuryPubkey), 2 * 1e9);
    await conn.confirmTransaction(sig, "confirmed");
    return { ok: true, signature: sig };
  });

const deploySchema = z.object({
  initial_supply: z.number().int().positive().max(10_000_000_000),
});

export const adminDeployMint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deploySchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadSolanaConfig, getConnection, loadTreasuryKeypair } = await import("./solana/config.server");
    const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = await import("@solana/spl-token");

    const cfg = await loadSolanaConfig();
    if (cfg.mintAddress) throw new Error("Mint déjà déployée: " + cfg.mintAddress);
    const treasury = await loadTreasuryKeypair();
    const conn = getConnection(cfg.rpcUrl);

    const bal = await conn.getBalance(treasury.publicKey);
    if (bal < 1e8) throw new Error("Treasury sous-financée (" + (bal/1e9).toFixed(3) + " SOL). Airdrop d'abord.");

    // Create mint with treasury as authority
    const mint = await createMint(conn, treasury, treasury.publicKey, treasury.publicKey, cfg.decimals);

    // Create treasury ATA + mint initial supply
    const ata = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, treasury.publicKey);
    const amount = BigInt(data.initial_supply) * BigInt(10 ** cfg.decimals);
    await mintTo(conn, treasury, mint, ata.address, treasury, amount);

    await supabaseAdmin.from("app_config").upsert({ key: "kri_mint_address", value: mint.toBase58() });
    return { ok: true, mint: mint.toBase58(), supply: data.initial_supply };
  });

// ============ METAPLEX METADATA ============

const metadataSchema = z.object({
  name: z.string().min(1).max(32).default("KORI"),
  symbol: z.string().min(1).max(10).default("KRI"),
  uri: z.string().url().max(200),
});

export const adminSetTokenMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => metadataSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { loadSolanaConfig, loadTreasuryKeypair } = await import("./solana/config.server");
    const { createUmi } = await import("@metaplex-foundation/umi-bundle-defaults");
    const {
      mplTokenMetadata,
      createV1,
      updateV1,
      fetchMetadataFromSeeds,
      TokenStandard,
    } = await import("@metaplex-foundation/mpl-token-metadata");
    const { keypairIdentity, publicKey, percentAmount, some, none } = await import(
      "@metaplex-foundation/umi"
    );

    const cfg = await loadSolanaConfig();
    if (!cfg.mintAddress) throw new Error("Mint $KRI non déployée");
    const treasury = await loadTreasuryKeypair();

    const umi = createUmi(cfg.rpcUrl).use(mplTokenMetadata());
    const umiKp = umi.eddsa.createKeypairFromSecretKey(treasury.secretKey);
    umi.use(keypairIdentity(umiKp));
    const mintPk = publicKey(cfg.mintAddress);

    // Check if metadata already exists
    let exists = false;
    try {
      await fetchMetadataFromSeeds(umi, { mint: mintPk });
      exists = true;
    } catch {
      exists = false;
    }

    let signature: string;
    if (!exists) {
      const builder = createV1(umi, {
        mint: mintPk,
        authority: umi.identity,
        name: data.name,
        symbol: data.symbol,
        uri: data.uri,
        sellerFeeBasisPoints: percentAmount(0),
        tokenStandard: TokenStandard.Fungible,
      });
      const res = await builder.sendAndConfirm(umi);
      signature = Buffer.from(res.signature).toString("base64");
    } else {
      const res = await updateV1(umi, {
        mint: mintPk,
        authority: umi.identity,
        data: some({
          name: data.name,
          symbol: data.symbol,
          uri: data.uri,
          sellerFeeBasisPoints: 0,
          creators: none(),
        }),
      }).sendAndConfirm(umi);
      signature = Buffer.from(res.signature).toString("base64");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_config").upsert([
      { key: "kri_metadata_uri", value: data.uri },
      { key: "kri_metadata_name", value: data.name },
      { key: "kri_metadata_symbol", value: data.symbol },
    ]);

    return { ok: true, action: exists ? "updated" : "created", signature };
  });

