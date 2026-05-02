import type { ConcernsSection } from "@/lib/types";

interface ConcernsCardProps {
  section: ConcernsSection;
  index: number;
}

export function ConcernsCard({ section, index }: ConcernsCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="card card-warning card-full"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      <div className="card-title">{section.title}</div>
      <div className="card-body">
        {section.content && <p style={{ marginBottom: 12 }}>{section.content}</p>}
        <ul style={{ listStyle: "none" }}>
          {section.items.map((item) => (
            <li key={item} style={{ padding: "6px 0" }}>• {item}</li>
          ))}
        </ul>
        {section.suggestedSearches.length > 0 && (
          <>
            <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
              <strong>建议自行调研以下关键词：</strong>
            </div>
            <div className="search-keywords">
              {section.suggestedSearches.map((kw) => (
                <span className="keyword" key={kw}>{kw}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
