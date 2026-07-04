import * as React from "react";
import { Icon } from "./icons";

/** Renders inline **bold** markers within a line. */
function inline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} style={{ color: "var(--navy)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

/** Renders a body of lines: "## heading", "- bullet", or paragraph. */
export function ProseBody({ body }: { body: string[] }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={key}>
          {items.map((b, i) => (
            <li key={i}>
              <Icon name="check" size={18} stroke="var(--teal)" />
              <span>{inline(b, `${key}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };

  body.forEach((line, i) => {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      return;
    }
    flush(`ul-${i}`);
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else {
      blocks.push(<p key={i}>{inline(line, `p-${i}`)}</p>);
    }
  });
  flush("ul-end");

  return <div className="prose">{blocks}</div>;
}
