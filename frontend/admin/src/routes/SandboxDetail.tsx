/**
 * SandboxDetail — admin route at ``/sandbox/:id``.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type SandboxContentCard,
  SandboxDetailSurface,
  useTopbar,
} from "@theourgia/shared";

const CARDS: SandboxContentCard[] = [
  {
    id: "c-aries-1",
    glyph: "♈",
    title: "1st decan of Aries",
    ruler: "Mars",
    body: "A man with red eyes, holding a sickle — restless, ready for labour.",
  },
  {
    id: "c-aries-2",
    glyph: "♈",
    title: "2nd decan of Aries",
    ruler: "Sun",
    body: "A woman in green, one leg bare, seeking dominion.",
  },
  {
    id: "c-aries-3",
    glyph: "♈",
    title: "3rd decan of Aries",
    ruler: "Venus",
    body: "A restless man holding gold and a rod, impatient.",
  },
  {
    id: "c-taurus-1",
    glyph: "♉",
    title: "1st decan of Taurus",
    ruler: "Mercury",
    body: "A naked man, an archer, ploughing the earth.",
  },
  {
    id: "c-taurus-2",
    glyph: "♉",
    title: "2nd decan of Taurus",
    ruler: "Moon",
    body: "A man with a key, breaking the soil for sowing.",
  },
  {
    id: "c-gemini-1",
    glyph: "♊",
    title: "1st decan of Gemini",
    ruler: "Jupiter",
    body: "A man holding a staff, a servant at his side.",
  },
];

export function SandboxDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbar(() => ({ title: "Sandbox" }));

  return (
    <SandboxDetailSurface
      sandboxLabel="Decanic Faces preview"
      expiresAtLabel="23 July 2026"
      cards={CARDS}
      onBreadcrumbHome={() => navigate("/sandbox")}
      onPromote={() => {
        // eslint-disable-next-line no-console
        console.info("[sandbox-detail] promote", id);
      }}
      onDiscard={() => {
        // eslint-disable-next-line no-console
        console.info("[sandbox-detail] discard", id);
      }}
    />
  );
}
