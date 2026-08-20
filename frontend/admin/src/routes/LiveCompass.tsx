/**
 * A live compass, where the device can give one.
 *
 * The frames surface is a reference; this adds the needle. It reads the browser
 * DeviceOrientation heading (iOS needs a permission tap, and gives a true
 * compass heading; elsewhere it's approximate) and turns a wind-rose so north
 * stays north as the device turns. On a desktop with no sensor it says so —
 * honestly, rather than a needle that never moves.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "live" | "unsupported" | "denied";

const CARDINALS = [
  { label: "N", deg: 0 },
  { label: "E", deg: 90 },
  { label: "S", deg: 180 },
  { label: "W", deg: 270 },
];

/** Compass point for a heading, the phone's 8-wind vocabulary. */
const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function pointFor(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] ?? "N";
}

type OrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
type PermissionAPI = { requestPermission?: () => Promise<"granted" | "denied" | "default"> };

export function LiveCompass() {
  const [status, setStatus] = useState<Status>("idle");
  const [heading, setHeading] = useState<number | null>(null);
  const listening = useRef(false);

  // A stable handler, so add and remove use the same reference.
  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    const ev = e as OrientationEvent;
    const h =
      typeof ev.webkitCompassHeading === "number"
        ? ev.webkitCompassHeading
        : typeof ev.alpha === "number"
          ? (360 - ev.alpha) % 360
          : null;
    if (h !== null) setHeading(h);
  }, []);

  useEffect(() => {
    return () => {
      if (listening.current) window.removeEventListener("deviceorientation", onOrient, true);
    };
  }, [onOrient]);

  async function start(): Promise<void> {
    if (typeof window === "undefined" || typeof window.DeviceOrientationEvent === "undefined") {
      setStatus("unsupported");
      return;
    }
    const api = window.DeviceOrientationEvent as unknown as PermissionAPI;
    if (typeof api.requestPermission === "function") {
      try {
        const res = await api.requestPermission();
        if (res !== "granted") {
          setStatus("denied");
          return;
        }
      } catch {
        setStatus("denied");
        return;
      }
    }
    window.addEventListener("deviceorientation", onOrient, true);
    listening.current = true;
    setStatus("live");
  }

  const dialRotation = heading === null ? 0 : -heading;

  return (
    <section
      aria-label="Live compass"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: 20,
        marginBottom: 24,
        textAlign: "center",
      }}
    >
      <h2
        style={{
          margin: "0 0 4px",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 18,
          color: "var(--ink)",
        }}
      >
        Live compass
      </h2>
      <p style={{ margin: "0 0 16px", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}>
        {status === "live"
          ? "The rose turns with your device; the mark at the top is the way you face."
          : "On a phone or tablet, turn on the compass to orient the frame."}
      </p>

      <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto 14px" }}>
        {/* The needle — fixed, pointing up: the direction the device faces. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: 6,
            width: 0,
            height: 0,
            transform: "translateX(-50%)",
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderBottom: "16px solid var(--accent)",
            zIndex: 2,
          }}
        />
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          aria-hidden="true"
          style={{
            transform: `rotate(${dialRotation}deg)`,
            transition: "transform 0.2s linear",
          }}
        >
          <circle cx="110" cy="110" r="104" fill="none" stroke="var(--line)" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="88" fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.5" />
          {CARDINALS.map((c) => {
            const rad = ((c.deg - 90) * Math.PI) / 180;
            const x = 110 + 90 * Math.cos(rad);
            const y = 110 + 90 * Math.sin(rad);
            return (
              <text
                key={c.label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-display, var(--font-serif))"
                fontSize="16"
                fill={c.label === "N" ? "var(--accent)" : "var(--ink-soft)"}
              >
                {c.label}
              </text>
            );
          })}
          {/* The north pointer on the rose. */}
          <path d="M110 22 L104 44 L116 44 Z" fill="var(--accent)" />
        </svg>
      </div>

      {status === "live" && heading !== null ? (
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 20,
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pointFor(heading)} · {Math.round(heading)}°
        </div>
      ) : status === "unsupported" ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)" }}>
          This device has no orientation sensor — the compass is live only on a phone or tablet.
        </p>
      ) : status === "denied" ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)" }}>
          Compass access was declined. Allow motion &amp; orientation to use it.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          style={{
            padding: "9px 20px",
            borderRadius: "var(--r-md, 8px)",
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--on-accent, #fff)",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Turn on the compass
        </button>
      )}
    </section>
  );
}
