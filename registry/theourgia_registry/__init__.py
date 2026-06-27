"""Theourgia plugin registry — `plugins.theourgia.com`.

The author/reviewer/public side of the plugin ecosystem. The main
backend app (the vault host) is the *consumer* — it talks to this
registry through ``GET /api/v1/plugins/registry/search`` and the
download endpoints. This app is the producer.

Multi-maintainer ready from day 1: the maintainer table carries
role assignments + appointed-at timestamps, so multi-maintainer
governance lands without a schema migration.
"""

from theourgia_registry.__about__ import __version__

__all__ = ["__version__"]
