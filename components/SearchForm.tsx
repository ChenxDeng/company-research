"use client";

import { useState } from "react";

interface SearchFormProps {
  onSearch: (company: string, position: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (company.trim()) {
      onSearch(company.trim(), position.trim());
    }
  };

  return (
    <section className="search-section">
      <h1 className="search-title">深入了解你想加入的公司</h1>
      <p className="search-subtitle">
        输入公司名称，AI 实时整合公开信息，生成一页高密度调研报告
      </p>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-label">公司名称 *</span>
          <input
            className="search-input"
            placeholder="如：字节跳动、阿里巴巴、小红书..."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <span className="input-label">意向岗位</span>
          <input
            className="search-input"
            placeholder="如：前端开发、产品经理..."
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <button className="search-btn" type="submit" disabled={isLoading || !company.trim()}>
          {isLoading ? "调研中..." : "开始调研"}
        </button>
      </form>
    </section>
  );
}
