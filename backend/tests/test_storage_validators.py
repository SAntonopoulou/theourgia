"""Tests for upload validators."""

from __future__ import annotations

import pytest

from theourgia.core.storage.validators import (
    DEFAULT_MAX_SIZE,
    ValidationError,
    detect_content_type,
    validate_size,
)


def test_detect_known_extensions() -> None:
    assert detect_content_type("photo.jpg") in {"image/jpeg", "image/jpg"}
    assert detect_content_type("doc.pdf") == "application/pdf"
    assert detect_content_type("page.html") == "text/html"


def test_detect_unknown_extension_falls_back() -> None:
    assert detect_content_type("file.zzzz") == "application/octet-stream"
    assert detect_content_type("noextension") == "application/octet-stream"


def test_validate_size_passes_for_reasonable() -> None:
    validate_size(1024)
    validate_size(DEFAULT_MAX_SIZE)


def test_validate_size_rejects_oversize() -> None:
    with pytest.raises(ValidationError, match="exceeds"):
        validate_size(DEFAULT_MAX_SIZE + 1)


def test_validate_size_rejects_negative() -> None:
    with pytest.raises(ValidationError, match="negative"):
        validate_size(-1)


def test_validate_size_respects_custom_max() -> None:
    validate_size(500, max_size=1000)
    with pytest.raises(ValidationError):
        validate_size(2000, max_size=1000)


def test_validation_error_is_valueerror() -> None:
    """ValidationError extends ValueError so callers can catch broadly."""
    try:
        validate_size(-1)
    except ValueError as exc:
        assert isinstance(exc, ValidationError)
