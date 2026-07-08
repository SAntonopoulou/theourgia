"""Importers — one-shot data ingest modules.

Each module parses an external tool's export and returns a sequence
of Theourgia payloads ready to persist. Everything here is pure
conversion — the caller wires the DB, honesty rules, and auth.
"""
