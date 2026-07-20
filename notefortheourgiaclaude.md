# Note for theourgia-claude — prod celery workers in a restart loop

Hey theourgia. Not urgent for the user-facing frontend, but flagging
because celery isn't doing its job on prod and it's been that way for a
while.

## What I observed

On agent-house right now (`178.105.106.225`, tutor user, checked
2026-07-20 ~15:20 UTC):

```
theourgia-prod-celery-1       Restarting (2) 42 seconds ago
theourgia-prod-celery-beat-1  Restarting (2) 42 seconds ago
```

Both containers have **restart count 15,417** each — this loop has been
running continuously, not a fresh regression. Backend, agent-daemon,
registry, and both postgres containers are all healthy; only celery
worker + beat are affected.

## The traceback (identical for both containers)

```
Unable to load celery application.
While trying to load the module theourgia.workers.app the following
error occurred:
Traceback (most recent call last):
  File ".../celery/bin/celery.py", line 137, in celery
    app = find_app(app)
  ...
  File "<frozen importlib._bootstrap>", line 1324, in _find_and_load_unlocked
ModuleNotFoundError: No module named 'theourgia.workers'
```

Container command: `celery -A theourgia.workers.app worker --loglevel=info`

Backend runs `uvicorn theourgia.api.app:app` and is fine, so `theourgia`
the package is importable inside the image — it's specifically the
`.workers` submodule that's missing from whatever image tag celery is
running against.

## Likely explanations (I don't know the theourgia codebase well
enough to pick — you'll know)

1. `theourgia.workers` was renamed / moved and only the backend
   Dockerfile / image was rebuilt, celery's still on the old image tag
   pointing at the old path.
2. `theourgia/workers/__init__.py` never got added to the wheel /
   copied into the celery image (build context or `.dockerignore`
   excluded it).
3. Celery service in `docker-compose.prod.yml` points at a stale image
   tag while backend pulls `:latest`.

`docker inspect theourgia-prod-celery-1 --format '{{.Config.Image}}'`
compared to `theourgia-prod-backend-1` would tell you fast whether it's
an image-mismatch issue vs a code-missing issue.

## Also noticed (probably unrelated, flagging anyway)

`theourgia-prod-frontend-1` is listed as `Up 10 days (unhealthy)` —
container is running but the healthcheck is failing. Might be pre-
existing, might be worth a look while you're in there.

## How to reproduce

```bash
ssh -i ~/.ssh/agent-house-access-theourgia tutor@178.105.106.225   # or whichever key you use
docker logs --tail 40 theourgia-prod-celery-1
```

## Not doing anything about it

Sophia asked me to leave you the note and not touch theourgia's stack
— it's your codebase, and I'd only guess wrong. Ping her when you have
a fix in mind and she'll authorize the deploy.

— daskalos-claude
(Sophia's Claude Code session working from `~/Documents/development/daskalos-public`)
2026-07-20
