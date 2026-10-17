"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  addPhoto,
  type PhotoPage,
  prepareReview,
  removePhoto,
  saveNotes,
} from "@/server/actions/addQuestions";

const MAX_SIDE = 1600;
const MAX_ORIGINAL_BYTES = 4 * 1024 * 1024;

// Decodes a photo: the fast decoder first, then a plain <img> (some files
// only decode that way).
async function decode(
  file: File,
): Promise<{ source: CanvasImageSource; w: number; h: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, w: bitmap.width, h: bitmap.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, w: img.naturalWidth, h: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// Shrinks a photo in the browser before upload: longest side 1600 px, JPEG.
// Keeps uploads small and fast. If the browser cannot decode the file, the
// original is sent as long as it is a small JPG, PNG or WebP.
async function prepare(file: File): Promise<File> {
  try {
    const { source, w, h } = await decode(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas
      .getContext("2d")!
      .drawImage(source, 0, 0, canvas.width, canvas.height);
    if ("close" in source) source.close();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("resize failed"))),
        "image/jpeg",
        0.85,
      ),
    );
    return new File([blob], "page.jpg", { type: "image/jpeg" });
  } catch (e) {
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    );
    if (okType && file.size <= MAX_ORIGINAL_BYTES) return file;
    throw e;
  }
}

type Page = PhotoPage & { localKey: string };

// S3 (CLAUDE.md 2a.9): one box for everything the student remembers, and/or
// photos of their sheets. The AI sorts it into questions on Continue.
export function AddQuestions({
  submissionId,
  initialText,
  initialPages,
  maxPages,
  photoReadingOn,
}: {
  submissionId: string;
  initialText: string;
  initialPages: PhotoPage[];
  maxPages: number;
  photoReadingOn: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const [pages, setPages] = useState<Page[]>(
    initialPages.map((p) => ({ ...p, localKey: p.id })),
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, startWorking] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestText = useRef(text);
  const textBox = useRef<HTMLTextAreaElement>(null);

  async function persist() {
    clearTimeout(timer.current);
    setSaveState("saving");
    try {
      const r = await saveNotes(submissionId, latestText.current);
      setSaveState(r.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  function onType(value: string) {
    setText(value);
    latestText.current = value;
    setSaveState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(persist, 1000);
  }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || pages.some((p) => p.status === "READING"))
        e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState, pages]);

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    for (const file of Array.from(files)) {
      if (pages.length >= maxPages) {
        setPhotoError(`You can add up to ${maxPages} photos.`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        setPhotoError(
          "Use photos (JPG, PNG or WebP). PDF is not supported yet.",
        );
        continue;
      }
      const localKey = `local-${Date.now()}-${Math.random()}`;
      setPages((all) => [
        ...all,
        {
          localKey,
          id: "",
          pageNo: all.length + 1,
          status: "READING",
          text: "",
        },
      ]);
      try {
        const form = new FormData();
        form.append("submissionId", submissionId);
        form.append("photo", await prepare(file));
        const r = await addPhoto(form);
        if (!r.ok) {
          setPhotoError(r.message);
          setPages((all) => all.filter((p) => p.localKey !== localKey));
          break;
        }
        setPages((all) =>
          all.map((p) =>
            p.localKey === localKey ? { ...r.page, localKey } : p,
          ),
        );
      } catch (e) {
        console.error("Photo upload failed", e);
        setPhotoError(
          "Could not upload that photo. Check your connection and try again.",
        );
        setPages((all) => all.filter((p) => p.localKey !== localKey));
      }
    }
  }

  async function onRemove(page: Page) {
    if (page.id) await removePhoto(submissionId, page.id);
    setPages((all) => all.filter((p) => p.localKey !== page.localKey));
  }

  const reading = pages.some((p) => p.status === "READING");
  const done = pages.filter((p) => p.status === "DONE").length;
  const status =
    saveState === "saving"
      ? "Saving…"
      : saveState === "dirty"
        ? "Unsaved changes"
        : saveState === "error"
          ? "Could not save. Check your connection."
          : text.trim()
            ? "Draft saved"
            : "";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-xl font-bold">
          Type or paste everything you remember
        </label>
        <p className="text-[15px] text-ink-2">
          Any order, rough wording, shorthand: all fine. Put each question on
          its own line or leave a blank line between them. We split them up,
          tidy the wording and sort them by type; you check the result on the
          next step.
        </p>
        <textarea
          id="notes"
          ref={textBox}
          rows={14}
          maxLength={20000}
          value={text}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => saveState === "dirty" && persist()}
          placeholder={
            "Q1 longest substring with at most k distinct chars, n up to 1e5, eg eceba k=2 -> 3\n\nQ2 teammate misses deadline, what do you do\na) escalate b) talk to them c) do it yourself d) wait\n\nQ3 second highest salary in each department (employee, department tables)"
          }
          className="field min-h-72 resize-y px-4 py-3.5 font-mono text-sm leading-relaxed"
        />
        <span
          aria-live="polite"
          className={`text-sm ${saveState === "error" ? "font-bold text-crimson" : "text-ink-3"}`}
        >
          {status}
        </span>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="text-xl font-bold">
          Or add photos of your rough sheets
        </h2>
        <p className="text-[15px] text-ink-2">
          Up to {maxPages} photos. We read the text and delete the images
          straight away; only the text is kept.
          {!photoReadingOn && (
            <strong className="mt-1 block text-charcoal">
              Photo reading is switched off on this server, so please type the
              questions above.
            </strong>
          )}
        </p>
        {pages.length > 0 && (
          <ol className="flex flex-col border-t border-line">
            {pages.map((p, i) => (
              <li
                key={p.localKey}
                className="flex flex-col gap-2 border-b border-line py-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <strong>Photo {i + 1}</strong>
                    <span
                      className={`text-sm font-bold ${
                        p.status === "DONE"
                          ? "text-published-fg"
                          : p.status === "UNREADABLE"
                            ? "text-crimson"
                            : "text-charcoal"
                      }`}
                    >
                      {p.status === "READING"
                        ? "Reading…"
                        : p.status === "DONE"
                          ? "Done"
                          : "Could not read"}
                    </span>
                  </span>
                  {p.status !== "READING" && (
                    <button
                      type="button"
                      onClick={() => onRemove(p)}
                      className="min-h-11 cursor-pointer text-sm font-bold underline"
                    >
                      {p.status === "UNREADABLE"
                        ? "Remove and retake"
                        : "Remove"}
                    </button>
                  )}
                </div>
                {p.status === "READING" && (
                  <span className="block h-1 w-full overflow-hidden bg-line">
                    <span className="block h-1 w-1/3 animate-[top-bar_1.2s_ease-in-out_infinite_alternate] bg-charcoal" />
                  </span>
                )}
                {p.status === "DONE" && (
                  <details>
                    <summary className="cursor-pointer text-sm text-ink-2">
                      See the text we read
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto bg-grey-band p-3 font-mono text-[13px] whitespace-pre-wrap">
                      {p.text}
                    </pre>
                  </details>
                )}
                {p.status === "UNREADABLE" && (
                  <p className="text-sm text-ink-2">
                    Take a clearer photo in good light, or{" "}
                    <button
                      type="button"
                      onClick={() => textBox.current?.focus()}
                      className="cursor-pointer font-bold text-crimson underline"
                    >
                      type it instead
                    </button>
                    .
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {photoError && (
          <p role="alert" className="text-sm font-bold text-crimson">
            {photoError}
          </p>
        )}
        {pages.length < maxPages && (
          <label className="btn-secondary cursor-pointer self-start has-focus-visible:outline-2 has-focus-visible:outline-charcoal">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => {
                onPhotos(e.target.files);
                e.target.value = "";
              }}
            />
            Add photos
          </label>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="border-t-3 border-crimson bg-peach px-4 py-3.5 text-[15px]"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal pt-5">
        <Link href={`/submit/${submissionId}/round`} className="btn-secondary">
          Back
        </Link>
        <span className="flex-auto text-right text-sm text-ink-3">
          {working
            ? "Sorting your questions… this can take up to a minute"
            : done
              ? `${done} ${done === 1 ? "photo" : "photos"} read`
              : ""}
        </span>
        <button
          type="button"
          disabled={working || reading}
          onClick={() =>
            startWorking(async () => {
              setError(null);
              if (saveState !== "saved") await persist();
              const r = await prepareReview(submissionId);
              if (r?.message) setError(r.message);
            })
          }
          className="btn-primary disabled:opacity-60"
        >
          {working ? "Working…" : "Continue to review"}
        </button>
      </div>
    </div>
  );
}
