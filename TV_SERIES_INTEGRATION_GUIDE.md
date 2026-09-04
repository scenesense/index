# SceneSense TV Series Integration Guide

**Purpose:** canonical handoff document for adding a new TV series to SceneSense without reconstructing the architecture, collection rules, scoring model, preservation metadata, or UI conventions in a later chat.

**Repository:** `scenesense/index`  
**Branch:** `main`  
**Site:** `https://scenesense.github.io/index/`  
**TV questions version:** `tv-v1`  
**Last updated:** 2026-09-03

---

# 1. Non-negotiable repository workflow

1. **Fetch every target file immediately before editing it and use its current SHA.**
2. **Never overwrite JSON from stale local state.** Merge only the intended change into the freshly fetched remote file.
3. **Write directly to `main`.**
4. **Never run concurrent writes to the same path.**
5. **TV work must never modify `data/movies.json`.** Movies and TV are separate systems.
6. Preserve user-supplied **ordering, exact runtimes, versions/cuts, media formats, audio data and collection scope**. Do not silently replace them with generic database conventions.
7. User media scans and explicit collection instructions are authoritative for the user's collection unless explicitly superseded.
8. A generic TV database is reference material, not the source of truth for a curated collection.
9. **Do not claim deployment/live success until the latest GitHub Pages workflow for the final head commit has completed successfully.**
10. After a multi-file integration, fetch the final files again and audit counts, titles, runtimes, formats, poster paths, metadata order and special cases.

The dangerous part is rarely JSON syntax. It is confidently saving yesterday's truth over today's file.

---

# 2. TV architecture

Normal structure:

```text
data/series/index.json

data/series/<series-folder>/
  season-01.json
  season-01-meta.json
  season-02.json
  season-02-meta.json
  ...
  episode-flags.json        # optional

assets/posters/<actual-poster-filename>.webp
```

Relevant runtime/rendering files:

```text
series.js
series-tv.js
series-tv-loader.js
series-tv-enhancements.js
audio-metadata.js
```

Responsibilities:

- `series.js`: catalogue loading, library cards, series overview, search/sort, navigation.
- `series-tv.js`: base season/episode scoring implementation.
- `series-tv-loader.js`: current scoring split patches, M flags, cut labels, ordering and format support.
- `series-tv-enhancements.js`: season/episode presentation, exact runtimes, descriptions, metadata rails and base format badges.
- `audio-metadata.js`: current audio presentation, edition inheritance, mixed-format badges, episode-level format overrides and TV metadata ordering.

A normal new-series integration should be **data-driven**. Change renderer code only when the new series exposes a real unsupported feature.

---

# 3. Series IDs, folders and visible naming

Use a stable internal ID:

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

The folder removes the trailing year:

```text
alf-1986                   -> data/series/alf/
agent-carter-2015          -> data/series/agent-carter/
```

Internal IDs do **not** need to be renamed merely because display punctuation later changes. Stable IDs matter once ratings exist.

## Canonical visible title

`title` is the canonical title used on the library card, search and ordinary UI surfaces.

If a long canonical title needs a shorter detail-page rendering, use:

```json
"title": "Around the World in Eighty Days",
"detailTitle": "Around the World in 80 Days"
```

`detailTitle` is a **layout exception only**. Do not let the shortened form leak back into cards or general naming.

## Hard naming rule

Before committing a new series, compare:

- canonical title
- internal ID
- folder name
- **actual poster filename already present in the repo**

Do not assume the poster follows the ID mechanically. Existing filenames may use different punctuation or underscores.

Examples of real poster filenames:

```text
assets/posters/around-the-world-in-eighty-days-2021.webp
assets/posters/breaking_in-2011.webp
assets/posters/buck-rogers-1979.webp
```

**Always list/check `assets/posters/` before finalizing the catalogue path.** A plausible filename that does not exist is still broken.

---

# 4. Top-level catalogue entry

Every series needs an entry in:

```text
data/series/index.json
```

Template:

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
  "audio": {"layouts":["5.1"],"lossless":false},
  "description": "A concise description of the series itself.",
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
      "scoringEntryCount": 22,
      "audio": {"layouts":["5.1"],"lossless":false}
    }
  ]
}
```

## Counts

`episodeCount` and `scoringEntryCount` are deliberately different concepts.

- `episodeCount`: numbered episodes represented by the collection.
- `scoringEntryCount`: actual media/scoring rows.

Examples:

```text
ALF:                 102 numbered / 100 scoring
Stargate SG-1:       218 numbered / 214 scoring
Buck Rogers:          17 numbered / 15 scoring
```

If a file combines E01–02, it can represent two numbered episodes but one scoring entry.

Never force these values to match because an external database does.

## Curated collections

If the user retains only selected episodes, **model only those selected episodes**.

Do not:

1. add every broadcast episode,
2. then use M flags to distinguish the ones actually wanted.

Buck Rogers is the reference case. The collection directly contains the selected episodes only.

Store collection bookkeeping separately if useful:

```json
"collectionScope": "Curated preferred-episode collection from the first-season era only."
```

Collection-scope text is archival metadata. It does **not** belong in plot descriptions.

---

# 5. Year handling

The data schema may use both `yearStart` and `yearEnd`, including equal values:

```json
"yearStart": 2014,
"yearEnd": 2014
```

The UI rule is absolute:

```text
2014
```

never:

```text
2014–2014
```

Only use an en-dash range when start and end differ.

This applies to series and seasons.

---

# 6. Genres: editorial assessment, not scraped order

Genre choice must describe the **actual viewing character of the work**, not whichever tags a generic site happened to print first.

Core SceneSense vocabulary:

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

`Documentary` is currently used as a deliberate nonfiction exception for the Brian Cox collection. Do not casually invent additional labels.

## Hard ordering rules

- **Fantasy may never be the first genre.**
- **Crime may never be the first genre.**
- Genre order is a hierarchy, not an alphabetical list.
- Assess the actual series yourself. Do not inherit IMDb/TMDb/Wikipedia ordering without thought.

Examples:

```text
Atlantis:     Adventure · Fantasy · Drama · Romance
BeastMaster:  Adventure · Fantasy · Action · Drama
Breaking In:  Comedy · Crime
```

A setting/device genre can be present without being allowed to define the work's first impression.

---

# 7. Cast ordering

The `actors` array is searchable, but the series overview displays the **first five** names.

Therefore order is deliberate.

```json
"actors": [
  "Lead One",
  "Lead Two",
  "Lead Three",
  "Lead Four",
  "Preferred Fifth",
  "Additional Search Actor"
]
```

If the user says “replace the last actor” on the visible page, that means the fifth visible slot. A displaced actor may remain later in the array for search if still useful.

Do not treat cast order as an arbitrary database dump.

---

# 8. Series and season descriptions

Descriptions are about **what the programme is about**, not how the local collection was assembled.

## Series description

Should describe:

- premise
- principal people
- continuing conflict/journey
- actual nature of the programme

It must not say things such as:

```text
This SceneSense collection combines...
This curated selection contains...
The omitted episodes are...
The retained episodes are...
```

Put those facts in `collectionScope`, `editionNote`, `source` or another metadata field.

## Season description

Same rule. Describe the season's story, subject or major arc.

For documentary/science material, “plot” means the substantive subject progression. Describe what is investigated/explained, not the archival grouping process.

## Episode description

A concise synopsis of that episode's actual content.

Technical provenance never belongs in the plot paragraph.

---

# 9. Every episode requires a real title

**Hard rule: generic placeholders are forbidden in final data.**

Do not leave:

```text
Episode 1
Episode 2
Episode #1.1
Untitled
```

If the broadcaster never supplied useful titles, derive concise, meaningful titles from the episode itself using:

1. subtitles/transcript if available,
2. detailed episode synopsis,
3. central location/conflict/theme,
4. direct viewing if necessary.

The derived title should be specific enough to distinguish the episode and sound like a plausible archival episode title, not a sentence-length plot summary.

Example derived titles for *Around the World in Eighty Days*:

```text
The Wager
The Broken Bridge
The Empty Quarter
A Wedding in India
The White Jade Dragon
Castaways
The Lawman and the Outlaw
The Final Day
```

If titles are derived rather than official, preserve that fact in working notes if needed, but **the UI still gets proper titles**.

---

# 10. Core season file

Path:

```text
data/series/<folder>/season-NN.json
```

Template:

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

Required conventions:

- `season`: numeric
- `number`: string, normally zero-padded
- `airDate`: ISO `YYYY-MM-DD`
- exact `runtimeSeconds` whenever supplied
- `seasonRatings: {}` initially
- episode `ratings: {}` initially
- preserve user/source order exactly

Do not sort by air date unless that is explicitly the chosen order.

---

# 11. Episode IDs and combined entries

Normal:

```json
"id": "s01e07",
"number": "07"
```

Combined:

```json
"id": "s01e01-02",
"number": "01-02"
```

IDs must remain stable once ratings exist.

The UI understands combined numbering and can stack the E numbers visually.

---

# 12. Multipart title convention

Store:

```text
The Tok'ra Part One
The Tok'ra Part Two
```

Presentation converts to:

```text
The Tok'ra (Part One)
The Tok'ra (Part Two)
```

Do not bake display punctuation inconsistently into source data.

---

# 13. Season presentation metadata

Every season should have:

```text
data/series/<folder>/season-NN-meta.json
```

Template:

```json
{
  "version": 1,
  "seriesId": "example-series-2001",
  "season": 1,
  "format": "SiLVER70",
  "source": "UK BLURAY REMUX · 1080p25 · SiLVER70",
  "description": "Season story or subject description.",
  "episodes": {
    "s01e01": {
      "airDate": "2001-09-12",
      "description": "Episode synopsis.",
      "runtimeSeconds": 2617
    }
  }
}
```

This file carries presentation/provenance data including:

- season description
- episode descriptions
- dates/runtimes
- restoration/video badge
- source provenance
- optional edition/cut metadata
- optional episode-level format/audio overrides

---

# 14. Restoration format is NOT source medium

This distinction is critical.

`format` controls the **video/restoration badge shown by SceneSense**.

`source` records where the material came from.

A Blu-ray remux can therefore correctly be:

```json
"format": "SiLVER70",
"source": "UK BLURAY REMUX · 1080p25 · SiLVER70"
```

Do **not** show a Blu-ray badge merely because `BLURAY` appears in the source filename.

Likewise, do not infer `format` by scraping the `source` string. Store it explicitly.

Current format map supports at least:

```text
BLURAY
PRiSM
SiLVER8
SiLVER16
SiLVER35
SiLVER55
SiLVER70
BRAZiER35
BRAZiER70
CLARiTY35
CLARiTY70
```

Use only formats for which the corresponding logo exists and renderer mapping is present.

---

# 15. Mixed video formats within one season

If most episodes use one restoration format but some use another, use ordered `formats`:

```json
"formats": ["SiLVER70", "SiLVER35"]
```

The **primary/majority format goes first**.

At episode level, specify the actual format where needed:

```json
"s01e06": {
  "format": "SiLVER35"
}
```

Rules:

- season detail shows all season formats side by side
- primary format is on the left
- episode detail shows the episode's own format when explicitly supplied
- otherwise episode detail inherits the season format
- all side-by-side format badges must have the **same visual height**, regardless of the source image's intrinsic dimensions

Breaking In S1 is the reference case:

```text
SiLVER70 | SiLVER35
```

with SiLVER70 primary.

---

# 16. Audio metadata

Valid channel-layout labels:

```text
Mono
Stereo
5.0
5.1
6.1
7.1
11.1
13.1
15.1
```

Do not invent alternate spelling such as `2.0` in the UI. Normalize perceptual 2.0 to `Stereo`, 1.0 to `Mono`.

Global display grouping is deliberately simpler than stored channel metadata:

```text
5.0 / 5.1 / 6.1 / 7.1  -> Surround
11.1 / 13.1 / 15.1     -> Atmos
```

Keep the exact channel layout in structured data; apply `Surround` / `Atmos` only at display time.

Structured examples:

```json
{"layouts":["Stereo"],"lossless":false}
```

```json
{"layouts":["5.1"],"lossless":true}
```

```json
{"layouts":["5.1"],"lossless":true,"quality":"24-bit"}
```

Aggregate multiple layouts with **no spaces around `/`**:

```text
Stereo/5.1
```

UI rendering:

```text
Stereo
5.1 · Lossless
5.1 · Lossless 24-bit
5.1 · Lossless 24/96
```

Rules:

- perceptual audio: channel layout only
- lossless: append `Lossless`
- genuine 24-bit at normal sample rate: `Lossless 24-bit`
- 24-bit above 48 kHz: compact to `Lossless 24/96`, `Lossless 24/192`, etc.
- 16-bit lossless remains simply `Lossless` unless a future UI rule explicitly changes it

When a season has uniform audio, store it once at season/catalogue level and let episodes inherit it. Add episode-level audio only for exceptions.

---

# 17. Current metadata placement and order

## Library cards

No audio metadata.

## Series detail header

No audio metadata.

Normal catalogue metadata only:

```text
year · seasons · episodes · optional collection-wide edition
```

## Season overview row

```text
year · episodes · audio · edition/cut
```

Edition/cut is always last.

## Season detail

```text
year · episodes · audio · edition/cut
```

Edition/cut is always last.

## Episode list

No audio. Keep it compact:

```text
runtime · date · cut/edition when relevant
```

## Episode detail

```text
episode code · date · runtime · audio · edition/cut
```

Edition/cut is always last.

---

# 18. Cut and edition metadata

Keep version labels out of titles whenever they are metadata.

Good:

```text
Title: Children of the Gods
Metadata: UNCUT
```

```text
Title: Consider Me Gone
Metadata: ALTERNATE ENDING
```

Not:

```text
Children of the Gods (Uncut)
Consider Me Gone (Alternate Ending)
```

Cut precedence:

1. explicit episode `cutLabel`
2. explicit episode `edition`
3. globally uncut series / episode `uncut`
4. season edition/cut
5. catalogue season edition/cut
6. series-wide edition

Explicit episode metadata overrides inherited series metadata.

### Entire series uncut

```json
"uncut": true
```

ALF uses this model.

### Special edition

```json
"edition": "SPECIAL EDITION",
"editionNote": "Twiki uses the alternate voice in this edition."
```

Buck Rogers uses this model.

`editionNote` is archival explanation and is not part of the plot description.

---

# 19. Optional M flags

Path:

```text
data/series/<folder>/episode-flags.json
```

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
    "M": ["s01e01", "s01e07", "s01e24-25"]
  }
}
```

Use M when the episodes exist in the collection and deserve a mythology/memorable marker.

**Never use M as a substitute for curation/exclusion.** If unwanted episodes are not part of the collection, do not add them merely to distinguish the retained episodes with M.

---

# 20. Runtime rules

Exact user media runtime is authoritative.

Store seconds:

```json
"runtimeSeconds": 2996
```

Display:

```text
44:13
01:36:57
```

One hour or more always gets two-digit hours.

Top-level `runtimeSeconds` must equal the actual included media/scoring collection, including:

- combined episodes
- specials
- uncut variants
- alternate cuts
- intentionally omitted episodes

Do not substitute a generic published series runtime.

---

# 21. Dates and ordering

Store dates as ISO:

```text
YYYY-MM-DD
```

Display formatting is handled by the UI.

Episode array order is the chosen collection order. Do not reorder by date merely because dates look non-sequential.

User-supplied DVD/production/chronological/custom order beats generic broadcast sorting.

---

# 22. TV scoring model

A complete TV score still represents the 15 SceneSense conceptual categories, split between season production qualities and episode-specific qualities.

## Season-level: 6 categories / 12 ratings

### CASTING — 12%
1. Do the actors feel naturally right for their characters?
2. Does the cast click as an ensemble?

### PERFORMANCE — 6%
3. Do the actors disappear convincingly into their roles?
4. Do the emotions feel genuine rather than performed?

### CINEMATOGRAPHY — 5%
5. Do the visuals make the show inviting to watch?
6. Do they avoid looking artificial, filtered or overly polished?

### WORLD — 5%
7. Do the locations feel convincing rather than like sets?
8. Does the world feel like it exists beyond the camera?

### SOUND — 5%
9. Do voices sound clean, believable and easy to understand?
10. Does the sound make you feel physically inside the scene?

### MUSIC — 6%
11. Does the music give the show a sound of its own?
12. Does the music enhance emotions without forcing them?

## Episode-level: 9 categories / 18 ratings

### WRITING — 9%
1. Did this episode have a story worth telling?
2. Did events follow naturally without the plot cheating?

### CHARACTER — 7%
3. Did everyone stay true to their character instead of changing just to serve the story?
4. Did the characters' choices make sense?

### REALISM — 6%
5. Once you accept the show's premise, did what happened feel believable?
6. Did actions have believable consequences?

### CHEMISTRY — 6%
7. Did you believe these people actually mattered to one another?
8. Did the episode add something meaningful to a relationship?

### DIRECTION — 5%
9. Did scenes feel like they were happening rather than being arranged for us?
10. Did the episode know how seriously to take itself?

### PACING — 7%
11. Did the episode use its time well?
12. Did important moments get enough time to land?

### ORIGINALITY — 6%
13. Did this episode bring something fresh to the series?
14. Did the episode use its central idea in an interesting way?

### MORALITY — 7%
15. Did the episode respect its characters as human beings?
16. Did the episode have a sound sense of right and wrong?

### INTEGRITY — 8%
17. Did it earn your reaction instead of trying to manufacture one?
18. Did the episode do the groundwork for its payoffs?

Season-level weight total: 39%.  
Episode-level weight total: 61%.  
Combined: 100%.

Category scoring uses the same 1–5 star control mapped onto 0–10 category values.

Season score = average of fully scored episode results.  
Series score = average of fully scored episode results across loaded seasons.

---

# 23. Poster checklist

Before catalogue commit:

1. list/check `assets/posters/`
2. copy the exact filename, including underscores/hyphens/case
3. verify 2:3 poster presence if available
4. point catalogue `poster` to that exact path
5. do not rename an existing poster merely to make the filename prettier unless explicitly intended

A poster can be missing temporarily, but a catalogue must never knowingly point at a fictional filename.

---

# 24. Description vs archival metadata checklist

Before committing any `description`, ask:

> If a viewer knew nothing about our file collection, would this still read like a sensible description of the programme itself?

If the answer is no, move the archival information elsewhere.

Use:

```text
description     -> story/content
collectionScope -> what is included/excluded
source          -> media provenance
edition         -> version label
editionNote     -> explanation of unusual edition
format/formats  -> restoration/video badge
audio           -> audio structure
cutLabel        -> episode-specific cut/version
```

---

# 25. Final integration audit

Before declaring a series complete, verify all of the following:

### Catalogue
- canonical title correct
- optional `detailTitle` only where genuinely needed
- single-year display does not produce fake `YYYY–YYYY`
- genres thoughtfully assessed
- Fantasy is not first
- Crime is not first
- first five actors are the intended visible cast
- poster path exactly matches a real repo file
- total runtime correct
- episode/scoring counts correct
- collection scope stored separately from descriptions

### Every season
- `season-NN.json` exists
- `season-NN-meta.json` exists
- year(s) correct
- exact episode order preserved
- every episode has a meaningful title
- exact runtimes preserved
- air dates preserved where known
- meaningful season description
- meaningful episode descriptions
- `format` or `formats` correct
- source medium not confused with restoration badge
- audio correct
- edition/cut correct

### Mixed formats
- primary badge first
- secondary badge second
- badges equal visual height
- episode-specific badge overrides work

### UI metadata
- no audio on library card
- no audio on series detail header
- season audio before edition
- episode list omits audio
- episode detail audio before edition
- edition/cut always last where specified

### Special cases
- combined episodes use stable combined IDs
- globally uncut series inherit `UNCUT`
- explicit alternate cut overrides inherited `UNCUT`
- curated collections contain only retained episodes
- M flags are not used to represent exclusion

### Deployment
- fetch final changed files again
- inspect final catalogue entry
- check latest Pages run corresponds to final head commit
- only call it deployed when that run succeeds

---

# 26. Reference special cases

## ALF
- globally `uncut: true`
- 102 numbered episodes / 100 scoring entries
- explicit `ALTERNATE ENDING` overrides inherited uncut on finale
- M flags used for mythology/memorable episodes

## Stargate SG-1
- custom 11-season collection
- 218 numbered episodes / 214 scoring entries
- combined long entries retained
- special uncut episode variants use metadata

## Alias Smith and Jones
- collection scope excludes later non-Pete-Duel Heyes episodes
- omission belongs in `collectionScope`, not story description

## Breaking In
- S1 uses `formats:["SiLVER70","SiLVER35"]`
- SiLVER70 is primary
- E06–E07 override to SiLVER35
- both badges display at equal visual height

## Around the World in Eighty Days
- canonical title spells **Eighty**
- detail-only compact title may use **80**
- episode titles are meaningful derived titles rather than `Episode 1` placeholders
- Blu-ray is source provenance; SceneSense restoration badge is SiLVER70

## Buck Rogers in the 25th Century
- curated preferred-episode collection, not a full-season-with-M model
- 17 numbered episodes / 15 scoring entries
- `SPECIAL EDITION` metadata
- Twiki alternate voice stored in `editionNote`
- collection omissions never appear in plot/season descriptions

## Brian Cox's Wonders
- custom nonfiction grouping
- `Documentary` is a deliberate vocabulary exception
- descriptions explain the scientific subjects, not how SceneSense grouped the programmes

---

This document is the integration contract. When a new show exposes a genuinely new requirement, update the contract at the same time as the site so the next chat inherits the rule instead of rediscovering the mistake.
