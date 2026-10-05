// Rehype plugin that wraps tracked brand names (any alias, plus a trailing
// inflection like "Нур Стоматологию") in <mark> elements.
import type { Element, ElementContent, Root } from "hast";
import type { Brand } from "@/shared/types/api";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Link text is a domain and code is verbatim, so neither is highlighted. */
const SKIP = new Set(["a", "code", "pre"]);

export interface HighlightOptions {
  brands: Brand[];
  classFor: (brandId: string) => string;
}

export function rehypeHighlightBrands({ brands, classFor }: HighlightOptions) {
  // One capture group per brand, so the matching group tells us which brand it is
  const pattern = new RegExp(
    brands
      .map((brand) => {
        const names = [...new Set([brand.name, ...brand.aliases])]
          .sort((a, b) => b.length - a.length)
          .map(escape);
        return `((?:${names.join("|")})[\\p{L}\\p{M}]*)`;
      })
      .join("|"),
    "gu",
  );

  function split(value: string): ElementContent[] {
    const parts: ElementContent[] = [];
    let last = 0;
    for (const match of value.matchAll(pattern)) {
      const brand = brands[match.slice(1).findIndex((group) => group !== undefined)];
      if (!brand) continue;
      if (match.index > last) parts.push({ type: "text", value: value.slice(last, match.index) });
      parts.push({
        type: "element",
        tagName: "mark",
        properties: { className: classFor(brand.id).split(" "), dataBrand: brand.id },
        children: [{ type: "text", value: match[0] }],
      });
      last = match.index + match[0].length;
    }
    if (last === 0) return [{ type: "text", value }];
    if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
    return parts;
  }

  function visit(element: Element) {
    element.children = element.children.flatMap((child) => {
      if (child.type === "text") return split(child.value);
      if (child.type === "element" && !SKIP.has(child.tagName)) visit(child);
      return [child];
    });
  }

  return (tree: Root) => {
    if (brands.length === 0) return;
    for (const node of tree.children) {
      if (node.type === "element") visit(node);
    }
  };
}
