"""Smoke tests — verify the package can be imported and basic metadata is present.

These tests run before any real functionality lands. They prove that the
package skeleton is healthy and `just test` returns green from day one.
"""

from __future__ import annotations

import theourgia
from theourgia.__about__ import __license__, __project_url__, __version__


def test_package_imports() -> None:
    """The top-level package imports cleanly."""
    assert theourgia is not None


def test_version_string_is_present() -> None:
    """The package exposes a non-empty version string."""
    assert isinstance(__version__, str)
    assert len(__version__) > 0


def test_license_is_agpl() -> None:
    """License metadata reflects AGPL-3.0-only — non-negotiable for this project."""
    assert __license__ == "AGPL-3.0-only"


def test_project_url_points_to_canonical_repo() -> None:
    """Project URL points to the canonical SAntonopoulou repo."""
    assert __project_url__ == "https://github.com/SAntonopoulou/theourgia"
