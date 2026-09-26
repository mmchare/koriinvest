import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Renders children at a fixed 1920x1080 resolution, scaled to fit its parent. */
export function ScaledSlide({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const update = () => {
      const r = parent.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setScale(Math.min(r.width / 1920, r.height / 1080));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="slide-wrapper" style={{ "--scale": scale } as CSSProperties}>
      <div className="slide-content">{children}</div>
    </div>
  );
}

export function SlideHead({
  kicker,
  title,
  sub,
  className = "",
}: {
  kicker?: string;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`px-20 pt-16 ${className}`}>
      {kicker ? <div className="slide-kicker slide-accent mb-5">{kicker}</div> : null}
      <h1 className="slide-title-md">{title}</h1>
      {sub ? <p className="slide-body slide-dim mt-5 max-w-[1250px]">{sub}</p> : null}
    </div>
  );
}

export function Glow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`slide-glow ${className}`}
      style={{ background: "oklch(0.64 0.23 25 / 0.35)", width: 700, height: 700 }}
    />
  );
}
