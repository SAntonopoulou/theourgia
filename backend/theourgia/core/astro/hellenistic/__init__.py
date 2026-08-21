"""The Hellenistic judgment layer, ported from AstroPractise (the canonical
engine — ``astropractise/lib/domain/astrology/``).

theourgia's ``core/astro`` computes positions, houses, aspects and the
calendrical techniques; this package adds the doctrine a Hellenistic chart is
*read* by — sect, the lots, essential dignity, and (in later batches) the
condition doctrine. Everything here is a faithful port of the Dart canon, held
to it field-for-field by golden vectors, and pure: positions are injected, no
ephemeris lives here.

Seven visible planets and nothing else in the judgment — the outer planets may
be displayed but rule nothing and take no part in any computation.
"""
