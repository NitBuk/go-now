# Contributing to Go Now

Thanks for your interest. Here's how to get started.

## Quick Start

**Frontend only** (recommended for UI work):

```bash
git clone https://github.com/NitBuk/go-now.git
cd go-now/apps/dashboard_nextjs
npm install && npm run dev
```

This connects to the live API -- no backend setup needed.

**Backend services** require a GCP project. See the [Full Stack Setup](README.md#full-stack-setup-requires-gcp-account) in the README.

## Running Tests

```bash
# Scoring engine (no GCP deps)
cd services/scoring_engine && uv run pytest tests/ -v

# API
cd services/api_fastapi && uv run pytest tests/ -v

# Ingest worker
cd services/ingest_worker && uv run pytest tests/ -v
```

## Pull Requests

- One feature or fix per PR
- Include tests for backend changes
- Run the relevant tests locally before submitting
- Keep PRs focused -- avoid unrelated formatting or refactoring changes

## Code Style

Already configured -- just follow the existing tooling:

- **Python:** [ruff](https://docs.astral.sh/ruff/) for linting (configured in each service's `pyproject.toml`)
- **TypeScript:** ESLint (configured in `apps/dashboard_nextjs/`)

## Project Structure

| Directory | What it is | Language |
|-----------|-----------|----------|
| `apps/dashboard_nextjs/` | Next.js web app | TypeScript |
| `services/api_fastapi/` | FastAPI REST API | Python |
| `services/ingest_worker/` | Data ingestion pipeline | Python |
| `services/scoring_engine/` | Standalone scoring package | Python |
| `services/shared_contracts/` | Shared DTOs | Python |
| `docs/` | Specification documents | Markdown |

## Reporting Issues

Use the [issue templates](https://github.com/NitBuk/go-now/issues/new/choose) for bug reports and feature requests.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
