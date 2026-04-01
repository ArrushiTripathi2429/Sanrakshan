"use client";

export default function DownloadReport({ issues, villages }) {
  const handleDownload = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const now = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(8, 14, 10);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(134, 239, 172);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Sanrakshan", 14, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 210, 180);
    doc.text("Smart Resource Allocation · Raebareli District", 14, 18);
    doc.setTextColor(120, 160, 120);
    doc.text(`Generated: ${now}`, 14, 24);

    // Summary stats
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Incident Summary", 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [["Metric", "Count"]],
      body: [
        ["Total Reports",      issues.length],
        ["Pending",            issues.filter(i => !i.assigned && i.status !== "resolved").length],
        ["Assigned",           issues.filter(i => i.assigned && i.status !== "resolved").length],
        ["Resolved",           issues.filter(i => i.status === "resolved").length],
        ["Villages Affected",  (villages || []).filter(v => v.issues > 0).length],
      ],
      theme: "grid",
      headStyles: { fillColor: [8, 14, 10], textColor: [134, 239, 172], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30, halign: "center" } },
      margin: { left: 14, right: 14 },
    });

    // Incidents table
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("All Incidents", 14, y);

    autoTable(doc, {
      startY: y + 4,
      head: [["Title", "Village", "Category", "Severity", "Affected", "Status", "Assigned To", "Date"]],
      body: issues.map(i => [
        i.title || i.description?.slice(0, 40) || "—",
        i.village || i.location || "—",
        i.category || "—",
        String(i.severity || "—"),
        i.affected ? `~${i.affected}` : "—",
        i.status || "pending",
        i.assignedTo || "Unassigned",
        i.date || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: [8, 14, 10], textColor: [134, 239, 172], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      columnStyles: {
        0: { cellWidth: 42 }, 1: { cellWidth: 26 }, 2: { cellWidth: 22 },
        3: { cellWidth: 14, halign: "center" }, 4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 20 }, 6: { cellWidth: 26 }, 7: { cellWidth: 18 },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const v = data.cell.raw;
          data.cell.styles.textColor =
            v === "resolved" ? [34, 197, 94] :
            v === "assigned" ? [103, 232, 249] :
            [251, 191, 36];
        }
      },
    });

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Sanrakshan · Smart Resource Allocation · Google Solution Challenge",
      pageW / 2, pageH - 8, { align: "center" }
    );

    doc.save(`sanrakshan-report-${Date.now()}.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 9,
        border: "1px solid rgba(134,239,172,0.2)",
        background: "rgba(134,239,172,0.06)",
        color: "#86efac", fontSize: "0.72rem", fontWeight: 600,
        cursor: "pointer", fontFamily: "'Outfit',sans-serif",
        transition: "all 0.2s",
      }}
    >
      ↓ PDF Report
    </button>
  );
}
