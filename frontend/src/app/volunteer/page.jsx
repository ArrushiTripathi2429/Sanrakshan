"use client";

import { useState } from "react";

const mockTasks = [
  {
    id: 1,
    title: "Flood Relief — Food Distribution",
    location: "Dalmau Block, Raebareli",
    category: "flood",
    severity: 5,
    affected: "200",
    description: "Distribute food packets and drinking water to flood-affected families near the main road. Coordinate with local panchayat for household list.",
    assignedAt: "2h ago",
    status: "active",
    distance: "3.2 km",
    adminNote: "Please reach by 10 AM. Contact Ramesh on arrival.",
  },
  {
    id: 2,
    title: "Medical Camp Assistance",
    location: "Salon Village, Raebareli",
    category: "medical",
    severity: 3,
    affected: "85",
    description: "Assist the medical team in registering patients and managing the queue at the temporary medical camp.",
    assignedAt: "5h ago",
    status: "active",
    distance: "7.8 km",
    adminNote: "Bring your volunteer ID card.",
  },
  {
    id: 3,
    title: "Road Debris Clearing",
    location: "Harchandpur, Raebareli",
    category: "road",
    severity: 2,
    affected: "40",
    description: "Help clear debris blocking the main road connecting two villages after last night's storm.",
    assignedAt: "1d ago",
    status: "completed",
    distance: "12.1 km",
    adminNote: "",
  },
];

const categoryColor = {
  flood: "#67e8f9",
  medical: "#f87171",
  road: "#fbbf24",
  food: "#86efac",
  education: "#c084fc",
  other: "#94a3b8",
};

const categoryLabel = {
  flood: "🌊 Flood",
  medical: "🏥 Medical",
  road: "🛣️ Road",
  food: "🌾 Food",
  education: "📚 Education",
  other: "📋 Other",
};

const severityLabel = ["", "Low", "Low-Med", "Medium", "High", "Critical"];
const severityColor = ["", "#86efac", "#a3e635", "#fbbf24", "#fb923c", "#f87171"];

export default function VolunteerPage() {
  const [tasks, setTasks] = useState(mockTasks);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("active"); // "active" | "completed" | "all"
  const [completing, setCompleting] = useState(false);
  const [available, setAvailable] = useState(true);

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleComplete = (id) => {
    setCompleting(true);
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t))
      );
      setSelected(null);
      setCompleting(false);
    }, 1400);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          background: #09100b;
          color: #e2ede4;
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
        }

        .vl-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 220px 1fr;
        }

        /* SIDEBAR */
        .vl-sidebar {
          background: rgba(255,255,255,0.015);
          border-right: 1px solid rgba(251,191,36,0.07);
          padding: 28px 16px;
          display: flex; flex-direction: column; gap: 4px;
          position: sticky; top: 0; height: 100vh;
        }

        .vl-logo {
          font-family: 'Fraunces', serif;
          font-weight: 600; font-size: 1.05rem;
          color: #fbbf24; margin-bottom: 32px; padding: 0 8px;
          letter-spacing: 0.02em;
        }
        .vl-logo span { opacity: 0.3; color: #e2ede4; font-weight: 300; }

        .vl-nav {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px;
          font-size: 0.83rem; color: rgba(226,237,228,0.38);
          cursor: pointer; transition: all 0.2s;
          border: none; background: none; width: 100%;
          text-align: left; font-family: 'Outfit', sans-serif;
          font-weight: 400;
        }
        .vl-nav:hover { color: #e2ede4; background: rgba(255,255,255,0.04); }
        .vl-nav.active { color: #fbbf24; background: rgba(251,191,36,0.08); }

        .vl-sidebar-footer {
          margin-top: auto; padding-top: 16px;
          border-top: 1px solid rgba(251,191,36,0.07);
        }

        .vl-user { display: flex; align-items: center; gap: 10px; padding: 8px; }
        .vl-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 600; color: #09100b; flex-shrink: 0;
        }
        .vl-user-name { font-size: 0.8rem; font-weight: 500; color: #e2ede4; }
        .vl-user-role { font-size: 0.63rem; color: rgba(226,237,228,0.28); text-transform: uppercase; letter-spacing: 0.08em; }

        /* AVAILABILITY TOGGLE */
        .vl-avail {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px; margin-top: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
        }
        .vl-avail-label { font-size: 0.72rem; color: rgba(226,237,228,0.35); letter-spacing: 0.06em; text-transform: uppercase; }
        .vl-toggle {
          width: 36px; height: 20px; border-radius: 100px;
          border: none; cursor: pointer; position: relative;
          transition: background 0.25s ease;
          background: ${"`"}${"`"}${"`"};
          flex-shrink: 0;
        }
        .vl-toggle::after {
          content: ''; position: absolute;
          top: 3px; width: 14px; height: 14px;
          border-radius: 50%; background: white;
          transition: left 0.25s ease;
        }

        /* MAIN */
        .vl-main { padding: 36px 40px; overflow-y: auto; }

        .vl-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 32px;
          opacity: 0; animation: vlUp 0.5s ease 0.1s forwards;
        }

        .vl-greeting { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(226,237,228,0.25); margin-bottom: 5px; }
        .vl-title { font-family: 'Fraunces', serif; font-weight: 400; font-size: 1.7rem; letter-spacing: -0.01em; color: #f0f7f1; }
        .vl-title em { font-style: italic; color: #fbbf24; }

        /* STATS ROW */
        .vl-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 28px;
          opacity: 0; animation: vlUp 0.5s ease 0.15s forwards;
        }

        .vl-stat {
          padding: 18px 20px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
        }

        .vl-stat-num {
          font-family: 'Fraunces', serif; font-weight: 400;
          font-size: 2rem; line-height: 1; margin-bottom: 4px;
        }

        .vl-stat-label {
          font-size: 0.68rem; text-transform: uppercase;
          letter-spacing: 0.1em; color: rgba(226,237,228,0.3);
        }

        /* FILTER TABS */
        .vl-tabs {
          display: flex; gap: 2px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 4px;
          margin-bottom: 20px; width: fit-content;
          opacity: 0; animation: vlUp 0.5s ease 0.2s forwards;
        }

        .vl-tab {
          padding: 7px 18px; border-radius: 7px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 0.78rem;
          font-weight: 400; letter-spacing: 0.04em; cursor: pointer;
          transition: all 0.2s; color: rgba(226,237,228,0.38);
          background: none;
        }
        .vl-tab.active { background: rgba(251,191,36,0.12); color: #fbbf24; }
        .vl-tab:hover:not(.active) { color: #e2ede4; }

        /* TASK LIST */
        .vl-tasks {
          display: flex; flex-direction: column; gap: 10px;
          opacity: 0; animation: vlUp 0.5s ease 0.25s forwards;
        }

        .vl-task {
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 20px 22px;
          cursor: pointer; transition: all 0.22s ease;
          background: rgba(255,255,255,0.015);
          position: relative; overflow: hidden;
        }

        .vl-task::before {
          content: ''; position: absolute;
          left: 0; top: 0; bottom: 0; width: 3px;
          border-radius: 3px 0 0 3px;
          opacity: 0; transition: opacity 0.2s;
        }

        .vl-task:hover { border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.03); }
        .vl-task:hover::before { opacity: 1; background: #fbbf24; }
        .vl-task.selected { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.05); }
        .vl-task.selected::before { opacity: 1; background: #fbbf24; }
        .vl-task.done { opacity: 0.5; }
        .vl-task.done:hover { opacity: 0.7; }

        .vl-task-top {
          display: flex; justify-content: space-between;
          align-items: flex-start; margin-bottom: 10px;
        }

        .vl-task-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }

        .vl-cat-badge {
          font-size: 0.63rem; padding: 3px 9px; border-radius: 3px;
          text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500;
        }

        .vl-sev-badge {
          font-size: 0.63rem; padding: 3px 9px; border-radius: 3px;
          text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500;
          border: 1px solid;
        }

        .vl-task-title {
          font-family: 'Fraunces', serif; font-weight: 400;
          font-size: 1.05rem; color: #f0f7f1; margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .vl-task-loc {
          font-size: 0.78rem; color: rgba(226,237,228,0.38);
          display: flex; align-items: center; gap: 5px;
        }

        .vl-task-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }

        .vl-dist {
          font-size: 0.72rem; color: rgba(226,237,228,0.28);
          font-family: 'Fraunces', serif; font-style: italic;
        }

        .vl-time { font-size: 0.68rem; color: rgba(226,237,228,0.22); }

        .vl-done-badge {
          font-size: 0.62rem; padding: 3px 9px; border-radius: 3px;
          background: rgba(134,239,172,0.08); border: 1px solid rgba(134,239,172,0.2);
          color: #86efac; text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* DETAIL PANEL */
        .vl-detail {
          margin-top: 10px; padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.06);
          opacity: 0; animation: vlUp 0.3s ease forwards;
        }

        .vl-detail-desc {
          font-size: 0.85rem; font-weight: 300; line-height: 1.7;
          color: rgba(226,237,228,0.5); margin-bottom: 16px;
        }

        .vl-admin-note {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 12px 14px;
          background: rgba(251,191,36,0.05);
          border: 1px solid rgba(251,191,36,0.12);
          border-radius: 8px; margin-bottom: 18px;
        }

        .vl-note-icon { font-size: 0.85rem; flex-shrink: 0; margin-top: 1px; }
        .vl-note-text { font-size: 0.8rem; color: rgba(251,191,36,0.7); font-weight: 300; line-height: 1.5; }

        .vl-detail-actions { display: flex; gap: 10px; }

        .vl-btn-primary {
          flex: 1; padding: 11px; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          font-family: 'Outfit', sans-serif; font-weight: 500;
          font-size: 0.82rem; letter-spacing: 0.06em; text-transform: uppercase;
          color: #09100b; cursor: pointer; transition: opacity 0.2s, transform 0.2s;
        }
        .vl-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .vl-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .vl-btn-secondary {
          padding: 11px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
          background: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem;
          color: rgba(226,237,228,0.4); cursor: pointer; transition: all 0.2s;
          letter-spacing: 0.04em;
        }
        .vl-btn-secondary:hover { color: #e2ede4; border-color: rgba(255,255,255,0.18); }

        /* COMPLETING ANIMATION */
        .vl-completing {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 16px 0;
        }
        .vl-spinner {
          width: 28px; height: 28px;
          border: 2px solid rgba(251,191,36,0.12);
          border-top-color: #fbbf24; border-radius: 50%;
          animation: vlSpin 0.7s linear infinite;
        }
        .vl-comp-text { font-size: 0.8rem; color: rgba(226,237,228,0.38); }

        /* EMPTY */
        .vl-empty {
          padding: 48px; text-align: center;
          border: 1px dashed rgba(255,255,255,0.06); border-radius: 14px;
        }
        .vl-empty-icon { font-size: 2rem; margin-bottom: 12px; opacity: 0.4; }
        .vl-empty-text { font-size: 0.82rem; color: rgba(226,237,228,0.22); line-height: 1.6; }

        @media (max-width: 768px) {
          .vl-wrap { grid-template-columns: 1fr; }
          .vl-sidebar { display: none; }
          .vl-main { padding: 20px 16px; }
          .vl-stats { grid-template-columns: repeat(3, 1fr); }
        }

        @keyframes vlUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vlSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="vl-wrap">

        {/* SIDEBAR */}
        <aside className="vl-sidebar">
          <div className="vl-logo">Sanrakshan<span>.</span></div>

          <button className="vl-nav active"><span>△</span> Dashboard</button>
          <button className="vl-nav"><span>◉</span> My Tasks</button>
          <button className="vl-nav"><span>✓</span> Completed</button>
          <button className="vl-nav"><span>◷</span> History</button>

          {/* Availability toggle */}
          <div className="vl-avail" style={{ marginTop: "12px" }}>
            <span className="vl-avail-label">Available</span>
            <button
              className="vl-toggle"
              style={{
                background: available ? "rgba(134,239,172,0.4)" : "rgba(255,255,255,0.08)",
              }}
              onClick={() => setAvailable((v) => !v)}
            >
              <span style={{
                position: "absolute", top: 3,
                left: available ? 19 : 3,
                width: 14, height: 14, borderRadius: "50%",
                background: "white", transition: "left 0.25s ease",
              }} />
            </button>
          </div>

          <div className="vl-sidebar-footer">
            <div className="vl-user">
              <div className="vl-avatar">SS</div>
              <div>
                <div className="vl-user-name">Suresh Singh</div>
                <div className="vl-user-role">Volunteer</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="vl-main">

          {/* HEADER */}
          <div className="vl-header">
            <div>
              <div className="vl-greeting">Volunteer Dashboard</div>
              <div className="vl-title">Your <em>Tasks</em></div>
            </div>
            <div style={{
              fontSize: "0.72rem", padding: "6px 14px",
              borderRadius: "6px", border: `1px solid ${available ? "rgba(134,239,172,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: available ? "#86efac" : "rgba(226,237,228,0.3)",
              background: available ? "rgba(134,239,172,0.06)" : "transparent",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {available ? "● Available" : "○ Unavailable"}
            </div>
          </div>

          {/* STATS */}
          <div className="vl-stats">
            <div className="vl-stat">
              <div className="vl-stat-num" style={{ color: "#fbbf24" }}>{activeCount}</div>
              <div className="vl-stat-label">Active Tasks</div>
            </div>
            <div className="vl-stat">
              <div className="vl-stat-num" style={{ color: "#86efac" }}>{completedCount}</div>
              <div className="vl-stat-label">Completed</div>
            </div>
            <div className="vl-stat">
              <div className="vl-stat-num" style={{ color: "#67e8f9" }}>{tasks.length}</div>
              <div className="vl-stat-label">Total Assigned</div>
            </div>
          </div>

          {/* TABS */}
          <div className="vl-tabs">
            {["active", "completed", "all"].map((f) => (
              <button
                key={f}
                className={`vl-tab ${filter === f ? "active" : ""}`}
                onClick={() => { setFilter(f); setSelected(null); }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* TASK LIST */}
          <div className="vl-tasks">
            {filtered.length === 0 ? (
              <div className="vl-empty">
                <div className="vl-empty-icon">📋</div>
                <div className="vl-empty-text">
                  No {filter === "all" ? "" : filter} tasks right now.<br />
                  Admin will assign tasks based on your location and skills.
                </div>
              </div>
            ) : (
              filtered.map((task) => (
                <div
                  key={task.id}
                  className={`vl-task ${selected === task.id ? "selected" : ""} ${task.status === "completed" ? "done" : ""}`}
                  onClick={() => setSelected(selected === task.id ? null : task.id)}
                >
                  <div className="vl-task-top">
                    <div style={{ flex: 1 }}>
                      <div className="vl-task-meta">
                        <span
                          className="vl-cat-badge"
                          style={{
                            color: categoryColor[task.category],
                            background: `${categoryColor[task.category]}15`,
                            border: `1px solid ${categoryColor[task.category]}30`,
                          }}
                        >
                          {categoryLabel[task.category]}
                        </span>
                        <span
                          className="vl-sev-badge"
                          style={{
                            color: severityColor[task.severity],
                            borderColor: `${severityColor[task.severity]}40`,
                            background: `${severityColor[task.severity]}10`,
                          }}
                        >
                          {severityLabel[task.severity]}
                        </span>
                      </div>
                      <div className="vl-task-title">{task.title}</div>
                      <div className="vl-task-loc">
                        <span>📍</span> {task.location}
                      </div>
                    </div>
                    <div className="vl-task-right">
                      {task.status === "completed" ? (
                        <span className="vl-done-badge">✓ Done</span>
                      ) : (
                        <span className="vl-dist">{task.distance}</span>
                      )}
                      <span className="vl-time">{task.assignedAt}</span>
                    </div>
                  </div>

                  {/* EXPANDED DETAIL */}
                  {selected === task.id && (
                    <div className="vl-detail">
                      <div className="vl-detail-desc">{task.description}</div>

                      {task.adminNote ? (
                        <div className="vl-admin-note">
                          <span className="vl-note-icon">📌</span>
                          <span className="vl-note-text"><strong>Admin note:</strong> {task.adminNote}</span>
                        </div>
                      ) : null}

                      {task.status === "active" && (
                        completing ? (
                          <div className="vl-completing">
                            <div className="vl-spinner" />
                            <div className="vl-comp-text">Marking as complete...</div>
                          </div>
                        ) : (
                          <div className="vl-detail-actions">
                            <button
                              className="vl-btn-primary"
                              onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }}
                            >
                              ✓ Mark as Complete
                            </button>
                            <button
                              className="vl-btn-secondary"
                              onClick={(e) => { e.stopPropagation(); window.open(`https://maps.google.com?q=${encodeURIComponent(task.location)}`); }}
                            >
                              🗺 Directions
                            </button>
                          </div>
                        )
                      )}

                      {task.status === "completed" && (
                        <div style={{ fontSize: "0.78rem", color: "rgba(134,239,172,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>✓</span> Task completed · Thank you for your service
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </>
  );
}
