import { Fragment } from "react";
import { parseInline, parseMarkdown } from "@/lib/markdown";

// Renders a question body. Text only ever becomes React text nodes.
export function Markdown({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3.5">
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto border-l-3 border-charcoal bg-grey-band px-4.5 py-4 font-mono text-[13px] leading-[1.7]"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === "list") {
          return (
            <ul
              key={i}
              className="flex list-disc flex-col gap-1 pl-5 leading-[1.7]"
            >
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-[1.7] whitespace-pre-line">
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
