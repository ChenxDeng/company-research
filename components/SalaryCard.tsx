import type { CompensationSection } from "@/lib/types";
import { SourceLinks } from "./SourceLinks";

interface SalaryCardProps {
  section: CompensationSection;
  index: number;
}

export function SalaryCard({ section, index }: SalaryCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      <div className="card-body">
        {section.salary.length > 0 && (
          <div className="salary-grid">
            {section.salary.map((item) => (
              <div className="salary-item" key={item.role}>
                <div className="salary-role">{item.role}</div>
                <div className="salary-range">{item.range}</div>
                <div className="salary-detail">{item.months}</div>
              </div>
            ))}
          </div>
        )}
        {section.workIntensity && (
          <div style={{ margin: "10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
            <strong>工作强度：</strong>{section.workIntensity}
          </div>
        )}
        {(section.pros.length > 0 || section.cons.length > 0) && (
          <div className="pros-cons">
            {section.pros.length > 0 && (
              <div className="pros">
                <div className="pros-label">好评</div>
                <ul>{section.pros.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
            {section.cons.length > 0 && (
              <div className="cons">
                <div className="cons-label">差评</div>
                <ul>{section.cons.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
      {section.sources.length > 0 && (
        <SourceLinks sources={section.sources} />
      )}
    </div>
  );
}
