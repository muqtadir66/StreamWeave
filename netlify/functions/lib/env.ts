export const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Server missing ${name}`);
  return v;
};

export const getIntEnv = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const parsed = Number.parseInt(v, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

