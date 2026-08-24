/** Escape the five XML-significant characters. Shared by every feed builder
 *  (`rss.ts`) — every user-supplied string (titles, snippets) must pass
 *  through this before landing in a `<tag>` body. */
export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

/**
 * Lightweight well-formedness check: every opening tag has a matching,
 * correctly-nested closing tag. Not a full XML parser (no attribute
 * validation, no entity/DTD handling) — just enough to catch the class of
 * bug this module actually risks: an unescaped user string breaking tag
 * structure. Strips the XML declaration and comments before scanning.
 */
export function isWellFormedXml(xml: string): boolean {
  const body = xml.replace(/<\?xml[^>]*\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const tagRe = /<(\/)?([a-zA-Z][\w:.-]*)(?:\s[^<>]*?)?(\/)?>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(body))) {
    const [, closing, name, selfClosing] = match;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else {
      stack.push(name);
    }
  }

  return stack.length === 0;
}
