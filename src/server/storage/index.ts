import "server-only";
import { isSupabaseConfigured } from "../env";
import { createMemoryStorage } from "./memory";
import { createSupabaseStorage } from "./supabase";
import type { MediaStorage } from "./types";

let storage: MediaStorage | null = null;

export function getStorage(): MediaStorage {
  storage ??= isSupabaseConfigured() ? createSupabaseStorage() : createMemoryStorage();
  return storage;
}

export type { MediaStorage, UploadTarget } from "./types";
