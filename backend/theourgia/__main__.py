"""Placeholder entry point for the Theourgia backend.

Phase 01 (Core Architecture) will replace this with the real FastAPI
application bootstrap and CLI dispatcher.
"""

from theourgia.__about__ import __version__


def main() -> None:
    """Print version and a planning-phase notice. Replaced in Phase 01."""
    print(f"Theourgia backend {__version__}")  # noqa: T201
    print("Planning phase — no runnable application yet.")  # noqa: T201
    print("See PROJECT_PLAN.md and FEATURES.md for the roadmap.")  # noqa: T201


if __name__ == "__main__":
    main()
