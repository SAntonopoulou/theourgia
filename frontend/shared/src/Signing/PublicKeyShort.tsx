/**
 * PublicKeyShort — render a 32-byte Ed25519 public key as
 * "9F2A…2A19" (first 4 + last 4) with the full key in the `title`
 * tooltip + the `aria-label`.
 *
 * Per the H01-H03 supplement §S3.3: public keys never display as
 * raw 64-character hex; the short form keeps the surface scannable
 * while the full key stays one hover/screen-reader-pass away.
 */

import { type CSSProperties } from "react";

export interface PublicKeyShortProps {
  /** Full hex public key (typically 64 chars for Ed25519). */
  keyHex: string;
  /** Override how many chars to show on each end. Default 4 + 4. */
  prefix?: number;
  suffix?: number;
  className?: string;
  style?: CSSProperties;
}

function shorten(keyHex: string, prefix: number, suffix: number): string {
  if (keyHex.length <= prefix + suffix + 1) {
    return keyHex;
  }
  return `${keyHex.slice(0, prefix)}…${keyHex.slice(-suffix)}`;
}

export function PublicKeyShort({
  keyHex,
  prefix = 4,
  suffix = 4,
  className,
  style,
}: PublicKeyShortProps) {
  const short = shorten(keyHex, prefix, suffix);
  return (
    <span
      className={className}
      title={keyHex}
      aria-label={`Public key ${keyHex}`}
      data-full-key={keyHex}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: "var(--ink-soft)",
        cursor: "help",
        ...style,
      }}
    >
      {short}
    </span>
  );
}

export { shorten as shortenPublicKey };
