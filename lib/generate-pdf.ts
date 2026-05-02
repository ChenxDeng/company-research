// lib/generate-pdf.ts

import { jsPDF } from "jspdf";
import { loadChineseFont } from "./font-loader";
import type {
  ResearchReport,
  AnySection,
  OrganizationSection,
  CompensationSection,
  ConcernsSection,
  Source,
  CityDetail,
  SalaryItem,
} from "./types";

// A4 dimensions in mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 15;
const MARGIN_R = 15;
const MARGIN_T = 20;
const MARGIN_B = 20;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const COLORS = {
  black: [30, 30, 30] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [180, 180, 180] as [number, number, number],
  accent: [217, 119, 6] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  bg: [250, 249, 247] as [number, number, number],
  cardBg: [245, 243, 240] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  red: [180, 83, 9] as [number, number, number],
};

export async function generateReportPdf(report: ResearchReport): Promise<void> {
  const fontBase64 = await loadChineseFont();

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  doc.addFileToVFS("NotoSansSC-Regular.ttf", fontBase64);
  doc.addFont("NotoSansSC-Regular.ttf", "NotoSansSC", "normal");
  doc.setFont("NotoSansSC");

  let y = MARGIN_T;

  // Header
  y = drawHeader(doc, report, y);

  // Summary
  if (report.summary) {
    y = drawSummary(doc, report.summary, y);
  }

  // Sections
  for (const section of report.sections) {
    y = checkPageBreak(doc, y, 20);
    y = drawSection(doc, section, y);
  }

  const company = report.company || "公司";
  doc.save(`${company}简历.pdf`);
}

function drawHeader(
  doc: jsPDF,
  report: ResearchReport,
  y: number,
): number {
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.black);
  doc.text(report.company, MARGIN_L, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.lightGray);
  const today = new Date().toISOString().split("T")[0];
  doc.text(`调研时间：${today}  ·  数据来源：实时网络搜索`, MARGIN_L, y);
  y += 6;

  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 6;

  return y;
}

function drawSummary(doc: jsPDF, summary: string, y: number): number {
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  const lines = wrapText(doc, summary, CONTENT_W);
  for (const line of lines) {
    y = checkPageBreak(doc, y, 5);
    doc.text(line, MARGIN_L, y);
    y += 5;
  }
  y += 6;
  return y;
}

function drawSection(doc: jsPDF, section: AnySection, y: number): number {
  switch (section.id) {
    case "organization":
      return drawOrganizationSection(doc, section as OrganizationSection, y);
    case "compensation":
      return drawCompensationSection(doc, section as CompensationSection, y);
    case "concerns":
      return drawConcernsSection(doc, section as ConcernsSection, y);
    default:
      return drawDefaultSection(doc, section, y);
  }
}

// Default section (overview, business, trends)
function drawDefaultSection(
  doc: jsPDF,
  section: { id: string; title: string; content: string; tags?: string[]; prediction?: string; sources: Source[] },
  y: number,
): number {
  y = drawSectionTitle(doc, section.title, y);

  // Content
  y = drawWrappedText(doc, section.content, MARGIN_L, y, CONTENT_W, 10, COLORS.gray);

  // Prediction
  if (section.prediction) {
    y += 4;
    y = checkPageBreak(doc, y, 16);

    doc.setFillColor(...COLORS.cardBg);
    const predLines = wrapText(doc, section.prediction, CONTENT_W - 12);
    const boxH = predLines.length * 5 + 8;
    doc.roundedRect(MARGIN_L, y - 3, CONTENT_W, boxH, 2, 2, "F");

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_L, y - 3, MARGIN_L, y - 3 + boxH);

    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    for (const line of predLines) {
      y = checkPageBreak(doc, y, 5);
      doc.text(line, MARGIN_L + 6, y);
      y += 5;
    }
    y += 2;
  }

  // Tags
  if (section.tags && section.tags.length > 0) {
    y += 2;
    y = drawTags(doc, section.tags, y);
  }

  // Sources
  if (section.sources.length > 0) {
    y = drawSources(doc, section.sources, y);
  }

  return y;
}

// Organization section
function drawOrganizationSection(
  doc: jsPDF,
  section: OrganizationSection,
  y: number,
): number {
  y = drawSectionTitle(doc, section.title, y);

  // Content
  if (section.content) {
    y = drawWrappedText(doc, section.content, MARGIN_L, y, CONTENT_W, 10, COLORS.gray);
    y += 3;
  }

  // Employees & Structure
  if (section.employees) {
    y = drawField(doc, "员工规模", section.employees, y);
  }
  if (section.structure) {
    y = drawField(doc, "组织风格", section.structure, y);
  }

  // Roles
  if (section.roles.length > 0) {
    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.black);
    doc.text("岗位构成", MARGIN_L, y);
    y += 5;

    for (const role of section.roles) {
      y = checkPageBreak(doc, y, 5);
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.gray);
      doc.text(`• ${role.name} ${role.percent}%`, MARGIN_L + 4, y);
      y += 5;
    }
    y += 2;
  }

  // City Details
  if (section.cityDetails && section.cityDetails.length > 0) {
    y = drawCityDetailsTable(doc, section.cityDetails, y);
  }

  // Locations fallback
  if ((!section.cityDetails || section.cityDetails.length === 0) && section.locations.length > 0) {
    y = drawField(doc, "主要分布", section.locations.join("、"), y);
  }

  // Sources
  if (section.sources.length > 0) {
    y = drawSources(doc, section.sources, y);
  }

  return y;
}

// Compensation section
function drawCompensationSection(
  doc: jsPDF,
  section: CompensationSection,
  y: number,
): number {
  y = drawSectionTitle(doc, section.title, y);

  // Content
  if (section.content) {
    y = drawWrappedText(doc, section.content, MARGIN_L, y, CONTENT_W, 10, COLORS.gray);
    y += 3;
  }

  // Salary table
  if (section.salary.length > 0) {
    y = drawSalaryTable(doc, section.salary, y);
  }

  // Work intensity
  if (section.workIntensity) {
    y = drawField(doc, "工作强度", section.workIntensity, y);
  }

  // Pros & Cons
  if (section.pros.length > 0 || section.cons.length > 0) {
    y += 2;

    if (section.pros.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.green);
      doc.text("好评", MARGIN_L, y);
      y += 5;
      for (const pro of section.pros) {
        y = checkPageBreak(doc, y, 5);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.gray);
        doc.text(`+ ${pro}`, MARGIN_L + 4, y);
        y += 5;
      }
      y += 2;
    }

    if (section.cons.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.red);
      doc.text("差评", MARGIN_L, y);
      y += 5;
      for (const con of section.cons) {
        y = checkPageBreak(doc, y, 5);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.gray);
        doc.text(`− ${con}`, MARGIN_L + 4, y);
        y += 5;
      }
      y += 2;
    }
  }

  // Sources
  if (section.sources.length > 0) {
    y = drawSources(doc, section.sources, y);
  }

  return y;
}

// Concerns section
function drawConcernsSection(
  doc: jsPDF,
  section: ConcernsSection,
  y: number,
): number {
  y = drawSectionTitle(doc, section.title, y);

  // Content
  if (section.content) {
    y = drawWrappedText(doc, section.content, MARGIN_L, y, CONTENT_W, 10, COLORS.gray);
    y += 3;
  }

  // Concern items
  if (section.items.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.red);
    doc.text("⚠ 存疑点", MARGIN_L, y);
    y += 5;

    for (const item of section.items) {
      y = checkPageBreak(doc, y, 5);
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.gray);
      const lines = wrapText(doc, `• ${item}`, CONTENT_W - 6);
      for (const line of lines) {
        y = checkPageBreak(doc, y, 5);
        doc.text(line, MARGIN_L + 4, y);
        y += 5;
      }
    }
    y += 2;
  }

  // Suggested searches
  if (section.suggestedSearches.length > 0) {
    y = drawTags(doc, section.suggestedSearches, y);
  }

  // Sources
  if (section.sources.length > 0) {
    y = drawSources(doc, section.sources, y);
  }

  return y;
}

// --- Drawing Helpers ---

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = checkPageBreak(doc, y, 14);

  // Orange dot
  doc.setFillColor(...COLORS.accent);
  doc.circle(MARGIN_L + 2, y - 1, 1.5, "F");

  doc.setFontSize(13);
  doc.setTextColor(...COLORS.black);
  doc.text(title, MARGIN_L + 7, y);
  y += 6;

  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 5;

  return y;
}

function drawField(doc: jsPDF, label: string, value: string, y: number): number {
  y = checkPageBreak(doc, y, 6);
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.black);
  doc.text(`${label}：`, MARGIN_L, y);
  const labelWidth = doc.getTextWidth(`${label}：`);
  doc.setTextColor(...COLORS.gray);
  const lines = wrapText(doc, value, CONTENT_W - labelWidth - 2);
  doc.text(lines[0], MARGIN_L + labelWidth, y);
  y += 5;
  for (let i = 1; i < lines.length; i++) {
    y = checkPageBreak(doc, y, 5);
    doc.text(lines[i], MARGIN_L + labelWidth, y);
    y += 5;
  }
  return y + 2;
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: [number, number, number],
): number {
  doc.setFontSize(10);
  doc.setTextColor(...color);
  const lines = wrapText(doc, text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight * 0.5);
    doc.text(line, x, y);
    y += lineHeight * 0.5;
  }
  return y;
}

function drawSalaryTable(doc: jsPDF, salary: SalaryItem[], y: number): number {
  const colW = CONTENT_W / 3;
  const rowH = 18;
  const startX = MARGIN_L;

  // Header
  y = checkPageBreak(doc, y, rowH);
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(startX, y - 4, CONTENT_W, rowH, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.lightGray);
  doc.text("岗位", startX + colW * 0.5, y + 2, { align: "center" });
  doc.text("薪资范围", startX + colW * 1.5, y + 2, { align: "center" });
  doc.text("薪月数", startX + colW * 2.5, y + 2, { align: "center" });
  y += rowH - 2;

  // Rows
  for (const item of salary) {
    y = checkPageBreak(doc, y, rowH);
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.15);
    doc.line(startX, y - 2, startX + CONTENT_W, y - 2);

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(item.role, startX + colW * 0.5, y + 4, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(...COLORS.black);
    doc.text(item.range, startX + colW * 1.5, y + 4, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.lightGray);
    doc.text(item.months, startX + colW * 2.5, y + 4, { align: "center" });

    y += rowH;
  }

  return y + 3;
}

function drawCityDetailsTable(doc: jsPDF, details: CityDetail[], y: number): number {
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.black);
  doc.text("城市分布", MARGIN_L, y);
  y += 5;

  const colW = CONTENT_W / 3;
  const rowH = 14;
  const startX = MARGIN_L;

  // Header
  y = checkPageBreak(doc, y, rowH);
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(startX, y - 3, CONTENT_W, rowH, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.lightGray);
  doc.text("城市", startX + colW * 0.5, y + 2, { align: "center" });
  doc.text("主要职能", startX + colW * 1.5, y + 2, { align: "center" });
  doc.text("员工占比", startX + colW * 2.5, y + 2, { align: "center" });
  y += rowH - 1;

  // Rows
  for (const city of details) {
    y = checkPageBreak(doc, y, rowH);
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.15);
    doc.line(startX, y - 2, startX + CONTENT_W, y - 2);

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(city.city, startX + colW * 0.5, y + 3, { align: "center" });
    doc.text(city.function, startX + colW * 1.5, y + 3, { align: "center" });
    doc.text(city.percent, startX + colW * 2.5, y + 3, { align: "center" });
    y += rowH;
  }

  return y + 3;
}

function drawTags(doc: jsPDF, tags: string[], y: number): number {
  let x = MARGIN_L;
  doc.setFontSize(8);

  for (const tag of tags) {
    const tagW = doc.getTextWidth(tag) + 8;
    if (x + tagW > PAGE_W - MARGIN_R) {
      x = MARGIN_L;
      y += 7;
      y = checkPageBreak(doc, y, 7);
    }

    doc.setFillColor(...COLORS.cardBg);
    doc.roundedRect(x, y - 4, tagW, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.accent);
    doc.text(tag, x + 4, y);
    x += tagW + 3;
  }

  return y + 8;
}

function drawSources(doc: jsPDF, sources: Source[], y: number): number {
  y += 4;
  y = checkPageBreak(doc, y, 6);

  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.lightGray);
  doc.text("引用来源：", MARGIN_L, y);
  y += 4;

  for (const src of sources) {
    y = checkPageBreak(doc, y, 4);
    const displayText = src.url
      ? `${src.name}  ${src.url}`
      : src.name;
    const lines = wrapText(doc, displayText, CONTENT_W - 4);
    for (const line of lines) {
      y = checkPageBreak(doc, y, 4);
      doc.setTextColor(...COLORS.blue);
      doc.text(line, MARGIN_L + 2, y);
      y += 4;
    }
  }

  return y + 4;
}

// --- Utility Functions ---

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN_B) {
    doc.addPage();
    return MARGIN_T;
  }
  return y;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [];

  // Use jsPDF's built-in splitTextToSize for line splitting
  const result = doc.splitTextToSize(text, maxWidth);
  // splitTextToSize returns string[] or string depending on version
  if (Array.isArray(result)) return result;
  return [result];
}
