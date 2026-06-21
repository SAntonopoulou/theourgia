"""Entry template substrate.

12 built-in templates ship with the application — the practitioner-
essential set per `plan/04-journaling.md` §3. Each template is a
Tiptap-JSON body with prompt placeholders rendered as ghosted text
in the editor.

Three citation/scope tiers as for festivals (`plan` §"Templates"):

* **Built-in** (this module) — ship with the application, scope =
  ``publishable``, license = `AGPL-3.0-only`. The maintainer can
  edit / extend but the defaults are tested and documented.
* **Personal** — user-authored, scope = ``personal``.
* **Vault-shared** — user-authored, scope = ``vault_shared``.

Loading: the seeder in :func:`seed_builtin_templates` is called once
at app boot (idempotent: skipped if any built-in template already
exists in the database). The function is also called by the test
fixture for unit tests that need built-ins available.
"""

from theourgia.core.templates.builtins import (
    BUILTIN_TEMPLATES,
    builtin_by_id,
    seed_builtin_templates,
)

__all__ = [
    "BUILTIN_TEMPLATES",
    "builtin_by_id",
    "seed_builtin_templates",
]
