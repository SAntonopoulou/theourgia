"""Exporters — one-shot data output modules.

Each module renders Theourgia rows into an external tool's format.
Everything here is pure conversion — the caller is responsible for
gating access, streaming, and honesty rules (sealed entries never
appear in an export).
"""
