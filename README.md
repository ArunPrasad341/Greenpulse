# 🌿 GreenPulse
### AI-Powered Real-Time Campus Sustainability Dashboard

> Built for **AMD Slingshot 2026** · Theme: **Sustainable AI & Green Tech**

## 🚀 What it does
GreenPulse monitors 5 sustainability domains on campus in real-time — Energy, Water, Air Quality, Carbon, and Waste — using live sensor data streams, AI anomaly detection, and immediate corrective action recommendations.

## ✨ Features
- 📊 Live streaming charts updating every 2 seconds
- 🧠 AI Insight engine — surfaces the most critical domain alert automatically
- ⚠️ Immediate Action Cards — URGENT / SOON / PLANNED priority with ETAs
- 🔐 Secure login with session-based access
- 📱 5 domain detail pages with stat boxes, charts, and AI narratives

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18 + Hooks |
| Charts | Recharts (AreaChart, LineChart) |
| Styling | CSS-in-JS (custom dark theme) |
| Fonts | Syne + Space Mono (Google Fonts) |

## ▶️ Run Locally
```bash
npm install
npm install recharts
npm start
```
Open http://localhost:3000

## 🏗️ Architecture
```
IoT Sensors (simulated) → React State (2s interval) → AI Threshold Engine → UI Output
                                                    ↓
                               OPTIMAL / ELEVATED / CRITICAL status
                                                    ↓
                               Immediate Action Cards (5 per domain)
```

## 🌍 SDG Alignment
- SDG 7 — Affordable & Clean Energy
- SDG 6 — Clean Water & Sanitation  
- SDG 11 — Sustainable Cities
- SDG 13 — Climate Action
- SDG 12 — Responsible Consumption

## 🏆 AMD Slingshot 2026
**Theme:** Sustainable AI & Green Tech  
**Team:** GreenPulse
