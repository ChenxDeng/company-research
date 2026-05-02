export interface Source {
  name: string;
  url: string;
}

export interface CityDetail {
  city: string;
  function: string;
  percent: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  sources: Source[];
  tags?: string[];
  prediction?: string;
}

export interface OrganizationSection extends ReportSection {
  id: "organization";
  employees: string;
  structure: string;
  roles: { name: string; percent: number }[];
  locations: string[];
  cityDetails: CityDetail[];
}

export interface SalaryItem {
  role: string;
  range: string;
  months: string;
}

export interface CompensationSection extends ReportSection {
  id: "compensation";
  salary: SalaryItem[];
  workIntensity: string;
  pros: string[];
  cons: string[];
}

export interface ConcernsSection extends ReportSection {
  id: "concerns";
  items: string[];
  suggestedSearches: string[];
}

export type AnySection =
  | ReportSection
  | OrganizationSection
  | CompensationSection
  | ConcernsSection;

export interface ResearchReport {
  company: string;
  summary: string;
  sections: AnySection[];
}

export type ResearchEvent =
  | { type: "status"; message: string }
  | { type: "report"; data: ResearchReport }
  | { type: "error"; message: string };
