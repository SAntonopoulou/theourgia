/**
 * Library stories — book row across statuses, quote card per
 * language, reading-list card in three progress states.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { BookRow } from "./BookRow.js";
import { BookStatusBadge } from "./BookStatusBadge.js";
import {
  BOOK_STATUS_ORDER,
  type LibraryBook,
  type LibraryQuote,
  type ReadingListSummary,
} from "./library.js";
import { QuoteCard } from "./QuoteCard.js";
import { ReadingListCard } from "./ReadingListCard.js";

const meta = {
  title: "Library",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 700,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

const LANG_LABEL: Record<string, string> = {
  grc: "Greek",
  en: "English",
  la: "Latin",
  he: "Hebrew",
  ar: "Arabic",
  cop: "Coptic",
  sa: "Sanskrit",
};
const labelFor = (c: string) => LANG_LABEL[c] ?? c;

// ─── BookStatusBadge ───────────────────────────────────────────────

export const Status_All: Story = {
  name: "BookStatusBadge · all six statuses",
  render: () => (
    <Frame width={320}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {BOOK_STATUS_ORDER.map((s) => (
          <BookStatusBadge key={s} status={s} />
        ))}
      </div>
    </Frame>
  ),
};

// ─── BookRow ───────────────────────────────────────────────────────

const oracles: LibraryBook = {
  id: "b1",
  title: "The Chaldean Oracles",
  author: "ed. & trans. Ruth Majercik",
  year: 1989,
  publisher: "Brill",
  isbn: "9789004092433",
  tradition: "primary",
  traditionLabel: "Neoplatonism",
  languages: ["grc", "en"],
  status: "read",
  holding: "physical",
  shelf: "II·3",
  citations: 47,
  glyph: "☉",
};

const picatrix: LibraryBook = {
  id: "b4",
  title: "Ghāyat al-Ḥakīm — Picatrix",
  author: "ps.-al-Majrīṭī",
  year: 1100,
  publisher: "Warburg",
  isbn: "9780854810697",
  tradition: "grimoire",
  traditionLabel: "Astral magic",
  languages: ["ar", "en"],
  status: "reading",
  holding: "physical",
  shelf: "IV·2",
  citations: 31,
  glyph: "♄",
};

const equinox: LibraryBook = {
  id: "b7",
  title: "The Equinox, Vol. I",
  author: "ed. Aleister Crowley",
  year: 1909,
  publisher: "Weiser",
  isbn: "9780877280040",
  tradition: "periodical",
  traditionLabel: "A∴A∴",
  languages: ["en"],
  status: "want",
  holding: "none",
  shelf: "—",
  citations: 26,
  glyph: "☽",
};

const lentBook: LibraryBook = {
  ...picatrix,
  id: "b10",
  title: "The Greek Magical Papyri in Translation",
  author: "ed. Hans Dieter Betz",
  year: 1992,
  status: "lent_out",
  tradition: "scholarship",
  traditionLabel: "Greco-Egyptian",
  languages: ["en"],
  shelf: "II·5",
  citations: 19,
  glyph: "𓁹",
};

export const Row_Read_Primary: Story = {
  name: "BookRow · Read · primary source",
  render: () => (
    <Frame>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          background: "var(--bg-2)",
        }}
      >
        <BookRow
          book={oracles}
          languageLabel={labelFor}
          isFirstRow
          onOpen={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Row_Reading_Grimoire: Story = {
  name: "BookRow · Reading · grimoire",
  render: () => (
    <Frame>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          background: "var(--bg-2)",
        }}
      >
        <BookRow
          book={picatrix}
          languageLabel={labelFor}
          isFirstRow
          onOpen={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Row_Want_NotHeld: Story = {
  name: "BookRow · Want · not held (periodical)",
  render: () => (
    <Frame>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          background: "var(--bg-2)",
        }}
      >
        <BookRow
          book={equinox}
          languageLabel={labelFor}
          isFirstRow
          onOpen={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Row_LentOut: Story = {
  name: "BookRow · Lent out (care palette, no red)",
  render: () => (
    <Frame>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          background: "var(--bg-2)",
        }}
      >
        <BookRow
          book={lentBook}
          languageLabel={labelFor}
          isFirstRow
          onOpen={() => {}}
        />
      </div>
    </Frame>
  ),
};

const Selectable = () => {
  const [selected, setSelected] = useState(false);
  return (
    <Frame>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          overflow: "hidden",
          background: "var(--bg-2)",
        }}
      >
        <BookRow
          book={oracles}
          languageLabel={labelFor}
          selected={selected}
          onToggleSelect={setSelected}
          onOpen={() => {}}
          isFirstRow
        />
      </div>
    </Frame>
  );
};

export const Row_Selectable: Story = {
  name: "BookRow · selectable (bulk-export mode)",
  render: () => <Selectable />,
};

// ─── QuoteCard ─────────────────────────────────────────────────────

const chaldean: LibraryQuote = {
  id: "q1",
  bookId: "b1",
  text: "Ἔστιν γὰρ δή τι νοητόν, ὃ χρή σε νοεῖν νόου ἄνθει.",
  cite: "The Chaldean Oracles, fr. 1",
  page: "p. 47",
  lang: "grc",
  langLabel: "Greek",
  citationKey: "[[cite:chaldean-fr1]]",
};

const liberAL: LibraryQuote = {
  id: "q2",
  bookId: "b3",
  text: "Do what thou wilt shall be the whole of the Law.",
  cite: "Liber AL vel Legis, I:40",
  lang: "en",
  langLabel: "English",
  citationKey: "[[cite:liber-al-I-40]]",
};

const agrippa: LibraryQuote = {
  id: "q5",
  bookId: "b5",
  text: "Magia naturalis ea est quae rerum naturalium vires contemplata…",
  cite: "Agrippa, De Occulta Phil., I:i",
  page: "p. 5",
  lang: "la",
  langLabel: "Latin",
  citationKey: "[[cite:agrippa-I-i]]",
};

export const Quote_Greek: Story = {
  name: "QuoteCard · Greek (Chaldean Oracles)",
  render: () => (
    <Frame>
      <QuoteCard quote={chaldean} onUseAsCitation={() => {}} />
    </Frame>
  ),
};

export const Quote_Thelemic: Story = {
  name: "QuoteCard · English (Liber AL I:40)",
  render: () => (
    <Frame>
      <QuoteCard quote={liberAL} onUseAsCitation={() => {}} />
    </Frame>
  ),
};

export const Quote_Latin: Story = {
  name: "QuoteCard · Latin (Agrippa)",
  render: () => (
    <Frame>
      <QuoteCard quote={agrippa} onUseAsCitation={() => {}} />
    </Frame>
  ),
};

// ─── ReadingListCard ───────────────────────────────────────────────

const hellenistic: ReadingListSummary = {
  id: "l1",
  name: "Hellenistic foundations",
  published: true,
  total: 5,
  read: 3,
  reading: 1,
};

const thelemic: ReadingListSummary = {
  id: "l2",
  name: "Thelemic curriculum",
  published: false,
  total: 3,
  read: 1,
  reading: 0,
};

const finished: ReadingListSummary = {
  id: "l3",
  name: "First year",
  published: true,
  total: 8,
  read: 8,
  reading: 0,
};

export const List_InProgress: Story = {
  name: "ReadingListCard · in progress · public",
  render: () => (
    <Frame width={320}>
      <ReadingListCard list={hellenistic} active onSelect={() => {}} />
    </Frame>
  ),
};

export const List_Private: Story = {
  name: "ReadingListCard · private · early",
  render: () => (
    <Frame width={320}>
      <ReadingListCard list={thelemic} onSelect={() => {}} />
    </Frame>
  ),
};

export const List_Finished: Story = {
  name: "ReadingListCard · finished",
  render: () => (
    <Frame width={320}>
      <ReadingListCard list={finished} onSelect={() => {}} />
    </Frame>
  ),
};
