"use client";

import { useState } from "react";
import AboutModal from "@/components/ui/AboutModal";
import NavShell from "@/components/ui/NavShell";

/**
 * The nav and the about modal for a page that is not a world.
 *
 * NavShell takes an onAbout callback, which a server component cannot pass, so
 * the few lines of state live here rather than turning the whole page into a
 * client component to render a table of dates.
 */
export default function DataNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <NavShell onAbout={() => setOpen(true)} />
      {open && <AboutModal onClose={() => setOpen(false)} />}
    </>
  );
}
