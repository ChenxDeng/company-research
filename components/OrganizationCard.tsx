import type { OrganizationSection } from "@/lib/types";
import { SourceLinks } from "./SourceLinks";

interface OrganizationCardProps {
  section: OrganizationSection;
  index: number;
}

export function OrganizationCard({ section, index }: OrganizationCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-icon">{num} / {section.title}</div>
      <div className="card-body">
        {section.employees && (
          <div style={{ marginBottom: 8 }}>
            <strong>员工规模：</strong>{section.employees}
          </div>
        )}
        {section.structure && (
          <div style={{ marginBottom: 12 }}>
            <strong>组织风格：</strong>{section.structure}
          </div>
        )}
        {section.roles.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <strong>岗位构成：</strong>
            <div className="tag-row" style={{ marginTop: 6 }}>
              {section.roles.map((r) => (
                <span className="tag" key={r.name}>{r.name} {r.percent}%</span>
              ))}
            </div>
          </div>
        )}
        {section.cityDetails && section.cityDetails.length > 0 && (
          <div>
            <strong>城市分布：</strong>
            <div className="salary-grid" style={{ marginTop: 8 }}>
              {section.cityDetails.map((c) => (
                <div className="salary-item" key={c.city}>
                  <div className="salary-role">{c.city}</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{c.function}</div>
                  <div className="salary-detail">{c.percent}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(!section.cityDetails || section.cityDetails.length === 0) && section.locations.length > 0 && (
          <div>
            <strong>主要分布：</strong>{section.locations.join("、")}
          </div>
        )}
      </div>
      {section.sources.length > 0 && (
        <SourceLinks sources={section.sources} />
      )}
    </div>
  );
}
