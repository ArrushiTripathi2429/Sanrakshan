"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const MEDALS = ["🥇", "🥈", "🥉"];
const CAT_COLORS = {
  flood: "#67e8f9", medical: "#f87171", road: "#fbbf24",
  food: "#86efac", education: "#c084fc", electricity: "#fb923c",
  water: "#38bdf8", other: "#94a3b8",
};

export default function CommunityImpactBoard({ highlightUid = null, compact = false }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to all resolved reports
    const q = query(collection(db, "reports"), where("status", "==", "resolved"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => d.data());

      // Aggregate by volunteer name
      const map = {};
      docs.forEach(r => {
        if (!r.assignedTo) return;
        const key = r.assignedTo;
        if (!map[key]) {
          map[key] = {
            name: r.assignedTo,
            tasksCompleted: 0,
            peopleHelped: 0,
            categories: new Set(),
          };
        }
        map[key].tasksCompleted += 1;
        map[key].peopleHelped += parseInt(r.affected || "0") || 0;
        if (r.category) map[key].categories.add(r.category);
      });

      // Also pull resolvedTasks from users collection for accuracy
      const sorted = Object.values(map)
        .map(v => ({ ...v, categories: Array.from(v.categories) }))
        .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
        .slice(0, compact ? 5 : 10);

      setLeaderboard(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px 24px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 52, borderRadius: 10, background: "rgba(255,255,255,0.03)", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.3 }}>🏆</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(232,245,233,0.22)", lineHeight: 1.6 }}>
          No completed tasks yet.<br />Impact board will populate as volunteers complete missions.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      {leaderboard.map((vol, i) => {
        const isHighlighted = highlightUid && vol.name === highlightUid;
        const medal = MEDALS[i] || null;
        const reliability = vol.tasksCompleted > 0
          ? Math.min(100, Math.round((vol.tasksCompleted / Math.max(vol.tasksCompleted, 1)) * 100))
          : 0;

        return (
          <div
            key={vol.name}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: isHighlighted
                ? "1px solid rgba(251,191,36,0.35)"
                : i < 3
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(255,255,255,0.05)",
              background: isHighlighted
                ? "rgba(251,191,36,0.06)"
                : i === 0
                ? "rgba(255,215,0,0.04)"
                : "rgba(255,255,255,0.015)",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Rank */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: i < 3 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: i < 3 ? "1rem" : "0.72rem",
                color: "rgba(232,245,233,0.4)",
                fontWeight: 700,
              }}>
                {medal || `#${i + 1}`}
              </div>

              {/* Name + categories */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: "0.88rem", fontWeight: 600,
                    color: isHighlighted ? "#fbbf24" : "#f0fdf4",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {vol.name}
                  </span>
                  {isHighlighted && (
                    <span style={{ fontSize: "0.6rem", padding: "1px 7px", borderRadius: 100, background: "rgba(251,191,36,0.15)", color: "#fbbf24", flexShrink: 0 }}>
                      You
                    </span>
                  )}
                </div>
                {/* Category dots */}
                {!compact && vol.categories.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {vol.categories.slice(0, 4).map(cat => (
                      <span key={cat} style={{
                        fontSize: "0.6rem", padding: "1px 7px", borderRadius: 100,
                        background: `${CAT_COLORS[cat] || "#94a3b8"}15`,
                        color: CAT_COLORS[cat] || "#94a3b8",
                        border: `1px solid ${CAT_COLORS[cat] || "#94a3b8"}30`,
                      }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.35)" }}>tasks</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#86efac" }}>{vol.tasksCompleted}</span>
                </div>
                {vol.peopleHelped > 0 && (
                  <div style={{ fontSize: "0.65rem", color: "rgba(232,245,233,0.3)" }}>
                    ~{vol.peopleHelped.toLocaleString()} helped
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
