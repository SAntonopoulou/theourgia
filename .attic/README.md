# .attic — parked, not deleted

Things that are intentionally out of the supported path but kept in the
tree for a future phase.

## helm/

The Helm chart for Kubernetes deployment. Parked because:

- It has never been tested against the real deployment — production
  runs on Docker Compose (`docker-compose.yml` +
  `docker-compose.prod.yml`, driven by `scripts/deploy-prod.sh`), and
  that is the only supported path.
- Maintaining an untested second deployment surface alongside the
  compose files invites drift and false confidence.

It is kept (rather than deleted) for a possible future multi-instance /
managed-hosting phase where Kubernetes becomes relevant. Before reviving
it, audit every value against the current compose files — profiles,
ports, env vars, and healthchecks have all changed since the chart was
written.

See `docs/ops/DEPLOYMENT_RUNBOOK.md` for the supported deployment.
