import type { Source } from "@/lib/types";

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname;
    if (path.length > 20) {
      return domain + path.substring(0, 20) + "...";
    }
    return domain + path;
  } catch {
    return url.length > 30 ? url.substring(0, 30) + "..." : url;
  }
}

interface SourceLinksProps {
  sources: Source[];
}

export function SourceLinks({ sources }: SourceLinksProps) {
  if (sources.length === 0) return null;

  return (
    <div className="source-tag">
      {sources.map((src, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {src.url ? (
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline" }}
              title={src.url}
            >
              {src.name || shortenUrl(src.url)}
            </a>
          ) : (
            <span>{src.name}</span>
          )}
        </span>
      ))}
    </div>
  );
}
