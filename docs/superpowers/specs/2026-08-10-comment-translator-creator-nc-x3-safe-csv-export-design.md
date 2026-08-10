# Comment Translator Creator NC-X3 Safe CSV Export Design

> Design basis: the user-approved NC-X3 handoff and the existing NC-H1 safe-history contracts. This document records the smallest implementation boundary; it does not authorize deployment, activation, migration apply, or publication.

## Goal

Allow an authenticated Creator owner to download the existing NC-H1 safe-history projection as a bounded CSV attachment without creating a second authority, adding fields, or changing retention and deletion behavior.

## Architecture and data flow

1. A fixed `GET` route accepts no owner, session, entitlement, history, retention, or query authority from the browser.
2. The route calls the existing `readCommentTranslatorCreatorSafeHistoryAction()`. That action remains responsible for server-derived caller auth, the fixed-closed paid authority, the current durable session, the trusted NC-H1 store, and safe-row validation.
3. A safe-history result is passed to a server-only CSV serializer. The serializer has an explicit allowlist and a fixed row bound of 500. More than 500 rows fails closed instead of silently truncating the owner’s history.
4. The response is a UTF-8 BOM CSV with CRLF records, RFC-compatible quoting, a stable sanitized filename, attachment disposition, and `Cache-Control: no-store`. No object is written to R2 or another store.
5. Missing or unreadable authorization, entitlement, session, store, projection, or row-bound state returns a sanitized non-CSV unavailable response with no reason detail.

## Safe CSV contract

The seven deterministic columns are limited to values already rendered by `CommentTranslatorCreatorHistoryPanel`:

| Order | Header | Source / UI mapping |
| --- | --- | --- |
| 1 | `author` | `authorDisplayName ?? authorLabel` |
| 2 | `badge` | the panel’s validated priority badge fallback to `badgeLabel` |
| 3 | `purchase` | `purchaseLabel` |
| 4 | `translated_text` | `translatedText` |
| 5 | `original_text` | `originalText` |
| 6 | `moderation` | the panel’s safe human-readable moderation label |
| 7 | `source` | `sourceAttributionLabel` |

Owner IDs, session references, correlation digests, timestamps, translation status, raw/provider values, private metadata, and any field not in the safe panel are excluded. Null values encode as empty cells. The server-provided NC-H1 row order is preserved.

Every cell is quoted when required by comma, quote, CR, or LF. Quotes are doubled. Unicode is retained. A cell whose value begins, after leading whitespace/control characters, with `=`, `+`, `-`, or `@` receives a leading apostrophe before CSV quoting so spreadsheet applications treat it as text.

The panel shows a fixed notice: the export contains only the existing seven-day safe-history window; the current retention and deletion rules continue to apply; downloading does not delete the server history or local copies.

## Error and security behavior

The route does not inspect query parameters, browser storage, or client-supplied owner/plan state. It does not log payloads and does not expose auth, entitlement, store, private identifiers, or provider errors. Existing Free behavior, fixed-closed Paid activation, signed-entitlement authority, NC-H1 retention, tombstone semantics, and owner-derived cleanup remain unchanged.

## Verification contract

Focused tests must cover the allowlist and ordering, bounded rows, owner/auth/store fail-closed behavior, RFC quoting, CRLF and Unicode/newlines, formula prefixes `=`, `+`, `-`, `@` after leading whitespace/control characters, filename and response headers, and the retention/deletion notice. Existing NC-H1, Free, auth/security, and isolation contracts remain part of the broad check set. Dependency-backed checks remain setup-blocked if `node_modules` is absent; dependency installation and manifest changes are forbidden in this lane.
