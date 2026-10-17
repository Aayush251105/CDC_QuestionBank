// A small markdown subset for question bodies (CLAUDE.md: plain textarea
// with code blocks, no rich text). Supports paragraphs, "- " lists, fenced
// ``` code blocks, `inline code` and **bold**. Output is data, rendered as
// React elements by src/components/Markdown.tsx, so no HTML is ever injected.

export type Block =
  | { type: "code"; lang: string; text: string }
  | { type: "list"; items: string[] }
  | { type: "para"; text: string };

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ type: "para", text: para.join("\n") });
    if (list.length) blocks.push({ type: "list", items: list });
    para = [];
    list = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]))
        code.push(lines[i++]);
      blocks.push({ type: "code", lang: fence[1], text: code.join("\n") });
      continue;
    }
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    if (item) {
      if (para.length) flush();
      list.push(item[1]);
    } else if (line.trim() === "") {
      flush();
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "bold"; text: string };

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last)
      out.push({ type: "text", text: text.slice(last, m.index) });
    out.push(
      m[1] !== undefined
        ? { type: "code", text: m[1] }
        : { type: "bold", text: m[2] },
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}
