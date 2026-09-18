-- Current Production managed Auth baseline delta (2026-09-17 observation).
-- Generated from the observed managed catalog; not from an assumed version.
-- Local synthetic fixture: applied to both the source and restore databases.
SET ROLE supabase_auth_admin;
CREATE TABLE auth.mfa_recovery_code_sets (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "mfa_factor_id" uuid NOT NULL,
  "failed_verification_count" integer DEFAULT 0 NOT NULL,
  "verification_locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE auth.mfa_recovery_codes (
  "id" uuid NOT NULL,
  "mfa_recovery_code_set_id" uuid NOT NULL,
  "code_hash" text NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE auth.scim_tokens (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "prefix" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "last_used_at" timestamp with time zone
);
CREATE TABLE auth.scim_users (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "user_id" uuid,
  "resource" jsonb NOT NULL,
  "user_name" text GENERATED ALWAYS AS (lower((resource ->> 'userName'::text))) STORED NOT NULL,
  "external_id" text GENERATED ALWAYS AS ((resource ->> 'externalId'::text)) STORED,
  "active" boolean GENERATED ALWAYS AS (COALESCE(((resource ->> 'active'::text))::boolean, true)) STORED NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
ALTER TABLE auth.one_time_tokens ADD COLUMN "expires_at" timestamp with time zone;
ALTER TABLE auth.mfa_recovery_code_sets ADD CONSTRAINT "mfa_recovery_code_sets_failed_verification_count_check" CHECK ((failed_verification_count >= 0));
ALTER TABLE auth.mfa_recovery_code_sets ADD CONSTRAINT "mfa_recovery_code_sets_mfa_factor_id_fkey" FOREIGN KEY (mfa_factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;
ALTER TABLE auth.mfa_recovery_code_sets ADD CONSTRAINT "mfa_recovery_code_sets_mfa_factor_id_key" UNIQUE (mfa_factor_id);
ALTER TABLE auth.mfa_recovery_code_sets ADD CONSTRAINT "mfa_recovery_code_sets_pkey" PRIMARY KEY (id);
ALTER TABLE auth.mfa_recovery_code_sets ADD CONSTRAINT "mfa_recovery_code_sets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE auth.mfa_recovery_code_sets ADD CONSTRAINT "mfa_recovery_code_sets_user_id_key" UNIQUE (user_id);
ALTER TABLE auth.mfa_recovery_codes ADD CONSTRAINT "mfa_recovery_codes_mfa_recovery_code_set_id_fkey" FOREIGN KEY (mfa_recovery_code_set_id) REFERENCES auth.mfa_recovery_code_sets(id) ON DELETE CASCADE;
ALTER TABLE auth.mfa_recovery_codes ADD CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY (id);
ALTER TABLE auth.scim_tokens ADD CONSTRAINT "scim_tokens_expires_at_future" CHECK (((expires_at IS NULL) OR (expires_at > created_at)));
ALTER TABLE auth.scim_tokens ADD CONSTRAINT "scim_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE auth.scim_tokens ADD CONSTRAINT "scim_tokens_revoked_after_created" CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at)));
ALTER TABLE auth.scim_tokens ADD CONSTRAINT "scim_tokens_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE auth.scim_tokens ADD CONSTRAINT "scim_tokens_token_hash_check" CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text));
ALTER TABLE auth.scim_users ADD CONSTRAINT "scim_users_pkey" PRIMARY KEY (id);
ALTER TABLE auth.scim_users ADD CONSTRAINT "scim_users_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE auth.scim_users ADD CONSTRAINT "scim_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX mfa_recovery_codes_set_id_idx ON auth.mfa_recovery_codes USING btree (mfa_recovery_code_set_id);
CREATE INDEX scim_tokens_expires_at_idx ON auth.scim_tokens USING btree (expires_at);
CREATE INDEX scim_tokens_revoked_at_idx ON auth.scim_tokens USING btree (revoked_at);
CREATE INDEX scim_tokens_sso_provider_id_idx ON auth.scim_tokens USING btree (sso_provider_id);
CREATE UNIQUE INDEX scim_tokens_token_hash_key ON auth.scim_tokens USING btree (token_hash);
CREATE INDEX scim_users_created_at_idx ON auth.scim_users USING btree (sso_provider_id, created_at, id) WHERE (deleted_at IS NULL);
CREATE INDEX scim_users_deleted_at_idx ON auth.scim_users USING btree (deleted_at);
CREATE UNIQUE INDEX scim_users_external_id_key ON auth.scim_users USING btree (sso_provider_id, external_id) WHERE ((external_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE INDEX scim_users_id_idx ON auth.scim_users USING btree (sso_provider_id, id) WHERE (deleted_at IS NULL);
CREATE INDEX scim_users_sso_provider_id_idx ON auth.scim_users USING btree (sso_provider_id);
CREATE INDEX scim_users_updated_at_idx ON auth.scim_users USING btree (sso_provider_id, updated_at, id) WHERE (deleted_at IS NULL);
CREATE INDEX scim_users_user_id_idx ON auth.scim_users USING btree (user_id);
CREATE INDEX scim_users_user_name_idx ON auth.scim_users USING btree (sso_provider_id, user_name COLLATE "C", id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX scim_users_user_name_key ON auth.scim_users USING btree (sso_provider_id, user_name) WHERE (deleted_at IS NULL);
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.mfa_recovery_code_sets TO "dashboard_user";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.mfa_recovery_code_sets TO "postgres";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.mfa_recovery_code_sets TO "supabase_auth_admin";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.mfa_recovery_codes TO "dashboard_user";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.mfa_recovery_codes TO "postgres";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.mfa_recovery_codes TO "supabase_auth_admin";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.scim_tokens TO "dashboard_user";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.scim_tokens TO "postgres";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.scim_tokens TO "supabase_auth_admin";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.scim_users TO "dashboard_user";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.scim_users TO "postgres";
GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE auth.scim_users TO "supabase_auth_admin";
ALTER TYPE auth.factor_type ADD VALUE IF NOT EXISTS 'recovery_code';
-- ^ from the official Auth migration 20260824000000_add_recovery_codes_factor_type;
-- observed as a label difference in the 2026-09-17 managed catalog.
RESET ROLE;
