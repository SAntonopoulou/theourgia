"""Common API response schemas.

Schemas specific to one router live alongside that router. This module
holds the cross-cutting shapes that every endpoint may emit — the
:class:`Problem` payload for errors most prominently.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

__all__ = ["Problem", "Meta"]


class Problem(BaseModel):
    """RFC 7807 problem-details response.

    Returned for any API error with ``Content-Type:
    application/problem+json``. Clients should consume this rather than
    relying on HTTP status codes alone.

    Fields:

    - ``type`` — a URI identifying the problem type. Defaults to
      ``about:blank`` (per RFC) which means "see the status code." When
      Theourgia has a stable taxonomy of error types (post-1.0) this
      will point at a documentation URL.
    - ``title`` — short, human-readable summary of the problem.
    - ``status`` — HTTP status code mirroring the response.
    - ``detail`` — optional human-readable explanation specific to this
      occurrence. Safe to surface to end-users.
    - ``instance`` — optional URI identifying the specific occurrence
      (we populate with the request path).
    - ``request_id`` — correlation ID matching ``X-Request-ID`` for log
      correlation. Non-standard extension to RFC 7807.
    """

    model_config = ConfigDict(extra="forbid")

    type: str = Field(default="about:blank", description="URI identifying the problem type")
    title: str = Field(description="Short summary of the problem")
    status: int = Field(description="HTTP status code")
    detail: str | None = Field(default=None, description="Human-readable explanation")
    instance: str | None = Field(default=None, description="URI of this occurrence")
    request_id: str | None = Field(default=None, description="Correlation ID for logs")


class Meta(BaseModel):
    """Response of ``GET /api/v1/meta`` — about this instance.

    Used by clients to discover capabilities, version compatibility, and
    instance identity before deeper interaction.
    """

    model_config = ConfigDict(extra="forbid")

    instance_id: str = Field(description="Federation actor identifier (host portion)")
    version: str = Field(description="Backend package version")
    api_version: str = Field(description="API version identifier (e.g., 'v1')")
    environment: str = Field(description="'development' | 'production' | 'test'")
    telemetry: str = Field(
        default="none",
        description="Stated telemetry posture. Always 'none' for Theourgia.",
    )
    license: str = Field(default="AGPL-3.0-only")
    source: str = Field(default="https://github.com/SAntonopoulou/theourgia")
