import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { spinWheel } from "@/lib/kori.functions";
import { useWheelLast, useProfile } from "@/hooks/use-kori";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { fmtKri } from "@/lib/format";

export const Route = createFileRoute("/app/wheel")({
  component: WheelPage,
});

const SEGMENTS = [
  { label: "5 KRI", color: "var(--kori)" },
  { label: "Perdu", color: "oklch(0.4 0.02 30)" },
  { label: "10 KRI", color: "var(--kori-deep)" },
  { label: "Perdu", color: "oklch(0.4 0.02 30)" },
  { label: "25 KRI", color: "var(--kori)" },
  { label: "100 KRI", color: "var(--kori-deep)" },
  { label: "10 KRI", color: "var(--kori)" },
  { label: "JACKPOT", color: "oklch(0.78 0.16 75)" },
];

function WheelPage() {
  const { data: profile } = useProfile();
  const { data: lastPlay, refetch } = useWheelLast();
  const spin = useServerFn(spinWheel);
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const nextAt = lastPlay ? new Date(lastPlay.getTime() + 24 * 3600 * 1000) : null;
  const cooldown = nextAt && nextAt.getTime() > now;
  const remaining = cooldown ? Math.max(0, nextAt!.getTime() - now) : 0;
  const remH = Math.floor(remaining / 3_600_000);
  const remM = Math.floor((remaining % 3_600_000) / 60_000);
  const remS = Math.floor((remaining % 60_000) / 1000);

  const wheelStyle = useMemo(() => {
    const step = 360 / SEGMENTS.length;
    const gradient = SEGMENTS.map((s, i) => `${s.color} ${i * step}deg ${(i + 1) * step}deg`).join(", ");
    return { background: `conic-gradient(${gradient})` };
  }, []);

  async function onSpin() {
    if (spinning || cooldown) return;
    setSpinning(true);
    try {
      const r = await spin({});
      if (!r.ok) {
        if (r.error === "cooldown") toast.error("Reviens dans 24 h !");
        else toast.error("Erreur");
        setSpinning(false);
        refetch();
        return;
      }
      const idxByType: Record<string, number> = { KRI_5: 0, LOSE: 1, KRI_10: 2, KRI_25: 4, KRI_100: 5, JACKPOT_500: 7 };
      const idx = idxByType[r.reward_type!] ?? 1;
      const segDeg = 360 / SEGMENTS.length;
      const target = 360 * 5 + (270 - (idx * segDeg + segDeg / 2));
      setAngle(target);
      setTimeout(() => {
        if ((r.reward ?? 0) > 0) toast.success(`Bravo ! Tu gagnes ${fmtKri(r.reward!)} 🎉`);
        else toast("Pas de chance cette fois. Reviens demain !");
        qc.invalidateQueries();
        refetch();
        setSpinning(false);
      }, 4200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setSpinning(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/app" className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display text-xl font-bold">Roue de la Fortune</h1>
      </header>
      <div className="px-5 text-sm text-muted-foreground">Une chance toutes les 24 h. Solde : <span className="font-semibold text-foreground">{fmtKri(Number(profile?.kori_balance ?? 0))}</span></div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pt-4">
        <div className="relative w-[300px] h-[300px]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-[color:var(--kori-deep)] z-10" />
          <div
            className="w-full h-full rounded-full shadow-kori transition-transform"
            style={{ ...wheelStyle, transform: `rotate(${angle}deg)`, transitionDuration: spinning ? "4s" : "0ms", transitionTimingFunction: "cubic-bezier(0.2,0.8,0.2,1)" }}
          >
            {SEGMENTS.map((s, i) => {
              const deg = (360 / SEGMENTS.length) * i + (360 / SEGMENTS.length) / 2;
              return (
                <div key={i} className="absolute inset-0 grid place-items-start justify-center text-white font-bold text-xs"
                  style={{ transform: `rotate(${deg}deg)` }}>
                  <span className="mt-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">{s.label}</span>
                </div>
              );
            })}
            <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full grid place-items-center font-display font-bold text-[color:var(--kori)] text-xl shadow-card">K</div>
          </div>
        </div>

        <button onClick={onSpin} disabled={spinning || !!cooldown}
          className="mt-8 w-full bg-kori-gradient text-white font-semibold rounded-2xl py-4 shadow-kori disabled:opacity-60 active:scale-[0.98] transition">
          {cooldown ? `Reviens dans ${String(remH).padStart(2,"0")}:${String(remM).padStart(2,"0")}:${String(remS).padStart(2,"0")}` : spinning ? "Spin en cours…" : "Tourner la roue 🎲"}
        </button>
      </div>
    </div>
  );
}
