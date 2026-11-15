/**
 * A small XML reader for Office files.
 *
 * Word and PowerPoint parts are well-formed XML without DTDs, so a
 * non-validating parser is enough, and avoids adding a dependency to the
 * project for a build-time step. Namespace prefixes are kept as written
 * (`w:p`, `a:t`), which is how every Office part spells them.
 */

export type XmlElement = {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
};
export type XmlNode = XmlElement | string;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code] ?? whole;
  });
}

const ATTR = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: "#root", attrs: {}, children: [] };
  const stack: XmlElement[] = [root];
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) break;
    if (lt > i) {
      const text = xml.slice(i, lt);
      if (text.trim() || stack.length > 1) stack[stack.length - 1].children.push(decodeEntities(text));
    }
    if (xml.startsWith("<?", lt)) {
      i = xml.indexOf("?>", lt) + 2;
      continue;
    }
    if (xml.startsWith("<!--", lt)) {
      i = xml.indexOf("-->", lt) + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt);
      stack[stack.length - 1].children.push(xml.slice(lt + 9, end));
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<!", lt)) {
      i = xml.indexOf(">", lt) + 1;
      continue;
    }
    const gt = findTagEnd(xml, lt);
    const body = xml.slice(lt + 1, gt);
    if (body[0] === "/") {
      if (stack.length > 1) stack.pop();
    } else {
      const selfClosing = body.endsWith("/");
      const inner = selfClosing ? body.slice(0, -1) : body;
      const space = inner.search(/\s/);
      const name = space === -1 ? inner : inner.slice(0, space);
      const attrs: Record<string, string> = {};
      if (space !== -1) {
        ATTR.lastIndex = 0;
        let m: RegExpExecArray | null;
        const rest = inner.slice(space);
        while ((m = ATTR.exec(rest))) attrs[m[1]] = decodeEntities(m[2] ?? m[3] ?? "");
      }
      const el: XmlElement = { name, attrs, children: [] };
      stack[stack.length - 1].children.push(el);
      if (!selfClosing) stack.push(el);
    }
    i = gt + 1;
  }
  const first = root.children.find((c): c is XmlElement => typeof c !== "string");
  if (!first) throw new Error("No root element");
  return first;
}

/** The `>` closing a tag, skipping any inside quoted attribute values. */
function findTagEnd(xml: string, from: number): number {
  let quote: string | null = null;
  for (let i = from + 1; i < xml.length; i++) {
    const ch = xml[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  throw new Error("Unterminated tag");
}

/* ------------------------------------------------------------------ helpers */

export const elements = (el: XmlElement | null | undefined): XmlElement[] =>
  el ? el.children.filter((c): c is XmlElement => typeof c !== "string") : [];

export function child(el: XmlElement | null | undefined, name: string): XmlElement | null {
  if (!el) return null;
  for (const c of el.children) if (typeof c !== "string" && c.name === name) return c;
  return null;
}

export function children(el: XmlElement | null | undefined, name: string): XmlElement[] {
  return elements(el).filter((c) => c.name === name);
}

/** Follow a path of child names: `path(el, "w:pPr", "w:spacing")`. */
export function path(el: XmlElement | null | undefined, ...names: string[]): XmlElement | null {
  let cur = el ?? null;
  for (const n of names) cur = child(cur, n);
  return cur;
}

/** Every descendant with this name, in document order. */
export function descendants(el: XmlElement, name: string, out: XmlElement[] = []): XmlElement[] {
  for (const c of el.children) {
    if (typeof c === "string") continue;
    if (c.name === name) out.push(c);
    descendants(c, name, out);
  }
  return out;
}

export function textOf(el: XmlElement): string {
  return el.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("");
}

export function attr(el: XmlElement | null | undefined, name: string): string | undefined {
  return el?.attrs[name];
}

export function num(el: XmlElement | null | undefined, name: string): number | undefined {
  const v = el?.attrs[name];
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** OOXML booleans: present means true unless val is 0/false/off. */
export function onOff(el: XmlElement | null | undefined): boolean | undefined {
  if (!el) return undefined;
  const v = el.attrs["w:val"] ?? el.attrs.val;
  return !(v === "0" || v === "false" || v === "off" || v === "none");
}
