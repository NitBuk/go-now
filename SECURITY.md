# Security Policy

## Supported Versions

Only the current version on `main` is actively maintained. There are no legacy versions to patch.

## Reporting a Vulnerability

Please don't open a public issue for security bugs.

Instead, use GitHub's [private vulnerability reporting](https://github.com/NitBuk/go-now/security/advisories/new) or email me directly — you can find my contact in my GitHub profile.

I'll acknowledge within a few days and aim to have a fix out within 2 weeks depending on severity. I'll keep you in the loop throughout.

## Scope

Things that are in scope:

- API endpoints (`/v1/public/*`) — injection, auth bypass, data leakage
- GCP infrastructure — misconfigured IAM, exposed credentials, public buckets
- Dependencies with known CVEs affecting this project

Things that are out of scope:

- Scoring results being "wrong" or disagreeing with conditions — that's a product issue, not a security one
- Findings from automated scanners with no demonstrated impact
- Third-party services (Open-Meteo, Firebase) — report those upstream

## A Note on Severity

This is a small personal project. There's no user auth, no PII, and no payments. That said, I take security seriously and appreciate responsible disclosure regardless of scale.
