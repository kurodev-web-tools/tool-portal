export const supabasePublicEnvNames = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
} as const;

export const supabaseTrustedServerEnvNames = {
  secretKey: "SUPABASE_SECRET_KEY",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY"
} as const;

export type SupabasePublicConfig =
  | {
      status: "ready";
      url: string;
      publishableKey: string;
    }
  | {
      status: "missing";
      missing: Array<(typeof supabasePublicEnvNames)[keyof typeof supabasePublicEnvNames]>;
    };

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = readEnv(supabasePublicEnvNames.url);
  const publishableKey = readEnv(supabasePublicEnvNames.publishableKey);
  const missing: Array<(typeof supabasePublicEnvNames)[keyof typeof supabasePublicEnvNames]> = [];

  if (!url) {
    missing.push(supabasePublicEnvNames.url);
  }

  if (!publishableKey) {
    missing.push(supabasePublicEnvNames.publishableKey);
  }

  if (url && publishableKey) {
    return { status: "ready", url, publishableKey };
  }

  return { status: "missing", missing };
}
