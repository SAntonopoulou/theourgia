"""Library catalog substrate.

Import/export helpers for the bibliography:

* BibTeX (the academic-standard format; the `.bib` files journals
  publish reference lists in).
* RIS (the other standard, used by EndNote / Mendeley / Zotero
  exports).
* CSV / JSON for general-purpose interchange.

ISBN lookup against Open Library lives in
:mod:`theourgia.core.library.isbn`. Backend-side; the API surface
exposes it as ``POST /api/v1/library/lookup-isbn``.
"""

from theourgia.core.library.bibtex import (
    BibTexEntry,
    book_to_bibtex,
    parse_bibtex,
)
from theourgia.core.library.ris import (
    book_to_ris,
    parse_ris,
)

__all__ = [
    "BibTexEntry",
    "book_to_bibtex",
    "book_to_ris",
    "parse_bibtex",
    "parse_ris",
]
