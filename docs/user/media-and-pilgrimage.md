# Media Library, Pilgrimage, and Calendar Feeds

Your vault can hold images, audio, and video references, map the sacred
places you have visited, and publish a calendar feed you can subscribe
to from any calendar app. Everything here follows the same privacy
posture as the rest of the vault: location data is blurred by default,
photo metadata is stripped by default, and sealed things stay sealed.

## Media library

At `/media`, with each asset's detail page at `/media/{id}`. Assets carry
a filename, caption, alt text, and tags, and can be linked to entries and
other content — the links are counted exactly, both ways.

Sealed media behaves differently from everything else:

- The library list shows sealed assets as a **count only** — no
  thumbnails, no names.
- A sealed asset's record hides its filename, caption, alt text, tags,
  photo metadata, and dimensions. Only the file size remains visible,
  because your storage quota still has to add up.

There are no play counts or view counts anywhere in the library. What
you keep here is not content to be ranked.

## Uploading — EXIF stripped by default

Uploading happens in three steps: pick the file, configure it, upload.
The bytes travel directly from your browser to storage.

Photographs usually contain EXIF metadata — GPS coordinates, camera
serial numbers, timestamps. **By default, Theourgia strips EXIF from
every image you upload.** If you want to keep the metadata, that is an
explicit opt-in per upload. After a strip, the vault records the size
before and after, so you can verify it happened.

Sealed uploads are encrypted on your device before they leave it, which
means the server cannot strip their metadata — so for sealed images,
stripping happens on your device before encryption. The server refuses
any request that would pretend otherwise.

Each vault has a 5 GB storage quota by default; an over-quota upload is
declined with a plain explanation. Unfinished upload sessions expire
after 24 hours.

## Audio library

At `/audio`. Chants, voces magicae recordings, ambient sound, lectures,
and dictation live here, with playback in the browser. Recordings can
also be attached to entries in the voces magicae library.

## Video embeds

Video comes into your journal and blog as YouTube embeds through the
privacy-enhanced `youtube-nocookie.com` host, and the player is
lazy-loaded — no request reaches any third party until a reader actually
scrolls to the video. Embeds **never autoplay**. You can attach a
captions file (WebVTT) and define chapter markers, which render as
clickable timestamps.

## Pilgrimage sites and the precision floor

At `/pilgrimage`. A map (OpenStreetMap data, credited on the surface) of
the sacred places you have visited, each with its visits, deity
associations, and linked workings.

Every site has a location precision, and the rule is a **one-way
ratchet**: the vault stores coordinates only as precisely as the
precision level allows — the default is roughly a kilometre, not an
exact point — and you can lower a site's precision later, but never
raise it. Once the finer coordinates are gone, they are gone; there is
no endpoint anywhere that could recover them. Imports follow the same
rule: journal importers drop raw coordinates rather than smuggle them in.

Sealed sites never appear in the map data at all. The map shows only a
count of sealed places, with no names and no coordinates.

## Pilgrimage routes

At `/pilgrimage-routes`. Order your sites into named journeys — an
"Eleusis route," a working pilgrimage — with per-stop notes and
reordering. The route preview draws the path over your sites'
(precision-floored) coordinates.

## iCal calendar feed

At `/icalfeed`. Your vault can publish a standard iCal feed that any
calendar app can subscribe to — Apple Calendar, Google Calendar,
Thunderbird, and the rest. Six switches control what the feed includes:
Liber Resh stations, workings, pilgrimage anniversaries, lunar events,
planetary hours, and custom events.

The feed URL contains a long random token instead of your name. If the
URL ever leaks, regenerate the token — the old URL stops working
immediately.

Sealed content is honest here too:

- Sealed journal entries never appear as events. Instead, a day with
  sealed entries shows a single all-day marker reading
  "{N} sealed entries today" — the fact of practice, nothing more.
- Sealed pilgrimage anniversaries are excluded entirely, without even a
  count, because a dated marker would reveal the anniversary itself.
