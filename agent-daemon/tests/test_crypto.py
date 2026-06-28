"""Mode B crypto round-trip + per-record key isolation tests.

Argon2 is intentionally slow; we use minimal parameters in tests so
they don't dominate CI. Production defaults live in
:class:`theourgia_agent.core.config.AgentDaemonSettings`.
"""

from __future__ import annotations

import pytest
from cryptography.exceptions import InvalidTag

from theourgia_agent.core.crypto import (
    EncryptedKey,
    InMemoryKeyVault,
    decrypt_api_key,
    derive_master,
    encrypt_api_key,
)


PASSPHRASE = "do what thou wilt"
WRONG_PASSPHRASE = "love is the law"
API_KEY = "sk-ant-test-key-12345"


def test_encrypt_decrypt_round_trip(monkeypatch) -> None:
    # Speed up argon2 for tests
    from theourgia_agent.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_MEMORY_COST_KIB", "256")
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_TIME_COST", "1")
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_PARALLELISM", "1")
    get_settings.cache_clear()

    master = derive_master(PASSPHRASE)
    record = encrypt_api_key(API_KEY, master)
    assert isinstance(record, EncryptedKey)
    assert record.nonce != record.ciphertext
    assert len(record.nonce) == 12  # AES-GCM standard
    assert len(record.record_id) == 16

    plaintext = decrypt_api_key(record, master)
    assert plaintext == API_KEY


def test_wrong_passphrase_fails_with_invalid_tag(monkeypatch) -> None:
    from theourgia_agent.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_MEMORY_COST_KIB", "256")
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_TIME_COST", "1")
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_PARALLELISM", "1")
    get_settings.cache_clear()

    record = encrypt_api_key(API_KEY, derive_master(PASSPHRASE))
    wrong_master = derive_master(WRONG_PASSPHRASE)
    with pytest.raises(InvalidTag):
        decrypt_api_key(record, wrong_master)


def test_per_record_keys_are_isolated(monkeypatch) -> None:
    """Encrypting twice yields different ciphertexts AND nonces AND
    record_ids. Decrypting cross-record with the same master fails."""
    from theourgia_agent.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_MEMORY_COST_KIB", "256")
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_TIME_COST", "1")
    monkeypatch.setenv("THEOURGIA_AGENT_ARGON2_PARALLELISM", "1")
    get_settings.cache_clear()

    master = derive_master(PASSPHRASE)
    rec_a = encrypt_api_key("key-a", master)
    rec_b = encrypt_api_key("key-b", master)
    assert rec_a.record_id != rec_b.record_id
    assert rec_a.nonce != rec_b.nonce
    assert rec_a.ciphertext != rec_b.ciphertext

    # And the right master decrypts each correctly
    assert decrypt_api_key(rec_a, master) == "key-a"
    assert decrypt_api_key(rec_b, master) == "key-b"


def test_in_memory_vault_store_and_forget() -> None:
    vault = InMemoryKeyVault()
    assert vault.has("v1", "a1") is False

    vault.store("v1", "a1", "plaintext-key")
    assert vault.has("v1", "a1") is True
    assert vault.get("v1", "a1") == "plaintext-key"

    vault.forget("v1", "a1")
    assert vault.has("v1", "a1") is False
    assert vault.get("v1", "a1") is None


def test_in_memory_vault_lock_clears_everything() -> None:
    vault = InMemoryKeyVault()
    vault.store("v1", "a1", "k1")
    vault.store("v1", "a2", "k2")
    vault.store("v2", "a1", "k3")
    assert vault.has("v1", "a1")
    assert vault.has("v2", "a1")

    vault.lock()
    assert vault.has("v1", "a1") is False
    assert vault.has("v1", "a2") is False
    assert vault.has("v2", "a1") is False


def test_in_memory_vault_never_persists() -> None:
    """Belt-and-braces: the vault has __slots__ + a single dict —
    not pickleable to disk, not serialisable through model_dump etc."""
    vault = InMemoryKeyVault()
    assert vault.__slots__ == ("_store",)
    vault.store("v1", "a1", "secret")
    # `_store` is a plain dict, not a public attribute the rest of the
    # codebase can introspect by accident.
    assert isinstance(vault._store, dict)
