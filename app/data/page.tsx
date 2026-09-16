import type { Metadata } from "next";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import MirrorTable, { type MirrorStamp } from "@/components/data/MirrorTable";
import { MIRRORS, readStamp } from "@/lib/mirrors";
import DataNav from "@/components/data/DataNav";

export const metadata: Metadata = {
  title: "Data \u00b7 H.O.T Earth",
  description:
    "Every committed data mirror behind this site, how old it is, and what that age means. Forty one JSON files, grouped into three kinds: live mirrors from upstreams that keep moving, where an age past the cadence is a problem; published catalogues that change only when their publisher releases a new version, where a number in the thousands of days is normal; and files derived in this repository, whose age is the age of the code. The fetch scripts are deliberately idempotent, comparing the whole payload except their own timestamp and declining to write when nothing upstream moved, so the expected outcome of most scheduled runs is no commit at all. That is the right design and it makes an unchanged file indistinguishable from a job that silently stopped. This page is what tells those apart. Ages are computed against your clock rather than the build, because a statically prerendered page would otherwise freeze its ages at deploy time. No API keys.",
};

/**
 * Read every mirror's declared timestamp at build time.
 *
 * Done on the server so the page stays a single static document: the
 * alternative, fetching forty one files in the browser to read one field out of
 * each, would download several megabytes to render a table of dates.
 *
 * Only the timestamp and the file size cross to the client. The ages are
 * computed there, against the reader's clock, because this page is prerendered
 * and a build-time age would be wrong the day after a deploy.
 */
function collectStamps(): MirrorStamp[] {
  const root = join(process.cwd(), "public");
  return MIRRORS.map((mirror) => {
    const file = join(root, mirror.path);
    let stamp: string | null = null;
    let bytes = 0;
    try {
      bytes = statSync(file).size;
      // Only parse the files that declare a timestamp. Several of these are
      // hundreds of kilobytes and there is no reason to parse a star catalogue
      // to learn that it carries no date.
      if (mirror.stampPath !== null) {
        stamp = readStamp(JSON.parse(readFileSync(file, "utf8")), mirror.stampPath);
      }
    } catch {
      // A missing or unparseable file leaves the row undated rather than
      // failing the build. lib/mirrors.test.ts is what makes that loud.
    }
    return { path: mirror.path, stamp, bytes };
  });
}

export default function DataPage() {
  const stamps = collectStamps();
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(143,211,255,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Data &middot; provenance and age
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ice sm:text-4xl">
            How old is all of this
          </h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-dim">
            Every number on this site comes out of a file in this repository, and every one of those
            files is listed below with its age. That is the first question to ask of a site that
            claims to show real measurements, and until now there was nowhere on it to find the
            answer.
          </p>
        </header>

        <MirrorTable stamps={stamps} />
      </div>

      <DataNav />
    </main>
  );
}
