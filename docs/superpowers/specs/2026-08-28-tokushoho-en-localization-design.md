# Tokushoho English Localization Design

## Problem

The Preview locale can be switched to English, but `/legal/tokushoho/` always renders the Japanese `legalDocuments.tokushoho` object. This leaves the document body in Japanese while the surrounding portal is English.

## Goal

Render a complete English version of the Specified Commercial Transactions Act disclosure when the active locale is `en`, while preserving the current Japanese disclosure and every Paid Core v1 price, tax, provider, retention, cancellation, refund, and safety statement.

## Scope

- Localize `/legal/tokushoho/` only.
- Keep `/terms/` and `/privacy/` unchanged.
- Keep canonical metadata, routes, billing behavior, Checkout behavior, provider behavior, storage, and remote state unchanged.
- Do not add dependencies or external calls.

## Design

### Localized document data

Add a locale-indexed `tokushohoDocuments` export in `lib/legal-content.ts` with required `ja` and `en` entries. The existing Japanese document is moved without copy changes and remains the Japanese authority. `legalDocuments.tokushoho` remains an alias of the Japanese entry for existing contracts and compatibility. The English entry translates the complete document structure, including dates, headings, row labels, row values, and status paragraphs.

The English copy must retain these canonical disclosures:

- `US$6/month (total price, billed in USD)`
- automatic renewal
- applicable tax is shown in Stripe Checkout
- initial sales regions are Japan and the United States
- up to 500,000 input characters per renewal period is not guaranteed
- Paid access begins only after server-side confirmation of a signed Webhook
- comment text is sent to OpenAI or Azure for translation processing
- cancellation, refund, dispute, data retention, and Provider boundaries remain semantically equivalent to Japanese
- Free remains available and live operations remain separately approval-gated

The focused content contract imports `tokushohoDocuments` and checks both entries directly. It requires the same section kinds and row/paragraph cardinalities, preserves the established Japanese markers, and asserts English markers for every business-information and sales-condition row rather than searching an aggregate billing/legal source. A separate rendering contract verifies readiness, complete locale selection, localized date labels, and route wiring so content and UI each have an independent RED/GREEN cycle.

### Locale-aware rendering

Keep `LegalDocumentPage` and its Japanese date labels unchanged for Terms and Privacy. Add a Tokushoho-only client wrapper, `LocalizedTokushohoDocumentPage`, that reads `locale` and `isLocaleReady` from the existing `useLocale()` provider, selects `tokushohoDocuments[locale]`, and passes locale-specific date labels to a narrowly extended `LegalDocumentPage` prop.

`LegalDocumentPage` accepts optional `dateLabels`; omission preserves the current Japanese labels exactly. Existing Terms and Privacy callers remain unchanged, avoiding mixed English labels on Japanese-only documents and avoiding an unrelated translation project.

Before `LocaleProvider` finishes resolving the stored/browser locale, the Tokushoho wrapper renders the complete Japanese document as a server-readable legal fallback. This preserves legal-page availability when JavaScript is disabled or hydration fails. After readiness it renders the selected complete document, and later locale switches replace the whole document and date labels atomically. English users may briefly see the Japanese fallback before local preference resolution, but the page never intentionally combines fragments from different locales.

`LegalDocumentPage` generates an opaque, whitespace-free section ID from the section index and uses the same ID for the heading and `aria-labelledby`. Human-readable headings are not used as IDREF tokens.

### Failure behavior

The document map is typed to require both supported locales, so a missing English document is a compile-time error. No runtime fetch or fallback to partial mixed-language content is introduced. Locale readiness produces either the complete Japanese fallback or one complete selected locale; it never intentionally composes Japanese and English document fragments.

## Testing

Use TDD:

1. Add a focused content contract that imports the complete `ja/en` Tokushoho map, compares section kinds and row/paragraph cardinalities, preserves established Japanese markers, and directly requires English business-information and sales-condition markers including price, tax, region, payment, timing, signed-Webhook activation, quota, provider, cancellation, refund/dispute, deletion, retention, environment, expert-review, Free-availability, and approval-gate copy.
2. Run it before implementation and confirm it fails because the `tokushohoDocuments` export does not exist.
3. Implement the locale-indexed content and verify the focused content contract turns green.
4. Add and verify a failing rendering contract for the server-readable Japanese fallback, complete locale selection, localized date labels, whitespace-free ARIA section IDs, updated Tokushoho route contract, and unchanged Terms/Privacy callers.
5. Implement the minimal rendering changes and update the existing Task 10 route-shape contract to recognize the localized Tokushoho wrapper while preserving its Terms/Privacy assertions.
6. Run both focused contracts; existing Paid Task 10/11 legal contracts; provider legal-copy contract; TypeScript; lint; and build as available.
5. Re-run width-based Preview QA only after a separately approved deployment.

## Non-goals

- Translating Terms or Privacy
- Changing legal policy or pricing
- Activating Checkout, Portal, Stripe, Provider, Supabase, or Cloudflare operations
- Commit, push, PR, merge, deployment, or cleanup in this implementation step
