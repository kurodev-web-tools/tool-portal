# Wave 1: Repository Call Path

- Production Supabase factories normalize `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as strings and pass them to `createClient`.
- Store/read calls use string table/column/filter values and async fluent queries.
- YouTube provider reads construct URL and Authorization header strings and call async `fetch` without an abort signal or dispose acknowledgement.
- Production consumers span OAuth callback, credential status, session and tool contexts, account/disconnect actions, token-material resolution, and provider reads.

Verdict contribution: replacing one factory cannot create a byte-only end-to-end C1 path.
