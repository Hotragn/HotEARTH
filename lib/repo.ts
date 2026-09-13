/**
 * Where this project lives, in one place.
 *
 * Every honesty panel and attribution footer links back to the docs, and the
 * base URL for those links was copied into twenty-two separate files. When the
 * repository was renamed from H.O.T-EARTH to HotEARTH, all twenty-two went
 * stale at once. Nothing broke, because GitHub redirects a renamed repository,
 * but that redirect only survives until somebody else claims the old name, and
 * "it still works for now" is not a link.
 *
 * This is the same lesson lib/geo.ts records about great-circle distance: two
 * copies of a constant are two constants, and the second one is wrong the moment
 * the first one changes. lib/consistency.test.ts enforces it by reading the
 * component sources and failing if any of them hardcodes a GitHub URL again.
 */

/** The canonical repository. */
export const REPO_OWNER = "Hotragn";
export const REPO_NAME = "HotEARTH";
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

/** The docs directory on the default branch, which is what the tabs link into. */
export const DOCS_BASE = `${REPO_URL}/blob/main/docs`;
