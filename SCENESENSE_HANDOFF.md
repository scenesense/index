# SceneSense / Movie Quality Index — Project Handoff

**Purpose:** This file is the continuity document for a fresh ChatGPT conversation taking over SceneSense development. Read it before changing the site.

**Repository:** `scenesense/index`  
**Production site:** `https://scenesense.github.io/index/`  
**Branch:** `main`  
**Working UI/data baseline documented here:** commit `4e00218f5d6ecd52918bca7eaa3ce8c0753ceb80` (`Tighten King Solomon II card title`).  
The commit that adds this handoff file changes documentation only and does not intentionally change site behavior.

---

## 1. First rule for the next chat

SceneSense is already a working production site. Do **not** rebuild it from memory, regenerate files wholesale, or treat this as a greenfield project.

Before every repository edit:

1. Fetch the **current** target file from `main`.
2. Use its current GitHub blob SHA for the write.
3. Make the smallest required change.
4. Write directly to `main` unless the user explicitly requests another workflow.
5. Re-fetch the edited file after the commit when the change is important.
6. For `data/movies.json`, preserve all newer ratings and fields. Never overwrite it from a stale local/chat copy.
7. **Global visible-text rule: the ampersand character (U+0026) is forbidden everywhere the site can display text. Write `and` instead, including when importing or matching titles from external databases. Run `python scripts/validate-visible-ampersands.py` before committing content changes.**

The GitHub connector is the normal way to work on this repo. Do not tell the user the repository is inaccessible merely because one particular write route fails. Try the appropriate GitHub-native action instead.

---

## 2. What SceneSense is

SceneSense is a static GitHub Pages movie database and scoring application built around the user's independent **Movie Quality Index** rather than IMDb/Rotten Tomatoes/awards/popularity.

The public library is read-only. The owner can unlock scoring in the browser with a fine-grained GitHub personal access token. The token is kept in `sessionStorage`, is never committed, and is used by the site to update scores through the GitHub Contents API.

The current visual design is dark navy/black, compact, poster-first, and intentionally information-dense without becoming a conventional streaming-service UI.

---

## 3. Core repository files

### `index.html`

This is more than markup. It currently contains a substantial inline enhancement layer on top of `engine.js` and `styles.css`.

Important responsibilities currently living in `index.html` include:

- category display-name overrides (`WRITING`, `CHARACTER`, etc.)
- ordered genre vocabulary and fallback genre map
- title splitting for colon titles
- special Indiana Jones two-line title handling
- library search and sort override
- exact-runtime-aware sorting
- title/subtitle fit logic
- genre-row fit logic
- actor-chip rendering
- detail description/genre rendering
- missing-poster fallback
- responsive category-grid overrides
- rating-question hover tooltips

Do not assume a behavior is controlled only by `engine.js`; `index.html` intentionally overrides several base functions after `engine.js` loads.

### `styles.css`

Base visual design plus several later refinements.

Current important card-title rules:

- main card title: **19.5 px desktop**, **16.5 px mobile**
- title uses Saira small caps, so true capitals remain larger than synthesized small capitals
- main title is allowed to wrap naturally rather than being clipped or globally shrunk
- main-title line-height is **1.02**
- subtitle line-height is **1.02**
- subtitle sits close to main title (`margin-top: -1px !important` from `styles.css`)
- current subtitle target size is **16 px desktop**, **13 px mobile**
- subtitle is white, not grey
- card metadata is white, 13 px, weight 400, small caps

Special current one-off:

```css
.movieCard[data-movie="king-solomons-mines-ii-2004"] .cardTitle{
  letter-spacing:0!important
}
```

This exists only to keep the `II` of **King Solomon's Mines II** on the first visual line without reducing the font size.

### `categories.js`

This is the **canonical scoring rubric**.

It defines:

- repository constants
- branch and data path
- all 15 categories
- all 75 questions
- locked category weights

Do not silently rewrite the rubric in another file. If a question or weight is changed, `categories.js` is the canonical source that must be updated deliberately.

### `engine.js`

Base application engine. Important functions include:

- data loading
- merging supplemental movies
- exact runtime overlay
- category and overall score calculation
- owner token validation
- star interactions
- dirty-state handling
- safe GitHub score saving
- base library rendering
- movie detail opening/closing

### `data/movies.json`

Primary production movie database. Current schema version is `3`.

This file contains the established library and stored ratings. It is the file the browser's Save button writes to.

### `data/movies-additions-20260830.json`

Supplemental movie data loaded in addition to `movies.json`.

This is not merely archival. `engine.js` fetches it every load and appends movies whose IDs are not already present in `movies.json`.

### `data/exact_runtimes_manifest.json`

Canonical exact runtimes used by the loader.

After `movies.json` and the supplemental file are merged, the runtime manifest overlays matching movies by normalized:

`year | title | version`

It then sets:

- `runtimeSeconds`
- `runtimeExact`
- rounded `runtimeMinutes`

Therefore, changing only `runtimeMinutes` in a movie record may be undone on load. If an exact runtime is being corrected, inspect and update the runtime manifest too.

### `assets/posters/`

Preferred permanent home for approved poster assets.

### `POSTER_POLICY.md`

Contains useful poster-selection principles, but note the **latest user instruction supersedes part of its older storage wording**. See the poster section below.

---

## 4. The three-layer movie data model

This is one of the easiest places to create subtle regressions.

At startup `engine.js` loads, in parallel:

1. `data/movies.json`
2. `data/exact_runtimes_manifest.json`
3. `data/movies-additions-20260830.json`

Then it does this:

1. load `movies.json`
2. append supplemental movies whose IDs are not already present
3. apply exact-runtime manifest values to the merged collection
4. clone the result as `savedData`
5. render the library

### Consequence: duplicate IDs

If a movie exists in both `movies.json` and the supplemental file, the main `movies.json` version wins because the supplemental copy is skipped.

Before editing a movie, search/fetch both data files if you are not certain where the authoritative record currently lives.

### Consequence: scoring a supplemental-only movie

The safe Save routine writes ratings to `data/movies.json`.

If the changed movie exists only in the supplemental collection, `saveData()` cannot find it in remote `movies.json`, so it pushes the current movie object into `movies.json`. On later loads that new main copy wins and the duplicate supplemental record is skipped.

In other words, **scoring a supplemental movie can effectively promote it into `movies.json`**.

Do not be surprised by this behavior and do not create a second manual copy without checking first.

---

## 5. The scoring system

There are exactly **15 categories × 5 questions = 75 ratings**.

Every question uses 1–5 stars, converted as:

| Stars | Points |
|---|---:|
| ★☆☆☆☆ | 0.0 |
| ★★☆☆☆ | 0.5 |
| ★★★☆☆ | 1.0 |
| ★★★★☆ | 1.5 |
| ★★★★★ | 2.0 |

Each category contains five questions, so each category scores **0.0–10.0**.

Five neutral 3-star answers produce **5.0/10**.

Unselected questions are **unrated**, not zero.

A category score is not produced until all five questions in that category are rated. The overall score is not produced until all **75** questions are complete.

### Locked category weights

| Category key | Display category | Weight |
|---|---|---:|
| `writing` | WRITING | 9% |
| `character` | CHARACTER | 7% |
| `realism` | REALISM | 6% |
| `casting` | CASTING | 12% |
| `performance` | PERFORMANCE | 6% |
| `chemistry` | CHEMISTRY | 6% |
| `direction` | DIRECTION | 5% |
| `editing` | PACING | 7% |
| `visuals` | CINEMATOGRAPHY | 5% |
| `world` | WORLD | 5% |
| `sound` | SOUND | 5% |
| `music` | MUSIC | 6% |
| `creativity` | ORIGINALITY | 6% |
| `morality` | MORALITY | 7% |
| `integrity` | INTEGRITY | 8% |

Total = **100%**.

Overall formula:

```text
sum(categoryScore × categoryWeight) / 100
```

Do not invent replacement weights.

The complete wording of all 75 questions is already in `categories.js` and that file is the canonical source.

---

## 6. How AI scoring should be done in chat

When the user asks ChatGPT to score a film for SceneSense, the intent is **independent film assessment**, not consensus imitation.

Rules:

- score the exact cut/version being discussed
- answer from the film itself
- ignore IMDb gravity, awards, Oscars, prestige, popularity, box office, fandom and critic consensus
- do not try to predict the score the user wants
- provide a brief film-specific justification/evidence for every question
- do not let one strong category compensate for another weak category
- use 3★ only when genuinely mixed/ordinary/neutral, not as an uncertainty bucket
- use 1★ and 5★ when actually warranted; do not compress everything into the middle
- do not manufacture defects simply because a criterion had little opportunity to fail

Useful interpretation rules already established:

- **Realism:** grant the film's central fictional premise, then assess additional departures from normal human, practical, technical and physical reality.
- **CGI/effects:** narrative necessity is not automatically production-method necessity. Prefer credible practical/natural/hybrid realization where reasonably available.
- **Casting Aesthetics vs Magnetism:** keep them distinct. Aesthetics is visual beauty; magnetism is attention/presence.
- **Underage performers:** any magnetism assessment is strictly nonsexual warmth, vitality, charm or screen presence.
- **Chemistry:** relationship depth must work for couples, families, friends, teams, rivals and groups, not only romance.
- **Moral Opposition:** the opposing force need not be a human villain.
- **Integrity / Degradation:** needless profanity or depravity is a negative. Meaningful, earned use can be neutral or positive.

### Description/blurb convention

For newly scored films, the user prefers the assistant's concise, dry/cynical end-of-score description as the site description instead of simply copying an official IMDb-style plot summary. It still has to be accurate to the actual film and useful as a description, not random snark.

Existing older entries may still use conventional concrete synopses. Do not mass-rewrite them unless requested.

---

## 7. Safe score saving — critical regression rule

This was previously broken and caused old browser state to overwrite newer repository ratings. The current `saveData()` implementation is intentionally defensive.

### Current safe-save behavior

When Save is pressed:

1. compare current local ratings against `savedData`
2. identify only movie IDs whose **ratings** changed
3. fetch the **latest remote `data/movies.json`** and its SHA from GitHub
4. parse that fresh remote file
5. merge only the changed movie ratings into the fresh remote data
6. PUT that merged file back using the fresh SHA
7. reload saved state

If a changed movie is not yet present in remote `movies.json`, its current movie object is appended.

### Never regress to this old pattern

Do **not** restore a Save implementation that simply PUTs the entire browser's stale `data` snapshot over the repository.

That destroys metadata/ratings added after the page was opened.

### Rule for assistant-driven data edits

The same principle applies when editing through the GitHub connector:

- fetch current `movies.json`
- preserve all ratings and unrelated fields
- change only the intended records/fields
- write with the current SHA

Never reconstruct `movies.json` from chat memory.

---

## 8. Library layout and card behavior

### Cards

Each movie card contains:

1. poster
2. score badge
3. title first line
4. optional title second line/subtitle
5. metadata (`year · rounded runtime · version`)
6. ordered genres

Descriptions do **not** appear on thumbnails.

### Default sorting

Default: **Score descending**.

Unrated/incomplete films behave as score `0` for library sorting.

Sort menu currently supports:

- Score ↓
- Score ↑
- Title A–Z
- Title Z–A
- Year ↓
- Year ↑
- Runtime ↓
- Runtime ↑

Runtime sorting uses `runtimeSeconds` when available, otherwise `runtimeMinutes × 60`.

For equal default scores, normal fallback is title order, except the two current Indiana Jones entries have an explicit franchise tie order so **Raiders** precedes **Last Crusade**.

### Search

Search is whitespace-tokenized and **ANDed**.

The searchable haystack includes:

- title
- year
- version
- ordered genres
- actors

Examples that should work:

```text
1979 horror
Sigourney science fiction
Christmas romance
```

Every entered term must be present somewhere in the movie's search text.

---

## 9. Runtime presentation — do not repeat the old regression

The user explicitly wants different runtime displays in the card and detail views.

### Library thumbnail

Always display rounded minutes:

```text
1984 · 116 min · Theatrical Cut
```

Do **not** show `HH:MM:SS` on thumbnails.

### Movie detail view

When an exact runtime is available, display:

```text
1984 · 01:55:56 · Theatrical Cut
```

`runtimeText(movie)` handles this distinction based on whether the movie detail view is active.

### Sorting

Use exact seconds whenever present.

---

## 10. Title rendering

### Normal titles

The first card title line is the main title.

It is **not** supposed to be clipped or aggressively shrunk. If it is too long, it may wrap to a second visual line at the same main-title size.

Current main-title typography:

- Saira
- small caps
- 19.5 px desktop
- 16.5 px mobile
- weight around 650
- line-height 1.02
- white

The recent 18 → 19.5 px change was made because the synthesized smaller capitals looked too tiny compared with the true capitals.

### Colon titles

`splitDisplayTitle()` automatically treats text before `:` as the main line and text after `:` as the subtitle.

Example:

```text
2010
The Year We Make Contact
```

The subtitle is:

- white, same color as main title
- 16 px desktop
- 13 px mobile
- single-line
- auto-shrunk only as much as necessary to fit width
- line-height 1.02
- vertically close to the main title

The subtitle should use the available row width, not be globally condensed into a narrow-looking label.

### Indiana Jones special split

Two custom title mappings currently exist:

```text
Indiana Jones
Raiders of the Lost Ark
```

and

```text
Indiana Jones
The Last Crusade
```

The underlying database titles remain:

- `Indiana Jones and the Raiders of the Lost Ark`
- `Indiana Jones and the Last Crusade`

Do not rename the data records merely to achieve the display split.

### King Solomon's Mines II special fit

The title should remain normal size. Only its tracking is tightened to `letter-spacing: 0` so `II` stays on the first visual line.

---

## 11. Genre system

Genres describe the **kind of movie experience**, not the medium, audience, prestige status or subject matter.

Current vocabulary:

- Action
- Adventure
- Comedy
- Crime
- Drama
- Horror
- Romance
- Science Fiction
- Thriller
- Western
- Musical
- Mystery
- Christmas
- Fantasy

Explicitly rejected as routine SceneSense genres:

- Animation
- Biography
- Historical
- Family
- Sport
- Superhero
- Epic

`War` has also not been accepted as an automatic category; treat it cautiously rather than inventing it into the vocabulary.

### Ordering matters

Never alphabetize genres.

Genre order is dominant viewing experience first, then supporting modes.

Examples:

```text
Back to the Future → Adventure · Science Fiction
Back to the Future III → Adventure · Western · Science Fiction · Romance
Alien → Horror · Thriller · Science Fiction
Aliens → Action · Thriller · Horror · Science Fiction
Leaving D.C. → Mystery · Horror · Thriller
```

### Fantasy rule

Use Fantasy only when the world fundamentally operates through magic, supernatural/enchanted beings, folklore or fairy-tale rules.

A science-fiction premise is not automatically Fantasy.

### Christmas rule

Use Christmas only when Christmas materially shapes the plot, setting, relationships, atmosphere or structure. Do not use it as shorthand merely because something resembles a Hallmark production.

### Comedy rule

Use Comedy only when making the audience laugh is a central purpose of the movie.

### Card fitting

All genres remain in the data and detail page. On a narrow thumbnail, `fitCardGenres()` progressively removes trailing genres from the displayed card row until the row fits. It does not change the stored genre list.

---

## 12. Posters

Poster handling has gone through several iterations. Use the latest rules below, not old assumptions.

### Visual preference

Preferred poster:

- portrait composition
- full recognizable poster composition
- movie title clearly visible and complete
- clean/key-art feel
- little promotional clutter
- avoid taglines, billing walls, review blurbs, festival laurels, release banners and watermarks when possible
- no guns/firearms visible

### Latest source-integrity rule

The user explicitly rejected assistant-driven cropping/manipulation used merely to make a poster comply.

When the user supplies a poster URL:

- treat that exact artwork as the requested source
- do not creatively crop, clean, redraw or alter the image unless explicitly asked
- do not silently substitute a different poster
- display positioning (`object-position`) is acceptable when explicitly requested, because it does not alter the source file

Earlier `POSTER_POLICY.md` language recommending conversion to WebP predates this stricter user preference. For newly user-supplied assets, preserve the supplied image bytes/format unless the user explicitly approves conversion.

### Preferred production state

Approved posters should normally live under:

```text
assets/posters/
```

with the movie record pointing at the local path.

Do not tell the user the repo is unavailable if a particular binary-upload path is awkward. Use the GitHub connector and an appropriate GitHub-native path.

### Current technical exception: 10 remote display overrides

At the baseline documented here, ten recently supplied posters are being applied through CSS `content:url(...)` overrides in `styles.css` rather than being fully localized. This was used to get the requested artwork live after the binary-import route was blocked.

The current overrides are:

- Indiana Jones and the Raiders of the Lost Ark  
  `https://image.tmdb.org/t/p/original/hm799c7uDQdJHenPSJQprX0l6L.jpg`
- Indiana Jones and the Last Crusade  
  `https://i.ebayimg.com/00/s/MTYwMFgxMDY2/z/-FgAAOSwwK5juLUD/$_57.JPG?set_id=880000500F`
- John Tucker Must Die  
  `https://m.media-amazon.com/images/M/MV5BYWZlYzFmYzMtNjI2MS00MmE3LTlhZTQtNzBlZmYyZjM3MmFmXkEyXkFqcGc@._V1_.jpg`
- Jurassic Park  
  `https://cdng.europosters.eu/pod_public/750/266264.jpg`
- Just in Time for Christmas  
  `https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p12216957_p_v13_ax.jpg`
- K-19: The Widowmaker  
  `https://image.tmdb.org/t/p/original/lg45uF9zyeqhXm7URE5WQ9cOjuF.jpg`
- Kate and Leopold  
  `https://www.cinematerial.com/p/500x/e7duc9ek/kate-leopold-movie-poster.jpg?v=1456197882`
- King Kong  
  `https://studiocloudstoragelive.blob.core.windows.net/media/7d5225b6-270c-4e47-9cd4-a8ee4a1ccc38.jpg`
- King Solomon's Mines II  
  `https://m.media-amazon.com/images/S/pv-target-images/26133729336eaabd49ca7bd59fb904921146dee403c76be2bd5ecaffb137324b.png`
- Love Actually  
  `https://m.media-amazon.com/images/M/MV5BYWRlZjcwYTgtYWJkOS00MGYwLTk3Y2ItNmU4NTg5Nzg2YTQ2XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg`

For **Kate and Leopold**, the user specifically asked for the bottom to be cut rather than the top, so its display rule uses:

```css
object-fit:cover!important;
object-position:center top!important;
```

Do not remove the remote overrides until equivalent local assets are actually present and verified.

### Already localized recent examples

Recent supplied images that were localized successfully include:

- `assets/posters/easy-a-2010.jpg`
- `assets/posters/gojira-mainasu-wan-2023.jpg`
- `assets/posters/guess-whos-coming-to-dinner-1967.jpg`
- `assets/posters/heaven-can-wait-1943.jpg`
- `assets/posters/in-time-2011.jpg`
- `assets/posters/finding-christmas-2013.jpg`

Do not revert those to older external candidates.

---

## 13. Detail page

Clicking a card opens a hash-addressable movie detail view:

```text
#movie=<movie-id>
```

The detail page contains:

- back button
- larger poster
- main title
- optional subtitle
- year · exact runtime · version
- all ordered genres
- principal cast chips
- description
- overall score/progress
- all 15 scoring categories

### Cast chips

Display up to five principal actors from `movie.actors`.

Current styling:

- white/light rectangular chip
- dark text
- square corners
- true uppercase
- one horizontal row
- if the row does not fit, trailing chips are removed until it fits

---

## 14. Scoring-grid UI

Desktop category layout:

- 3 columns normally
- 2 columns below 1250 px
- 1 column below 760 px

Each category contains five compact rating rows.

Current behavior deliberately shows category bodies rather than relying on expandable accordion interaction. Category headers have pointer interaction disabled by the inline override.

The short criterion name is visible. The full question appears in a hover tooltip when hovering the rating name.

Stars are compact and aligned to the right.

---

## 15. Typography and casing

Primary typeface: **Saira**.

Global interface styling uses small caps extensively:

```css
font-variant-caps: small-caps;
font-synthesis-small-caps: auto;
```

Important exceptions use normal casing deliberately:

- scoring questions
- descriptions
- mode/save text

Actor chips use explicit true uppercase rather than synthesized small caps.

The user is sensitive to subtle typography regressions. Do not casually replace the card title font, card metadata font, or small-caps behavior while trying to solve a width problem.

Prefer a narrowly scoped title-specific fix over a global font change.

---

## 16. Card metadata styling

Current thumbnail metadata line is intentionally:

- Saira
- 13 px
- weight 400
- small caps
- white (`#fff`)
- slight `.02em` tracking

It must remain visually distinct from the genre row below it.

Do not make metadata grey again unless explicitly requested.

---

## 17. Movie record shape

Typical movie object:

```json
{
  "id": "example-movie-2001",
  "title": "Example Movie",
  "year": 2001,
  "runtimeMinutes": 123,
  "runtimeSeconds": 7380,
  "runtimeExact": "02:03:00",
  "version": "Theatrical Cut",
  "tmdbId": 12345,
  "poster": "assets/posters/example-movie-2001.jpg",
  "description": "Concrete, concise description.",
  "actors": [
    "Actor One",
    "Actor Two",
    "Actor Three",
    "Actor Four",
    "Actor Five"
  ],
  "genres": [
    "Romance",
    "Comedy"
  ],
  "ratings": {}
}
```

`tmdbId` is useful but not mandatory for all older entries.

### IDs

Use stable lowercase hyphenated IDs, normally including the year.

Do not casually change an existing ID because it is used by:

- hashes
- card `data-movie`
- ratings
- CSS special cases
- poster filenames
- supplemental deduplication

---

## 18. Adding movies

The user has previously asked to avoid deploying more than **20 new movies at a time** because very large GitHub batches have caused problems.

Recommended sequence:

1. fetch current `movies.json`, supplemental additions, runtime manifest and their SHAs
2. check whether each intended movie already exists by ID/title
3. add no more than 20 new entries in one batch unless the user explicitly changes this rule
4. preserve exact supplied `HH:MM:SS` runtime
5. store `runtimeSeconds` and `runtimeExact`
6. ensure rounded `runtimeMinutes` is correct
7. add/update exact runtime manifest so load-time overlay agrees
8. add ordered genres according to SceneSense rules
9. add five principal actors where known
10. add a concrete description or the current dry SceneSense description style requested by the user
11. add poster reference only after the intended image is confirmed
12. use `ratings: {}` for an unrated film
13. re-fetch after commit and verify no existing rating data changed

### Exact runtime rounding

The loader currently calculates rounded minutes approximately as:

```js
Math.floor((runtimeSeconds + 30) / 60)
```

So card minutes are nearest-minute rounded, not necessarily simple floor division.

---

## 19. Editing existing movies

Before changing an existing movie:

1. determine whether its authoritative record is in main or supplemental
2. fetch that exact live file and SHA
3. check runtime manifest if runtime is involved
4. preserve ratings exactly
5. change only requested metadata fields
6. do not reorder genres unless requested or clearly correcting SceneSense ordering
7. do not alter posters not mentioned by the user
8. do not rewrite all descriptions as part of an unrelated metadata change

A poster change should not mutate scores. A font change should not rewrite movie data. Keep concerns separated.

---

## 20. Current known quirks / technical debt

These are not necessarily bugs that should be “cleaned up” without permission. They are simply facts the next chat should know.

### A. Inline enhancement layer

`index.html` contains significant behavior that would traditionally live in separate JS/CSS files. This grew through iterative visual tuning.

Do not refactor it merely for elegance unless the user asks. Refactors create high regression risk and give very little visible benefit.

### B. Main + supplemental split

The movie library is currently split across two JSON files and merged client-side. This works, but means movie location must be checked before edits.

Do not consolidate the files casually because score saving and runtime overlays need to be considered.

### C. Ten remote poster CSS overrides

See the poster section. They are visually correct current state but should eventually be localized when a safe binary path is available.

### D. Stale Finding Christmas `.webp` CSS selector

`index.html` still contains an old special selector targeting:

```text
finding-christmas-2013.webp
```

The current movie record uses `finding-christmas-2013.jpg`, so that old selector is effectively inert. It is harmless. Do not remove it during unrelated work unless intentionally cleaning known dead code.

### E. Historical batch workflow

A previous `.github/workflows/deploy-batch-51-70.yml` was reused temporarily for narrowly scoped patching and then deleted by its last run. At the baseline documented here it is no longer present.

---

## 21. Current baseline file SHAs

These SHAs are included as a forensic checkpoint only. **Always fetch current files again before writing.**

At the UI/data baseline documented here:

```text
main commit                               4e00218f5d6ecd52918bca7eaa3ce8c0753ceb80
categories.js                             a05ccd23f1101af61b98a7b303a87dcee227377f
engine.js                                 a4f6b2bd22d5a604a698b6412e561ed4c834ab31
index.html                                c7d79c5edb73f75d49056781f571761bc82a3708
styles.css                                86c546235affe05f59a3d318ba8618dc6e20b05c
data/movies.json                          6e559179a79dbd010558a4b7da7317306191c435
data/movies-additions-20260830.json       cdf8d40b898d685238cf8c29510cfe71a0f03b59
data/exact_runtimes_manifest.json         fbb2e348a2e62d274561028ee53e12459124a6c1
POSTER_POLICY.md                          696bf8abb7b070f87697fa87dde2e6a1d4d32972
README.md                                 58e9f3a2b3fcf3e8014bed536d7976100b73d1f5
```

If any current SHA differs later, the current repository wins. Do not force these old SHAs back into place.

---

## 22. Useful historical commits

These are useful for understanding intent if a regression appears. Do not blindly revert to them.

```text
85aa2d4...   restored ratings after stale-save damage
a8d5cd8...   introduced safe rating merge save
33d7db3...   search/sort feature work
42965744...  Alien Special Edition runtime correction
2a9150f...   An Unfinished Life principal-cast correction
c38f049a...  supplied Easy A / Gojira / Guess Who posters localized
98ac9893...  Finding Christmas display and subtitle-size work
d23120c0...  restored thumbnail metadata weight and made it white
8c61574d...  refreshed white metadata style
1cf82e46...  In Time / Finding Christmas poster presentation + Leaving D.C. genre order + subtitle size
4e00218f...  current baseline: King Solomon II title tracking tweak
```

Commit IDs shown with ellipses are historical references; use GitHub history if exact full SHA is needed.

---

## 23. Regression checklist before declaring a change complete

After any meaningful UI/data change, verify the relevant points below.

### Library

- site loads without JS error
- card grid renders
- default sort is Score ↓
- search still searches title/year/version/genre/actors
- unrated movies still sort as zero
- title/year/runtime sort directions still work

### Cards

- poster not unintentionally cropped/letterboxed differently
- first title line is not clipped
- long first-line title may wrap naturally
- subtitle is white and close to first line
- subtitle remains one line and only shrinks as needed
- metadata remains white and rounded-runtime-only
- genres remain last line and preserve order

### Runtime

- card shows `### min`, never `HH:MM:SS`
- detail shows exact runtime when available
- runtime sorting uses seconds

### Detail

- main/subtitle split correct
- all genres visible
- actor chips fit
- description visible
- score progress correct

### Scoring

- all 75 rows exist
- star selection works only when unlocked
- incomplete category/overall score remains `—`
- Save touches only changed ratings
- no older ratings disappear after Save

### Data

- no duplicate unintended movie IDs
- exact runtime manifest agrees with edited runtimes
- unrelated ratings untouched

### Deployment

- commit landed on `main`
- Pages workflow starts/completes
- do not claim the public page has updated until deployment has actually caught up

---

## 24. How to respond to user correction requests

The user usually gives narrow, concrete visual feedback such as:

- “make this one title slightly narrower”
- “move this genre first”
- “replace these poster URLs”
- “subtitle 1 px smaller”

Treat these as narrowly scoped edits.

Do not solve one title overflow by globally changing every title. Do not solve one poster's framing by changing `object-fit` for the whole library. Do not “improve” unrelated metadata in the same commit.

When a previous explanation was wrong, use the live repository/history to diagnose rather than inventing a cause.

---

## 25. Recommended next-chat startup sequence

A fresh chat taking over this project should do this before making changes:

1. read `SCENESENSE_HANDOFF.md`
2. fetch `main` branch head
3. fetch the exact file(s) relevant to the requested change
4. if editing a movie, determine whether it is in `movies.json` or supplemental
5. if runtime is involved, inspect `exact_runtimes_manifest.json`
6. if poster is involved, inspect current movie poster path **and** `styles.css` for an existing CSS override
7. make the smallest live edit with the current SHA
8. verify the commit and Pages deployment

The current site is in a good working state. Preserve that state first; improve it second.

## Current 4K metadata convention

Library cards and movie-detail metadata both end with a `4K` marker. The metadata row must remain on one line and may shrink slightly to fit rather than wrap or clip. The normal marker is silver. Blue is reserved for these current IDs: BTTF I–III, Alien, Bring It On, Dragonheart, Gojira Minus One, Guess Who’s Coming to Dinner, both Indiana Jones films, and Jurassic Park. The implementation currently lives in the inline UI layer in `index.html`.

