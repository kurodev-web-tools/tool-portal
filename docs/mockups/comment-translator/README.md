# Kuro Live Comment Translator Mock Foundation

Generated with `imagegen` built-in mode on 2026-05-30 for the first YouTube read-only broadcaster dock PR.

Target widths: `390 / 820 / 1024 / 1280 / 1366`.

## Files

| Target width | File |
|---:|---|
| 390 | `comment-translator-390.png` |
| 820 | `comment-translator-820.png` |
| 1024 | `comment-translator-1024.png` |
| 1280 | `comment-translator-1280.png` |
| 1366 | `comment-translator-1366.png` |

## Task 18 HTML Mock

- `operator-ux-readiness-task18-mock.html`
- Purpose: review the proposed account billing plan comparison and `/tools/comment-translator` start-blocked guidance before production implementation.
- Status: review mock only. It is not a runtime route and does not create Stripe Prices, start Checkout, open Customer Portal, call providers, or mutate remote state.

## Boundary

- Direction only: final UI text is reproduced in React rather than trusted from generated text.
- Fixture-only: the route uses a `MockTranslationProvider` boundary and static comment data.
- No real translation API, external provider call, provider secret, server action, quota write, billing, analytics, cookie consent, or YouTube live connection is included in this PR.
- The UI stays broadcaster-only and read-only. Reply generation, auto-posting, viewer overlay, and OBS plugin work remain out of scope.
