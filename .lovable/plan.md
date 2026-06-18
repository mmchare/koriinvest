# KORI ($KRI) — Plan de construction

Application Fintech Web3 mobile-first (XAF/XOF) avec dépôts/retraits Mobile Money, Roue de la Fortune, Coffres de staking, parrainage 5%/3%, et back-office admin.

## Stack adaptée à Lovable

Le cahier des charges propose Flutter + Node + PostgreSQL + Solana. Sur Lovable je vais livrer l'équivalent web :
- **Frontend mobile-first** : TanStack Start + React + Tailwind v4 (design rouge vif KORI, optimisé 390px, "Add to home screen" PWA-like).
- **Backend** : Lovable Cloud (Postgres + Auth + server functions) au lieu de Node/Express. Schéma SQL identique à celui du cahier des charges, adapté aux conventions Lovable (RLS, `user_roles`, GRANTs).
- **Auth** : Email + mot de passe (Lovable Cloud n'offre pas de login par téléphone sans OTP natif). Le numéro de téléphone reste un champ requis stocké sur `profiles`. Pas d'OTP. La biométrie passera par WebAuthn dans une itération ultérieure (mentionnée mais non bloquante).
- **Blockchain / wallets Solana** : hors scope V1. Le champ `solana_wallet_pubkey` reste dans le schéma mais reste nul. Le solde KORI est géré comme une balance interne (custodial virtuel). À brancher plus tard sur Privy + SPL token.
- **NotchPay** : intégration réelle nécessite une clé API. En V1 je pose le flux UI + une server function `initiate_deposit` qui crée une transaction `PENDING`. Quand tu auras la clé NotchPay, on branchera le webhook `/api/public/notchpay-webhook`.

## V1 — Périmètre livré

### Design system
- Palette rouge vif KORI (#E11D2E ou proche) sur blanc, tokens sémantiques dans `src/styles.css`.
- Typo moderne (Inter + display), composants shadcn customisés (variant `hero` rouge).
- Layout mobile-first (max-w-md centré), bottom nav 4 onglets : Accueil · Coffre · Roue · Profil.

### Auth (`/auth`)
- Inscription : téléphone (avec sélecteur indicatif XAF/XOF — CM, CI, SN, BJ, TG, BF, ML, CG, GA…), mot de passe, nom d'affichage, code parrainage optionnel.
- Connexion : téléphone + mot de passe.
- Sous le capot : on synthétise un email `+{phone}@kori.app` pour Supabase Auth (transparent pour l'utilisateur).

### Accueil (`/`)
- Header avec nom + avatar.
- Carte solde "magique" : affichage XAF par défaut, **flip 3D au clic** → KORI équivalent.
- Boutons rouges [Dépôt] [Retrait] côte à côte.
- Raccourcis : Roue de la Fortune, Coffre-fort, Parrainage.
- Historique des dernières transactions.

### Dépôt (`/deposit`)
- Saisie montant fiat + numéro Mobile Money.
- Estimation KORI en temps réel (taux fixe configurable, ex. 1 KRI = 10 XAF).
- Bouton "Payer via NotchPay" → crée tx PENDING + écran de confirmation (mock en V1).

### Retrait (`/withdraw`)
- Saisie montant fiat + numéro bénéficiaire.
- Gèle l'équivalent KORI immédiatement (server function transactionnelle).
- Crée tx PENDING visible côté admin.

### Roue de la Fortune (`/wheel`)
- Roue animée (8 segments : bonus KRI, multiplicateurs, "Réessayez").
- Limite 24h **serveur** via `wheel_logs`.
- Gain crédité + commission 3% au parrain (server function atomique).

### Coffre-fort (`/vault`)
- Liste des coffres actifs avec compte à rebours.
- Création : choix 7j (+1.5%), 15j (+4%), 30j (+10%).
- Cron / vérification à l'ouverture : coffres échus distribuent profit + 3% au parrain.

### Parrainage (`/referral`)
- Lien unique `https://app.kori/r/{code}` + bouton "Partager sur WhatsApp" (deep link `wa.me`).
- Stats : nb filleuls, commissions cumulées.

### Profil (`/profile`)
- Infos compte, déconnexion.

### Back-office admin (`/admin`)
- Protégé par rôle `admin` (table `user_roles` + `has_role()`).
- Onglet **Retraits** : liste PENDING, boutons Valider / Refuser (avec motif).
- Onglet **Finances** : KORI en circulation, KORI bloqués en coffres, volume dépôts/retraits.
- Onglet **Utilisateurs** : recherche, blocage compte.

## Schéma DB (adapté Lovable)

```text
profiles(id uuid PK→auth.users, phone_number unique, display_name,
         referral_code unique, referred_by uuid→profiles, kori_balance numeric,
         solana_wallet_pubkey, is_blocked bool, created_at)
user_roles(user_id, role app_role)  -- 'admin' | 'user'
vaults(id, user_id, amount_locked, duration_days, expected_profit,
       start_date, end_date, status, payout_processed bool)
transactions(id, user_id, type, amount_cfa, amount_kori, status,
             provider_tx_id, recipient_phone, admin_notes, created_at, updated_at)
wheel_logs(id, user_id, reward_type, reward_amount, played_at)
referral_commissions(id, parrain_id, filleul_id, source_type, source_id,
                     amount_kori, created_at)
app_config(key, value)  -- taux KRI/XAF, etc.
```

RLS : chaque user ne lit/écrit que ses propres lignes ; admins lisent tout. Toutes les opérations de solde passent par des server functions (`requireSupabaseAuth`) avec verrouillage de ligne pour garantir l'intégrité ACID.

## Sécurité
- Limite Roue : check serveur sur `wheel_logs.played_at > now() - 24h`.
- Commission parrain 5% : déclenchée **uniquement** par webhook NotchPay validé (en V1 par action admin "marquer dépôt comme payé" en attendant la clé NotchPay).
- Tous les mouvements de `kori_balance` dans une transaction SQL (`BEGIN; SELECT … FOR UPDATE; …; COMMIT;`) via RPC Postgres.
- Validation Zod sur toutes les entrées server function.

## Ce qui n'est PAS dans la V1 (à confirmer)
- Intégration NotchPay réelle (besoin clé API).
- Wallet Solana réel + token SPL $KRI (besoin Privy + déploiement on-chain).
- Biométrie WebAuthn.
- Notifications push.

Dis-moi si tu veux que je démarre la V1 telle quelle, ou si tu veux ajuster quelque chose (palette exacte, taux KRI/XAF de départ, pays prioritaires pour le sélecteur d'indicatif, premier compte admin à créer…).
