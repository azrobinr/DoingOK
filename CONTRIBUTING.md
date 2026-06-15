# Contributing to DoingOK

Thank you for your interest in contributing to DoingOK. This project exists to protect vulnerable people, and every contribution — code, design, documentation, or feedback — helps us do that better.

---

## Code of Conduct

We are committed to providing a welcoming and respectful environment for all contributors. Please be kind, patient, and constructive in all interactions.

---

## Ways to Contribute

- **Bug reports** — found something broken? Open an issue using the bug report template.
- **Feature requests** — have an idea? Open an issue using the feature request template.
- **Code contributions** — fix a bug or build a feature (see workflow below).
- **Documentation** — improve setup guides, API docs, or inline comments.
- **Design** — UX/UI improvements for the mobile app or web.
- **Testing** — write or improve test coverage.

---

## Development Workflow

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/doingok.git
cd doingok
```

### 2. Create a feature branch

Branch off `dev`, not `main`:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-short-description
```

Branch naming conventions:
- `feature/` — new functionality
- `fix/` — bug fixes
- `docs/` — documentation only
- `chore/` — tooling, dependencies, configuration

### 3. Set up your environment

```bash
cp .env.example .env
# Fill in your local values — see docs/onboarding.md
```

### 4. Make your changes

- Keep commits small and focused
- Write clear commit messages: `fix: prevent duplicate alert on late check-in`
- Add or update tests where appropriate
- Update documentation if your change affects behavior

### 5. Open a Pull Request

- Target the `dev` branch (not `main`)
- Fill out the PR description — what does it do, why, and how was it tested?
- Link any related issues with `Closes #123`
- Request a review from a maintainer

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Always deployable. Protected — PRs only. |
| `dev` | Integration branch. All feature PRs target here. |
| `feature/*` | Individual work. Branch from and PR back to `dev`. |

---

## Sensitive Data

This project handles data for vulnerable individuals. Please take special care:

- **Never commit real user data**, even anonymized test data
- **Never commit secrets** — API keys, passwords, tokens. Use `.env` (which is gitignored)
- If you discover a security vulnerability, please report it privately to security@doingok.org rather than opening a public issue

---

## Questions?

Open a [GitHub Discussion](https://github.com/doingok/doingok/discussions) or reach out at tech@doingok.org.
