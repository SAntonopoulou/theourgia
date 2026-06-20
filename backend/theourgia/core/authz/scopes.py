"""Permission scopes — string-enum names for actions the API supports.

Endpoints declare the scope they require; the authorization layer
verifies the caller has the right relationship to the resource for
that scope.

Scopes are namespaced by domain (``entry.``, ``entity.``, ``vault.``,
…) for readability and to make grep-based audits practical. New scopes
are added as new endpoints land; existing scopes are never renamed
(only deprecated and superseded) so external integrations that depend
on the surface aren't silently broken.
"""

from __future__ import annotations

import enum

__all__ = ["Scope"]


class Scope(str, enum.Enum):
    """Action scopes the API recognizes.

    The string value is the wire format; the enum form is what code
    uses. Members are grouped by domain via comment headers.
    """

    # ── Entry domain ─────────────────────────────────────────────────
    ENTRY_READ = "entry.read"
    ENTRY_WRITE = "entry.write"
    ENTRY_DELETE = "entry.delete"
    ENTRY_PUBLISH = "entry.publish"  # change visibility outward
    ENTRY_SEAL = "entry.seal"  # convert to sealed (zero-knowledge)
    ENTRY_UNSEAL = "entry.unseal"  # decrypt sealed content (records audit)

    # ── Entity (gods / spirits / ancestors / servitors / …) domain ───
    ENTITY_READ = "entity.read"
    ENTITY_WRITE = "entity.write"
    ENTITY_DELETE = "entity.delete"

    # ── Vault domain ─────────────────────────────────────────────────
    VAULT_CREATE = "vault.create"
    VAULT_READ = "vault.read"
    VAULT_UPDATE = "vault.update"
    VAULT_DELETE = "vault.delete"
    VAULT_TRANSFER = "vault.transfer"
    VAULT_MEMBER_INVITE = "vault.member.invite"
    VAULT_MEMBER_REMOVE = "vault.member.remove"

    # ── Hub domain ───────────────────────────────────────────────────
    HUB_CREATE = "hub.create"
    HUB_READ = "hub.read"
    HUB_UPDATE = "hub.update"
    HUB_DELETE = "hub.delete"
    HUB_MEMBER_INVITE = "hub.member.invite"
    HUB_MEMBER_APPROVE = "hub.member.approve"
    HUB_MEMBER_REMOVE = "hub.member.remove"
    HUB_PUBLISH = "hub.publish"  # accept content from member into hub
    HUB_ADMIN = "hub.admin"  # change roles, permissions, settings
    HUB_OFFICER = "hub.officer"  # moderate, curate newsletter

    # ── Authentication / session ─────────────────────────────────────
    SESSION_READ = "session.read"
    SESSION_REVOKE = "session.revoke"
    USER_PASSWORD_CHANGE = "user.password.change"
    USER_2FA_ENROLL = "user.2fa.enroll"
    USER_2FA_DISABLE = "user.2fa.disable"

    # ── Encryption ───────────────────────────────────────────────────
    KEY_ROTATE = "key.rotate"  # rotate vault data key
    SEALED_SETUP = "sealed.setup"  # initialize Mode B for a scope

    # ── Plugin lifecycle ─────────────────────────────────────────────
    PLUGIN_INSTALL = "plugin.install"
    PLUGIN_CONFIGURE = "plugin.configure"
    PLUGIN_ACTIVATE = "plugin.activate"
    PLUGIN_UNINSTALL = "plugin.uninstall"

    # ── Federation ───────────────────────────────────────────────────
    FEDERATION_PEER_ADD = "federation.peer.add"
    FEDERATION_PEER_REMOVE = "federation.peer.remove"
    FEDERATION_PUSH = "federation.push"

    # ── Operations ───────────────────────────────────────────────────
    BACKUP_RUN = "backup.run"
    BACKUP_RESTORE = "backup.restore"
    AUDIT_READ = "audit.read"
    ADMIN_OBSERVE = "admin.observe"  # /metrics, observability surface
    AGENT_CONFIGURE = "agent.configure"
    AGENT_INVOKE = "agent.invoke"
