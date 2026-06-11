type JsonLdProps = {
  data: Record<string, unknown>;
};

// JSON.stringify does not escape characters that are significant inside an
// HTML <script> context, so a user-controlled string containing "</script>"
// would break out of the ld+json block and inject markup. Escape the unsafe
// characters to their \uXXXX form (still valid JSON, inert as HTML). U+2028 /
// U+2029 are also escaped since they are invalid raw inside a script element.
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export { serializeJsonLd };
