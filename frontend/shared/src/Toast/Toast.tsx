/**
 * Toast — non-blocking notification.
 *
 * Two public surfaces:
 *
 *   <ToastProvider />        — mount once at the app root. Renders the
 *                              live region + the visible toast stack.
 *
 *   Toast.push({...})        — global API; call from anywhere in the tree
 *                              (or outside React entirely) to enqueue a
 *                              toast onto the active provider.
 *
 * Lifecycle:
 *   - push() creates a record with auto-incrementing id + the props
 *   - provider subscribes to the module-level emitter, mirrors records
 *     into local state, and renders them
 *   - each record auto-dismisses after ``duration`` ms (default 4000),
 *     unless ``duration: Infinity`` keeps it sticky
 *   - clicking the action button calls the callback then dismisses
 *   - the × button dismisses immediately
 */

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "../Button/index.js";
import { Glyph, type GlyphName } from "../Glyph/index.js";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  tone: ToastTone;
  title: ReactNode;
  body?: ReactNode;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss. Pass Infinity for sticky. Default 4000. */
  duration?: number;
}

interface ToastRecord extends ToastInput {
  id: number;
}

type Listener = (record: ToastRecord) => void;

let nextId = 1;
const listeners = new Set<Listener>();

function emit(input: ToastInput): number {
  const id = nextId++;
  const record: ToastRecord = { ...input, id };
  for (const listener of listeners) listener(record);
  return id;
}

/** Test helper — reset the global emitter state between tests. */
export function _resetToasts(): void {
  listeners.clear();
  nextId = 1;
}

// Public namespaced API: `Toast.push({...})`.
export const Toast = {
  push(input: ToastInput): number {
    return emit(input);
  },
};

const TONE_GLYPH: Record<ToastTone, GlyphName> = {
  info: "scroll",
  success: "key",
  warning: "bell",
  error: "lock",
};

const TONE_COLOR: Record<ToastTone, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--danger)",
};

export interface ToastProviderProps {
  /** Where to anchor the stack on the viewport. Default "bottom-right". */
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  /** Cap on simultaneous visible toasts. Older ones drop. Default 5. */
  max?: number;
}

export function ToastProvider({ position = "bottom-right", max = 5 }: ToastProviderProps) {
  const [records, setRecords] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function dismiss(id: number): void {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  useEffect(() => {
    const listener: Listener = (record) => {
      setRecords((prev) => {
        const next = [...prev, record];
        if (next.length > max) return next.slice(next.length - max);
        return next;
      });
      const duration = record.duration ?? 4000;
      if (duration !== Number.POSITIVE_INFINITY) {
        const timer = setTimeout(() => dismiss(record.id), duration);
        timersRef.current.set(record.id, timer);
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, [max]);

  if (typeof document === "undefined") return null;

  const containerStyle = positionStyle(position);

  const node = (
    <div role="region" aria-label="Notifications" aria-live="polite" style={containerStyle}>
      {records.map((r) => (
        <ToastItem key={r.id} record={r} onDismiss={() => dismiss(r.id)} />
      ))}
    </div>
  );

  return createPortal(node, document.body);
}

function ToastItem({ record, onDismiss }: { record: ToastRecord; onDismiss: () => void }) {
  const itemStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    padding: "12px 14px",
    backgroundColor: "var(--bg-2)",
    color: "var(--ink)",
    border: "1px solid var(--line-2)",
    borderLeft: `3px solid ${TONE_COLOR[record.tone]}`,
    borderRadius: "var(--r-md, 8px)",
    boxShadow: "0 10px 26px rgba(0, 0, 0, 0.4)",
    minWidth: 240,
    maxWidth: 360,
    fontFamily: "var(--font-ui)",
    pointerEvents: "auto",
  };

  return (
    <div
      role={record.tone === "error" ? "alert" : "status"}
      data-tone={record.tone}
      style={itemStyle}
    >
      <span style={{ color: TONE_COLOR[record.tone], flexShrink: 0, marginTop: 1 }}>
        <Glyph name={TONE_GLYPH[record.tone]} size={17} />
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontSize: 13.5,
            color: "var(--ink)",
          }}
        >
          {record.title}
        </span>
        {record.body ? (
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{record.body}</span>
        ) : null}
      </div>
      {record.action ? (
        <Button
          size="sm"
          variant="quiet"
          onClick={() => {
            record.action?.onClick();
            onDismiss();
          }}
        >
          {record.action.label}
        </Button>
      ) : null}
      <Button size="sm" variant="quiet" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </Button>
    </div>
  );
}

function positionStyle(position: NonNullable<ToastProviderProps["position"]>): CSSProperties {
  // Wrapper passes clicks through; each item opts in via pointerEvents: "auto".
  const base: CSSProperties = {
    position: "fixed",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    padding: "var(--space-4, 16px)",
    zIndex: 1100,
    pointerEvents: "none",
  };
  switch (position) {
    case "top-left":
      return { ...base, top: 0, left: 0, alignItems: "flex-start" };
    case "top-right":
      return { ...base, top: 0, right: 0, alignItems: "flex-end" };
    case "top-center":
      return { ...base, top: 0, left: "50%", transform: "translateX(-50%)", alignItems: "center" };
    case "bottom-left":
      return { ...base, bottom: 0, left: 0, alignItems: "flex-start" };
    case "bottom-center":
      return {
        ...base,
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        alignItems: "center",
      };
    default:
      return { ...base, bottom: 0, right: 0, alignItems: "flex-end" };
  }
}
