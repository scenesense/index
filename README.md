# SceneSense

Static GitHub Pages site for the SceneSense Movie Quality Index.

## Scoring model

- 15 categories
- 5 human rating questions per category
- 1–5 stars per question
- ★☆☆☆☆ = 0.0, ★★☆☆☆ = 0.5, ★★★☆☆ = 1.0, ★★★★☆ = 1.5, ★★★★★ = 2.0
- Each category therefore scores 0.0–10.0
- Overall score uses the locked MQI v0.21.1 category weights

## Owner scoring

Visitors are read-only. To unlock the stars, use a GitHub fine-grained personal access token with **Contents: Read and write** permission for this repository. The token is stored only in `sessionStorage` and is never committed to the site.

## GitHub Pages

Deploy from the `main` branch, root folder, under **Settings → Pages**.
