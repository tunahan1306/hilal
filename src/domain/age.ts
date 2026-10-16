export const MINIMUM_AGE = 18;

/** Doğum tarihinden (YYYY-MM-DD) verilen tarihteki yaşı hesaplar. */
export function ageOn(birthDate: string, on: Date): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  let age = on.getUTCFullYear() - y;
  const beforeBirthday =
    on.getUTCMonth() + 1 < m || (on.getUTCMonth() + 1 === m && on.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isAdult(birthDate: string, on: Date): boolean {
  const age = ageOn(birthDate, on);
  return Number.isFinite(age) && age >= MINIMUM_AGE;
}
