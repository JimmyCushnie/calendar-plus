import { TFile } from "obsidian";
import type { App } from "obsidian";

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "avif",
]);

function isImagePath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

function extractLinkpath(raw: string): string {
  // Strip ![[...]], [[...]], display aliases (|alias), and bare "..." wrappers
  return raw
    .replace(/^!?\[\[(.+?)(?:\|[^\]]*)?]]$/, "$1")
    .replace(/^"(.+)"$/, "$1")
    .trim();
}

/**
 * Resolve the background image URL for a vault file.
 *
 * Strategy:
 *  1. Check each entry in `frontmatterProperties` (in order). The property
 *     value may be a wikilink (![[img.png]]), a plain filename, or a quoted
 *     string. First valid vault image wins.
 *  2. Fall back to the first `![[…]]` embed in `cache.embeds` that resolves
 *     to an image file.
 *
 * Returns an `app://` resource URL (from `vault.getResourcePath`) or null if
 * no image is found or the file cache is not yet available.
 *
 * Vault-only: external `https://` URLs are intentionally rejected.
 */
export function getFeatureImageUrl(
  file: TFile,
  app: App,
  frontmatterProperties: string[]
): string | null {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return null;

  // `FrontMatterCache` indexes to `any`; pull each property out into an
  // explicitly-`unknown` local so the access is type-safe (the reviewer's
  // no-unsafe-* rules flag `any`).
  const fm = cache.frontmatter;
  if (fm) {
    for (const prop of frontmatterProperties) {
      const value: unknown = fm[prop.trim()];
      // A list-valued property (YAML sequence) arrives as an array — use its
      // first entry. Single-string values pass through unchanged.
      const raw: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
      if (typeof raw !== "string") continue;
      const linkpath = extractLinkpath(raw);
      if (!isImagePath(linkpath)) continue;
      const imageFile = app.metadataCache.getFirstLinkpathDest(linkpath, file.path);
      if (imageFile instanceof TFile) {
        return app.vault.getResourcePath(imageFile);
      }
    }
  }

  if (cache.embeds) {
    for (const embed of cache.embeds) {
      const linkpath = embed.link.split("|")[0];
      if (!isImagePath(linkpath)) continue;
      const imageFile = app.metadataCache.getFirstLinkpathDest(linkpath, file.path);
      if (imageFile instanceof TFile) {
        return app.vault.getResourcePath(imageFile);
      }
    }
  }

  return null;
}
