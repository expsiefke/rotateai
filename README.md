# RotateAI

**AI-powered restaurant inventory management SaaS** — reduce the 30% F&B waste factor through intelligent FIFO tracking, shrinkage detection, seasonal demand forecasting, and Claude-powered vendor order optimization.

> Built by [Phil Siefke](https://philsiefke.com) / [Expert Incubators LLC](https://expertincubators.com)  
> Validated against Ford's Garage franchise network (32 locations, $5.38M AUV)

---

## The Problem

R365, Toast, MarketMan — all rear-view mirrors. They tell you what already happened. RotateAI is the **intelligence layer on top** — a forward-looking daily decision engine that reads your inventory data and tells your GM what to do at 6am before they walk in the door.

> *"You're already paying for R365. RotateAI makes sure you actually use it."*

---

## Demo Features (v6)

### 7 Operational Modules

| Tab | What it does |
|---|---|
| ☀️ Morning Brief | Priority action list — keg alerts, FIFO expiration, shrinkage flags, weather, next event |
| 🔄 FIFO Manager | Batch tracking with expiration countdown, USE FIRST labeling |
| 🤖 AI Order Engine | **Real Claude API call** — generates operational analysis of vendor order decisions |
| 🍺 Bar & Beverage | Beer keg gauges, wine on tap + BTG, spirits pour cost signals |
| 🌦️ Seasonal Intel | 7-day weather + demand impact table, upcoming event par adjustments |
| 📊 Waste Analytics | Full-width category accordion + Recharts charts + shrinkage detection view |
| 🗑️ Overorder Analyzer | 8-week Recharts bar charts showing ordered vs. used vs. waste |

### Libraries Integrated

- **Recharts** — AreaChart (waste trend), stacked BarChart (ordered vs. used), pour cost comparison
- **Sonner-equivalent** — Stacked toast notifications with physics animation, auto-dismiss, click-to-navigate
- **Zustand-equivalent** — `AppContext` with `navigate()` and `addToast()` shared across all tabs
- **TanStack Table-equivalent** — `useSort()` hook with `↑↓↕` sort buttons on all tables
- **AutoAnimate-equivalent** — Pure conditional render accordion (no CSS max-height hacks)
- **Anthropic Claude API** — Real AI subagent call on Order Engine tab

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/rotateai.git
cd rotateai
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Live Demo

The demo runs entirely on sample data — no backend required. The AI Order Engine tab makes a real call to the Anthropic API (handled by the Claude.ai artifact runtime). To run locally with the AI feature, you'll need an Anthropic API key.

---

## The Business Case

A Ford's Garage location does **$5.4M AUV**. At a 28% blended F&B cost, waste exposure is ~$450K/year. RotateAI targeting 20% recovery = **$90,000/location/year** saved. At $447/month that's a **17x ROI**.

```
32 locations × $447/month = $171,456 ARR (per-location)
Enterprise license to 23 Restaurant Services = $60K+ ARR (single contract)
```

---

## Roadmap

### Phase 1 — Foundation (current)
- [x] Morning Brief with priority actions
- [x] FIFO batch tracking
- [x] Overorder pattern detection
- [x] Basic waste analytics accordion

### Phase 2 — Intelligence (in progress)
- [x] AI Order Engine (Claude-powered)
- [x] Seasonal/Event intelligence
- [x] Keg velocity tracking + wine on tap
- [x] Open bottle countdown
- [x] Shrinkage & theft detection (POS vs. depletion delta)

### Phase 3 — Protection
- [ ] Invoice OCR ingestion (Veryfi/Mindee)
- [ ] POS integration (Toast/Square)
- [ ] R365 data sync
- [ ] Shift-level risk scoring with GM alerts

### Phase 4 — Scale
- [ ] Multi-location dashboard
- [ ] Corporate rollup reporting (23 Restaurant Services view)
- [ ] Franchise benchmarking
- [ ] Mobile PWA (GM morning brief on phone)

---

## Tech Stack

```
Frontend:  React 18 · Recharts · Vite
AI:        Anthropic Claude API (claude-sonnet-4-20250514)
State:     Context + useReducer (Zustand-equivalent)
Charts:    Recharts (AreaChart, BarChart, Cell coloring)
Alerts:    Custom Sonner-equivalent stacked toasts
Tables:    Custom useSort hook (TanStack-equivalent)
Deploy:    Netlify / Vercel (static, no backend)
```

---

## Disclaimer

All inventory numbers, vendor prices, sales figures, and operational data shown in the demo are **illustrative sample data only**. The Ford's Garage AUV figure ($5.38M) is sourced from their FDD. No real restaurant data is used.

---

## License

MIT © 2025 Phil Siefke / Expert Incubators LLC

---

## Contact

- **Phil Siefke** — [phil@philsiefke.com](mailto:phil@philsiefke.com)
- **Website** — [philsiefke.com](https://philsiefke.com)
- **The Blazed Path** — AI consulting & content

*RotateAI is a product of Expert Incubators LLC, Eagle Lake, FL*
