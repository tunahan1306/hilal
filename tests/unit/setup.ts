import { vi } from "vitest";

// next/cache yalnızca Next.js çalışma zamanında kullanılabilir.
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
