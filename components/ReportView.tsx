import type { ResearchReport, OrganizationSection, CompensationSection, ConcernsSection } from "@/lib/types";
import { ReportCard } from "./ReportCard";
import { SalaryCard } from "./SalaryCard";
import { ConcernsCard } from "./ConcernsCard";

interface ReportViewProps {
  report: ResearchReport;
}

export function ReportView({ report }: ReportViewProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div id="report-content">
      <div className="report-header">
        <h2 className="company-name">{report.company}</h2>
        <div className="report-meta">
          <div>调研时间：{today}</div>
          <div>数据来源：实时网络搜索</div>
        </div>
      </div>

      <p style={{ marginBottom: 24, fontSize: 15, color: "var(--text-secondary)" }}>
        {report.summary}
      </p>

      <div className="report-grid">
        {report.sections.map((section, i) => {
          switch (section.id) {
            case "organization":
              return (
                <ReportCard
                  key={section.id}
                  section={section as OrganizationSection}
                  index={i}
                />
              );
            case "compensation":
              return (
                <SalaryCard
                  key={section.id}
                  section={section as CompensationSection}
                  index={i}
                />
              );
            case "concerns":
              return (
                <ConcernsCard
                  key={section.id}
                  section={section as ConcernsSection}
                  index={i}
                />
              );
            default:
              return (
                <ReportCard
                  key={section.id}
                  section={section}
                  index={i}
                  fullWidth={section.id === "trends"}
                />
              );
          }
        })}
      </div>
    </div>
  );
}
