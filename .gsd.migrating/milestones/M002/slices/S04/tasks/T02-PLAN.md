---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Rewrite README.md to concise navigation hub (< 80 lines)

Rewrite README.md from 232 lines to < 80 lines. Keep: project tagline, feature bullets (6 items), quick-start (install → configure → db:migrate → dev/build), documentation link table pointing to docs/architecture.md, docs/development-notes.md, docs/deployment.md, and the original spec doc. Remove: full API overview, data model, project structure tree, CLI usage details, tech stack table — these are already covered in architecture.md. Keep tech stack as a compact one-liner or omit. All content in Chinese to match existing docs.

## Inputs

- `docs/architecture.md`
- `docs/development-notes.md`

## Expected Output

- `README.md`

## Verification

wc -l README.md
