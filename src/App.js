import { useState, useEffect, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

// ─── UTILS ───────────────────────────────────────────────────────────────────
const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const STATUS = {
  good: { label: "OPTIMAL", color: "#00ff88" },
  warn: { label: "ELEVATED", color: "#ffcc00" },
  bad: { label: "CRITICAL", color: "#ff4466" },
};

// ─── DOMAIN CONFIG ────────────────────────────────────────────────────────────
const DOMAINS = [
  {
    id: "energy", icon: "⚡", label: "Energy", unit: "kWh", color: "#00ff88",
    base: 340, delta: 18, min: 200, max: 600,
    insight: "Lab Block B is drawing 23% excess — idle HVAC units detected.",
    thresholds: { good: 400, warn: 520 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Shut down idle HVAC units in Lab Block B immediately", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Switch off non-essential lighting in unused lab sections", eta: "5 min" },
      { priority: "medium", icon: "🟡", text: "Set AC thermostats to 24°C across all hostel wings", eta: "15 min" },
      { priority: "medium", icon: "🟡", text: "Enable power-saving mode on all idle lab computers", eta: "15 min" },
      { priority: "low",    icon: "🟢", text: "Schedule equipment audit for Lab Block B this week", eta: "This week" },
    ],
  },
  {
    id: "water", icon: "💧", label: "Water", unit: "L/hr", color: "#00cfff",
    base: 820, delta: 45, min: 400, max: 1400,
    insight: "Hostel wing 3 shows micro-leak signature on sensor 7.",
    thresholds: { good: 900, warn: 1100 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Dispatch maintenance team to Hostel Wing 3, Sensor 7 zone", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Isolate the affected pipe section using shutoff valve C-7", eta: "10 min" },
      { priority: "medium", icon: "🟡", text: "Notify hostel warden and restrict water usage in Wing 3", eta: "15 min" },
      { priority: "medium", icon: "🟡", text: "Cross-check flow meter readings on adjacent sensors 6 & 8", eta: "20 min" },
      { priority: "low",    icon: "🟢", text: "Log incident and schedule full pipe inspection for the wing", eta: "Tomorrow" },
    ],
  },
  {
    id: "airquality", icon: "🌿", label: "Air Quality", unit: "AQI", color: "#a8ff78",
    base: 62, delta: 8, min: 20, max: 180,
    insight: "AQI trending up — wind from construction zone. Alert issued.",
    thresholds: { good: 80, warn: 130 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Close all windows and vents on the construction-facing side", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Activate indoor air purifiers in classrooms and common areas", eta: "5 min" },
      { priority: "medium", icon: "🟡", text: "Send advisory to students to avoid outdoor activities", eta: "10 min" },
      { priority: "medium", icon: "🟡", text: "Switch HVAC systems to recirculation mode", eta: "10 min" },
      { priority: "low",    icon: "🟢", text: "Contact construction team to enforce dust suppression measures", eta: "1 hour" },
    ],
  },
  {
    id: "carbon", icon: "☁️", label: "Carbon", unit: "kg CO₂", color: "#ff9f43",
    base: 142, delta: 12, min: 60, max: 280,
    insight: "Carbon output 18% below monthly avg. Solar panels performing well.",
    thresholds: { good: 160, warn: 220 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Reduce diesel generator runtime — switch to grid + solar", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Halt non-essential high-emission campus transport", eta: "15 min" },
      { priority: "medium", icon: "🟡", text: "Shift peak-hour energy loads to solar production window", eta: "30 min" },
      { priority: "medium", icon: "🟡", text: "Enable carbon offset logging for today's excess output", eta: "1 hour" },
      { priority: "low",    icon: "🟢", text: "Review and optimize monthly carbon budget allocation", eta: "This week" },
    ],
  },
  {
    id: "waste", icon: "♻️", label: "Waste", unit: "kg/day", color: "#f368e0",
    base: 94, delta: 10, min: 30, max: 200,
    insight: "E-waste bin at 87% capacity. Collection needed within 12 hrs.",
    thresholds: { good: 100, warn: 150 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Schedule emergency e-waste pickup within 12 hours", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Seal and label overflow e-waste in designated holding area", eta: "10 min" },
      { priority: "medium", icon: "🟡", text: "Notify department heads to pause non-urgent disposal", eta: "20 min" },
      { priority: "medium", icon: "🟡", text: "Redirect general waste to secondary bins in Block A & C", eta: "30 min" },
      { priority: "low",    icon: "🟢", text: "Review waste collection frequency — consider bi-weekly schedule", eta: "This week" },
    ],
  },
];

const generateHistory = (base, delta, min, max, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    v: clamp(base + rand(-delta * 2, delta * 2), min, max),
  }));

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #070a0f;
    --surface: rgba(255,255,255,0.035);
    --border: rgba(255,255,255,0.08);
    --text: #e8f4f0;
    --muted: #5a7a6e;
    --accent: #00ff88;
    --accent2: #00cfff;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'Space Mono', monospace;
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-mono);
    overflow: hidden;
  }

  /* ─── LOGIN ─── */
  .login-wrap {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,255,136,0.08) 0%, transparent 70%),
                radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0,207,255,0.06) 0%, transparent 60%),
                var(--bg);
    position: relative;
    overflow: hidden;
  }

  .login-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
  }

  .login-card {
    position: relative;
    width: 420px;
    padding: 48px 40px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(0,255,136,0.2);
    border-radius: 16px;
    backdrop-filter: blur(20px);
    box-shadow: 0 0 80px rgba(0,255,136,0.08), 0 0 0 1px rgba(255,255,255,0.04) inset;
    animation: fadeUp 0.6s ease both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-logo {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 28px;
    color: var(--accent);
    letter-spacing: -1px;
    margin-bottom: 4px;
  }

  .login-sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 36px;
  }

  .login-label {
    display: block;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .login-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 14px;
    margin-bottom: 20px;
    outline: none;
    transition: border-color 0.2s;
  }

  .login-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0,255,136,0.1);
  }

  .login-btn {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: #070a0f;
    border: none;
    border-radius: 8px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 4px;
  }

  .login-btn:hover { background: #00e87a; transform: translateY(-1px); box-shadow: 0 8px 30px rgba(0,255,136,0.3); }
  .login-btn:active { transform: translateY(0); }

  .login-hint {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    margin-top: 20px;
  }

  /* ─── APP SHELL ─── */
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ─── SIDEBAR ─── */
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.02);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 28px 0;
    position: relative;
  }

  .sidebar::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(0,255,136,0.3), transparent);
  }

  .sidebar-brand {
    padding: 0 24px 28px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }

  .brand-name {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 20px;
    color: var(--accent);
    letter-spacing: -0.5px;
  }

  .brand-tag {
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 2px;
  }

  .nav-section {
    padding: 0 12px;
    flex: 1;
  }

  .nav-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    padding: 0 12px;
    margin-bottom: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 2px;
    font-size: 13px;
    color: var(--muted);
    border: 1px solid transparent;
    position: relative;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.04);
    color: var(--text);
  }

  .nav-item.active {
    background: rgba(0,255,136,0.08);
    border-color: rgba(0,255,136,0.2);
    color: var(--accent);
  }

  .nav-item .icon { font-size: 16px; }
  .nav-item .badge {
    margin-left: auto;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .nav-item.warn .badge { background: #ffcc00; }
  .nav-item.bad .badge  { background: #ff4466; }

  .sidebar-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
  }

  .avatar {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar-circle {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: #070a0f;
    font-family: var(--font-display);
  }

  /* ─── MAIN ─── */
  .main {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse 60% 50% at 70% 20%, rgba(0,255,136,0.04) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 20% 80%, rgba(0,207,255,0.03) 0%, transparent 60%),
      var(--bg);
  }

  .main::-webkit-scrollbar { width: 4px; }
  .main::-webkit-scrollbar-track { background: transparent; }
  .main::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.2); border-radius: 4px; }

  /* ─── TOPBAR ─── */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: rgba(7,10,15,0.9);
    backdrop-filter: blur(10px);
    z-index: 10;
  }

  .topbar-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.5px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .live-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
  }

  .live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.2s infinite;
  }

  .time-display {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  /* ─── CONTENT ─── */
  .content {
    padding: 28px 32px;
    flex: 1;
  }

  /* ─── DASHBOARD ─── */
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .metric-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 16px;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--card-color, var(--accent));
    opacity: 0.7;
  }

  .metric-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: var(--card-color, var(--accent));
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }

  .card-icon { font-size: 18px; margin-bottom: 12px; }

  .card-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .card-value {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 800;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    margin-bottom: 4px;
  }

  .card-unit {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .card-status {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 700;
  }

  .mini-chart {
    margin-top: 12px;
    opacity: 0.8;
  }



  /* ─── DETAIL VIEW ─── */
  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
  }

  .detail-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 4px;
  }

  .detail-sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .stat-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 18px;
  }

  .stat-box-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .stat-box-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .stat-box-sub {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
  }

  .chart-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .chart-card-title {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .change-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 20px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .change-badge.up { background: rgba(255,68,102,0.15); color: #ff4466; }
  .change-badge.down { background: rgba(0,255,136,0.15); color: var(--accent); }
  .change-badge.neutral { background: rgba(255,204,0,0.15); color: #ffcc00; }

  .ai-insight-card {
    background: linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,207,255,0.04));
    border: 1px solid rgba(0,255,136,0.2);
    border-radius: 12px;
    padding: 20px 24px;
  }

  /* ─── ACTIONS SECTION ─── */
  .actions-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }

  .actions-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    background: rgba(255,255,255,0.02);
  }

  .actions-title {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: -0.3px;
  }

  .actions-sub {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .actions-list {
    padding: 8px 0;
  }

  .action-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.2s;
    gap: 16px;
  }

  .action-item:last-child { border-bottom: none; }

  .action-item:hover { background: rgba(255,255,255,0.03); }

  .action-item.action-high { border-left: 3px solid #ff4466; }
  .action-item.action-medium { border-left: 3px solid #ffcc00; }
  .action-item.action-low { border-left: 3px solid #00ff88; }

  .action-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  }

  .action-index {
    font-size: 11px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    width: 20px;
  }

  .action-icon { font-size: 18px; flex-shrink: 0; }

  .action-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.4;
  }

  .action-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    flex-shrink: 0;
  }

  .action-eta {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .eta-high   { color: #ff4466; }
  .eta-medium { color: #ffcc00; }
  .eta-low    { color: #00ff88; }

  .action-priority-badge {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 700;
  }

  .badge-high   { background: rgba(255,68,102,0.15);  color: #ff4466; }
  .badge-medium { background: rgba(255,204,0,0.15);   color: #ffcc00; }
  .badge-low    { background: rgba(0,255,136,0.12);   color: #00ff88; }

  .ai-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--accent);
    background: rgba(0,255,136,0.1);
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 12px;
  }

  .ai-insight-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    margin-bottom: 24px;
    transition: color 0.2s;
  }

  .back-btn:hover { color: var(--text); }

  .tooltip-custom {
    background: rgba(7,10,15,0.95) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 8px !important;
    font-family: var(--font-mono) !important;
    font-size: 12px !important;
  }

  .domain-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 28px;
  }

  /* ─── AIR QUALITY PANEL ─── */
  .aq-panel {
    background: rgba(168,255,120,0.04);
    border: 1px solid rgba(168,255,120,0.2);
    border-radius: 14px;
    padding: 22px 24px;
    margin-bottom: 24px;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }

  .aq-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #a8ff78, transparent);
  }

  .aq-panel:hover {
    background: rgba(168,255,120,0.07);
    border-color: rgba(168,255,120,0.35);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(168,255,120,0.08);
  }

  .aq-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .aq-panel-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    color: #a8ff78;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .aq-panel-sub {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .aq-stats {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .aq-stat-box {
    flex: 1;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .aq-stat-label {
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .aq-stat-value {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    margin-bottom: 2px;
  }

  .aq-stat-unit {
    font-size: 10px;
    color: var(--muted);
  }

  .aq-insight {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(168,255,120,0.1);
    border-radius: 8px;
    padding: 14px 16px;
  }

  /* ─── PROMINENT INSIGHT BAR ─── */
  .big-insight {
    background: linear-gradient(120deg, rgba(0,255,136,0.09) 0%, rgba(0,207,255,0.05) 100%);
    border: 1px solid rgba(0,255,136,0.25);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
    cursor: default;
  }

  .big-insight::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ff88, #00cfff, transparent);
  }

  .big-insight::after {
    content: '✦';
    position: absolute;
    right: 32px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 80px;
    color: rgba(0,255,136,0.06);
    pointer-events: none;
    font-family: sans-serif;
  }

  .big-insight-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .big-insight-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #070a0f;
    background: var(--accent);
    padding: 5px 14px;
    border-radius: 20px;
    font-weight: 700;
  }

  .big-insight-domain {
    font-size: 10px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .big-insight-text {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    max-width: 85%;
  }

  .big-insight-sub {
    margin-top: 12px;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1px;
  }
`;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function getStatus(d, v) {
  if (v <= d.thresholds.good) return STATUS.good;
  if (v <= d.thresholds.warn) return STATUS.warn;
  return STATUS.bad;
}

function getBadgeClass(domain, v) {
  if (v <= domain.thresholds.good) return "";
  if (v <= domain.thresholds.warn) return "warn";
  return "bad";
}

function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div className="login-wrap">
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">GreenPulse</div>
        <div className="login-sub">Sustainability Intelligence Platform</div>
        <label className="login-label">Email Address</label>
        <input
          className="login-input"
          type="email"
          placeholder="you@campus.edu"
          value={user}
          onChange={e => setUser(e.target.value)}
        />
        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          placeholder="••••••••"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onLogin(user)}
        />
        <button className="login-btn" onClick={() => onLogin(user || "User")}>
          Access Dashboard
        </button>
        <div className="login-hint">AMD Slingshot · Sustainable AI & Green Tech</div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-custom" style={{ padding: "8px 12px" }}>
      <span style={{ color: "#e8f4f0" }}>{payload[0].value} {unit}</span>
    </div>
  );
}

function MiniSparkline({ data, color }) {
  return (
    <div className="mini-chart">
      <ResponsiveContainer width="100%" height={36}>
        <AreaChart data={data.slice(-10)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#sg-${color.replace("#","")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DetailView({ domain, history, current, onBack }) {
  const status = getStatus(domain, current);
  const prev = history.at(-2)?.v ?? current;
  const change = current - prev;
  const pct = ((Math.abs(change) / (prev || 1)) * 100).toFixed(1);
  const min = Math.min(...history.map(h => h.v)).toFixed(1);
  const max = Math.max(...history.map(h => h.v)).toFixed(1);
  const avg = (history.reduce((a, h) => a + h.v, 0) / history.length).toFixed(1);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Overview</button>
      <div className="detail-header">
        <div>
          <div className="detail-title" style={{ color: domain.color }}>
            {domain.icon} {domain.label}
          </div>
          <div className="detail-sub">Real-time monitoring · Updates every 2s</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 48,
            fontWeight: 800,
            color: domain.color,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {current}
          </div>
          <div style={{ fontSize: 14, color: "#5a7a6e", marginTop: 4 }}>{domain.unit}</div>
          <div className={`change-badge ${change > 0 ? "up" : change < 0 ? "down" : "neutral"}`}
            style={{ marginTop: 8, display: "inline-block" }}>
            {change >= 0 ? "▲" : "▼"} {pct}%
          </div>
        </div>
      </div>

      <div className="stat-row">
        {[
          { l: "Current", v: current, u: domain.unit, c: domain.color },
          { l: "Average", v: avg, u: domain.unit, c: "#e8f4f0" },
          { l: "Peak", v: max, u: domain.unit, c: "#ff4466" },
          { l: "Minimum", v: min, u: domain.unit, c: "#00ff88" },
        ].map(s => (
          <div className="stat-box" key={s.l}>
            <div className="stat-box-label">{s.l}</div>
            <div className="stat-box-value" style={{ color: s.c }}>{s.v}</div>
            <div className="stat-box-sub">{s.u}</div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Live Feed · Last 30 Readings</div>
          <div className="live-badge">
            <div className="live-dot" />
            STREAMING
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="detail-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={domain.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={domain.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis domain={[domain.min, domain.max]} hide />
            <Tooltip content={<CustomTooltip unit={domain.unit} />} />
            <Area type="monotone" dataKey="v" stroke={domain.color} strokeWidth={2}
              fill="url(#detail-grad)" dot={false} activeDot={{ r: 4, fill: domain.color }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="ai-insight-card" style={{ marginBottom: 20 }}>
        <div className="ai-tag">✦ AI Insight</div>
        <div className="ai-insight-text">{domain.insight}</div>
      </div>

      {/* Immediate Actions */}
      <div className="actions-section">
        <div className="actions-header">
          <div className="actions-title">⚡ Immediate Actions Required</div>
          <div className="actions-sub">AI-recommended steps · Prioritized by urgency</div>
        </div>
        <div className="actions-list">
          {domain.actions.map((action, i) => (
            <div key={i} className={`action-item action-${action.priority}`}>
              <div className="action-left">
                <div className="action-index">{String(i + 1).padStart(2, "0")}</div>
                <div className="action-icon">{action.icon}</div>
                <div className="action-text">{action.text}</div>
              </div>
              <div className="action-right">
                <div className={`action-eta eta-${action.priority}`}>{action.eta}</div>
                <div className={`action-priority-badge badge-${action.priority}`}>
                  {action.priority === "high" ? "URGENT" : action.priority === "medium" ? "SOON" : "PLANNED"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AirQualityPanel({ history, current, onSelect }) {
  const domain = DOMAINS.find(d => d.id === "airquality");
  const status = getStatus(domain, current);
  const prev = history.at(-2)?.v ?? current;
  const change = (current - prev).toFixed(1);
  const avg = (history.reduce((a, h) => a + h.v, 0) / history.length).toFixed(1);
  const peak = Math.max(...history.map(h => h.v)).toFixed(1);
  const minVal = Math.min(...history.map(h => h.v)).toFixed(1);
  const pct = ((Math.abs(change) / (prev || 1)) * 100).toFixed(1);

  return (
    <div className="aq-panel" onClick={() => onSelect("airquality")} title="Click to open full view">
      {/* Header */}
      <div className="aq-panel-header">
        <div>
          <div className="aq-panel-title">🌿 Air Quality Monitor</div>
          <div className="aq-panel-sub">Live · Updates every 2s · Click for full view</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 42, color: domain.color, lineHeight: 1,
            fontVariantNumeric: "tabular-nums"
          }}>{current}</div>
          <div style={{ fontSize: 12, color: "#5a7a6e", marginTop: 2 }}>AQI</div>
          <div className={`change-badge ${change > 0 ? "up" : "down"}`} style={{ marginTop: 6, display: "inline-block" }}>
            {change >= 0 ? "▲" : "▼"} {pct}%
          </div>
        </div>
      </div>

      {/* Stat boxes */}
      <div className="aq-stats">
        {[
          { l: "Current", v: current, c: domain.color },
          { l: "Average", v: avg, c: "#e8f4f0" },
          { l: "Peak",    v: peak,   c: "#ff4466" },
          { l: "Min",     v: minVal, c: "#00ff88" },
        ].map(s => (
          <div className="aq-stat-box" key={s.l}>
            <div className="aq-stat-label">{s.l}</div>
            <div className="aq-stat-value" style={{ color: s.c }}>{s.v}</div>
            <div className="aq-stat-unit">AQI</div>
          </div>
        ))}
        <div className="aq-stat-box">
          <div className="aq-stat-label">Status</div>
          <div className="aq-stat-value" style={{ color: status.color, fontSize: 15 }}>{status.label}</div>
          <div className="aq-stat-unit">threshold</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#5a7a6e", marginBottom: 10 }}>
          Live Feed · Last 30 Readings
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="aq-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={domain.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={domain.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis domain={[domain.min, domain.max]} hide />
            <Tooltip content={<CustomTooltip unit="AQI" />} />
            <Area type="monotone" dataKey="v" stroke={domain.color} strokeWidth={2}
              fill="url(#aq-grad)" dot={false} activeDot={{ r: 4, fill: domain.color }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insight */}
      <div className="aq-insight">
        <div className="ai-tag">✦ AI Insight</div>
        <div style={{ fontSize: 13, color: "#e8f4f0", lineHeight: 1.6 }}>{domain.insight}</div>
      </div>
    </div>
  );
}

function Dashboard({ histories, currents, onSelectDomain }) {
  const criticalDomain = DOMAINS.find(d => getStatus(d, currents[d.id]) === STATUS.bad)
    || DOMAINS.find(d => getStatus(d, currents[d.id]) === STATUS.warn)
    || DOMAINS[0];
  const status = getStatus(criticalDomain, currents[criticalDomain.id]);

  return (
    <div>
      {/* Big Prominent AI Insight Bar */}
      <div className="big-insight">
        <div className="big-insight-top">
          <div className="big-insight-tag">✦ AI Insight</div>
          <div className="big-insight-domain">{criticalDomain.icon} {criticalDomain.label} · <span style={{ color: status.color }}>{status.label}</span></div>
        </div>
        <div className="big-insight-text">{criticalDomain.insight}</div>
        <div className="big-insight-sub">AI-generated · Based on live sensor data · Updated every 2s</div>
      </div>

      <div className="overview-grid">
        {DOMAINS.map(d => {
          const v = currents[d.id];
          const status = getStatus(d, v);
          return (
            <div
              key={d.id}
              className="metric-card"
              style={{ "--card-color": d.color }}
              onClick={() => onSelectDomain(d.id)}
            >
              <div className="card-icon">{d.icon}</div>
              <div className="card-label">{d.label}</div>
              <div className="card-value">{v}</div>
              <div className="card-unit">{d.unit}</div>
              <div className="card-status" style={{ color: status.color }}>
                {status.label}
              </div>
              <MiniSparkline data={histories[d.id]} color={d.color} />
            </div>
          );
        })}
      </div>

      <div className="domain-grid-2">
        {DOMAINS.slice(0, 2).map(d => (
          <div key={d.id} className="chart-card" style={{ cursor: "pointer" }} onClick={() => onSelectDomain(d.id)}>
            <div className="chart-card-header">
              <div className="chart-card-title">{d.icon} {d.label} · Live</div>
              <div style={{ fontSize: 13, color: d.color, fontVariantNumeric: "tabular-nums", fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
                {currents[d.id]} {d.unit}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={histories[d.id].slice(-20)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`ovg-${d.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={d.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={d.color} strokeWidth={2}
                  fill={`url(#ovg-${d.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("User");
  const [active, setActive] = useState("dashboard");
  const [time, setTime] = useState(new Date());

  const [histories, setHistories] = useState(() =>
    Object.fromEntries(DOMAINS.map(d => [d.id, generateHistory(d.base, d.delta, d.min, d.max, 30)]))
  );

  const [currents, setCurrents] = useState(() =>
    Object.fromEntries(DOMAINS.map(d => [d.id, +rand(d.base - d.delta, d.base + d.delta).toFixed(1)]))
  );

  // Live update
  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(() => {
      setCurrents(prev => {
        const next = { ...prev };
        DOMAINS.forEach(d => {
          const newVal = clamp(
            +(prev[d.id] + rand(-d.delta * 0.6, d.delta * 0.6)).toFixed(1),
            d.min, d.max
          );
          next[d.id] = newVal;
        });
        return next;
      });
      setHistories(prev => {
        const next = { ...prev };
        DOMAINS.forEach(d => {
          const newEntry = { t: Date.now(), v: currents[d.id] };
          next[d.id] = [...prev[d.id].slice(-49), newEntry];
        });
        return next;
      });
      setTime(new Date());
    }, 2000);
    return () => clearInterval(interval);
  }, [loggedIn, currents]);

  const activeDomain = DOMAINS.find(d => d.id === active);

  const handleLogin = (name) => {
    setUserName(name || "User");
    setLoggedIn(true);
  };

  if (!loggedIn) return (
    <>
      <style>{styles}</style>
      <Login onLogin={handleLogin} />
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-name">GreenPulse</div>
            <div className="brand-tag">Sustainability AI</div>
          </div>

          <div className="nav-section">
            <div className="nav-label" style={{ marginBottom: 8 }}>Overview</div>
            <div
              className={`nav-item ${active === "dashboard" ? "active" : ""}`}
              onClick={() => setActive("dashboard")}
            >
              <span className="icon">◈</span> Dashboard
              <span className="badge" />
            </div>

            <div className="nav-label" style={{ margin: "20px 0 8px" }}>Domains</div>
            {DOMAINS.map(d => (
              <div
                key={d.id}
                className={`nav-item ${active === d.id ? "active" : ""} ${getBadgeClass(d, currents[d.id])}`}
                style={active === d.id ? { "--accent": d.color } : {}}
                onClick={() => setActive(d.id)}
              >
                <span className="icon">{d.icon}</span>
                {d.label}
                <span className="badge" style={active !== d.id ? { background: getBadgeClass(d, currents[d.id]) === "bad" ? "#ff4466" : getBadgeClass(d, currents[d.id]) === "warn" ? "#ffcc00" : "#00ff88" } : {}} />
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="avatar">
              <div className="avatar-circle">{userName.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 12, color: "#e8f4f0" }}>{userName.split("@")[0] || "User"}</div>
                <div style={{ fontSize: 10, color: "#5a7a6e" }}>Researcher</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">
              {active === "dashboard" ? "Overview Dashboard" : activeDomain?.label + " Monitor"}
            </div>
            <div className="topbar-right">
              <div className="live-badge">
                <div className="live-dot" />
                Live Feed
              </div>
              <div className="time-display">
                {time.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="content">
            {active === "dashboard" ? (
              <Dashboard
                histories={histories}
                currents={currents}
                onSelectDomain={setActive}
              />
            ) : activeDomain ? (
              <DetailView
                domain={activeDomain}
                history={histories[activeDomain.id]}
                current={currents[activeDomain.id]}
                onBack={() => setActive("dashboard")}
              />
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
import { useState, useEffect, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

// ─── UTILS ───────────────────────────────────────────────────────────────────
const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const STATUS = {
  good: { label: "OPTIMAL", color: "#00ff88" },
  warn: { label: "ELEVATED", color: "#ffcc00" },
  bad: { label: "CRITICAL", color: "#ff4466" },
};

// ─── DOMAIN CONFIG ────────────────────────────────────────────────────────────
const DOMAINS = [
  {
    id: "energy", icon: "⚡", label: "Energy", unit: "kWh", color: "#00ff88",
    base: 340, delta: 18, min: 200, max: 600,
    insight: "Lab Block B is drawing 23% excess — idle HVAC units detected.",
    thresholds: { good: 400, warn: 520 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Shut down idle HVAC units in Lab Block B immediately", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Switch off non-essential lighting in unused lab sections", eta: "5 min" },
      { priority: "medium", icon: "🟡", text: "Set AC thermostats to 24°C across all hostel wings", eta: "15 min" },
      { priority: "medium", icon: "🟡", text: "Enable power-saving mode on all idle lab computers", eta: "15 min" },
      { priority: "low",    icon: "🟢", text: "Schedule equipment audit for Lab Block B this week", eta: "This week" },
    ],
  },
  {
    id: "water", icon: "💧", label: "Water", unit: "L/hr", color: "#00cfff",
    base: 820, delta: 45, min: 400, max: 1400,
    insight: "Hostel wing 3 shows micro-leak signature on sensor 7.",
    thresholds: { good: 900, warn: 1100 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Dispatch maintenance team to Hostel Wing 3, Sensor 7 zone", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Isolate the affected pipe section using shutoff valve C-7", eta: "10 min" },
      { priority: "medium", icon: "🟡", text: "Notify hostel warden and restrict water usage in Wing 3", eta: "15 min" },
      { priority: "medium", icon: "🟡", text: "Cross-check flow meter readings on adjacent sensors 6 & 8", eta: "20 min" },
      { priority: "low",    icon: "🟢", text: "Log incident and schedule full pipe inspection for the wing", eta: "Tomorrow" },
    ],
  },
  {
    id: "airquality", icon: "🌿", label: "Air Quality", unit: "AQI", color: "#a8ff78",
    base: 62, delta: 8, min: 20, max: 180,
    insight: "AQI trending up — wind from construction zone. Alert issued.",
    thresholds: { good: 80, warn: 130 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Close all windows and vents on the construction-facing side", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Activate indoor air purifiers in classrooms and common areas", eta: "5 min" },
      { priority: "medium", icon: "🟡", text: "Send advisory to students to avoid outdoor activities", eta: "10 min" },
      { priority: "medium", icon: "🟡", text: "Switch HVAC systems to recirculation mode", eta: "10 min" },
      { priority: "low",    icon: "🟢", text: "Contact construction team to enforce dust suppression measures", eta: "1 hour" },
    ],
  },
  {
    id: "carbon", icon: "☁️", label: "Carbon", unit: "kg CO₂", color: "#ff9f43",
    base: 142, delta: 12, min: 60, max: 280,
    insight: "Carbon output 18% below monthly avg. Solar panels performing well.",
    thresholds: { good: 160, warn: 220 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Reduce diesel generator runtime — switch to grid + solar", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Halt non-essential high-emission campus transport", eta: "15 min" },
      { priority: "medium", icon: "🟡", text: "Shift peak-hour energy loads to solar production window", eta: "30 min" },
      { priority: "medium", icon: "🟡", text: "Enable carbon offset logging for today's excess output", eta: "1 hour" },
      { priority: "low",    icon: "🟢", text: "Review and optimize monthly carbon budget allocation", eta: "This week" },
    ],
  },
  {
    id: "waste", icon: "♻️", label: "Waste", unit: "kg/day", color: "#f368e0",
    base: 94, delta: 10, min: 30, max: 200,
    insight: "E-waste bin at 87% capacity. Collection needed within 12 hrs.",
    thresholds: { good: 100, warn: 150 },
    actions: [
      { priority: "high",   icon: "🔴", text: "Schedule emergency e-waste pickup within 12 hours", eta: "Now" },
      { priority: "high",   icon: "🔴", text: "Seal and label overflow e-waste in designated holding area", eta: "10 min" },
      { priority: "medium", icon: "🟡", text: "Notify department heads to pause non-urgent disposal", eta: "20 min" },
      { priority: "medium", icon: "🟡", text: "Redirect general waste to secondary bins in Block A & C", eta: "30 min" },
      { priority: "low",    icon: "🟢", text: "Review waste collection frequency — consider bi-weekly schedule", eta: "This week" },
    ],
  },
];

const generateHistory = (base, delta, min, max, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    v: clamp(base + rand(-delta * 2, delta * 2), min, max),
  }));

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #070a0f;
    --surface: rgba(255,255,255,0.035);
    --border: rgba(255,255,255,0.08);
    --text: #e8f4f0;
    --muted: #5a7a6e;
    --accent: #00ff88;
    --accent2: #00cfff;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'Space Mono', monospace;
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-mono);
    overflow: hidden;
  }

  /* ─── LOGIN ─── */
  .login-wrap {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,255,136,0.08) 0%, transparent 70%),
                radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0,207,255,0.06) 0%, transparent 60%),
                var(--bg);
    position: relative;
    overflow: hidden;
  }

  .login-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
  }

  .login-card {
    position: relative;
    width: 420px;
    padding: 48px 40px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(0,255,136,0.2);
    border-radius: 16px;
    backdrop-filter: blur(20px);
    box-shadow: 0 0 80px rgba(0,255,136,0.08), 0 0 0 1px rgba(255,255,255,0.04) inset;
    animation: fadeUp 0.6s ease both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-logo {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 28px;
    color: var(--accent);
    letter-spacing: -1px;
    margin-bottom: 4px;
  }

  .login-sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 36px;
  }

  .login-label {
    display: block;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .login-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 14px;
    margin-bottom: 20px;
    outline: none;
    transition: border-color 0.2s;
  }

  .login-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0,255,136,0.1);
  }

  .login-btn {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: #070a0f;
    border: none;
    border-radius: 8px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 4px;
  }

  .login-btn:hover { background: #00e87a; transform: translateY(-1px); box-shadow: 0 8px 30px rgba(0,255,136,0.3); }
  .login-btn:active { transform: translateY(0); }

  .login-hint {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    margin-top: 20px;
  }

  /* ─── APP SHELL ─── */
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ─── SIDEBAR ─── */
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.02);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 28px 0;
    position: relative;
  }

  .sidebar::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(0,255,136,0.3), transparent);
  }

  .sidebar-brand {
    padding: 0 24px 28px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }

  .brand-name {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 20px;
    color: var(--accent);
    letter-spacing: -0.5px;
  }

  .brand-tag {
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 2px;
  }

  .nav-section {
    padding: 0 12px;
    flex: 1;
  }

  .nav-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    padding: 0 12px;
    margin-bottom: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 2px;
    font-size: 13px;
    color: var(--muted);
    border: 1px solid transparent;
    position: relative;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.04);
    color: var(--text);
  }

  .nav-item.active {
    background: rgba(0,255,136,0.08);
    border-color: rgba(0,255,136,0.2);
    color: var(--accent);
  }

  .nav-item .icon { font-size: 16px; }
  .nav-item .badge {
    margin-left: auto;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .nav-item.warn .badge { background: #ffcc00; }
  .nav-item.bad .badge  { background: #ff4466; }

  .sidebar-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
  }

  .avatar {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar-circle {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: #070a0f;
    font-family: var(--font-display);
  }

  /* ─── MAIN ─── */
  .main {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse 60% 50% at 70% 20%, rgba(0,255,136,0.04) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 20% 80%, rgba(0,207,255,0.03) 0%, transparent 60%),
      var(--bg);
  }

  .main::-webkit-scrollbar { width: 4px; }
  .main::-webkit-scrollbar-track { background: transparent; }
  .main::-webkit-scrollbar-thumb { background: rgba(0,255,136,0.2); border-radius: 4px; }

  /* ─── TOPBAR ─── */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: rgba(7,10,15,0.9);
    backdrop-filter: blur(10px);
    z-index: 10;
  }

  .topbar-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.5px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .live-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
  }

  .live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.2s infinite;
  }

  .time-display {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  /* ─── CONTENT ─── */
  .content {
    padding: 28px 32px;
    flex: 1;
  }

  /* ─── DASHBOARD ─── */
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .metric-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 16px;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--card-color, var(--accent));
    opacity: 0.7;
  }

  .metric-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: var(--card-color, var(--accent));
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }

  .card-icon { font-size: 18px; margin-bottom: 12px; }

  .card-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .card-value {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 800;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    margin-bottom: 4px;
  }

  .card-unit {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .card-status {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 700;
  }

  .mini-chart {
    margin-top: 12px;
    opacity: 0.8;
  }



  /* ─── DETAIL VIEW ─── */
  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
  }

  .detail-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 4px;
  }

  .detail-sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .stat-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 18px;
  }

  .stat-box-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .stat-box-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .stat-box-sub {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
  }

  .chart-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .chart-card-title {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .change-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 20px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .change-badge.up { background: rgba(255,68,102,0.15); color: #ff4466; }
  .change-badge.down { background: rgba(0,255,136,0.15); color: var(--accent); }
  .change-badge.neutral { background: rgba(255,204,0,0.15); color: #ffcc00; }

  .ai-insight-card {
    background: linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,207,255,0.04));
    border: 1px solid rgba(0,255,136,0.2);
    border-radius: 12px;
    padding: 20px 24px;
  }

  /* ─── ACTIONS SECTION ─── */
  .actions-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }

  .actions-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    background: rgba(255,255,255,0.02);
  }

  .actions-title {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: -0.3px;
  }

  .actions-sub {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .actions-list {
    padding: 8px 0;
  }

  .action-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.2s;
    gap: 16px;
  }

  .action-item:last-child { border-bottom: none; }

  .action-item:hover { background: rgba(255,255,255,0.03); }

  .action-item.action-high { border-left: 3px solid #ff4466; }
  .action-item.action-medium { border-left: 3px solid #ffcc00; }
  .action-item.action-low { border-left: 3px solid #00ff88; }

  .action-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  }

  .action-index {
    font-size: 11px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    width: 20px;
  }

  .action-icon { font-size: 18px; flex-shrink: 0; }

  .action-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.4;
  }

  .action-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    flex-shrink: 0;
  }

  .action-eta {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .eta-high   { color: #ff4466; }
  .eta-medium { color: #ffcc00; }
  .eta-low    { color: #00ff88; }

  .action-priority-badge {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 700;
  }

  .badge-high   { background: rgba(255,68,102,0.15);  color: #ff4466; }
  .badge-medium { background: rgba(255,204,0,0.15);   color: #ffcc00; }
  .badge-low    { background: rgba(0,255,136,0.12);   color: #00ff88; }

  .ai-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--accent);
    background: rgba(0,255,136,0.1);
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 12px;
  }

  .ai-insight-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    margin-bottom: 24px;
    transition: color 0.2s;
  }

  .back-btn:hover { color: var(--text); }

  .tooltip-custom {
    background: rgba(7,10,15,0.95) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 8px !important;
    font-family: var(--font-mono) !important;
    font-size: 12px !important;
  }

  .domain-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 28px;
  }

  /* ─── AIR QUALITY PANEL ─── */
  .aq-panel {
    background: rgba(168,255,120,0.04);
    border: 1px solid rgba(168,255,120,0.2);
    border-radius: 14px;
    padding: 22px 24px;
    margin-bottom: 24px;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }

  .aq-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #a8ff78, transparent);
  }

  .aq-panel:hover {
    background: rgba(168,255,120,0.07);
    border-color: rgba(168,255,120,0.35);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(168,255,120,0.08);
  }

  .aq-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .aq-panel-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    color: #a8ff78;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .aq-panel-sub {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .aq-stats {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .aq-stat-box {
    flex: 1;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .aq-stat-label {
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .aq-stat-value {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    margin-bottom: 2px;
  }

  .aq-stat-unit {
    font-size: 10px;
    color: var(--muted);
  }

  .aq-insight {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(168,255,120,0.1);
    border-radius: 8px;
    padding: 14px 16px;
  }

  /* ─── PROMINENT INSIGHT BAR ─── */
  .big-insight {
    background: linear-gradient(120deg, rgba(0,255,136,0.09) 0%, rgba(0,207,255,0.05) 100%);
    border: 1px solid rgba(0,255,136,0.25);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
    cursor: default;
  }

  .big-insight::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ff88, #00cfff, transparent);
  }

  .big-insight::after {
    content: '✦';
    position: absolute;
    right: 32px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 80px;
    color: rgba(0,255,136,0.06);
    pointer-events: none;
    font-family: sans-serif;
  }

  .big-insight-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .big-insight-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #070a0f;
    background: var(--accent);
    padding: 5px 14px;
    border-radius: 20px;
    font-weight: 700;
  }

  .big-insight-domain {
    font-size: 10px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .big-insight-text {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    max-width: 85%;
  }

  .big-insight-sub {
    margin-top: 12px;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1px;
  }
`;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function getStatus(d, v) {
  if (v <= d.thresholds.good) return STATUS.good;
  if (v <= d.thresholds.warn) return STATUS.warn;
  return STATUS.bad;
}

function getBadgeClass(domain, v) {
  if (v <= domain.thresholds.good) return "";
  if (v <= domain.thresholds.warn) return "warn";
  return "bad";
}

function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div className="login-wrap">
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">GreenPulse</div>
        <div className="login-sub">Sustainability Intelligence Platform</div>
        <label className="login-label">Email Address</label>
        <input
          className="login-input"
          type="email"
          placeholder="you@campus.edu"
          value={user}
          onChange={e => setUser(e.target.value)}
        />
        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          placeholder="••••••••"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onLogin(user)}
        />
        <button className="login-btn" onClick={() => onLogin(user || "User")}>
          Access Dashboard
        </button>
        <div className="login-hint">AMD Slingshot · Sustainable AI & Green Tech</div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-custom" style={{ padding: "8px 12px" }}>
      <span style={{ color: "#e8f4f0" }}>{payload[0].value} {unit}</span>
    </div>
  );
}

function MiniSparkline({ data, color }) {
  return (
    <div className="mini-chart">
      <ResponsiveContainer width="100%" height={36}>
        <AreaChart data={data.slice(-10)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#sg-${color.replace("#","")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DetailView({ domain, history, current, onBack }) {
  const status = getStatus(domain, current);
  const prev = history.at(-2)?.v ?? current;
  const change = current - prev;
  const pct = ((Math.abs(change) / (prev || 1)) * 100).toFixed(1);
  const min = Math.min(...history.map(h => h.v)).toFixed(1);
  const max = Math.max(...history.map(h => h.v)).toFixed(1);
  const avg = (history.reduce((a, h) => a + h.v, 0) / history.length).toFixed(1);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Overview</button>
      <div className="detail-header">
        <div>
          <div className="detail-title" style={{ color: domain.color }}>
            {domain.icon} {domain.label}
          </div>
          <div className="detail-sub">Real-time monitoring · Updates every 2s</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 48,
            fontWeight: 800,
            color: domain.color,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {current}
          </div>
          <div style={{ fontSize: 14, color: "#5a7a6e", marginTop: 4 }}>{domain.unit}</div>
          <div className={`change-badge ${change > 0 ? "up" : change < 0 ? "down" : "neutral"}`}
            style={{ marginTop: 8, display: "inline-block" }}>
            {change >= 0 ? "▲" : "▼"} {pct}%
          </div>
        </div>
      </div>

      <div className="stat-row">
        {[
          { l: "Current", v: current, u: domain.unit, c: domain.color },
          { l: "Average", v: avg, u: domain.unit, c: "#e8f4f0" },
          { l: "Peak", v: max, u: domain.unit, c: "#ff4466" },
          { l: "Minimum", v: min, u: domain.unit, c: "#00ff88" },
        ].map(s => (
          <div className="stat-box" key={s.l}>
            <div className="stat-box-label">{s.l}</div>
            <div className="stat-box-value" style={{ color: s.c }}>{s.v}</div>
            <div className="stat-box-sub">{s.u}</div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">Live Feed · Last 30 Readings</div>
          <div className="live-badge">
            <div className="live-dot" />
            STREAMING
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="detail-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={domain.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={domain.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis domain={[domain.min, domain.max]} hide />
            <Tooltip content={<CustomTooltip unit={domain.unit} />} />
            <Area type="monotone" dataKey="v" stroke={domain.color} strokeWidth={2}
              fill="url(#detail-grad)" dot={false} activeDot={{ r: 4, fill: domain.color }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="ai-insight-card" style={{ marginBottom: 20 }}>
        <div className="ai-tag">✦ AI Insight</div>
        <div className="ai-insight-text">{domain.insight}</div>
      </div>

      {/* Immediate Actions */}
      <div className="actions-section">
        <div className="actions-header">
          <div className="actions-title">⚡ Immediate Actions Required</div>
          <div className="actions-sub">AI-recommended steps · Prioritized by urgency</div>
        </div>
        <div className="actions-list">
          {domain.actions.map((action, i) => (
            <div key={i} className={`action-item action-${action.priority}`}>
              <div className="action-left">
                <div className="action-index">{String(i + 1).padStart(2, "0")}</div>
                <div className="action-icon">{action.icon}</div>
                <div className="action-text">{action.text}</div>
              </div>
              <div className="action-right">
                <div className={`action-eta eta-${action.priority}`}>{action.eta}</div>
                <div className={`action-priority-badge badge-${action.priority}`}>
                  {action.priority === "high" ? "URGENT" : action.priority === "medium" ? "SOON" : "PLANNED"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AirQualityPanel({ history, current, onSelect }) {
  const domain = DOMAINS.find(d => d.id === "airquality");
  const status = getStatus(domain, current);
  const prev = history.at(-2)?.v ?? current;
  const change = (current - prev).toFixed(1);
  const avg = (history.reduce((a, h) => a + h.v, 0) / history.length).toFixed(1);
  const peak = Math.max(...history.map(h => h.v)).toFixed(1);
  const minVal = Math.min(...history.map(h => h.v)).toFixed(1);
  const pct = ((Math.abs(change) / (prev || 1)) * 100).toFixed(1);

  return (
    <div className="aq-panel" onClick={() => onSelect("airquality")} title="Click to open full view">
      {/* Header */}
      <div className="aq-panel-header">
        <div>
          <div className="aq-panel-title">🌿 Air Quality Monitor</div>
          <div className="aq-panel-sub">Live · Updates every 2s · Click for full view</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 42, color: domain.color, lineHeight: 1,
            fontVariantNumeric: "tabular-nums"
          }}>{current}</div>
          <div style={{ fontSize: 12, color: "#5a7a6e", marginTop: 2 }}>AQI</div>
          <div className={`change-badge ${change > 0 ? "up" : "down"}`} style={{ marginTop: 6, display: "inline-block" }}>
            {change >= 0 ? "▲" : "▼"} {pct}%
          </div>
        </div>
      </div>

      {/* Stat boxes */}
      <div className="aq-stats">
        {[
          { l: "Current", v: current, c: domain.color },
          { l: "Average", v: avg, c: "#e8f4f0" },
          { l: "Peak",    v: peak,   c: "#ff4466" },
          { l: "Min",     v: minVal, c: "#00ff88" },
        ].map(s => (
          <div className="aq-stat-box" key={s.l}>
            <div className="aq-stat-label">{s.l}</div>
            <div className="aq-stat-value" style={{ color: s.c }}>{s.v}</div>
            <div className="aq-stat-unit">AQI</div>
          </div>
        ))}
        <div className="aq-stat-box">
          <div className="aq-stat-label">Status</div>
          <div className="aq-stat-value" style={{ color: status.color, fontSize: 15 }}>{status.label}</div>
          <div className="aq-stat-unit">threshold</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#5a7a6e", marginBottom: 10 }}>
          Live Feed · Last 30 Readings
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="aq-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={domain.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={domain.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis domain={[domain.min, domain.max]} hide />
            <Tooltip content={<CustomTooltip unit="AQI" />} />
            <Area type="monotone" dataKey="v" stroke={domain.color} strokeWidth={2}
              fill="url(#aq-grad)" dot={false} activeDot={{ r: 4, fill: domain.color }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insight */}
      <div className="aq-insight">
        <div className="ai-tag">✦ AI Insight</div>
        <div style={{ fontSize: 13, color: "#e8f4f0", lineHeight: 1.6 }}>{domain.insight}</div>
      </div>
    </div>
  );
}

function Dashboard({ histories, currents, onSelectDomain }) {
  const criticalDomain = DOMAINS.find(d => getStatus(d, currents[d.id]) === STATUS.bad)
    || DOMAINS.find(d => getStatus(d, currents[d.id]) === STATUS.warn)
    || DOMAINS[0];
  const status = getStatus(criticalDomain, currents[criticalDomain.id]);

  return (
    <div>
      {/* Big Prominent AI Insight Bar */}
      <div className="big-insight">
        <div className="big-insight-top">
          <div className="big-insight-tag">✦ AI Insight</div>
          <div className="big-insight-domain">{criticalDomain.icon} {criticalDomain.label} · <span style={{ color: status.color }}>{status.label}</span></div>
        </div>
        <div className="big-insight-text">{criticalDomain.insight}</div>
        <div className="big-insight-sub">AI-generated · Based on live sensor data · Updated every 2s</div>
      </div>

      <div className="overview-grid">
        {DOMAINS.map(d => {
          const v = currents[d.id];
          const status = getStatus(d, v);
          return (
            <div
              key={d.id}
              className="metric-card"
              style={{ "--card-color": d.color }}
              onClick={() => onSelectDomain(d.id)}
            >
              <div className="card-icon">{d.icon}</div>
              <div className="card-label">{d.label}</div>
              <div className="card-value">{v}</div>
              <div className="card-unit">{d.unit}</div>
              <div className="card-status" style={{ color: status.color }}>
                {status.label}
              </div>
              <MiniSparkline data={histories[d.id]} color={d.color} />
            </div>
          );
        })}
      </div>

      <div className="domain-grid-2">
        {DOMAINS.slice(0, 2).map(d => (
          <div key={d.id} className="chart-card" style={{ cursor: "pointer" }} onClick={() => onSelectDomain(d.id)}>
            <div className="chart-card-header">
              <div className="chart-card-title">{d.icon} {d.label} · Live</div>
              <div style={{ fontSize: 13, color: d.color, fontVariantNumeric: "tabular-nums", fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
                {currents[d.id]} {d.unit}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={histories[d.id].slice(-20)} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`ovg-${d.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={d.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={d.color} strokeWidth={2}
                  fill={`url(#ovg-${d.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("User");
  const [active, setActive] = useState("dashboard");
  const [time, setTime] = useState(new Date());

  const [histories, setHistories] = useState(() =>
    Object.fromEntries(DOMAINS.map(d => [d.id, generateHistory(d.base, d.delta, d.min, d.max, 30)]))
  );

  const [currents, setCurrents] = useState(() =>
    Object.fromEntries(DOMAINS.map(d => [d.id, +rand(d.base - d.delta, d.base + d.delta).toFixed(1)]))
  );

  // Live update
  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(() => {
      setCurrents(prev => {
        const next = { ...prev };
        DOMAINS.forEach(d => {
          const newVal = clamp(
            +(prev[d.id] + rand(-d.delta * 0.6, d.delta * 0.6)).toFixed(1),
            d.min, d.max
          );
          next[d.id] = newVal;
        });
        return next;
      });
      setHistories(prev => {
        const next = { ...prev };
        DOMAINS.forEach(d => {
          const newEntry = { t: Date.now(), v: currents[d.id] };
          next[d.id] = [...prev[d.id].slice(-49), newEntry];
        });
        return next;
      });
      setTime(new Date());
    }, 2000);
    return () => clearInterval(interval);
  }, [loggedIn, currents]);

  const activeDomain = DOMAINS.find(d => d.id === active);

  const handleLogin = (name) => {
    setUserName(name || "User");
    setLoggedIn(true);
  };

  if (!loggedIn) return (
    <>
      <style>{styles}</style>
      <Login onLogin={handleLogin} />
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-name">GreenPulse</div>
            <div className="brand-tag">Sustainability AI</div>
          </div>

          <div className="nav-section">
            <div className="nav-label" style={{ marginBottom: 8 }}>Overview</div>
            <div
              className={`nav-item ${active === "dashboard" ? "active" : ""}`}
              onClick={() => setActive("dashboard")}
            >
              <span className="icon">◈</span> Dashboard
              <span className="badge" />
            </div>

            <div className="nav-label" style={{ margin: "20px 0 8px" }}>Domains</div>
            {DOMAINS.map(d => (
              <div
                key={d.id}
                className={`nav-item ${active === d.id ? "active" : ""} ${getBadgeClass(d, currents[d.id])}`}
                style={active === d.id ? { "--accent": d.color } : {}}
                onClick={() => setActive(d.id)}
              >
                <span className="icon">{d.icon}</span>
                {d.label}
                <span className="badge" style={active !== d.id ? { background: getBadgeClass(d, currents[d.id]) === "bad" ? "#ff4466" : getBadgeClass(d, currents[d.id]) === "warn" ? "#ffcc00" : "#00ff88" } : {}} />
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="avatar">
              <div className="avatar-circle">{userName.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 12, color: "#e8f4f0" }}>{userName.split("@")[0] || "User"}</div>
                <div style={{ fontSize: 10, color: "#5a7a6e" }}>Researcher</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">
              {active === "dashboard" ? "Overview Dashboard" : activeDomain?.label + " Monitor"}
            </div>
            <div className="topbar-right">
              <div className="live-badge">
                <div className="live-dot" />
                Live Feed
              </div>
              <div className="time-display">
                {time.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="content">
            {active === "dashboard" ? (
              <Dashboard
                histories={histories}
                currents={currents}
                onSelectDomain={setActive}
              />
            ) : activeDomain ? (
              <DetailView
                domain={activeDomain}
                history={histories[activeDomain.id]}
                current={currents[activeDomain.id]}
                onBack={() => setActive("dashboard")}
              />
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
