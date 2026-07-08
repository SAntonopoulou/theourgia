"""Obsidian-compatible markdown export.

b108-2hh part 2 · FEATURES §13 (reference plugin: Obsidian
markdown exporter).

Converts a Theourgia Entry into an Obsidian-friendly markdown
document with YAML frontmatter. Rules:

* Frontmatter carries `title`, `type`, `created`, `updated`,
  `visibility`, `glyph`, and (if present) `occurred_at`, `tags`.
* Body is emitted as plain-text markdown. Rich Tiptap JSON is
  rendered via a minimal walker that supports paragraphs,
  headings, bullet/ordered lists, code, quotes, bold, italic,
  and links. Custom node kinds (calendar-stamp, correspondence
  table, etc.) render as visible YAML blocks so the semantics
  aren't lost on export.
* Sealed entries are NEVER exported — the caller filters them out.
  If a sealed row somehow reaches the encoder, ValueError is raised.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Iterable


__all__ = ["ObsidianExportEntry", "render_entry_markdown", "safe_filename"]


@dataclass(frozen=True)
class ObsidianExportEntry:
    """Denormalised entry ready to be rendered as markdown."""

    id: str
    title: str
    entry_type: str
    excerpt: str
    body_text: str | None
    body_json: str | None
    glyph: str
    visibility: str
    created_at: str  # ISO-8601
    updated_at: str  # ISO-8601
    occurred_at: str | None = None
    tags: tuple[str, ...] = ()
    sealed: bool = False


_FRONTMATTER_ORDER = (
    "id",
    "title",
    "type",
    "glyph",
    "visibility",
    "occurred_at",
    "created_at",
    "updated_at",
    "tags",
)


def safe_filename(entry: ObsidianExportEntry) -> str:
    """Sanitise the entry title for a filesystem-safe filename.

    Obsidian vaults use file basename as note identifier — special
    characters must be stripped so the vault imports cleanly.
    """
    clean = re.sub(r"[^A-Za-z0-9 _\-]", "", entry.title)
    clean = clean.strip() or f"entry-{entry.id[:8]}"
    # Collapse whitespace.
    clean = re.sub(r"\s+", " ", clean).strip()
    return f"{clean}.md"


def _yaml_scalar(value: Any) -> str:
    """Render a scalar for YAML frontmatter. Everything is quoted so
    we never trip YAML edge cases (booleans, colons, dashes)."""
    if value is None:
        return '""'
    text = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def _yaml_list(values: Iterable[str]) -> str:
    items = ", ".join(_yaml_scalar(v) for v in values)
    return f"[{items}]"


def _frontmatter(entry: ObsidianExportEntry) -> str:
    lines = ["---"]
    for key in _FRONTMATTER_ORDER:
        if key == "id":
            lines.append(f"id: {_yaml_scalar(entry.id)}")
        elif key == "title":
            lines.append(f"title: {_yaml_scalar(entry.title)}")
        elif key == "type":
            lines.append(f"type: {_yaml_scalar(entry.entry_type)}")
        elif key == "glyph":
            lines.append(f"glyph: {_yaml_scalar(entry.glyph)}")
        elif key == "visibility":
            lines.append(f"visibility: {_yaml_scalar(entry.visibility)}")
        elif key == "occurred_at":
            if entry.occurred_at:
                lines.append(f"occurred_at: {_yaml_scalar(entry.occurred_at)}")
        elif key == "created_at":
            lines.append(f"created_at: {_yaml_scalar(entry.created_at)}")
        elif key == "updated_at":
            lines.append(f"updated_at: {_yaml_scalar(entry.updated_at)}")
        elif key == "tags":
            if entry.tags:
                lines.append(f"tags: {_yaml_list(entry.tags)}")
    lines.append("---")
    return "\n".join(lines)


# ── Tiptap JSON → markdown ────────────────────────────────────────


def _render_tiptap(node: dict[str, Any], depth: int = 0) -> str:
    kind = node.get("type", "")
    content = node.get("content", []) or []

    if kind == "doc":
        return "\n\n".join(_render_tiptap(c, depth) for c in content)

    if kind == "paragraph":
        return _render_inline(content)

    if kind == "heading":
        level = int(node.get("attrs", {}).get("level", 2))
        text = _render_inline(content)
        return f"{'#' * level} {text}"

    if kind == "bulletList":
        return "\n".join(_render_list_item(c, "-", depth) for c in content)

    if kind == "orderedList":
        return "\n".join(
            _render_list_item(c, f"{i + 1}.", depth)
            for i, c in enumerate(content)
        )

    if kind == "codeBlock":
        text = "".join(_text_leaf(c) for c in content)
        lang = node.get("attrs", {}).get("language", "")
        return f"```{lang}\n{text}\n```"

    if kind == "blockquote":
        inner = "\n\n".join(_render_tiptap(c, depth) for c in content)
        return "\n".join("> " + line for line in inner.split("\n"))

    if kind == "horizontalRule":
        return "---"

    # Custom nodes — emit as a YAML block so semantics survive.
    if kind:
        attrs = node.get("attrs", {}) or {}
        payload = json.dumps({"type": kind, "attrs": attrs}, indent=2)
        return f"```yaml\n# theourgia custom block\n{payload}\n```"

    return ""


def _render_list_item(item: dict[str, Any], marker: str, depth: int) -> str:
    inner_content = item.get("content", []) or []
    inner = "\n".join(_render_tiptap(c, depth + 1) for c in inner_content)
    indent = "  " * depth
    return f"{indent}{marker} {inner}"


def _render_inline(content: Iterable[dict[str, Any]]) -> str:
    parts: list[str] = []
    for c in content:
        text = _text_leaf(c)
        marks = c.get("marks", []) or []
        for mark in marks:
            mtype = mark.get("type")
            if mtype == "bold":
                text = f"**{text}**"
            elif mtype == "italic":
                text = f"*{text}*"
            elif mtype == "code":
                text = f"`{text}`"
            elif mtype == "link":
                href = mark.get("attrs", {}).get("href", "")
                text = f"[{text}]({href})"
        parts.append(text)
    return "".join(parts)


def _text_leaf(node: dict[str, Any]) -> str:
    if node.get("type") == "text":
        return str(node.get("text", ""))
    if node.get("type") == "hardBreak":
        return "  \n"
    # Fallback: recurse for nested content in unknown inline kinds.
    return _render_inline(node.get("content", []) or [])


# ── Top-level render ──────────────────────────────────────────────


def render_entry_markdown(entry: ObsidianExportEntry) -> str:
    """Render an entry to Obsidian markdown.

    Sealed entries never round-trip through here — the export
    endpoint filters them upstream. If a sealed row reaches us,
    raise so the leak surfaces loudly.
    """
    if entry.sealed:
        msg = f"sealed entry {entry.id} must not be exported"
        raise ValueError(msg)

    frontmatter = _frontmatter(entry)

    if entry.body_json:
        try:
            doc = json.loads(entry.body_json)
            body = _render_tiptap(doc)
        except (json.JSONDecodeError, TypeError):
            body = entry.body_text or entry.excerpt
    elif entry.body_text:
        body = entry.body_text
    else:
        body = entry.excerpt

    return f"{frontmatter}\n\n{body}\n"
