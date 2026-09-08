# SceneSense TV Series Integration Guide Amendment: Secondary Audio Display

**Effective:** 2026-09-08  
**Applies to:** `TV_SERIES_INTEGRATION_GUIDE.md`, audio metadata and TV detail rendering.

When a retained television presentation includes a secondary audio option whose identity is editorially meaningful, season presentation metadata may include:

```json
"secondaryAudioLabel": "Stereo [original music]"
```

Hard rules:

- `secondaryAudioLabel` is presentation metadata, not a replacement for structured primary `audio`.
- The primary track still uses the normal structured audio schema and normal visible classes (`Mono`, `Stereo`, `Surround`, `Atmos`).
- The secondary label is shown only on the **season detail** and **episode detail** metadata rails, after the primary audio and separated by a middle dot.
- It is not shown on library cards, series headers, season overview banners or episode-list rows.
- Do not encode a secondary soundtrack as a fake channel layout, quality state, edition or cut label.
- A season-level `secondaryAudioLabel` applies to every retained episode in that season unless a later schema explicitly defines an episode-level override.
- Bracketed qualifiers may intentionally use lowercase when they function as descriptive metadata rather than a title.
- Example visible rendering:

```text
Surround · Stereo [original music]
```

Roswell (1999) is the reference implementation.
