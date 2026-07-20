# AI Agents

Theourgia can host AI agents that help with study, research, and
reflection on your practice — a divination companion to talk a reading
through with, a study tutor, a research helper. Everything about this
feature is opt-in, transparent about cost, and structurally prevented
from reading what you have sealed.

## Zero-AI by default

If you never touch the agent surfaces, no AI is involved in your vault
in any way. There is no background analysis, no suggestion engine, no
model quietly reading your journal. The zero-AI vault is a fully
supported, permanent way to run Theourgia — not a degraded mode.

## Bring your own key

Theourgia never holds API keys centrally and never bills you. At
`/agents-keys` you provide your own Anthropic API key (or connect a
Claude subscription) — the cost lives with you, on your account, visible
on your bill. Keys are stored encrypted; once saved, the value is never
displayed again, and rotating means pasting a new key, which replaces
the old one immediately. You can also override the key per agent if you
want one agent running on a different account.

## Per-purpose agents

Agents are installed individually from the marketplace at
`/agents-marketplace`, each for a specific purpose. Installation walks
you through a trust review and a capability review — the same
browser-extension-style consent as plugins: you see exactly which parts
of your vault the agent may read or act on before it can do anything,
and it can never exceed what you granted.

Each agent keeps its own scoped memory, which you can read yourself at
any time from the agent's memory page — nothing the agent remembers
about your work is hidden from you.

## What agents can never read

Two exclusions are enforced twice — first inside the vault itself,
which never hands the excluded rows out, and again in the agent
daemon as a second pass — below the level of any setting:

- **Sealed content.** Sealed rows are encrypted with a key derived from
  your passphrase on your device. The vault excludes sealed rows from
  every agent-facing read at the database query, and the daemon holds
  no decryption keys besides, so it could not pass sealed content to an
  agent even if you asked it to.
- **Closed-tradition content.** Anything tagged as belonging to a
  closed tradition is removed from agent-visible results, regardless of
  what capabilities the agent was granted.

Agent reads are also read-only: in this version there is no way for an
agent to write into your vault at all.

## Running tasks and watching them work

Compose a task for an installed agent from its task composer, then watch
the run live in the run monitor — including a full transcript afterwards
in the transcript viewer. Everything an agent does is recorded in the
activity log at `/agents-activity`.

When the daemon refuses something — a capability not granted, a cost cap
reached, content filtered — the refusal text you see is the daemon's own
words, passed through verbatim. What the daemon said is what you read;
nothing is paraphrased into vagueness.

## Cost caps and the hard halt

Every agent has a monthly cost cap, set when you install it. Before each
run, the daemon estimates what the run may cost (based on the agent's
recent history, with a conservative margin) and reserves that amount
against the cap. If the month's spending plus the reservation would
exceed the cap, the agent simply does not wake, and the monitor shows
you the cost-cap halt message.

The cap is hard. There is no "just this once" override anywhere in the
daemon — by design, so a runaway loop can never surprise you on your
API bill.

## Token usage

The cost dashboard at `/agents-cost` shows per-agent token and cost
totals, so you can see exactly where your key's usage goes, agent by
agent, over time.
