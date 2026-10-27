import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Demo/memory repository'de son kullanıcı şifrelerini saklamak için. Yalnızca Supabase
 * yapılandırılmadığında kullanılır — Supabase modunda şifreyi Supabase Auth saklar, bu
 * modül devreye girmez. demo-credentials.ts'teki tek-admin sabit tuzundan farklı olarak
 * her kullanıcı için rastgele tuz üretir (genel amaçlı çok kullanıcılı saklama).
 */
export type PasswordHash = { hash: string; salt: string };

export function hashPassword(password: string): PasswordHash {
  const salt = randomBytes(16).toString("hex");
  return { hash: scryptSync(password, salt, 32).toString("hex"), salt };
}

export function verifyPassword(password: string, stored: PasswordHash): boolean {
  const given = scryptSync(password, stored.salt, 32);
  const expected = Buffer.from(stored.hash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
