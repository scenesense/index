# SceneSense Poster Policy

Poster selection is a **visual QA task**, not a metadata or URL lookup.

## Hard requirements

A poster is rejected unless it passes all of these checks:

- Inspect the actual image before committing it.
- Use a full, uncropped portrait composition. No zoomed or landscape-derived crops.
- The movie title must be clearly visible and complete.
- Prefer image-first artwork with only the title. Minimal extra text is strongly preferred.
- No guns or firearms visible on posters.
- No dense billing blocks, cinema credit walls, or masses of tiny text.
- No review blurbs, festival laurels, ratings boxes, release banners, streaming/DVD/Blu-ray branding, or watermarks.
- No photographed paper posters, folds, wrinkles, glare, scanner artifacts, or visible physical damage.
- No broken links, hotlink placeholders, HTML/error pages masquerading as images, or tiny thumbnails.
- The artwork must remain readable and attractive in both the library thumbnail and movie detail view.

## Selection priority

1. Clean official or licensed art with image + title only.
2. Clean alternate/key art with a readable title.
3. Minimally cluttered theatrical art only when no cleaner suitable art exists.

A technically valid image is not automatically an acceptable poster.

## Framing rule

SceneSense displays posters with `object-fit: contain` so the website must never crop or zoom poster artwork to fill the 2:3 frame. Small letterbox margins are preferable to losing part of the poster.

## Verification before completion

- Visually inspect candidate artwork.
- Confirm the image actually resolves.
- Confirm full title and composition are visible.
- Check for guns and prohibited clutter.
- Verify thumbnail and detail framing.
- Re-fetch the edited repository file after the commit.
- Inspect the commit diff and confirm only intended data changed.
