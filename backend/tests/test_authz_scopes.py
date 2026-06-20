"""Tests for the Scope enum."""

from __future__ import annotations

from theourgia.core.authz.scopes import Scope


def test_scope_value_is_dotted_lowercase() -> None:
    for scope in Scope:
        assert scope.value == scope.value.lower()
        assert "." in scope.value
        # No spaces
        assert " " not in scope.value


def test_scope_namespaces_are_grouped() -> None:
    """Each scope's leading segment identifies its domain."""
    expected_domains = {
        "entry",
        "entity",
        "vault",
        "hub",
        "session",
        "user",
        "key",
        "sealed",
        "plugin",
        "federation",
        "backup",
        "audit",
        "agent",
        "admin",
    }
    actual_domains = {scope.value.split(".", 1)[0] for scope in Scope}
    assert actual_domains.issubset(expected_domains)


def test_scopes_are_unique() -> None:
    values = [s.value for s in Scope]
    assert len(values) == len(set(values))


def test_scope_is_str_enum() -> None:
    """Scope values are usable wherever a string is expected."""
    assert Scope.ENTRY_READ == "entry.read"
    assert str(Scope.ENTRY_READ.value) == "entry.read"
    # Comparable to plain strings
    assert "entry.read" == Scope.ENTRY_READ.value


def test_known_critical_scopes_exist() -> None:
    """Smoke check: load-bearing scopes mentioned by the plan are present."""
    critical = {
        Scope.ENTRY_READ,
        Scope.ENTRY_WRITE,
        Scope.ENTRY_SEAL,
        Scope.ENTRY_UNSEAL,
        Scope.VAULT_CREATE,
        Scope.VAULT_TRANSFER,
        Scope.HUB_ADMIN,
        Scope.PLUGIN_INSTALL,
        Scope.FEDERATION_PUSH,
        Scope.BACKUP_RUN,
        Scope.AUDIT_READ,
    }
    # If any of these scopes disappears in a future refactor without an
    # ADR and a supersession path, this test catches it.
    for s in critical:
        assert s in Scope
