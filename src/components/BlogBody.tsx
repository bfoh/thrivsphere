import * as React from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * A blog post's body, written in Markdown.
 *
 * Raw HTML in the text is never rendered (react-markdown's default), and
 * pictures inside the text are dropped: the only photo is the cover, which a
 * reviewer approves with the rest. A heading written as "#" becomes the same
 * size as "##", because the page title is the only top-level heading.
 * Links to other sites open in a new tab and pass no referrer.
 */

const SITE = /^https?:\/\/(?:www\.)?thrivsphere\.org(?:[/?#]|$)/i;

const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ href, children }) => {
    const url = href ?? "";
    const internal = url.startsWith("/") || url.startsWith("#") || SITE.test(url);
    const safe = internal || /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:");
    if (!safe) return <>{children}</>;
    return internal ? (
      <a href={url}>{children}</a>
    ) : (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

export function BlogBody({ markdown }: { markdown: string }) {
  return (
    <div className="article">
      <Markdown remarkPlugins={[remarkGfm]} components={components} disallowedElements={["img"]} unwrapDisallowed>
        {markdown}
      </Markdown>
    </div>
  );
}
