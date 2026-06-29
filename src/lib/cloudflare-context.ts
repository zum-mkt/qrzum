let _env: Record<string, string | undefined> = {};

export function setCloudflareEnv(env: unknown): void {
  _env = (env ?? {}) as Record<string, string | undefined>;
}

export function getEnvVar(key: string): string | undefined {
  return _env[key] ?? (typeof process !== "undefined" ? process.env[key] : undefined);
}
