"""Version and project metadata for Theourgia.

Single source of truth for the installed package's version string.
``pyproject.toml`` reads from here at build time once we wire it up;
runtime code imports ``__version__`` from this module directly.
"""

__version__ = "0.0.0-dev"
"""Pre-release version; bumped on tagged releases per SemVer."""

__project_url__ = "https://github.com/SAntonopoulou/theourgia"
__docs_url__ = "https://theourgia.com"
__license__ = "AGPL-3.0-only"
