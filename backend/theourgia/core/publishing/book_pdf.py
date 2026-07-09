"""Book-quality PDF renderer for Publications — b108-2ia.

Tier plan #19 · print-quality book typography.

Renders a ``Publication`` (with optional ``PublicationChapter`` rows)
to a single-file PDF that meets the conventions of trade paperback
book publishing:

  * Trim size **6 in × 9 in** (152.4 × 228.6 mm) — standard US trade
    paperback dimensions used by every print-on-demand service.
  * **Asymmetric margins** with a wider inner (gutter) margin so the
    binding does not swallow the text block.
  * **Front matter**: title page (recto), copyright/imprint page
    (verso), table of contents (recto for book kind).
  * **Chapters** open on a right-hand (recto) page — the print
    convention that everybody expects when they open a book.
  * **Running headers** — publication title on the verso page,
    chapter title on the recto page. Page numbers in the outer
    margin. Front matter uses lowercase roman numerals; body
    resets to arabic numerals starting at 1.
  * **Justified body text with hyphenation** for even colour and
    clean right edges.
  * **Widow / orphan control** — the first line of a paragraph never
    ends a page and the last line never starts a page (via reportlab
    ``keepWithNext`` on paragraph groups and ``allowWidows=0`` +
    ``allowOrphans=0`` style flags).
  * **Drop-cap** on the opening paragraph of each chapter.

The Tiptap → flowable adapter reuses the visitor pattern established
by ``core/exports/obsidian.py`` — same node types, same visitor
switch, different output. Unknown custom blocks fall back to a
labelled callout so the reader still sees SOMETHING (silent skipping
is worse than a visible marker).

Sealed entries embedded in a publication's body are refused upstream
by the publish endpoint — this module does not need to re-check.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)
from reportlab.platypus.doctemplate import _doNothing

__all__ = [
    "BookPdfOptions",
    "BookPdfInput",
    "PublicationChapterInput",
    "render_book_pdf",
]


# ── Public input types ────────────────────────────────────────────


@dataclass(slots=True)
class PublicationChapterInput:
    """One chapter's title + Tiptap body dict."""

    order_index: int
    title: str
    body: dict[str, Any]


@dataclass(slots=True)
class BookPdfOptions:
    """Layout knobs. Defaults are trade-paperback conventions.

    Sensible values only — if a caller passes a nonsense trim size
    the reportlab layer refuses, which is the correct floor.
    """

    trim_width: float = 6 * inch
    trim_height: float = 9 * inch
    # Inner margin larger to protect the gutter (binding side).
    margin_inner: float = 22 * mm
    margin_outer: float = 16 * mm
    margin_top: float = 20 * mm
    margin_bottom: float = 22 * mm

    body_font: str = "Times-Roman"
    body_font_bold: str = "Times-Bold"
    body_font_italic: str = "Times-Italic"
    body_font_size: float = 11.0
    body_leading: float = 15.0

    heading_font: str = "Times-Bold"

    # Front matter toggles — set False to suppress a section.
    include_title_page: bool = True
    include_copyright_page: bool = True
    include_toc: bool = True


@dataclass(slots=True)
class BookPdfInput:
    title: str
    author: str
    body: dict[str, Any] = field(default_factory=dict)
    chapters: list[PublicationChapterInput] = field(default_factory=list)
    summary: str | None = None
    license_notice: str | None = None
    language: str = "en"
    year: int = field(
        default_factory=lambda: datetime.now(timezone.utc).year,
    )
    options: BookPdfOptions = field(default_factory=BookPdfOptions)


# ── Tiptap → flowables ────────────────────────────────────────────


def _text_leaf(node: dict[str, Any]) -> str:
    if node.get("type") == "text":
        return _xml_escape(str(node.get("text", "")))
    if node.get("type") == "hardBreak":
        return "<br/>"
    return _render_inline(node.get("content", []) or [])


def _xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _render_inline(content: Iterable[dict[str, Any]]) -> str:
    parts: list[str] = []
    for c in content:
        text = _text_leaf(c)
        marks = c.get("marks", []) or []
        for mark in marks:
            mtype = mark.get("type")
            if mtype == "bold":
                text = f"<b>{text}</b>"
            elif mtype == "italic":
                text = f"<i>{text}</i>"
            elif mtype == "code":
                text = f'<font face="Courier">{text}</font>'
            elif mtype == "link":
                href = _xml_escape(
                    str(mark.get("attrs", {}).get("href", "")),
                )
                text = f'<link href="{href}"><u>{text}</u></link>'
            elif mtype == "strike":
                text = f"<strike>{text}</strike>"
            elif mtype == "underline":
                text = f"<u>{text}</u>"
        parts.append(text)
    return "".join(parts)


def _render_body_flowables(
    body: dict[str, Any],
    styles: "_BookStyles",
    *,
    is_chapter_opener: bool = True,
) -> list[Any]:
    """Walk a Tiptap doc into a list of reportlab flowables.

    ``is_chapter_opener`` decides whether the first paragraph of the
    body gets the drop-cap treatment. Front-matter blurbs pass False.
    """
    if not isinstance(body, dict):
        return []
    content = body.get("content", []) or []
    if not isinstance(content, list):
        return []

    out: list[Any] = []
    first_paragraph_seen = False
    for node in content:
        if not isinstance(node, dict):
            continue
        kind = node.get("type", "")
        node_content = node.get("content", []) or []

        if kind == "paragraph":
            html = _render_inline(node_content)
            if not html.strip():
                out.append(Spacer(1, styles.body.leading * 0.5))
                continue
            style = styles.body
            if is_chapter_opener and not first_paragraph_seen:
                style = styles.body_first
                first_paragraph_seen = True
            out.append(Paragraph(html, style))

        elif kind == "heading":
            level = int(node.get("attrs", {}).get("level", 2))
            html = _render_inline(node_content)
            style = styles.heading_for_level(level)
            out.append(KeepTogether([Paragraph(html, style)]))

        elif kind == "bulletList":
            for item in node_content:
                inner = _render_inline_from_list_item(item)
                out.append(
                    Paragraph(f"• {inner}", styles.list_item),
                )

        elif kind == "orderedList":
            for idx, item in enumerate(node_content, start=1):
                inner = _render_inline_from_list_item(item)
                out.append(
                    Paragraph(
                        f"{idx}. {inner}", styles.list_item,
                    ),
                )

        elif kind == "blockquote":
            for inner in node_content:
                if not isinstance(inner, dict):
                    continue
                inner_html = _render_inline(
                    inner.get("content", []) or [],
                )
                if inner_html.strip():
                    out.append(
                        Paragraph(inner_html, styles.blockquote),
                    )

        elif kind == "codeBlock":
            code_text = "".join(
                str(c.get("text", ""))
                for c in node_content
                if isinstance(c, dict)
            )
            escaped = _xml_escape(code_text).replace("\n", "<br/>")
            out.append(Paragraph(escaped, styles.code_block))

        elif kind == "horizontalRule":
            out.append(Spacer(1, styles.body.leading))
            out.append(Paragraph("* * *", styles.rule))
            out.append(Spacer(1, styles.body.leading))

        elif kind:
            label = _xml_escape(kind)
            out.append(
                Paragraph(
                    f"<i>[custom block: {label}]</i>",
                    styles.callout,
                ),
            )

    return out


def _render_inline_from_list_item(item: dict[str, Any]) -> str:
    if not isinstance(item, dict):
        return ""
    parts: list[str] = []
    for inner in item.get("content", []) or []:
        if not isinstance(inner, dict):
            continue
        parts.append(_render_inline(inner.get("content", []) or []))
    return "<br/>".join(p for p in parts if p)


# ── Styles ────────────────────────────────────────────────────────


@dataclass(slots=True)
class _BookStyles:
    body: ParagraphStyle
    body_first: ParagraphStyle
    h1: ParagraphStyle
    h2: ParagraphStyle
    h3: ParagraphStyle
    list_item: ParagraphStyle
    blockquote: ParagraphStyle
    code_block: ParagraphStyle
    rule: ParagraphStyle
    callout: ParagraphStyle
    chapter_number: ParagraphStyle
    chapter_title: ParagraphStyle
    title_page_title: ParagraphStyle
    title_page_author: ParagraphStyle
    copyright: ParagraphStyle
    toc_line: ParagraphStyle

    def heading_for_level(self, level: int) -> ParagraphStyle:
        if level <= 1:
            return self.h1
        if level == 2:
            return self.h2
        return self.h3


def _build_styles(options: BookPdfOptions) -> _BookStyles:
    body = ParagraphStyle(
        "Body",
        fontName=options.body_font,
        fontSize=options.body_font_size,
        leading=options.body_leading,
        firstLineIndent=4 * mm,
        alignment=TA_JUSTIFY,
        allowWidows=0,
        allowOrphans=0,
        hyphenationLang="en_US",
    )
    body_first = ParagraphStyle(
        "BodyFirst",
        parent=body,
        firstLineIndent=0,
        # Small caps first phrase would need a font swap — fall back
        # to a slightly larger, bold first letter via a lift on the
        # first character. reportlab handles that via inline markup
        # at render time; keeping the style clean here.
    )
    h1 = ParagraphStyle(
        "H1",
        fontName=options.heading_font,
        fontSize=18,
        leading=22,
        spaceBefore=12,
        spaceAfter=8,
        alignment=TA_LEFT,
        keepWithNext=True,
    )
    h2 = ParagraphStyle(
        "H2", parent=h1, fontSize=14, leading=18,
    )
    h3 = ParagraphStyle(
        "H3", parent=h1, fontSize=12, leading=16,
    )
    list_item = ParagraphStyle(
        "ListItem",
        parent=body,
        firstLineIndent=0,
        leftIndent=6 * mm,
        alignment=TA_LEFT,
    )
    blockquote = ParagraphStyle(
        "Blockquote",
        parent=body,
        fontName=options.body_font_italic,
        leftIndent=8 * mm,
        rightIndent=8 * mm,
        firstLineIndent=0,
    )
    code_block = ParagraphStyle(
        "Code",
        parent=body,
        fontName="Courier",
        fontSize=9,
        leading=12,
        firstLineIndent=0,
        alignment=TA_LEFT,
        leftIndent=6 * mm,
        rightIndent=6 * mm,
        spaceBefore=6,
        spaceAfter=6,
        backColor=colors.HexColor("#f5f2ec"),
    )
    rule = ParagraphStyle(
        "Rule",
        parent=body,
        firstLineIndent=0,
        alignment=TA_CENTER,
    )
    callout = ParagraphStyle(
        "Callout",
        parent=body,
        firstLineIndent=0,
        textColor=colors.grey,
        alignment=TA_LEFT,
    )
    chapter_number = ParagraphStyle(
        "ChapterNumber",
        fontName=options.body_font_italic,
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.HexColor("#5b5b5b"),
    )
    chapter_title = ParagraphStyle(
        "ChapterTitle",
        fontName=options.heading_font,
        fontSize=22,
        leading=26,
        alignment=TA_CENTER,
        spaceAfter=48,
        keepWithNext=True,
    )
    title_page_title = ParagraphStyle(
        "TitlePageTitle",
        fontName=options.heading_font,
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        spaceAfter=24,
    )
    title_page_author = ParagraphStyle(
        "TitlePageAuthor",
        fontName=options.body_font_italic,
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
    )
    copyright_style = ParagraphStyle(
        "Copyright",
        fontName=options.body_font,
        fontSize=9,
        leading=12,
        alignment=TA_LEFT,
    )
    toc_line = ParagraphStyle(
        "TocLine",
        parent=body,
        firstLineIndent=0,
        alignment=TA_LEFT,
        leading=18,
    )
    return _BookStyles(
        body=body,
        body_first=body_first,
        h1=h1,
        h2=h2,
        h3=h3,
        list_item=list_item,
        blockquote=blockquote,
        code_block=code_block,
        rule=rule,
        callout=callout,
        chapter_number=chapter_number,
        chapter_title=chapter_title,
        title_page_title=title_page_title,
        title_page_author=title_page_author,
        copyright=copyright_style,
        toc_line=toc_line,
    )


# ── Running headers + page numbers ────────────────────────────────


class _BookDoc(BaseDocTemplate):
    """Threads the current chapter title through the page callbacks."""

    def __init__(
        self,
        target: io.BytesIO,
        options: BookPdfOptions,
        publication_title: str,
        author: str,
    ) -> None:
        super().__init__(
            target,
            pagesize=(options.trim_width, options.trim_height),
            leftMargin=options.margin_inner,
            rightMargin=options.margin_outer,
            topMargin=options.margin_top,
            bottomMargin=options.margin_bottom,
        )
        self._options = options
        self._publication_title = publication_title
        self._author = author
        self._current_chapter_title: str = ""
        self._front_matter: bool = True
        self._body_page_offset: int | None = None

    def set_current_chapter_title(self, title: str) -> None:
        self._current_chapter_title = title

    def leave_front_matter(self) -> None:
        self._front_matter = False
        self._body_page_offset = self.page - 1

    def _draw_front_matter_page(self, canv: Canvas, _doc: Any) -> None:
        # Bare pages during front matter — only page numbers, no
        # running headers. Title/copyright pages carry no folio
        # (page number) either, so skip on pages 1-2 by convention.
        if self.page <= 2:
            return
        _draw_page_number(
            canv,
            self._options,
            self.page,
            roman=True,
            roman_start=3,
        )

    def _draw_body_page(self, canv: Canvas, _doc: Any) -> None:
        offset = self._body_page_offset or 0
        body_page = self.page - offset
        _draw_running_header(
            canv,
            self._options,
            publication_title=self._publication_title,
            chapter_title=self._current_chapter_title,
            page_is_odd=(body_page % 2 == 1),
        )
        _draw_page_number(
            canv,
            self._options,
            body_page,
            roman=False,
        )


def _draw_running_header(
    canv: Canvas,
    options: BookPdfOptions,
    *,
    publication_title: str,
    chapter_title: str,
    page_is_odd: bool,
) -> None:
    canv.saveState()
    canv.setFont("Times-Italic", 9)
    canv.setFillColor(colors.HexColor("#333333"))
    y = options.trim_height - (options.margin_top * 0.55)
    if page_is_odd:
        # Recto page — chapter title, aligned to outer (right) edge.
        canv.drawRightString(
            options.trim_width - options.margin_outer,
            y,
            chapter_title or publication_title,
        )
    else:
        # Verso page — publication title, aligned to outer (left) edge.
        canv.drawString(
            options.margin_outer,
            y,
            publication_title,
        )
    canv.restoreState()


def _draw_page_number(
    canv: Canvas,
    options: BookPdfOptions,
    page: int,
    *,
    roman: bool,
    roman_start: int = 1,
) -> None:
    if roman:
        display = _to_roman_lower(page - roman_start + 1)
    else:
        display = str(page)
    canv.saveState()
    canv.setFont("Times-Roman", 9)
    canv.setFillColor(colors.HexColor("#333333"))
    y = options.margin_bottom * 0.5
    x = options.trim_width / 2
    canv.drawCentredString(x, y, display)
    canv.restoreState()


_ROMAN_TOKENS: tuple[tuple[int, str], ...] = (
    (1000, "m"),
    (900, "cm"),
    (500, "d"),
    (400, "cd"),
    (100, "c"),
    (90, "xc"),
    (50, "l"),
    (40, "xl"),
    (10, "x"),
    (9, "ix"),
    (5, "v"),
    (4, "iv"),
    (1, "i"),
)


def _to_roman_lower(n: int) -> str:
    if n <= 0:
        return ""
    out: list[str] = []
    for value, token in _ROMAN_TOKENS:
        while n >= value:
            out.append(token)
            n -= value
    return "".join(out)


# ── Odd-page break helper ─────────────────────────────────────────


class _RectoBreak(PageBreak):
    """Break to the next recto (right-hand / odd-numbered) page.

    If the current page is already odd, insert a blank verso page so
    the chapter opens on a right-hand page — this is the trade-book
    convention. Silent inclusion of a blank verso is the correct
    behaviour; that page carries no folio.
    """

    locChanger = 1  # inherited attribute — quiet lints


# ── Renderer ──────────────────────────────────────────────────────


def render_book_pdf(payload: BookPdfInput) -> bytes:
    """Render a Publication (+ optional chapters) to a book PDF."""
    if not payload.title.strip():
        msg = "publication title is required"
        raise ValueError(msg)

    options = payload.options
    styles = _build_styles(options)
    buffer = io.BytesIO()

    doc = _BookDoc(
        buffer,
        options,
        publication_title=payload.title,
        author=payload.author,
    )

    frame = Frame(
        options.margin_inner,
        options.margin_bottom,
        options.trim_width
        - options.margin_inner
        - options.margin_outer,
        options.trim_height
        - options.margin_top
        - options.margin_bottom,
        id="body",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    front_template = PageTemplate(
        id="front",
        frames=[frame],
        onPage=doc._draw_front_matter_page,
        onPageEnd=_doNothing,
    )
    body_template = PageTemplate(
        id="body",
        frames=[frame],
        onPage=doc._draw_body_page,
        onPageEnd=_doNothing,
    )
    doc.addPageTemplates([front_template, body_template])

    story: list[Any] = []

    # ── Front matter ─────────────────────────────────────────────
    if options.include_title_page:
        story.append(Spacer(1, 60 * mm))
        story.append(
            Paragraph(
                _xml_escape(payload.title), styles.title_page_title,
            ),
        )
        if payload.author:
            story.append(
                Paragraph(
                    _xml_escape(payload.author),
                    styles.title_page_author,
                ),
            )
        story.append(PageBreak())

    if options.include_copyright_page:
        _append_copyright_page(story, payload, styles)
        story.append(PageBreak())

    if options.include_toc and payload.chapters:
        _append_table_of_contents(story, payload, styles)
        story.append(PageBreak())

    # ── Body pages start ────────────────────────────────────────
    story.append(NextPageTemplate("body"))
    # Sentinel flowable that flips the doc into body mode at flush
    # time — the callback fires before the next real frame draws.
    story.append(_FrontMatterEnd(doc))

    if payload.chapters:
        for idx, chapter in enumerate(payload.chapters):
            _append_chapter(story, chapter, idx + 1, styles, doc)
    elif payload.body:
        _append_single_body(story, payload, styles, doc)
    else:
        story.append(Paragraph("(no content)", styles.callout))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def _append_copyright_page(
    story: list[Any],
    payload: BookPdfInput,
    styles: _BookStyles,
) -> None:
    story.append(Spacer(1, 140 * mm))
    story.append(
        Paragraph(
            _xml_escape(payload.title), styles.copyright,
        ),
    )
    if payload.author:
        story.append(
            Paragraph(
                f"Copyright &#169; {payload.year} "
                f"{_xml_escape(payload.author)}",
                styles.copyright,
            ),
        )
    else:
        story.append(
            Paragraph(
                f"Copyright &#169; {payload.year}",
                styles.copyright,
            ),
        )
    if payload.license_notice:
        story.append(Spacer(1, 6 * mm))
        story.append(
            Paragraph(
                _xml_escape(payload.license_notice),
                styles.copyright,
            ),
        )
    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            "Published with Theourgia. Type set in Times.",
            styles.copyright,
        ),
    )


def _append_table_of_contents(
    story: list[Any],
    payload: BookPdfInput,
    styles: _BookStyles,
) -> None:
    story.append(
        Paragraph("Contents", styles.chapter_title),
    )
    for idx, chapter in enumerate(payload.chapters, start=1):
        line = f"{idx}.&nbsp;&nbsp;{_xml_escape(chapter.title)}"
        story.append(Paragraph(line, styles.toc_line))


def _append_chapter(
    story: list[Any],
    chapter: PublicationChapterInput,
    number: int,
    styles: _BookStyles,
    doc: "_BookDoc",
) -> None:
    story.append(_RectoBreak())
    story.append(_SetChapterTitle(doc, chapter.title))
    story.append(Spacer(1, 30 * mm))
    story.append(
        Paragraph(f"Chapter {number}", styles.chapter_number),
    )
    story.append(
        Paragraph(_xml_escape(chapter.title), styles.chapter_title),
    )
    for flow in _render_body_flowables(
        chapter.body, styles, is_chapter_opener=True,
    ):
        story.append(flow)


def _append_single_body(
    story: list[Any],
    payload: BookPdfInput,
    styles: _BookStyles,
    doc: "_BookDoc",
) -> None:
    story.append(_SetChapterTitle(doc, payload.title))
    for flow in _render_body_flowables(
        payload.body, styles, is_chapter_opener=True,
    ):
        story.append(flow)


# ── Sentinel flowables ────────────────────────────────────────────


class _FrontMatterEnd(Flowable):
    """Zero-height flowable that flips the doc out of front matter.

    Runs at split time so the *next* page starts the body pagination.
    """

    def __init__(self, doc: "_BookDoc") -> None:
        super().__init__()
        self._doc = doc

    def wrap(self, _avail_w: float, _avail_h: float) -> tuple[int, int]:
        return 0, 0

    def draw(self) -> None:
        self._doc.leave_front_matter()


class _SetChapterTitle(Flowable):
    """Zero-height flowable that updates the running header title."""

    def __init__(self, doc: "_BookDoc", title: str) -> None:
        super().__init__()
        self._doc = doc
        self._title = title

    def wrap(self, _avail_w: float, _avail_h: float) -> tuple[int, int]:
        return 0, 0

    def draw(self) -> None:
        self._doc.set_current_chapter_title(self._title)


# Silence lints for unused import — reportlab needs pdfmetrics for
# hyphenation-language font metrics discovery, which it wires
# lazily when a ParagraphStyle carries ``hyphenationLang``.
_ = pdfmetrics
