import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { appleMapsUrl, categories, destination, googleMapsUrl, type Listing } from "./data";

type MapViewProps = {
  listings: Listing[];
  selectedId: string;
  onSelect: (id: string, options?: { scroll?: boolean }) => void;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function stableOffset(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = 0.00018 + (hash % 7) * 0.000045;
  return {
    lat: Math.sin(angle) * radius,
    lng: Math.cos(angle) * radius,
  };
}

function displayPoint(listing: Listing): L.LatLngExpression {
  const offset = stableOffset(listing.id);
  return [listing.lat + offset.lat, listing.lng + offset.lng];
}

function markerIcon(index: number, listing: Listing, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="numberMarker ${selected ? "numberMarkerSelected" : ""} ${
      listing.borderline ? "numberMarkerBorderline" : ""
    }"><span>${index + 1}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function schoolIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="schoolLeafletMarker"><span>W</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

function popupHtml(listing: Listing) {
  return `
    <div class="leafletPopup">
      <p class="popupKicker">${escapeHtml(categories[listing.category].short)} · ${listing.walk}</p>
      <strong>${escapeHtml(listing.name)}</strong>
      <p>${escapeHtml(listing.price)}</p>
      <div class="popupLinks">
        <a href="${appleMapsUrl(listing.origin)}" target="_blank" rel="noreferrer">Apple Maps</a>
        <a href="${googleMapsUrl(listing.origin)}" target="_blank" rel="noreferrer">Google backup</a>
      </div>
    </div>
  `;
}

export function MapView({ listings, selectedId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const [tilesEnabled, setTilesEnabled] = useState(false);
  const [tileFailed, setTileFailed] = useState(false);

  const bounds = useMemo(() => {
    const points = listings.map((listing) => displayPoint(listing));
    return L.latLngBounds([[destination.lat, destination.lng], ...points]);
  }, [listings]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [destination.lat, destination.lng],
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.marker([destination.lat, destination.lng], { icon: schoolIcon(), zIndexOffset: 2000 })
      .bindPopup(
        `<div class="leafletPopup"><p class="popupKicker">Destination</p><strong>${destination.name}</strong><p>${destination.address}</p></div>`,
      )
      .addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerLayerRef.current = layer;
    window.setTimeout(() => map.invalidateSize({ pan: false }), 120);
    window.setTimeout(() => map.invalidateSize({ pan: false }), 700);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
      markerRefs.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!tilesEnabled) {
      tileLayerRef.current?.remove();
      tileLayerRef.current = null;
      setTileFailed(false);
      return;
    }

    if (tileLayerRef.current) return;

    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    })
      .on("tileerror", () => setTileFailed(true))
      .addTo(map);

    tileLayerRef.current = tileLayer;
    setTileFailed(false);
  }, [tilesEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerRefs.current = {};

    listings.forEach((listing, index) => {
      const selected = listing.id === selectedId;
      const marker = L.marker(displayPoint(listing), {
        icon: markerIcon(index, listing, selected),
        keyboard: true,
        title: listing.name,
        zIndexOffset: selected ? 1200 : listing.borderline ? 0 : 300,
      })
        .bindPopup(popupHtml(listing), { closeButton: true, maxWidth: 260 })
        .on("click", () => onSelect(listing.id, { scroll: false }));

      marker.addTo(layer);
      markerRefs.current[listing.id] = marker;
    });

    if (listings.length > 0) {
      map.fitBounds(bounds, {
        padding: [34, 34],
        maxZoom: listings.length <= 5 ? 15 : 14,
        animate: false,
      });
    }
  }, [bounds, listings, onSelect, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRefs.current[selectedId];
    if (!map || !marker) return;

    marker.openPopup();
    map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [listings.length]);

  return (
    <div className={`leafletShell ${tilesEnabled ? "tilesEnabled" : "localMap"} ${tileFailed ? "tileFailed" : ""}`}>
      <div className="mapFallback" aria-hidden="true">
        <span>Clifton</span>
        <span>City Centre</span>
        <span>Harbourside</span>
        <span>Temple / Redcliffe</span>
        <em>{tilesEnabled && tileFailed ? "Map tiles unavailable · markers still work" : "Local map default · China-friendly"}</em>
      </div>
      <div ref={containerRef} className="leafletMap" aria-label="Interactive Bristol housing map" />
      <button className="tileToggle" type="button" onClick={() => setTilesEnabled((value) => !value)}>
        {tilesEnabled ? "关闭街道瓦片" : "加载 OSM 街道层"}
      </button>
    </div>
  );
}
