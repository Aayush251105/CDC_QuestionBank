"use client";

import { useEffect } from "react";

const isField = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  Boolean(el.closest("input, textarea, select, [contenteditable='true']"));

// Questions must not be copied out of the site, by students or admins
// (CLAUDE.md 2a.10). Admins get questions only through Export CSV. This
// stops copy, cut, right-click, dragging text out and Ctrl+P; globals.css
// turns off text selection and printing. It is a deterrent: no website can
// stop screenshots or photos of the screen.
export function CopyGuard() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const outsideFields = (e: Event) => {
      if (!isField(e.target)) e.preventDefault();
    };
    const noPrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
      }
    };
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", outsideFields);
    document.addEventListener("dragstart", outsideFields);
    document.addEventListener("keydown", noPrint);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", outsideFields);
      document.removeEventListener("dragstart", outsideFields);
      document.removeEventListener("keydown", noPrint);
    };
  }, []);
  return null;
}
