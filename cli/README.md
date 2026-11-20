# Đắk Lắk CMS CLI

An agent-friendly CLI for authoring, validating, translating, reviewing, and publishing bilingual (`vi` / `en`) travel blog posts in the Đắk Lắk CMS.

## Features for AI Agents & Editorial Workflows

- **Zero-server or Live-server operation (`auto` / `--local` / `--http`)**:
  - Automatically talks to a running CMS server (`http://localhost:4000`) via Bearer token auth, or falls back to direct SQLite access (`--local`) when no server is running.
- **Structured JSON output (`--json`) & predictable exit codes**:
  - `0` success, `1` runtime/connection error, `2` validation/usage error, `3` auth/permission error, `4` not found.
- **Markdown-first authoring with bilingual support**:
  - Drafts use standard YAML frontmatter + Markdown body, with an optional `<!-- LANG:EN -->` separator for English translations.
  - Automatically converts Markdown to sanitized HTML (`sanitizeRichHtml`), extracts `previewParagraphs`, and estimates `readTime`.
- **Automatic local media upload (`--upload-media`)**:
  - References to local images (in `image:` frontmatter or `![alt](./img.jpg)` in body) are uploaded to `/uploads/...` and rewritten automatically.
- **Editorial context & quality gates**:
  - `context` exposes existing posts, categories, locations, and schema presets so AI agents avoid duplicate topics and match the editorial style.
  - `post validate` checks required fields, slug syntax, word count, image validity, glossary items, and translation readiness.

## Quick Start

```bash
# Inspect CMS health & post counts
npm run cms -- status --json

# Get editorial inventory, categories, locations & schema for an AI agent
npm run cms -- context --json

# Print ready-to-use AI agent workflow instructions
npm run cms -- agent-prompt --role writer

# Scaffold a bilingual Markdown draft
npm run cms -- post template --section stories --theme coffee --bilingual --out draft.md

# Validate before saving
npm run cms -- post validate draft.md --json

# Create or update from Markdown (uploading any local images) and submit for review
npm run cms -- post push draft.md --upload-media --submit --json

# Admin: submit AI-authored English translation & publish
npm run cms -- post translate <id-or-slug> --file draft.md --provider ai-agent --json
npm run cms -- post review <id-or-slug> --action publish --json

# Pull an existing post to Markdown for editing or translation
npm run cms -- post pull <id-or-slug> --bilingual --out post.md
```

## Authentication & Environment Variables

- `CMS_URL`: Target server URL (default `http://localhost:4000`)
- `CMS_MODE`: `auto` | `http` | `local`
- `CMS_TOKEN`: Bearer session token
- `CMS_EMAIL` / `CMS_PASSWORD`: Credentials for HTTP auto-login (or `--as <email>` in `--local` mode)
- `CMS_SESSION_FILE`: Custom session storage file (default `.daklak-cms-session.json`)
