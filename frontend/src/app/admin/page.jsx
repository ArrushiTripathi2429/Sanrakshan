"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// 🔥 IMPORTANT: dynamic import
const MapView = dynamic(() => import("../../components/mapview"), {
  ssr: false,
});

// ------------------ DATA ------------------
const villages = [
  { id:1, name:"Dalmau", lat:26.0631, lng:81.0364, status:"red", issues:3 },
  { id:2, name:"Salon", lat:26.1200, lng:81.3100, status:"green", issues:0 },
  { id:3, name:"Lalganj", lat:26.2477, lng:81.7100, status:"red", issues:2 },
  { id:4, name:"Maharajganj", lat:26.1900, lng:81.4300, status:"green", issues:0 },
  { id:5, name:"Khira", lat:26.3100, lng:81.1900, status:"red", issues:5 },
  { id:6, name:"Unchahar", lat:26.1000, lng:81.3600, status:"green", issues:0 },
  { id:7, name:"Rae Bareli City", lat:26.2309, lng:81.2408, status:"red", issues:7 }
];

const initialIssues = [
  { id:1, title:"Water shortage", village:"Khira", category:"Water", severity:"High", worker:"Ramesh", date:"2 days ago", assigned:null },
  { id:2, title:"Medical emergency", village:"Dalmau", category:"Health", severity:"High", worker:"Sita", date:"1 day ago", assigned:null },
  { id:3, title:"School supplies needed", village:"Lalganj", category:"Education", severity:"Low", worker:"Amit", date:"3 days ago", assigned:null },
  { id:4, title:"Women safety concern", village:"Rae Bareli City", category:"Safety", severity:"High", worker:"Neha", date:"Today", assigned:null },
  { id:5, title:"Food shortage", village:"Khira", category:"Food", severity:"Medium", worker:"Rahul", date:"4 days ago", assigned:null },
  { id:6, title:"Health camp needed", village:"Dalmau", category:"Health", severity:"Medium", worker:"Pooja", date:"Yesterday", assigned:null },
];

const volunteers = [
  { id:1, name:"Arjun", skills:["Medical"], available:true },
  { id:2, name:"Priya", skills:["Education"], available:true },
  { id:3, name:"Vikas", skills:["Construction"], available:true },
  { id:4, name:"Sneha", skills:["Health","Safety"], available:true },
  { id:5, name:"Karan", skills:["Logistics"], available:true },
];

export default function Page() {
  const [issues, setIssues] = useState(initialIssues);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);

  const issueRefs = useRef({});

  const assignVolunteer = () => {
    if (!selectedIssue || !selectedVolunteer) return;

    setIssues((prev) =>
      prev.map((i) =>
        i.id === selectedIssue.id
          ? { ...i, assigned: selectedVolunteer.name }
          : i
      )
    );

    alert("Volunteer Assigned ✅");
  };

  const scrollToIssue = (villageName) => {
    const issue = issues.find((i) => i.village === villageName);
    if (issue && issueRefs.current[issue.id]) {
      issueRefs.current[issue.id].scrollIntoView({ behavior: "smooth" });
    }
  };

  const getSeverityColor = (sev) => {
    if (sev === "High") return "bg-red-500";
    if (sev === "Medium") return "bg-yellow-400";
    return "bg-blue-500";
  };

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* SIDEBAR */}
      <div className="flex flex-col w-64 p-5 text-white bg-gray-900">
        <h1 className="mb-6 text-xl font-bold">SahaYog</h1>
        <div className="mt-auto">👤 Admin</div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* MAP */}
        <div className="p-4 bg-white rounded shadow">
          <h2 className="mb-2 text-lg font-semibold">
            District Overview — Rae Bareli
          </h2>

          {/* ✅ SAFE MAP */}
          <MapView villages={villages} scrollToIssue={scrollToIssue} />
        </div>

        {/* ISSUES */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Active Issues</h2>
          <div className="grid grid-cols-3 gap-4">
            {issues.map((i) => (
              <div
                key={i.id}
                ref={(el) => (issueRefs.current[i.id] = el)}
                className="p-4 bg-white rounded shadow"
              >
                <h3 className="font-bold">{i.title}</h3>
                <p className="text-sm">📍 {i.village}</p>

                <span className={`text-white px-2 py-1 text-xs rounded ${getSeverityColor(i.severity)}`}>
                  {i.severity}
                </span>

                {i.assigned && (
                  <p className="mt-2 text-green-600">
                    Assigned to {i.assigned}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}