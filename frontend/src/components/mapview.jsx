"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

export default function MapView({ villages, scrollToIssue }) {
  return (
    <MapContainer
      center={[26.2309, 81.2408]}
      zoom={11}
      style={{ height: "450px", width: "100%" }}
    >
      <TileLayer url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=YOUR_KEY`} />

      {villages.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={10}
          pathOptions={{
            color: v.status === "red" ? "red" : "green",
          }}
          eventHandlers={{
            click: () => {
              if (v.status === "red") scrollToIssue(v.name);
            },
          }}
        >
          <Popup>
            <b>{v.name}</b><br />
            Issues: {v.issues}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}