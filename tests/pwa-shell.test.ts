import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA shell", () => {
  it("declares standalone display and caches the app shell", async () => {
    const manifest = JSON.parse(
      await readFile(join(process.cwd(), "public/manifest.webmanifest"), "utf8")
    );
    const serviceWorker = await readFile(join(process.cwd(), "public/sw.js"), "utf8");

    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toEqual([
      expect.objectContaining({
        sizes: "192x192",
        src: "/icons/focus-reader-192.svg"
      }),
      expect.objectContaining({
        sizes: "512x512",
        src: "/icons/focus-reader-512.svg"
      })
    ]);
    expect(serviceWorker).toContain('"/"');
    expect(serviceWorker).toContain('"/manifest.webmanifest"');
  });
});
