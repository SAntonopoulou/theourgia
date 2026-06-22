/**
 * SpreadBoard — framed gradient panel containing the spread's
 * positioned cards.
 *
 * Verbatim from `Theourgia Tarot.dc.html` lines 127-141. The board
 * frame uses --line border + --bg-2→--bg-sunk linear gradient. Card
 * width is configured per spread (see TAROT_CARD_WIDTH in copy.ts);
 * positions come from the engine's spreadLayout(spread).positions
 * with x/y as percentages.
 *
 * The board height is configured per spread (line 311 of the
 * mockup):
 *   single        → 250
 *   three         → 270
 *   relationship  → 380
 *   celtic / year → 470
 */

import { type CSSProperties } from "react";

import {
  type DrawnCard,
  type SpreadKind,
  buildDeck,
  spreadLayout,
} from "../divination/index.js";
import { TAROT_CARD_WIDTH } from "./copy.js";
import { TarotCardFace } from "./TarotCardFace.js";

const BOARD_HEIGHT: Record<SpreadKind, number> = {
  single: 250,
  three: 270,
  relationship: 380,
  celtic: 470,
  year: 470,
};

export interface SpreadBoardProps {
  spread: SpreadKind;
  /** Drawn cards. When null, the board shows face-down placeholders
   *  (the pre-draw state). Length must match the spread's positions
   *  when present. */
  drawn?: readonly DrawnCard[] | null;
  /** Selected card index. */
  selected?: number;
  onSelect?: (positionIndex: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function SpreadBoard({
  spread,
  drawn,
  selected,
  onSelect,
  className,
  style,
}: SpreadBoardProps) {
  const layout = spreadLayout(spread);
  const cardWidth = TAROT_CARD_WIDTH[spread];
  const boardHeight = BOARD_HEIGHT[spread];

  // Face-down placeholders draw from a fresh deck — same first card
  // for everyone. The visual is the deck mark, not the card identity.
  const placeholderDeck = drawn ? null : buildDeck();

  return (
    <div
      data-component="spread-board"
      data-spread={spread}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: boardHeight,
        ...style,
      }}
    >
      {layout.positions.map((pos, i) => {
        const drawnAtPos = drawn?.[i];
        const card = drawnAtPos?.card ?? placeholderDeck?.[0];
        if (!card) return null;
        const isSelected = selected === i;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <TarotCardFace
              card={card}
              width={cardWidth}
              faceDown={!drawn}
              reversed={drawnAtPos?.reversed ?? false}
              selected={isSelected}
              rotation={pos.rot}
              positionLabel={pos.label}
              onClick={onSelect ? () => onSelect(i) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

export { BOARD_HEIGHT as SPREAD_BOARD_HEIGHT };
