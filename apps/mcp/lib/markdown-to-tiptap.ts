import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export function markdownToTiptap(markdown: string): Record<string, unknown> {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const content = convertChildren(tree.children as MdastNode[]);
  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  alt?: string;
  title?: string;
  lang?: string;
};

function convertChildren(nodes: MdastNode[]): TiptapNode[] {
  return nodes.flatMap((node) => convertNode(node));
}

function convertNode(node: MdastNode): TiptapNode[] {
  switch (node.type) {
    case "heading":
      return [
        {
          type: "heading",
          attrs: { level: node.depth || 1 },
          content: convertInline(node.children || []),
        },
      ];
    case "paragraph": {
      const inline = convertInline(node.children || []);
      if (inline.length === 1 && inline[0].type === "image") return [inline[0]];
      return [{ type: "paragraph", content: inline }];
    }
    case "blockquote":
      return [
        {
          type: "blockquote",
          content: convertChildren(node.children || []),
        },
      ];
    case "list":
      return [
        {
          type: node.ordered ? "orderedList" : "bulletList",
          content: (node.children || []).map((item) => ({
            type: "listItem",
            content: convertChildren(item.children || []),
          })),
        },
      ];
    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: node.lang || null },
          content: [{ type: "text", text: node.value || "" }],
        },
      ];
    case "thematicBreak":
      return [{ type: "horizontalRule" }];
    default:
      return [];
  }
}

function convertInline(
  nodes: MdastNode[],
  marks: TiptapMark[] = []
): TiptapNode[] {
  return nodes.flatMap((node) => convertInlineNode(node, marks));
}

function convertInlineNode(
  node: MdastNode,
  marks: TiptapMark[]
): TiptapNode[] {
  switch (node.type) {
    case "text":
      return marks.length > 0
        ? [{ type: "text", text: node.value || "", marks: [...marks] }]
        : [{ type: "text", text: node.value || "" }];
    case "strong":
      return convertInline(node.children || [], [
        ...marks,
        { type: "bold" },
      ]);
    case "emphasis":
      return convertInline(node.children || [], [
        ...marks,
        { type: "italic" },
      ]);
    case "delete":
      return convertInline(node.children || [], [
        ...marks,
        { type: "strike" },
      ]);
    case "inlineCode":
      return [
        {
          type: "text",
          text: node.value || "",
          marks: [...marks, { type: "code" }],
        },
      ];
    case "link":
      return convertInline(node.children || [], [
        ...marks,
        { type: "link", attrs: { href: node.url || "", target: "_blank" } },
      ]);
    case "image":
      return [
        {
          type: "image",
          attrs: {
            src: node.url || "",
            alt: node.alt || null,
            title: node.title || null,
          },
        },
      ];
    case "break":
      return [{ type: "hardBreak" }];
    default:
      return [];
  }
}
