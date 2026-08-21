/**
 * SortableList — drag-and-drop reordering for a set of cards, order remembered.
 *
 * Sophia (21 Aug): "allow the users to drag and drop and customise their today
 * tab." Each card gets a grip in its corner; drag it to reorder, and the order
 * is kept in the browser (localStorage) so Today opens the way you left it. A
 * card whose content is gated off (a switched-off practice) keeps its place in
 * the order but is not shown, so turning it back on returns it where it was.
 *
 * Accessible: the grip is a real button, keyboard-draggable via dnd-kit's
 * keyboard sensor (space to lift, arrows to move, space to drop).
 */

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useState } from "react";

export interface SortableItemData {
  id: string;
  /** The card. Null when gated off — it holds its place but is not rendered. */
  node: ReactNode;
}

function loadOrder(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return parsed as string[];
      }
    }
  } catch {
    // fall through to the default order
  }
  return fallback;
}

function saveOrder(key: string, order: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch {
    // a browser refusing storage just means the order is not remembered
  }
}

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
      }}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          zIndex: 2,
          width: 24,
          height: 24,
          display: "grid",
          placeItems: "center",
          border: "none",
          background: "transparent",
          color: "var(--ink-mute)",
          cursor: "grab",
          touchAction: "none",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ⠿
      </button>
      {children}
    </div>
  );
}

export function SortableList({
  items,
  storageKey,
  gap = 22,
}: {
  items: SortableItemData[];
  storageKey: string;
  gap?: number;
}) {
  const present = items.filter((i) => i.node !== null && i.node !== undefined);
  const presentIds = present.map((i) => i.id);
  const [order, setOrder] = useState<string[]>(() =>
    loadOrder(
      storageKey,
      items.map((i) => i.id),
    ),
  );

  // Reconcile the remembered order with what is actually present: keep the
  // stored order for ids still here, then append any new ones in declared order.
  const ordered = [
    ...order.filter((id) => presentIds.includes(id)),
    ...presentIds.filter((id) => !order.includes(id)),
  ];
  const byId = new Map(present.map((i) => [i.id, i.node]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ordered.indexOf(active.id as string);
    const to = ordered.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    // Persist the FULL declared order (including gated-off ids in their slots),
    // so a card turned back on returns to where the practitioner left it.
    const next = arrayMove(ordered, from, to);
    const full = [...next, ...order.filter((id) => !next.includes(id))];
    setOrder(full);
    saveOrder(storageKey, full);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ordered} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {ordered.map((id) => (
            <SortableItem key={id} id={id}>
              {byId.get(id)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
