# SceneSense Data Migration Checkpoint Rules

These rules apply to all large catalogue, TV-series, poster, metadata and database integrations.

## Never treat conversational state as persistence

A statement such as "files are assembled" or "validation passed" does not mean the work is recoverable. A completed build requires a persistent artifact.

## Required workflow

### Phase 1: Build checkpoint

Before any commit claim:

- generate the actual files
- store them in a persistent location (repository branch, uploaded artifact, or equivalent)
- create an integration manifest
- record file count, episode count, runtime totals and description counts
- verify files exist

Example manifest fields:

```json
{
  "series": "Example",
  "files": 12,
  "episodes": 100,
  "runtimeSeconds": 123456,
  "descriptionCount": 100
}
```

### Phase 2: Repository checkpoint

A migration is not committed until:

- current `main` has been fetched
- changed files are written using current repository state
- commit SHA exists
- changed file list is verified
- post-commit fetch confirms the files exist

### Phase 3: Deployment checkpoint

A migration is not live until:

- Pages build/deployment is confirmed
- live site behavior is checked where practical

## Large TV batch requirement

For TV integrations, always create an integration manifest before deployment and compare:

```
pre-commit manifest
=
post-commit repository state
```

No equality means the migration is incomplete.

## Completion language

Do not say "completed" or "integrated" when only preparation has finished.

Use explicit states:

- Prepared: files generated but not persisted
- Persisted: files saved to a durable location
- Committed: Git SHA exists
- Deployed: production site verified
