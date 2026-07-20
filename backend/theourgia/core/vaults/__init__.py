"""Vault provisioning.

A :class:`~theourgia.models.identity.Vault` is the unit of personal
data isolation and the anchor for federation identity (the AP actor
resolves by ``vault.slug``), Mode A key rotation (per-vault data keys),
and per-vault voces state. Nothing created one until v1-030 — a fresh
install had a User but no Vault, silently degrading every vault-scoped
surface. This package owns the get-or-create path.
"""

from theourgia.core.vaults.provision import ensure_vault, vault_slug

__all__ = ["ensure_vault", "vault_slug"]
