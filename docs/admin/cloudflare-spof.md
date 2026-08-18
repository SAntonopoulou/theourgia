# Cloudflare: the single point of failure, named honestly

The pre-launch audit flagged that theourgia leans on Cloudflare in more than
one place at once. This note states the dependency plainly, says which parts
are worth mitigating and which are worth simply accepting, and records the
failover play so it exists *before* it is needed rather than during an outage.

## What actually depends on Cloudflare

`theourgia.com` resolves to Cloudflare addresses — the site is proxied (the
"orange cloud"), so Cloudflare sits in the request path. Concretely, Cloudflare
provides, at once:

- **DNS** for the domain,
- the **reverse proxy / CDN / TLS edge** in front of the origin,
- **WAF + DDoS** protection,
- **R2** — the object store that holds *both* user-uploaded media *and* the
  restic backup repository.

That last line is the sharp one: the live site, its uploads, and its backups
all live inside one vendor's account.

## Three different failures, three different answers

### 1. Cloudflare has an availability outage (their edge is down)
The site becomes unreachable through the proxy. **This is acceptable to run
with** — Cloudflare's edge uptime is very high, and a solo/small instance does
not need a second CDN. What matters is that a failover *exists*:

> **Failover play.** The origin VPS (`178.105.106.225`) is reachable directly
> on 443, and the origin Caddy terminates its own Let's Encrypt TLS. So during
> a Cloudflare edge outage, DNS can be re-pointed straight at the origin
> ("grey-cloud" / DNS-only) and the site serves itself, minus the WAF/CDN.
> This only works while DNS itself is answerable — see failure 3.

### 2. R2 is unreachable (media + backups temporarily unavailable)
Uploads fail to load and a scheduled backup can't write. **Data is not lost,
only unreachable**, and it self-heals when R2 returns. The scheduled backup is
watched by the Sentry cron monitor (`theourgia-scheduled-backup`), so a run
that fails to reach R2 surfaces rather than passing silently.

### 3. The Cloudflare *account* is lost (suspension, billing, compromise)
This is the real single point: DNS, the proxy, **and** R2 (media + the only
backup copy) would all go together. Two things blunt it:

- **Backups must not live only inside Cloudflare.** The durable answer is a
  second backup destination on a *different* provider — tracked as the R2
  media-mirror / second-provider work. Combined with the `RESTIC_PASSWORD`
  now escrowed off-server (see `SECRETS.local.md` and `backups.md`), a copy
  outside Cloudflare stays both reachable and decryptable.
- **Keep the registrar reachable independently.** If DNS can be moved at the
  registrar without the Cloudflare account, failure 3 degrades to failure 1.
  ⚠ **To verify:** where `theourgia.com` is registered, and that its registrar
  login is separate from the Cloudflare account.

## Recommended hardening (not yet applied)

- **Firewall the origin's 443 to Cloudflare IP ranges.** The origin currently
  answers 443 to the whole internet, which lets a client that knows the IP
  bypass Cloudflare's WAF/DDoS entirely. Restricting 443 to Cloudflare's
  published ranges closes that — but do it carefully: it must not break the
  direct-origin *failover* above (keep a break-glass allowance), and it is a
  firewall change worth doing with a second person watching. Left as a
  deliberate follow-up rather than a silent change.

## The bottom line

Availability through Cloudflare is **accepted** — the failover play covers a
temporary edge outage. The account-loss facet is **mitigated** by pushing a
backup copy outside Cloudflare and by keeping the registrar independent; those
two are the parts worth the effort. The origin-firewall hardening is a good
next step but is left as a watched follow-up, not a launch blocker.
