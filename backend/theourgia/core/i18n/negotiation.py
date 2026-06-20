"""Accept-Language header parsing and locale negotiation.

Parses RFC 7231-style ``Accept-Language`` header values into ordered
locale candidates, then picks the best-matching supported locale.

We deliberately do not require a full RFC 4647 matcher — features in
the spec like extended-range matching, basic-filtering, and BCP 47
lookup are over-engineered for what we need. The pattern is:

1. Parse the header into (locale-tag, quality) tuples ordered by quality.
2. For each candidate, try an exact match against ``supported``.
3. If no exact match, try the language-only prefix (e.g., ``en-US`` →
   ``en``).
4. Fall back to ``default`` when nothing matches.

This matches what every major framework (Django, Flask-Babel, FastAPI
i18n extensions) does in practice.
"""

from __future__ import annotations

__all__ = ["negotiate_locale", "parse_accept_language"]


def parse_accept_language(header: str) -> list[tuple[str, float]]:
    """Parse an ``Accept-Language`` header into ``(locale, quality)`` tuples.

    Order: highest quality first; ties preserve insertion order.

    Malformed entries (bad ``q=`` values, empty tokens) are silently
    skipped rather than raising — Accept-Language is client-supplied
    and we shouldn't 500 because Safari sent something weird.

    Examples:

        >>> parse_accept_language("en-US,en;q=0.9,fr;q=0.7")
        [('en-us', 1.0), ('en', 0.9), ('fr', 0.7)]
    """
    if not header:
        return []

    results: list[tuple[str, float]] = []
    for token in header.split(","):
        token = token.strip()
        if not token:
            continue
        if ";" in token:
            locale_part, qpart = token.split(";", 1)
            # Be permissive about whitespace inside the q-spec — some
            # clients send "q = 0.5" with spaces around the equals.
            qpart = qpart.strip().replace(" ", "")
            q = 1.0
            if qpart.lower().startswith("q="):
                try:
                    q = float(qpart[2:])
                except ValueError:
                    q = 0.0
        else:
            locale_part = token
            q = 1.0

        locale = locale_part.strip().lower()
        if not locale:
            continue
        if q < 0 or q > 1:
            continue
        results.append((locale, q))

    # Stable sort, highest quality first
    results.sort(key=lambda x: -x[1])
    return results


def negotiate_locale(
    accept: str,
    supported: list[str],
    default: str,
) -> str:
    """Pick the best-matching supported locale.

    Args:
        accept: Raw ``Accept-Language`` header value.
        supported: List of supported locale tags (canonical form,
            e.g., ``["en", "es", "fr", "pt-BR"]``).
        default: Locale to return when no supported tag matches.

    Returns:
        One of the ``supported`` strings (preserving the supplied
        case) or ``default``.
    """
    if not supported:
        return default

    supported_lower = [s.lower() for s in supported]

    for locale, _q in parse_accept_language(accept):
        # Exact match
        if locale in supported_lower:
            return supported[supported_lower.index(locale)]
        # Prefix match (en-US → en)
        if "-" in locale:
            base = locale.split("-", 1)[0]
            if base in supported_lower:
                return supported[supported_lower.index(base)]

    return default
