"""Tests for the structured logging configuration."""

from __future__ import annotations

import json
import logging

import pytest

from theourgia.core.observability.context import (
    bind_request_id,
    bind_user_id,
    clear_observability_context,
    get_request_id,
    get_user_id,
)
from theourgia.core.observability.logging import configure_logging, get_logger


@pytest.fixture(autouse=True)
def _reset_context() -> None:
    clear_observability_context()
    yield
    clear_observability_context()


def test_configure_logging_is_idempotent() -> None:
    """Calling configure_logging multiple times must not duplicate handlers."""
    configure_logging(level="INFO", json_output=True)
    handler_count_after_first = len(logging.getLogger().handlers)
    configure_logging(level="INFO", json_output=True)
    handler_count_after_second = len(logging.getLogger().handlers)
    assert handler_count_after_first == handler_count_after_second == 1


def test_json_output_is_parseable_json(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging(level="INFO", json_output=True)
    logger = get_logger("test_logger")
    logger.info("user.signed_in", extra_key="extra_value")
    captured = capsys.readouterr().err
    # At least one line should be parseable JSON containing our event
    parsed_lines: list[dict] = []
    for line in captured.strip().splitlines():
        try:
            parsed_lines.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    assert any(line.get("event") == "user.signed_in" for line in parsed_lines)


def test_request_id_appears_in_log_output(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging(level="INFO", json_output=True)
    bind_request_id("test-req-12345")
    logger = get_logger("test_logger")
    logger.info("auth.attempt")
    captured = capsys.readouterr().err
    for line in captured.strip().splitlines():
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if data.get("event") == "auth.attempt":
            assert data.get("request_id") == "test-req-12345"
            return
    pytest.fail("Did not find auth.attempt log line in output")


def test_user_id_appears_in_log_output(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging(level="INFO", json_output=True)
    bind_user_id("user-uuid-here")
    logger = get_logger("test_logger")
    logger.info("entry.created")
    captured = capsys.readouterr().err
    for line in captured.strip().splitlines():
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if data.get("event") == "entry.created":
            assert data.get("user_id") == "user-uuid-here"
            return
    pytest.fail("Did not find entry.created log line")


def test_context_unset_omits_keys(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging(level="INFO", json_output=True)
    # No bind_request_id / bind_user_id calls
    logger = get_logger("test_logger")
    logger.info("anon.event")
    captured = capsys.readouterr().err
    for line in captured.strip().splitlines():
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if data.get("event") == "anon.event":
            assert "request_id" not in data
            assert "user_id" not in data
            return
    pytest.fail("Did not find anon.event log line")


def test_pretty_mode_does_not_crash(capsys: pytest.CaptureFixture[str]) -> None:
    """The dev / pretty path should at least produce some output without
    raising. We don't pin exact format because color codes vary."""
    configure_logging(level="DEBUG", json_output=False)
    logger = get_logger("test_logger")
    logger.info("dev.event", with_key="with_value")
    captured = capsys.readouterr().err
    assert "dev.event" in captured


def test_context_helpers_round_trip() -> None:
    assert get_request_id() is None
    assert get_user_id() is None
    bind_request_id("R1")
    bind_user_id("U1")
    assert get_request_id() == "R1"
    assert get_user_id() == "U1"
    clear_observability_context()
    assert get_request_id() is None
    assert get_user_id() is None


def test_log_level_filters_lower_levels(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging(level="WARNING", json_output=True)
    logger = get_logger("test_logger")
    logger.info("should.not.appear")
    logger.warning("should.appear")
    captured = capsys.readouterr().err
    assert "should.not.appear" not in captured
    assert "should.appear" in captured
