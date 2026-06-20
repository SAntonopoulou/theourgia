/**
 * Avatar — identity surface.
 *
 * Renders the identity's photo if one is supplied; otherwise falls back to
 * a Medallion using the identity's glyph + tone. Naming wires the
 * accessible label automatically.
 *
 * The ``identity`` prop is intentionally minimal — additional fields
 * (display name, magickal name, federation handle) will accrue when the
 * user model lands. Until then this shape is enough for the smoke page
 * and entity-ledger work.
 */

import { type CSSProperties, useState } from "react";

import type { GlyphName } from "../Glyph/index.js";

import { Medallion, type MedallionSize, type MedallionTone } from "./Medallion.js";

export interface AvatarIdentity {
  /** Display name; used for the accessible label and the initial-letter fallback. */
  name: string;
  /** Optional photo URL. If present and loadable, shown in place of the medallion. */
  photoUrl?: string;
  /** Glyph for the medallion fallback. Defaults to ``entity``. */
  glyph?: GlyphName;
  /** Tone for the medallion fallback. Defaults to ``neutral``. */
  tone?: MedallionTone;
}

export interface AvatarProps {
  identity: AvatarIdentity;
  size?: MedallionSize;
  className?: string;
  style?: CSSProperties;
}

const SIZE_PX: Record<MedallionSize, number> = { sm: 24, md: 36, lg: 56, xl: 96 };

export function Avatar({ identity, size = "md", className, style }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const px = SIZE_PX[size];
  const showPhoto = Boolean(identity.photoUrl) && !imageFailed;

  if (showPhoto) {
    return (
      <img
        src={identity.photoUrl}
        alt={identity.name}
        width={px}
        height={px}
        onError={() => setImageFailed(true)}
        className={className}
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <Medallion
      glyph={identity.glyph ?? "entity"}
      tone={identity.tone ?? "neutral"}
      size={size}
      title={identity.name}
      className={className}
      style={style ?? {}}
    />
  );
}
