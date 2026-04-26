import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";

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

function markerIcon(index: number, listing: Listing, selected: boolean) {
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: "",
    html: `<div class="numberMarker ${selected ? "numberMarkerSelected" : ""} ${
      listing.borderline ? "numberMarkerBorderline" : ""
    }"><span>${index + 1}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -14],
  });
}

function schoolIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="schoolLeafletMarker"><span>W</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 20 ? 42 : count >= 10 ? 38 : 34;
  return L.divIcon({
    className: "",
    html: `<div class="clusterMarker"><span>${count}</span><em>listings</em></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  const markerLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const [tilesEnabled, setTilesEnabled] = useState(true);
  const [tileFailed, setTileFailed] = useState(false);

  const bounds = useMemo(() => {
    const points = listings.map((listing) => [listing.lat, listing.lng] as L.LatLngTuple);
    return L.latLngBounds([[destination.lat, destination.lng], ...points]);
  }, [listings]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [destination.lat, destination.lng],
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      scrollWheelZoom: true,
      zoomControl: true,
      preferCanvas: true,
    });

    map.createPane("schoolPane");
    const schoolPane = map.getPane("schoolPane");
    if (schoolPane) schoolPane.style.zIndex = "670";

    L.marker([destination.lat, destination.lng], { icon: schoolIcon(), pane: "schoolPane", zIndexOffset: 2000 })
      .bindPopup(
        `<div class="leafletPopup"><p class="popupKicker">Primary class anchor</p><strong>Wills / Law School 上课点</strong><p>${destination.address}</p><div class="popupLinks"><a href="${destination.sourceUrl}" target="_blank" rel="noreferrer">Official address</a></div></div>`,
      )
      .bindTooltip("Wills / Law School 上课点", {
        className: "schoolTooltip",
        direction: "top",
        offset: [0, -22],
        permanent: true,
      })
      .addTo(map);

    const layer = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 18,
      maxClusterRadius: (zoom) => {
        if (zoom >= 17) return 18;
        if (zoom >= 15) return 28;
        return 44;
      },
      iconCreateFunction: clusterIcon,
      spiderLegPolylineOptions: {
        color: "#171411",
        weight: 1.2,
        opacity: 0.72,
      },
    }).addTo(map);

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

    const tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri, OpenStreetMap contributors",
      maxZoom: 19,
    })
      .on("tileerror", () => setTileFailed(true))
      .on("tileload", () => setTileFailed(false))
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
      const marker = L.marker([listing.lat, listing.lng], {
        icon: markerIcon(index, listing, selected),
        keyboard: true,
        title: listing.name,
        zIndexOffset: selected ? 1200 : listing.borderline ? 0 : 300,
      })
        .bindPopup(popupHtml(listing), { closeButton: true, maxWidth: 260 })
        .on("click", () => onSelect(listing.id, { scroll: false }));

      layer.addLayer(marker);
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
    const layer = markerLayerRef.current;
    const marker = markerRefs.current[selectedId];
    if (!map || !layer || !marker) return;

    layer.zoomToShowLayer(marker, () => {
      marker.openPopup();
      map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    });
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
        <em>{tilesEnabled && tileFailed ? "Street tiles unavailable · local fallback still works" : "Real street map · local fallback underneath"}</em>
      </div>
      <div ref={containerRef} className="leafletMap" aria-label="Interactive Bristol housing map" />
      <button className="tileToggle" type="button" onClick={() => setTilesEnabled((value) => !value)}>
        {tilesEnabled ? "切换本地兜底" : "加载真实街道图"}
      </button>
    </div>
  );
}
