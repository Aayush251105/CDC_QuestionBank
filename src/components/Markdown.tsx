import { Fragment } from "react";
import { parseInline, parseMarkdown } from "@/lib/markdown";

// Renders a question body. Text only ever becomes React text nodes.
// A paragraph that is only bold ("**Constraints**") becomes a small heading.
// size="lg" is the question page; "md" is the round page accordion.
export function Markdown({
  source,
  size = "md",
}: {
  source: string;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <div
      className={`flex flex-col ${lg ? "gap-4 text-[17px] leading-[1.75]" : "gap-3.5 leading-[1.7]"}`}
    >
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "code") {
          return (
            <pre
              key={i}
              className={`overflow-x-auto border-l-3 border-charcoal bg-grey-band font-mono leading-[1.7] ${
                lg ? "px-5 py-4.5 text-sm" : "px-4.5 py-4 text-[13px]"
              }`}
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        const heading = /^\*\*([^*]+)\*\*$/.exec(block.text.trim());
        if (heading) {
          return (
            <p
              key={i}
              className="mt-2 text-sm font-bold tracking-widest uppercase"
            >
              {heading[1]}
            </p>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) =>
        part.type === "code" ? (
          <code key={i} className="bg-grey-band px-1 font-mono text-[0.9em]">
            {part.text}
          </code>
        ) : part.type === "bold" ? (
          <strong key={i}>{part.text}</strong>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
