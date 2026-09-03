# SceneSense TV Series Integration Guide

**Purpose:** canonical handoff document for adding a new TV series to SceneSense without having to reconstruct the architecture, data rules, UI conventions, or preservation metadata in a later chat.

**Repository:** `scenesense/index`  
**Branch:** `main`  
**Site:** `https://scenesense.github.io/index/`  
**TV questions version:** `tv-v1`  
**Last updated:** 2026-09-03

---

## 1. Non-negotiable workflow rules

Before editing anything in the repository:

1. **Fetch the current target file immediately before updating it and use its current SHA.**
2. **Never overwrite a current JSON file from stale local state.** If modifying an existing file, merge only the intended changes into the freshly fetched remote version.
3. **Write directly to `main`.**
4. **Never perform concurrent writes to the same path.**
5. **TV work must not modify `data/movies.json`.** Movies and TV are separate data systems.
6. **Preserve user-supplied ordering, exact runtimes, cut/version information, and collection scope.** Do not silently replace them with generic database conventions.
7. **Do not claim a change is live until the latest GitHub Pages workflow for the new head commit has completed successfully.**
8. When a user supplies an authoritative title/order/runtime source, **that source beats generic web metadata** unless the user explicitly asks to replace it.

The most common failure mode is not complicated programming. It is the ancient human tradition of updating the right field in the wrong stale copy.

---

## 2. TV data architecture

A series normally consists of:

```text
data/series/index.json

data/series/<series-folder>/
  season-01.json
  season-01-meta.json
  season-02.json
  season-02-meta.json
  ...
  episode-flags.json        # optional

assets/posters/<series-id>.webp
```

Relevant renderer/runtime files:

```text
series.js
series-tv.js
series-tv-loader.js
series-tv-enhancements.js
```

### Current responsibility split

- `series.js`
  - loads the series catalogue
  - mixes series into the library
  - renders series cards and the series overview
  - provides search/sorting/basic season navigation
- `series-tv.js`
  - base TV season/episode scoring implementation
- `series-tv-enhancements.js`
  - loads season presentation metadata
  - descriptions, dates, exact runtimes, format badges, metadata rails
- `series-tv-loader.js`
  - currently patches/extends the TV renderer
  - current 6-season / 9-episode scoring split
  - format support including `SiLVER70`
  - episode `M` flags
  - episode-list-before-scoring ordering
  - unified cut/version labels
  - duplicate format-badge protection

**Do not rewrite the renderer merely to add a new series.** A normal integration should be data-driven. Renderer changes are needed only for a genuinely new feature or a new unsupported format.

---

## 3. Series ID and folder naming

Use a stable series ID in this form:

```text
<slug>-<first-year>
```

Examples:

```text
alf-1986
agent-carter-2015
stargate-sg-1-1997
alias-smith-and-jones-1971
andromeda-2000
```

The series folder is the series ID with the trailing `-YYYY` removed:

```text
alf-1986                         -> data/series/alf/
agent-carter-2015                -> data/series/agent-carter/
alias-smith-and-jones-1971       -> data/series/alias-smith-and-jones/
```

The current helper effectively follows:

```js
String(seriesId || "").replace(/-\d{4}$/, "")
```

Do not invent a different folder convention for one show.

---

## 4. Required catalogue entry: `data/series/index.json`

A new series must be added to the top-level `series` array.

### Template

```json
{
  "id": "example-series-2001",
  "type": "series",
  "title": "Example Series",
  "yearStart": 2001,
  "yearEnd": 2005,
  "seasonCount": 5,
  "episodeCount": 110,
  "scoringEntryCount": 110,
  "genres": ["Science Fiction", "Adventure", "Drama"],
  "actors": [
    "Actor One",
    "Actor Two",
    "Actor Three",
    "Actor Four",
    "Actor Five"
  ],
  "description": "A concise overarching description of the actual series premise and continuing story.",
  "poster": "assets/posters/example-series-2001.webp",
  "score": null,
  "questionsVersion": "tv-v1",
  "runtimeSeconds": 283223,
  "seasons": [
    {
      "number": 1,
      "yearStart": 2001,
      "yearEnd": 2002,
      "episodeCount": 22,
      "scoringEntryCount": 22
    }
  ]
}
```

### Meaning of the important fields

- `episodeCount`
  - count of the **numbered episodes represented by the collection**
  - may be larger than the number of scoring rows when multipart material is intentionally combined
- `scoringEntryCount`
  - count of actual scoreable episode entries
- `runtimeSeconds`
  - exact total runtime of the included collection, in seconds
  - should equal the sum of the actual included media/scoring entries
- `score`
  - initially `null`
- `questionsVersion`
  - currently `tv-v1`
- `seasons`
  - summary data used by the overview

### Episode count vs scoring-entry count

These are deliberately separate.

Examples already in the database:

- ALF: **102 numbered episodes / 100 scoring entries**
- Stargate SG-1 custom collection: **218 numbered episodes / 214 scoring entries**

A combined entry can represent two numbered episodes while remaining one scoring/media entry.

Do **not** force `episodeCount === scoringEntryCount` simply because a generic TV database does.

---

## 5. Optional series-level catalogue fields

### Entire collection is uncut

For a collection in which the normal rule is that every episode is uncut:

```json
"uncut": true
```

This currently causes:

- `UNCUT` to appear in the series overview metadata
- `UNCUT` to be inherited by episode metadata
- explicit episode-level cut labels to override that inheritance

ALF uses this model.

### Collection scope

When the collection deliberately excludes part of the conventional series run, store the reason:

```json
"collectionScope": "Pete Duel as Hannibal Heyes only; later episodes with a different actor playing Heyes are intentionally excluded."
```

Use this when the user's collection definition is more precise than a generic broadcast-season definition.

Do not silently expand a curated collection because Wikipedia says more episodes exist.

---

## 6. Genres: locked SceneSense vocabulary

Never invent a new genre label during integration.

The current allowed vocabulary is:

```text
Action
Adventure
Comedy
Crime
Drama
Horror
Romance
Science Fiction
Thriller
Western
Musical
Mystery
Christmas
Fantasy
```

Not allowed unless the vocabulary is deliberately changed site-wide:

```text
Spy
Family
Historical
Superhero
Procedural
etc.
```

Genre selection should describe the **actual character of the series**, not blindly copy the first tags from IMDb/TMDb/Wikipedia.

Genre **order matters**. Put the most defining genres first.

Example:

```json
"genres": ["Adventure", "Western", "Drama", "Comedy"]
```

was deliberately preferred for *Alias Smith and Jones* over a shallow `Comedy / Western` classification.

---

## 7. Principal cast rules

The catalogue stores cast in the `actors` array.

```json
"actors": [
  "Actor One",
  "Actor Two",
  "Actor Three",
  "Actor Four",
  "Actor Five"
]
```

Important current UI behavior:

- series search uses the actor array
- the series overview displays **the first five actor names**
- actor order therefore matters
- keep the five most useful/representative names first

If more than five are stored, later names can still help search but are not normally shown as principal cast chips.

---

## 8. Series description

The top-level `description` is the overarching series premise, not an episode synopsis and not generic publicity sludge.

It should:

- identify the principal setup
- explain the continuing conflict or journey
- be concise enough for the overview page
- remain grounded in the actual series
- avoid spoilers far beyond the basic series premise unless the collection itself requires them

Do not put technical provenance such as `UNCUT`, disc source, PAL/NTSC, restoration type, etc. into the plot paragraph. Those belong in metadata.

---

## 9. Poster integration

Preferred path:

```text
assets/posters/<series-id>.webp
```

Example:

```text
assets/posters/alf-1986.webp
assets/posters/agent-carter-2015.webp
```

The catalogue should reference the same path:

```json
"poster": "assets/posters/alf-1986.webp"
```

Current preferred poster ratio is vertical **2:3**.

A missing poster has a UI fallback, so data integration does not have to be blocked by artwork, but the catalogue path should be correct from the start.

When replacing a poster binary, preserve the exact previous SHA/commit so the prior version is recoverable.

---

# PART II — SEASON DATA

## 10. Core season file: `season-NN.json`

Each season has one core scoring/data file.

Path:

```text
data/series/<folder>/season-01.json
```

### Template

```json
{
  "version": 1,
  "seriesId": "example-series-2001",
  "season": 1,
  "yearStart": 2001,
  "yearEnd": 2002,
  "seasonRatings": {},
  "episodes": [
    {
      "id": "s01e01",
      "number": "01",
      "title": "Pilot",
      "airDate": "2001-09-12",
      "runtimeSeconds": 2617,
      "ratings": {}
    }
  ]
}
```

### Required conventions

- `season` is numeric
- `number` is a string and normally zero-padded
- `airDate` is ISO `YYYY-MM-DD`
- `runtimeSeconds` is numeric and exact when exact runtime is known
- `seasonRatings` starts as `{}`
- episode `ratings` starts as `{}`

Do not pre-fill invented scores.

---

## 11. Episode IDs

Normal episode:

```json
"id": "s01e07",
"number": "07"
```

Combined entry:

```json
"id": "s01e24-25",
"number": "24-25"
```

The UI understands hyphenated episode numbers and stacks them visually.

Examples already in use:

```text
s01e01-02
s01e24-25
```

IDs must be unique within the series and remain stable once ratings are attached.

---

## 12. Custom episode order is allowed and important

The array order in `episodes` is the collection order.

If the user supplies:

- production order
- DVD order
- chronological order
- manually corrected order
- a specific archival source order

then preserve it.

Do not reorder episodes merely because their `airDate` values appear out of sequence.

A valid collection can therefore contain:

```text
Episode 17 -> Jan 27
Episode 18 -> Jan 20
```

if that is the authoritative title/order source supplied by the user.

---

## 13. Multipart title convention

Store ordinary multipart titles in this form:

```text
The Tok'ra Part One
The Tok'ra Part Two
```

The presentation layer converts them to:

```text
The Tok'ra (Part One)
The Tok'ra (Part Two)
```

House convention is therefore to keep `Part One`, `Part Two`, etc. in the source title rather than manually baking presentation parentheses into every JSON file.

---

# PART III — PRESENTATION / PROVENANCE METADATA

## 14. Season metadata file: `season-NN-meta.json`

Every season should have a matching presentation metadata file.

Path:

```text
data/series/<folder>/season-01-meta.json
```

### Template

```json
{
  "version": 1,
  "seriesId": "example-series-2001",
  "season": 1,
  "format": "PRiSM",
  "source": "US NTSC DVD LSMR",
  "description": "A concise season-level description of the major setup and arc.",
  "episodes": {
    "s01e01": {
      "airDate": "2001-09-12",
      "description": "A concise episode synopsis.",
      "runtimeSeconds": 2617
    }
  }
}
```

### Why this file matters

The metadata file supplies presentation information used by the season and episode detail UI:

- season description
- episode descriptions
- exact/fallback runtimes
- dates
- **format badge**
- source/provenance storage

A series can technically have core season data while still looking incomplete if its season metadata is missing.

---

## 15. Format badge is a per-season metadata field

This is easy to forget and causes a very visible failure.

Every season that should show a format logo needs:

```json
"format": "PRiSM"
```

or another currently supported format.

Current TV renderer support includes:

```text
PRiSM
SiLVER70
SiLVER35
```

Examples:

- Stargate SG-1 -> `PRiSM`
- ALF -> `PRiSM`
- Alias Smith and Jones -> `PRiSM`
- Andromeda -> `PRiSM`
- Agent Carter -> `SiLVER70`

**Do not assume that putting a source string such as `... PRiSM ...` in `source` will create the badge. It will not.** The explicit `format` property is required.

If a new format is introduced, add its logo asset and renderer mapping deliberately.

---

## 16. Source / provenance field

Use `source` for the media origin when useful:

```json
"source": "US NTSC DVD LSMR"
```

or:

```json
"source": "US NTSC WS DVD · 480p23 · PRiSM · LSMR"
```

This is descriptive provenance. It is not a substitute for structured fields such as `format` or `runtimeSeconds`.

---

## 17. Exact runtimes

When exact runtimes are supplied, preserve them in **seconds**.

```json
"runtimeSeconds": 2996
```

User-supplied exact collection runtimes are authoritative unless explicitly superseded.

Do not replace exact local-media runtimes with approximate web runtimes.

### Display convention

Under one hour:

```text
44:13
```

One hour or longer:

```text
01:36:57
```

The hour is always two digits when present.

### Approximate fallback

If an exact runtime genuinely is not available in metadata, the presentation layer can use:

```json
"runtimeApproxMinutes": 44
```

which displays approximately.

Prefer exact `runtimeSeconds` whenever the collection source provides it.

---

## 18. Total runtime

Top-level series `runtimeSeconds` must reflect the actual included collection.

It is used for sorting even though runtime is not displayed on the series library card.

Calculate it from the included media/scoring entries rather than a generic published total.

This matters for:

- combined episodes
- uncut episodes
- alternate versions
- excluded episodes
- film-length specials treated as TV scoring entries

---

## 19. Date format

Store:

```text
YYYY-MM-DD
```

Example:

```json
"airDate": "1987-02-09"
```

Presentation automatically renders this in the current site style, e.g.:

```text
Feb 9, 1987
```

Do not store presentation-formatted dates directly in the core JSON.

---

# PART IV — CUT / VERSION METADATA

## 20. Keep version labels out of episode titles when they are metadata

Current convention:

**Title:**

```text
Children of the Gods
```

**Metadata:**

```text
UNCUT
```

rather than:

```text
Children of the Gods (Uncut)
```

Likewise:

**Title:**

```text
Consider Me Gone
```

**Metadata:**

```text
ALTERNATE ENDING
```

This keeps episode titles clean and puts edition/provenance information where it belongs.

---

## 21. Cut-status precedence

Current renderer logic is effectively:

1. if episode has explicit `cutLabel`, use that
2. otherwise if the series is globally `uncut`, show `UNCUT`
3. otherwise if the episode has `uncut: true`, show `UNCUT`
4. otherwise legacy title text containing `UNCUT` / `(Uncut)` can still be recognized
5. otherwise show no cut label

### Explicit special variant

```json
{
  "id": "s04e24",
  "number": "24",
  "title": "Consider Me Gone",
  "cutLabel": "ALTERNATE ENDING",
  "airDate": "1990-03-24",
  "runtimeSeconds": 1364,
  "ratings": {}
}
```

Because explicit `cutLabel` wins, a globally uncut series can still have a special episode that displays `ALTERNATE ENDING` rather than `UNCUT`.

### One-off uncut episode in an otherwise normal series

```json
"uncut": true
```

on the episode object.

Examples in Stargate SG-1 include special long versions such as `Children of the Gods` and `Threads`.

---

# PART V — OPTIONAL EPISODE FLAGS

## 22. `episode-flags.json`

Optional reusable flags live separately from season scoring data.

Current supported flag:

```text
M = Mythology / memorable
```

Example:

```json
{
  "version": 1,
  "seriesId": "alf-1986",
  "flags": {
    "M": [
      "s01e01",
      "s01e07",
      "s01e24-25"
    ]
  }
}
```

Path:

```text
data/series/<folder>/episode-flags.json
```

The current renderer shows the `M` badge:

- immediately after the episode title in the season episode list
- beside the episode title on the episode detail page
- tooltip / accessibility text: `Mythology / memorable`

Do not hard-code flagged titles into JavaScript. Keep the list data-driven.

---

# PART VI — TV SCORING MODEL

## 23. Overall architecture

A TV episode's complete SceneSense score contains the same 15 conceptual categories as a movie, but they are split between season-level production qualities and episode-level qualities.

### Season-level categories

6 categories / 12 ratings:

```text
CASTING          12%
PERFORMANCE       6%
CINEMATOGRAPHY    5%
WORLD             5%
SOUND             5%
MUSIC             6%
```

These are inherited by every episode in the season.

### Episode-level categories

9 categories / 18 ratings:

```text
WRITING           9%
CHARACTER         7%
REALISM           6%
CHEMISTRY         6%
DIRECTION         5%
PACING            7%
ORIGINALITY       6%
MORALITY          7%
INTEGRITY         8%
```

Together, all 15 categories sum to 100%.

---

## 24. Exact season-level questions

### CASTING

1. Do the actors feel naturally right for their characters?
2. Does the cast click as an ensemble?

### PERFORMANCE

3. Do the actors disappear convincingly into their roles?
4. Do the emotions feel genuine rather than performed?

### CINEMATOGRAPHY

5. Do the visuals make the show inviting to watch?
6. Do they avoid looking artificial, filtered or overly polished?

### WORLD

7. Do the locations feel convincing rather than like sets?
8. Does the world feel like it exists beyond the camera?

### SOUND

9. Do voices sound clean, believable and easy to understand?
10. Does the sound make you feel physically inside the scene?

### MUSIC

11. Does the music give the show a sound of its own?
12. Does the music enhance emotions without forcing them?

---

## 25. Exact episode-level questions

### WRITING

1. Did this episode have a story worth telling?
2. Did events follow naturally without the plot cheating?

### CHARACTER

3. Did everyone stay true to their character instead of changing just to serve the story?
4. Did the characters' choices make sense?

### REALISM

5. Once you accept the show's premise, did what happened feel believable?
6. Did actions have believable consequences?

### CHEMISTRY

7. Did you believe these people actually mattered to one another?
8. Did the episode add something meaningful to a relationship?

### DIRECTION

9. Did scenes feel like they were happening rather than being arranged for us?
10. Did the episode know how seriously to take itself?

### PACING

11. Did the episode use its time well?
12. Did important moments get enough time to land?

### ORIGINALITY

13. Did this episode bring something fresh to the series?
14. Did the episode use its central idea in an interesting way?

### MORALITY

15. Did the episode respect its characters as human beings?
16. Did the episode have a sound sense of right and wrong?

### INTEGRITY

17. Did it earn your reaction instead of trying to manufacture one?
18. Did the episode do the groundwork for its payoffs?

---

## 26. Score aggregation

Category scoring uses the site's star-to-points mapping and converts the two ratings in a TV category to a 0–10 category score.

The current category calculation is conceptually:

```js
values.reduce((sum, stars) => sum + ratingPoints(stars), 0)
  / values.length
  * 5
```

A full episode score combines:

- the 6 inherited season categories
- the 9 episode-specific categories

A season score is based on its fully scored episodes.

A series score is based on fully scored episodes across its seasons.

Do not invent initial season/episode scores during integration. Ratings objects start empty.

---

# PART VII — CURRENT PRESENTATION CONVENTIONS

## 27. Series library card

Current series card display:

```text
SERIES TITLE
1997–2008 · 11 SEASONS · 218 EPISODES
SCIENCE FICTION · ADVENTURE · DRAMA ...
```

Rules:

- series title is gold (`#C59B45`)
- movie title is white
- full word `EPISODES`, never `EPS`
- no `TV SERIES` badge
- year range uses an en dash
- singular/plural is automatic
- long metadata is horizontally compressed with `scaleX`, not vertically shrunk
- runtime is not shown on the card

---

## 28. Series overview metadata

Current overview metadata is intentionally compact:

```text
1986–1990 · 4 SEASONS · 102 EPISODES · UNCUT
```

where relevant.

Do not reintroduce runtime or scoring-entry counts into the visible overview metadata unless the design is deliberately changed.

---

## 29. Season page order

Current intended season-page hierarchy:

1. `← Overview`
2. series/season identity
3. season metadata
4. season description
5. score + format badge
6. **Episodes**
7. six season-level scoring categories
8. Save / Revert controls
9. `← Overview`

Episodes appear **before** the repeated scoring guide because browsing the actual content is more important than repeatedly admiring the questionnaire.

---

## 30. Episode list metadata

Each episode row can show:

```text
runtime · date · cut/version label
```

Example:

```text
49:56 · Feb 9, 1987 · UNCUT
```

The same cut/version logic must be used on both the season list and episode detail page.

Do not make one view infer `UNCUT` differently from the other.

---

## 31. Episode detail metadata

Typical detail rail:

```text
S01 E24–25 · Feb 9, 1987 · 49:56 · UNCUT
```

Current visual hierarchy:

- episode code in gold
- remaining metadata in soft silver/white
- subtle neutral separators/hairlines
- synthesized small-cap typography

This is presentation styling, not something that should be encoded into data strings.

---

## 32. Guide text styling

Repeated scoring-guide/status text is intentionally visually subordinate:

- smaller
- dark grey
- synthesized small caps
- lower contrast than actual metadata and content

Examples include:

```text
OVERALL SCORE
0 / 18 episode ratings
category weight / rated counts
read-only / save status
```

When adding a series, do not create custom guide-text styles for that one show.

---

# PART VIII — INTEGRATION PROCEDURE

## 33. Recommended end-to-end procedure

### Step 1 — Lock the collection definition

Before creating files, establish:

- exact series title
- start/end years
- included seasons
- included/excluded episodes
- custom episode order if any
- whether multipart episodes are separate or combined scoring entries
- exact cut/version rules
- exact runtime source
- format per season
- poster status

If the user defines a curated collection, treat that as canonical.

### Step 2 — Determine IDs and counts

Calculate:

- series ID
- folder slug
- `seasonCount`
- `episodeCount`
- `scoringEntryCount`
- season episode/scoring-entry counts

Do this **before** writing the catalogue entry.

### Step 3 — Build core season JSON files

For every season:

```text
season-01.json
season-02.json
...
```

Populate:

- exact collection order
- stable IDs
- title
- ISO date
- exact runtime seconds
- empty ratings
- explicit `uncut` / `cutLabel` only where needed

### Step 4 — Build matching season metadata files

For every season:

```text
season-01-meta.json
season-02-meta.json
...
```

Include:

- `format` **for every season**
- source/provenance if known
- season description
- episode descriptions
- runtime/date metadata as needed

### Step 5 — Optional episode flags

Create `episode-flags.json` only when the collection has meaningful flags such as `M`.

### Step 6 — Upload/wire the poster

Preferred:

```text
assets/posters/<series-id>.webp
```

### Step 7 — Add the catalogue entry

Fetch the latest `data/series/index.json` immediately before editing.

Merge the new series into the existing `series` array. Do not recreate the file from an older local copy.

### Step 8 — Validate totals

Check all of the following:

- season counts sum correctly
- numbered episode counts sum to top-level `episodeCount`
- scoring entries sum to top-level `scoringEntryCount`
- exact runtimes sum to top-level `runtimeSeconds`
- all episode IDs are unique
- every season has a matching meta file
- every season meta file has the intended `format`
- poster path matches the actual asset path
- genres use only locked vocabulary
- actor ordering is deliberate
- special cut labels are metadata, not cluttering titles

### Step 9 — Validate UI behavior

Check at least:

- series appears in `All` and `Series`
- search finds title, genres and actors
- series card metadata is correct
- poster loads
- series overview opens
- all seasons open
- episode rows are in the intended order
- exact runtimes display correctly
- dates display correctly
- cut/version labels display in both episode list and detail
- format badge appears on every season/episode where expected
- `M` flags appear in both list and detail when configured
- season scoring has 6 categories / 12 ratings
- episode scoring has 9 categories / 18 ratings
- Save/Revert behavior remains intact

### Step 10 — Check deployment

After the final commit, inspect the latest GitHub Pages workflow for `main`.

Only report the integration as live after the workflow is:

```text
status: completed
conclusion: success
```

---

# PART IX — COMMON FAILURES TO AVOID

## 34. Missing format badge

**Symptom:** season/episode has no PRiSM/SiLVER logo.

**Likely cause:** `season-NN-meta.json` contains a source description but no explicit:

```json
"format": "PRiSM"
```

Fix the data. Do not hard-code a badge for the one series.

---

## 35. Series-level `UNCUT` visible on detail but missing from episode list

The season list and detail page must use the same cut-label resolver.

Current intended rule:

```text
cutLabel > series uncut / episode uncut > none
```

Do not implement cut status separately in two render paths.

---

## 36. Special version incorrectly inherits global `UNCUT`

Use an explicit override:

```json
"cutLabel": "ALTERNATE ENDING"
```

This deliberately replaces the inherited `UNCUT` label.

---

## 37. Variant text left in title

Avoid:

```text
Try to Remember (Uncut)
Consider Me Gone (Alternate Ending)
```

Prefer clean title + metadata:

```text
Try to Remember
... · UNCUT

Consider Me Gone
... · ALTERNATE ENDING
```

---

## 38. Generic database order overwrites curated order

Never assume broadcast order is automatically the desired collection order.

The core `episodes` array is the collection order.

---

## 39. Exact runtimes replaced by rounded minutes

Do not throw away seconds.

If exact runtimes exist, use `runtimeSeconds` everywhere and calculate totals from them.

---

## 40. Wrong genre vocabulary

Do not introduce labels such as `Spy` because they sound convenient.

Use the locked SceneSense vocabulary and choose the best existing categories thoughtfully.

---

## 41. Actor changes do not appear

Remember that the series overview displays only the first five names.

If a specific actor must visibly appear, place them within the first five in `actors`.

---

## 42. Title/order/count arithmetic not reconciled

Before declaring integration complete, independently verify:

```text
sum(season episodeCount)      == series episodeCount
sum(season scoringEntryCount) == series scoringEntryCount
sum(included runtimeSeconds)  == series runtimeSeconds
```

Combined entries are the usual reason the first two totals differ from each other.

---

# PART X — CURRENT REFERENCE EXAMPLES

## 43. ALF

Key model:

- series-level `"uncut": true`
- custom S1/S3 order
- 102 numbered episodes / 100 scoring entries
- `Try to Remember` is one combined entry (`s01e24-25`)
- final `Consider Me Gone` has:

```json
"cutLabel": "ALTERNATE ENDING"
```

- format: `PRiSM`
- optional `episode-flags.json` with `M` flags

ALF is the best reference for:

- global uncut inheritance
- explicit variant override
- combined episode IDs
- M flags
- custom ordering

---

## 44. Stargate SG-1

Key model:

- custom collection rather than generic database season arithmetic
- 218 numbered episodes / 214 scoring entries
- combined long-form entries
- individual uncut episodes (`uncut: true`)
- format: `PRiSM`

Useful reference for:

- one-off uncut versions
- combined two-part scoring entries
- nonstandard season 11 collection structure

---

## 45. Agent Carter

Key model:

- conventional episode-per-scoring-entry structure
- format: `SiLVER70`
- 18 episodes / 18 scoring entries

Useful reference for a compact conventional two-season integration.

---

## 46. Alias Smith and Jones

Key model:

- deliberately curated collection scope
- custom source/order authority
- format must be explicitly present in **both** season metadata files
- 33 included episodes / 33 scoring entries

Useful reference for a collection that intentionally excludes conventionally recognized later material.

---

## 47. Andromeda

Key model:

- straightforward 5-season / 110-episode integration
- exact user-source runtime total
- per-season `PRiSM` metadata
- full descriptions and dates

Useful reference for a larger conventional series where every numbered episode is its own scoring entry.

---

# FINAL CHECKLIST

Before calling a new TV integration complete, confirm every item:

- [ ] Current remote files were fetched before modifying existing paths
- [ ] Series ID follows `<slug>-<year>`
- [ ] Folder follows ID without trailing year
- [ ] Catalogue entry added to fresh `data/series/index.json`
- [ ] Locked genre vocabulary used
- [ ] Actor order is deliberate; visible actors are within first five
- [ ] Series description written
- [ ] Poster path wired
- [ ] Every season has `season-NN.json`
- [ ] Every season has `season-NN-meta.json`
- [ ] Every season meta has the intended `format`
- [ ] Exact order preserved
- [ ] Exact runtimes preserved in seconds
- [ ] ISO dates used
- [ ] Stable episode IDs used
- [ ] Multipart/combined episodes represented intentionally
- [ ] `episodeCount` arithmetic verified
- [ ] `scoringEntryCount` arithmetic verified
- [ ] total `runtimeSeconds` verified
- [ ] `uncut` / `cutLabel` rules applied correctly
- [ ] variant labels kept in metadata rather than titles
- [ ] optional `episode-flags.json` added when needed
- [ ] season descriptions present
- [ ] episode descriptions present
- [ ] format badge visually verified
- [ ] episode cut label verified in both list and detail
- [ ] season scoring shows 6 categories / 12 ratings
- [ ] episode scoring shows 9 categories / 18 ratings
- [ ] library search/sort still works
- [ ] latest GitHub Pages deployment completed successfully

This document should be treated as the starting context for any future chat asked to integrate another TV series into SceneSense.
