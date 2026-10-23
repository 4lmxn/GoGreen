import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconMarker,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Stable empty defaults so the drawing effect does not rerun on every render.
const NONE = [];

export default function MapView({ 
  routes = [], 
  selectedRouteId, 
  origin, 
  destination, 
  currentLocation = null, // [lat, lng] for live GPS tracking
  autoCenterOnGps = false,
  markers = NONE, // [{ lat, lng, label, title, className }] numbered pins (round planner)
  lines = NONE, // [{ points, color }] extra polylines drawn in order
  onMapClick = null, // (lat, lng) => void
}) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersGroupRef = useRef(null);

  // Initialize Map Instance Once
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([12.9716, 77.5946], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
    }

    const timer = setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Optional click handler (used to place depot and stops)
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !onMapClick) return;
    const handleClick = (event) => onMapClick(event.latlng.lat, event.latlng.lng);
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [onMapClick]);

  // Update Route Polylines, Markers, and Live GPS Position
  useEffect(() => {
    const map = leafletMapRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // Extra polylines (e.g. an optimised multi-stop round)
    lines.forEach((line) => {
      if (!line.points || line.points.length < 2) return;
      const polyline = L.polyline(line.points, {
        color: line.color || '#16a34a',
        weight: 6,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(layerGroup);
      bounds.extend(polyline.getBounds());
    });

    // Numbered pins
    markers.forEach((marker) => {
      const icon = L.divIcon({
        className: `op-pin ${marker.className || ''}`,
        html: `<span>${marker.label}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const pin = L.marker([marker.lat, marker.lng], { icon }).addTo(layerGroup);
      if (marker.title) {
        const text = document.createElement('span');
        text.textContent = marker.title;
        pin.bindPopup(text);
      }
      bounds.extend([marker.lat, marker.lng]);
    });

    // Helper: Determine Route Color
    const getRouteColor = (route) => {
      const type = String(route.type || route.id || '').toLowerCase();
      if (type.includes('eco')) return '#16a34a'; // Green
      if (type.includes('fast') || type.includes('highway')) return '#2563eb'; // Blue
      return '#f59e0b'; // Amber
    };

    // Draw unselected routes in faded style
    routes.forEach((route) => {
      if (route.id !== selectedRouteId) {
        const points = route.pathPoints || route.coordinates || [];
        if (points.length > 0) {
          const color = getRouteColor(route);
          const polyline = L.polyline(points, {
            color: color,
            weight: 4,
            opacity: 0.4,
            dashArray: '6, 8',
          }).addTo(layerGroup);

          bounds.extend(polyline.getBounds());
        }
      }
    });

    // Draw SELECTED route in bold
    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (selectedRoute) {
      const points = selectedRoute.pathPoints || selectedRoute.coordinates || [];
      if (points.length > 0) {
        const color = getRouteColor(selectedRoute);
        const polyline = L.polyline(points, {
          color: color,
          weight: 7,
          opacity: 0.95,
          lineJoin: 'round',
        }).addTo(layerGroup);

        bounds.extend(polyline.getBounds());

        // Origin Marker
        const originText = document.createElement('span');
        originText.textContent = `Origin: ${origin || 'Start Point'}`;
        L.marker(points[0])
          .bindPopup(originText)
          .addTo(layerGroup);

        // Destination Marker
        const destinationText = document.createElement('span');
        destinationText.textContent = `Destination: ${destination || 'End Point'}`;
        L.marker(points[points.length - 1])
          .bindPopup(destinationText)
          .addTo(layerGroup);
      }
    }

    // LIVE GPS CURRENT LOCATION MARKER (Pulsing Blue Circle)
    if (currentLocation && Array.isArray(currentLocation) && currentLocation.length === 2) {
      const [lat, lng] = currentLocation;

      // Outer Pulsing Halo
      L.circleMarker([lat, lng], {
        radius: 18,
        fillColor: '#3b82f6',
        color: '#60a5fa',
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.25,
      }).addTo(layerGroup);

      // Inner Core GPS Dot
      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      })
        .bindPopup('Last received driver position')
        .addTo(layerGroup);

      bounds.extend([lat, lng]);

      if (autoCenterOnGps) {
        map.panTo([lat, lng], { animate: true });
      }
    }

    if (bounds.isValid() && !autoCenterOnGps) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    map.invalidateSize();
  }, [routes, selectedRouteId, origin, destination, currentLocation, autoCenterOnGps, markers, lines]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      <div ref={mapRef} className="w-full h-full z-0" />
    </div>
  );
}
