import type { ReportSection } from "@/lib/types";

interface ReportCardProps {
  section: ReportSection;
  index: number;
  fullWidth?: boolean;
}

export function ReportCard({ section, index, fullWidth }: ReportCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className={`card${fullWidth ? " card-full" : ""}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      {section.tags && section.tags.length > 0 && (
        <div className="card-title">{section.title}</div>
      )}
      <div className="card-body">
        {section.content}
        {section.prediction && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              background: "var(--accent-soft)",
              borderRadius: 8,
              borderLeft: "3px solid var(--accent)",
            }}
          >
            {section.prediction}
          </div>
        )}
        {section.tags && section.tags.length > 0 && (
          <div className="tag-row" style={{ marginTop: 8 }}>
            {section.tags.map((tag) => (
              <span className="tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      {section.sources.length > 0 && (
        <div className="source-tag">{section.sources.join(" · ")}</div>
      )}
    </div>
  );
}
