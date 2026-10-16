import "server-only";
import { assertDemoAllowed, isSupabaseConfigured } from "../env";
import { createMemoryRepository } from "./memory";
import { createSupabaseRepository } from "./supabase";
import type { Repository } from "./types";

let repo: Repository | null = null;

export function getRepository(): Repository {
  if (repo) return repo;
  if (isSupabaseConfigured()) {
    repo = createSupabaseRepository();
  } else {
    assertDemoAllowed();
    repo = createMemoryRepository();
  }
  return repo;
}

export type { Repository } from "./types";
