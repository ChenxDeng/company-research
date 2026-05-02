# 公司调研助手 — 设计文档

## Context

求职者和公司之间存在明显的信息不对等：求职者的简历完全透明，而公司对求职者而言深不可测。现有获取公司信息的方式（官网搜索、社交平台零散信息）效率低下。本 app 帮助求职者更简单地掌握公司概况，促进信息权利平等。

## 产品概述

用户输入公司名称（必填）和意向岗位（选填），AI 实时搜索并整合公开信息，在一页上以高密度形式展示公司调研报告。用户可一键下载 PDF。

## 技术栈

- **框架**：Next.js 14+ (App Router)
- **AI 模型**：DeepSeek-Chat (function calling)
- **搜索 API**：Tavily Search API
- **PDF 生成**：html2pdf.js（纯前端）
- **部署**：Vercel
- **语言**：TypeScript

## 系统架构

```
用户浏览器
    ↓
Next.js App (Vercel)
    ├─ 前端：搜索表单 + 报告展示 + PDF 下载
    └─ API Route：POST /api/research
           ↓
       DeepSeek API (function calling)
           ├─ 调用搜索函数 → Tavily Search API
           ├─ 多轮搜索（自主决定搜什么）
           └─ 整合信息 → 返回结构化 JSON
           ↓
       前端渲染报告 + 一键下载 PDF
```

## 核心功能

### 1. 搜索与调研

- 用户输入：公司名称（必填）、意向岗位/工作内容（选填）
- 点击"开始调研"后，通过 SSE (Server-Sent Events) 流式返回结果
- DeepSeek 通过 function calling 自主规划搜索策略，多次调用 Tavily 搜索
- 最终整合为结构化 JSON 返回

### 2. 报告内容（6 个模块）

| 模块 | 内容 | 数据来源 |
|------|------|----------|
| 01 公司概况 | 成立历史、发展情况、行业地位 | 新闻、财报 |
| 02 业务范围 | 主要/次要行业业务、业界地位 | 新闻、财报、官网 |
| 03 最新动向 | 战略、营收、爆炸性新闻 + 趋势预测 | 新闻、财报 |
| 04 组织结构 | 员工规模、岗位构成、主要分布 | 脉脉、看准网、LinkedIn |
| 05 员工待遇 | 薪资水平、上升空间、工作强度、员工评价 | 脉脉、牛客网、offershow |
| 06 存疑之处 | 不明朗因素 + 建议搜索关键词 | 综合分析 |

### 3. PDF 下载

- 使用 html2pdf.js 纯前端生成
- 保持页面排版，包含所有来源标注

## API 设计

### POST /api/research

**请求体：**
```json
{
  "company": "字节跳动",
  "position": "前端工程师"  // 可选
}
```

**响应：** SSE 流，最终事件为完整 JSON 报告

**DeepSeek function calling 工具：**
- `search(query: string)` — 调用 Tavily 搜索，返回搜索结果

**流程：**
1. 接收请求，构造 DeepSeek prompt
2. DeepSeek 决定搜索关键词，调用 search 工具
3. 可能多轮搜索（3-5 轮）
4. DeepSeek 整合所有搜索结果，生成结构化报告 JSON
5. 通过 SSE 流式返回给前端

## UI 设计

- **风格**：浅色模式，温暖灰白背景（#faf9f7）
- **字体**：Noto Sans SC（无衬线）
- **强调色**：Claude 橙（#D97706）
- **布局**：卡片式，2 列网格，6 个信息模块
- **交互**：悬停动效、淡入动画
- **响应式**：支持移动端单列布局

## 文件结构

```
/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页（搜索 + 报告展示）
│   ├── globals.css         # 全局样式
│   └── api/
│       └── research/
│           └── route.ts    # 调研 API
├── components/
│   ├── SearchForm.tsx      # 搜索表单
│   ├── ReportCard.tsx      # 报告卡片组件
│   ├── LoadingState.tsx    # 加载状态
│   └── DownloadButton.tsx  # PDF 下载按钮
├── lib/
│   ├── deepseek.ts         # DeepSeek API 调用 + function calling
│   ├── tavily.ts           # Tavily 搜索 API 封装
│   └── types.ts            # TypeScript 类型定义
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local              # API keys
```

## 环境变量

```
DEEPSEEK_API_KEY=xxx
TAVILY_API_KEY=xxx
```

## 报告 JSON 结构

DeepSeek 最终输出的结构化 JSON 格式：

```json
{
  "company": "字节跳动",
  "summary": "从算法推荐到全球科技巨头",
  "sections": [
    {
      "id": "overview",
      "title": "公司概况",
      "content": "字节跳动成立于2012年...",
      "sources": ["36氪", "财新网", "Bloomberg"]
    },
    {
      "id": "business",
      "title": "业务范围",
      "content": "核心业务：短视频...",
      "tags": ["短视频", "信息流", "企业服务"],
      "sources": ["公司官网", "晚点LatePost"]
    },
    {
      "id": "trends",
      "title": "最新动向与趋势",
      "content": "2024年营收超1200亿美元...",
      "prediction": "短期面临地缘政治风险...",
      "sources": ["Bloomberg", "The Information"]
    },
    {
      "id": "organization",
      "title": "组织结构",
      "employees": "约15万人",
      "structure": "扁平化、OKR驱动",
      "roles": [{"name": "研发", "percent": 40}, ...],
      "locations": ["北京", "上海", "深圳"],
      "sources": ["脉脉", "看准网"]
    },
    {
      "id": "compensation",
      "title": "员工待遇",
      "salary": [
        {"role": "研发岗", "range": "30-60K", "months": "15-17薪"},
        ...
      ],
      "workIntensity": "大小周，加班文化显著",
      "pros": ["薪资竞争力强", "成长速度快"],
      "cons": ["工作强度大", "内卷严重"],
      "sources": ["脉脉", "牛客网", "offershow"]
    },
    {
      "id": "concerns",
      "title": "存疑之处",
      "items": ["TikTok美国业务走向不明朗...", ...],
      "suggestedSearches": ["TikTok 美国政策 2026", ...]
    }
  ]
}
```

## 限制与考虑

- **成本控制**：每次查询调用 DeepSeek + Tavily，通过 Vercel middleware 做 IP 级速率限制（每 IP 每小时最多 10 次查询）
- **响应时间**：预计 30-60 秒/次，通过 SSE 流式反馈进度（阶段：搜索中 → 分析中 → 生成报告）
- **数据质量**：依赖 Tavily 搜索结果质量，中文搜索覆盖度需验证，报告中明确标注数据来源
- **无用户系统**：完全匿名使用，不存储查询历史
