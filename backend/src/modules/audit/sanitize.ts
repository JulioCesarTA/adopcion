/** Claves que nunca deben llegar a la auditoría ni a los logs (sección 11). */
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'refreshtoken',
  'refreshtokenhash',
  'accesstoken',
  'token',
];

function isSensitive(key: string): boolean {
  const k = key.toLowerCase().replace(/[_-]/g, '');
  return SENSITIVE_KEYS.includes(k);
}

/**
 * Convierte un valor a JSON plano (Date → ISO, Decimal → string, BigInt → string)
 * y elimina recursivamente las claves sensibles.
 */
export function sanitizeForAudit(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  const json = JSON.stringify(value, (key, v: unknown) => {
    if (key && isSensitive(key)) return undefined;
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
  return json === undefined ? null : (JSON.parse(json) as unknown);
}
