/**
 * Foundations smoke page — Phase 02 Batches 1 + 2 + 3.
 *
 * Renders every primitive shipped so far so we can eyeball parity against
 * the design's `Theourgia Foundations.dc.html` reference page. Wires up
 * theme / mode / contrast / cvd switchers so visual axes can be flipped
 * live.
 */

import {
  AlertDialog,
  Avatar,
  Badge,
  Banner,
  Button,
  CONTRASTS,
  CVDS,
  Card,
  Chip,
  ConfirmDialog,
  type Contrast,
  type Cvd,
  Drawer,
  EmptyState,
  Field,
  Glyph,
  IconButton,
  MODES,
  Medallion,
  Menu,
  type MenuItem,
  type Mode,
  NumberInput,
  Popover,
  Progress,
  PromptDialog,
  SegmentedControl,
  Select,
  Skeleton,
  Stat,
  StatusDot,
  Switch,
  THEMES,
  TextArea,
  TextInput,
  type Theme,
  Toast,
  Tooltip,
  applyThemeState,
  readThemeState,
} from "@theourgia/shared";
import { type ReactNode, useState } from "react";

export function Foundations() {
  const [state, setState] = useState(() => readThemeState());
  const [chipOn, setChipOn] = useState(true);
  const [switchOn, setSwitchOn] = useState(false);
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<
    "personal" | "viewer" | "network" | "public" | "sealed"
  >("viewer");
  const [tradition, setTradition] = useState("hellenic");
  const [count, setCount] = useState(7);
  const [reflection, setReflection] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  function set<K extends keyof typeof state>(key: K, value: (typeof state)[K]): void {
    const next = { ...state, [key]: value };
    setState(next);
    applyThemeState(next);
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "var(--space-7, 48px) var(--space-5, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-7, 48px)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-ui, 13px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Phase 02 · Batches 1 + 2 + 3 + 4
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: "var(--type-display, 40px)",
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Theourgia Foundations
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--ink-soft)",
            fontFamily: "var(--font-ui)",
          }}
        >
          Smoke page exercising the token layer + bedrock primitives. Toggle the axes below to
          verify themes, modes, contrast, and CVD-safe palettes.
        </p>
      </header>

      <Section title="Theme axes">
        <Axis
          label="Theme"
          value={state.theme}
          options={THEMES}
          onChange={(v) => set("theme", v as Theme)}
        />
        <Axis
          label="Mode"
          value={state.mode}
          options={MODES}
          onChange={(v) => set("mode", v as Mode)}
        />
        <Axis
          label="Contrast"
          value={state.contrast}
          options={CONTRASTS}
          onChange={(v) => set("contrast", v as Contrast)}
        />
        <Axis label="CVD" value={state.cvd} options={CVDS} onChange={(v) => set("cvd", v as Cvd)} />
      </Section>

      <Section title="Glyphs">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "var(--ink)" }}>
          {GLYPHS_TO_SHOWCASE.map((g) => (
            <div
              key={g}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                width: 80,
              }}
            >
              <Glyph name={g} size={24} />
              <span
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}
              >
                {g}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button variant="primary" iconStart="key">
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" iconStart="lock">
            Danger
          </Button>
          <Button variant="quiet">Quiet</Button>
        </Row>
        <Row>
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row>
          <IconButton glyph="bell" label="Notifications" />
          <IconButton glyph="moon" label="Lunar" size="sm" />
          <IconButton glyph="sun" label="Solar" size="lg" />
        </Row>
      </Section>

      <Section title="Form fields">
        <Field label="Magickal name" hint="Visible across the vault.">
          <TextInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Soror Ευ. Α."
          />
        </Field>
        <Field label="Sealed vault" error="Passphrase required.">
          <TextInput type="password" placeholder="••••••••" />
        </Field>
        <Field label="Reflection" hint="What did you notice?">
          <TextArea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={4}
            placeholder="The candle held its flame longer than expected…"
          />
        </Field>
        <Field label="Tradition" hint="Drives the default vocabulary.">
          <Select
            value={tradition}
            onChange={(e) => setTradition(e.target.value)}
            options={[
              { value: "base", label: "Base — no tradition framing" },
              { value: "hellenic", label: "Hellenic" },
              { value: "thelemic", label: "Thelemic" },
            ]}
          />
        </Field>
        <Field label="Sessions this week">
          <NumberInput
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min={0}
            max={99}
          />
        </Field>
        <Switch checked={switchOn} onChange={setSwitchOn} label="Lunar phase notifications" />
      </Section>

      <Section title="Segmented control">
        <SegmentedControl
          options={[
            { value: "personal", label: "Personal", glyph: "lock" },
            { value: "viewer", label: "Viewer", glyph: "eye" },
            { value: "network", label: "Network", glyph: "compass" },
            { value: "public", label: "Public", glyph: "scroll" },
            { value: "sealed", label: "Sealed", glyph: "key" },
          ]}
          value={visibility}
          onChange={setVisibility}
          ariaLabel="Visibility"
        />
      </Section>

      <Section title="Identity">
        <Row>
          <Avatar identity={{ name: "Soror Ευ. Α.", glyph: "moon", tone: "accent" }} size="xl" />
          <Avatar identity={{ name: "Frater Δ.", glyph: "sun" }} size="lg" />
          <Avatar identity={{ name: "Anonymous", glyph: "entity" }} size="md" />
          <Avatar identity={{ name: "Trace", glyph: "sigil" }} size="sm" />
        </Row>
        <Row>
          <Medallion glyph="pentacle" tone="accent" />
          <Medallion glyph="sigil" tone="info" />
          <Medallion glyph="key" tone="success" />
          <Medallion glyph="bell" tone="warning" />
          <Medallion glyph="lock" tone="danger" />
          <Medallion glyph="scroll" tone="neutral" />
        </Row>
      </Section>

      <Section title="Stat tiles">
        <div
          style={{
            display: "grid",
            gap: "var(--space-4, 16px)",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <Card>
            <Stat
              label="Entries this week"
              value={42}
              spark={[2, 4, 3, 6, 5, 8, 14]}
              delta={12.4}
            />
          </Card>
          <Card>
            <Stat label="Synchronicities" value={9} spark={[1, 2, 1, 3, 2, 0, 1]} delta={-3.1} />
          </Card>
          <Card>
            <Stat label="Federation peers" value={6} tone="neutral" />
          </Card>
        </div>
      </Section>

      <Section title="Progress">
        <Progress value={28} label="Backfill" />
        <Progress value={84} label="Backup checkpoint" />
        <Progress label="Reindexing" />
      </Section>

      <Section title="Status">
        <Row>
          <StatusDot status="ok" label="agent-house · operational" />
          <StatusDot status="warn" label="cache · slow" />
          <StatusDot status="error" label="federation-peer · unreachable" />
          <StatusDot status="pending" label="reindex · queued" />
          <StatusDot status="neutral" label="archived" />
        </Row>
      </Section>

      <Section title="Banner">
        {!bannerDismissed ? (
          <Banner
            tone="warning"
            title="Encryption mode is sealed"
            body="Decrypt your vault before publishing — sealed entries cannot leave this device."
            dismissible
            onDismiss={() => setBannerDismissed(true)}
            action={{
              label: "Unseal",
              onClick: () =>
                Toast.push({ tone: "info", title: "Unseal flow", body: "(placeholder)" }),
            }}
          />
        ) : (
          <Button size="sm" variant="quiet" onClick={() => setBannerDismissed(false)}>
            Show banner again
          </Button>
        )}
      </Section>

      <Section title="Anchored overlays">
        <Row>
          <Tooltip label="Notifications you've opted into" placement="top">
            <Button variant="secondary" iconStart="bell">
              Lunar phase
            </Button>
          </Tooltip>

          <Menu
            ariaLabel="Entry actions"
            placement="bottom"
            align="start"
            trigger={
              <Button variant="secondary" iconStart="ritual">
                Entry actions
              </Button>
            }
            items={
              [
                { kind: "label", label: "This entry" },
                {
                  kind: "item",
                  label: "Duplicate",
                  glyph: "scroll",
                  onSelect: () => Toast.push({ tone: "info", title: "Duplicated" }),
                },
                {
                  kind: "item",
                  label: "Archive",
                  glyph: "library",
                  onSelect: () => Toast.push({ tone: "success", title: "Archived" }),
                },
                { kind: "separator" },
                {
                  kind: "item",
                  label: "Delete",
                  glyph: "lock",
                  tone: "danger",
                  onSelect: () =>
                    Toast.push({ tone: "error", title: "Delete blocked", body: "(demo only)" }),
                },
              ] as MenuItem[]
            }
          />

          <Popover
            open={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            placement="bottom"
            align="start"
            width={280}
            trigger={
              <Button variant="ghost" onClick={() => setPopoverOpen((p) => !p)}>
                Open Popover
              </Button>
            }
          >
            <div style={{ padding: "var(--space-4, 16px)", display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "var(--type-h3, 16px)" }}>
                Popover
              </h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: "var(--type-body-sm, 13px)" }}>
                Anchored content with click-outside dismissal and ESC. Generic surface — Menu and
                Tooltip are specialised versions of this.
              </p>
            </div>
          </Popover>
        </Row>
      </Section>

      <Section title="Overlays">
        <Row>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open ConfirmDialog
          </Button>
          <Button variant="primary" onClick={() => setAlertOpen(true)}>
            Open AlertDialog
          </Button>
          <Button variant="secondary" onClick={() => setPromptOpen(true)}>
            Open PromptDialog
          </Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Open Drawer
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              Toast.push({
                tone: "success",
                title: "Saved",
                body: "Entry locked into the vault.",
                action: {
                  label: "Undo",
                  onClick: () => Toast.push({ tone: "info", title: "Reverted" }),
                },
              })
            }
          >
            Push toast
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              Toast.push({
                tone: "error",
                title: "Federation peer unreachable",
                body: "Retrying in 30s…",
              })
            }
          >
            Push error toast
          </Button>
        </Row>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        tone="destructive"
        title="Archive this entry?"
        body="Archived entries can be restored within 30 days. After that, sealed entries are unrecoverable."
        confirmLabel="Archive"
        onConfirm={() => {
          setConfirmOpen(false);
          Toast.push({ tone: "success", title: "Entry archived" });
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <AlertDialog
        open={alertOpen}
        tone="danger"
        title="Sealed entries are zero-knowledge"
        body="You are about to seal this entry with your passphrase. If you lose the passphrase, the content is unrecoverable — not even Theourgia can read it."
        acknowledgeLabel="I understand"
        onAcknowledge={() => setAlertOpen(false)}
      />

      <PromptDialog
        open={promptOpen}
        title="New magickal name"
        label="Magickal name"
        defaultValue=""
        placeholder="Soror Ευ. Α."
        validate={(v) => (v.trim().length < 3 ? "Must be at least 3 characters." : null)}
        confirmLabel="Save"
        onSubmit={(value) => {
          setPromptOpen(false);
          Toast.push({ tone: "success", title: `Saved as ${value}` });
        }}
        onCancel={() => setPromptOpen(false)}
      />

      <Drawer
        open={drawerOpen}
        side="right"
        title="Vault settings"
        onClose={() => setDrawerOpen(false)}
      >
        <Field label="Tradition">
          <Select
            value={tradition}
            onChange={(e) => setTradition(e.target.value)}
            options={[
              { value: "base", label: "Base" },
              { value: "hellenic", label: "Hellenic" },
              { value: "thelemic", label: "Thelemic" },
            ]}
          />
        </Field>
        <p style={{ color: "var(--ink-soft)", marginTop: "var(--space-4, 16px)" }}>
          Drawers focus-trap, lock body scroll, and close on Escape — same as dialogs.
        </p>
      </Drawer>

      <Section title="Chips">
        <Row>
          <Chip label="Static" />
          <Chip label="Toggle" selected={chipOn} onToggle={setChipOn} glyph="star" />
          <Chip label="Removable" selected onToggle={() => undefined} removable />
        </Row>
      </Section>

      <Section title="Badges">
        <Row>
          <Badge tone="neutral" glyph="scroll">
            Neutral
          </Badge>
          <Badge tone="info" glyph="library">
            Info
          </Badge>
          <Badge tone="success" glyph="key">
            Verified
          </Badge>
          <Badge tone="warning" glyph="bell">
            Warning
          </Badge>
          <Badge tone="danger" glyph="lock">
            Danger
          </Badge>
          <Badge tone="trust" glyph="sigil">
            Trust
          </Badge>
        </Row>
      </Section>

      <Section title="Cards">
        <Row>
          <Card>
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-serif)" }}>Passive card</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              A structural surface used for grouping. No interaction affordance.
            </p>
          </Card>
          <Card interactive onClick={() => undefined}>
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-serif)" }}>Interactive card</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              Focus ring, keyboard activation, cursor change.
            </p>
          </Card>
        </Row>
      </Section>

      <Section title="Empty state">
        <EmptyState
          glyph="journal"
          title="No entries yet"
          body="Open a fresh page and capture the first observation. The tradition starts with the act, not the form."
          action={<Button variant="primary">Begin journal</Button>}
        />
      </Section>

      <Section title="Skeleton">
        <Row>
          <Skeleton kind="text" width={240} />
          <Skeleton kind="rect" width={160} height={96} />
          <Skeleton kind="circle" width={48} height={48} />
        </Row>
      </Section>
    </main>
  );
}

const GLYPHS_TO_SHOWCASE = [
  "journal",
  "library",
  "ritual",
  "candle",
  "sigil",
  "scroll",
  "pentacle",
  "star",
  "moon",
  "sun",
  "bell",
  "calendar",
  "compass",
  "divination",
  "entity",
  "eye",
  "feather",
  "flask",
  "hand",
  "key",
  "lock",
  "shield",
  "trance",
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontSize: "var(--type-h2, 22px)",
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      {children}
    </div>
  );
}

function Axis({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  return (
    <Row>
      <span
        style={{
          minWidth: 96,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {label}
      </span>
      {options.map((opt) => (
        <Button
          key={opt}
          variant={opt === value ? "primary" : "secondary"}
          size="sm"
          onClick={() => onChange(opt)}
        >
          {opt}
        </Button>
      ))}
    </Row>
  );
}
