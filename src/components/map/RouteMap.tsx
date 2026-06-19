'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js/Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Edge {
  from: string;
  to: string;
  durationMinutes: number;
  congestionRatio: number;
  status: 'clear' | 'moderate' | 'congested';
  paths?: { lat: number; lng: number }[][];
}

interface Node {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  isHiddenGem: boolean;
}

interface RouteMapProps {
  nodes: Node[];
  edges: Edge[];
  nearestHospital: { name: string; lat: number; lng: number } | null;
}

const getEdgeColor = (status: Edge['status']) => {
  switch (status) {
    case 'clear': return '#5cba74';
    case 'moderate': return '#e69c24';
    case 'congested': return '#ba1a1a';
    default: return '#5cba74';
  }
};

// Polyline decoder utility
function decodePolyline(encoded: string) {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Component to handle auto-fitting bounds
function FitBounds({ nodes, hospital }: { nodes: Node[], hospital: any }) {
  const map = useMap();

  useEffect(() => {
    if (nodes.length === 0) return;

    const bounds = L.latLngBounds(nodes.map(n => [n.lat, n.lng]));
    if (hospital) {
      bounds.extend([hospital.lat, hospital.lng]);
    }

    // Add padding so markers aren't cut off at the edges
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
  }, [map, nodes, hospital]);

  return null;
}

export default function RouteMap({ nodes, edges, nearestHospital }: RouteMapProps) {
  // Center defaults to first node or Bangalore
  const center: [number, number] = nodes.length > 0 
    ? [nodes[0].lat, nodes[0].lng] 
    : [12.9716, 77.5946];

  // Map our custom CSS classes to Leaflet divIcons
  const createNodeIcon = (node: Node, index: number) => {
    const isFirst = index === 0;
    const isHidden = node.isHiddenGem;
    
    // Using exactly the same styling as the previous SVG radar node
    const bgClass = isHidden ? 'bg-[#ba1a1a] text-white animate-pulse' : isFirst ? 'bg-[#5cba74] text-white' : 'bg-[#fdb55c] text-[#1b1c19]';
    const label = isHidden ? 'HG' : isFirst ? '1' : String(index + 1);

    const htmlString = `
      <div class="relative flex flex-col items-center group z-10 w-5 h-5" style="transform: translate(-10px, -10px);">
        <div class="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold shadow-lg ${bgClass}">
          ${label}
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: 'custom-leaflet-marker', // removing default leaflet styles
      iconSize: [20, 20],
      iconAnchor: [10, 10], // center anchor
    });
  };

  const createHospitalIcon = () => {
    const htmlString = `
      <div class="relative flex flex-col items-center group z-10 w-5 h-5" style="transform: translate(-10px, -10px);">
        <div class="w-5 h-5 bg-white border-2 border-[#ba1a1a] flex items-center justify-center text-[12px] font-bold text-[#ba1a1a] shadow-lg animate-pulse rounded-sm">
          +
        </div>
      </div>
    `;
    return L.divIcon({
      html: htmlString,
      className: 'custom-leaflet-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      scrollWheelZoom={false} 
      className="w-full h-full bg-[#e4e2dd]"
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <FitBounds nodes={nodes} hospital={nearestHospital} />

      {/* Render Edges (Polylines) */}
      {edges.map((edge, idx) => {
        // Decode polylines on the fly
        // @ts-expect-error - polylines is added from route.ts
        const edgePaths = (edge.polylines || []).map((p: string) => decodePolyline(p));
        if (edgePaths.length === 0) return null;

        const color = getEdgeColor(edge.status);
        const weight = edge.status === 'congested' ? 5 : 3;
        
        return edgePaths.map((pathSegment: any, pIdx: number) => (
          <Polyline 
            key={`edge-${idx}-${pIdx}`}
            positions={pathSegment.map((pt: any) => [pt.lat, pt.lng])}
            pathOptions={{ color, weight, opacity: 0.8 }}
          />
        ));
      })}

      {/* Render Nodes */}
      {nodes.map((node, i) => (
        <Marker 
          key={node.id} 
          position={[node.lat, node.lng]}
          icon={createNodeIcon(node, i)}
          zIndexOffset={node.isHiddenGem ? 1000 : 500}
        >
          <Popup className="font-journal-text text-[#1b1c19]">
            <strong className="block text-sm font-bold text-[#8f361d]">{node.name}</strong>
            <span className="text-xs text-[#89726c]">{node.type}</span>
          </Popup>
        </Marker>
      ))}

      {/* Render Hospital */}
      {nearestHospital && (
        <Marker 
          position={[nearestHospital.lat, nearestHospital.lng]}
          icon={createHospitalIcon()}
          zIndexOffset={1000}
        >
          <Popup className="font-journal-text text-[#1b1c19]">
            <strong className="block text-sm font-bold text-[#ba1a1a]">{nearestHospital.name}</strong>
            <span className="text-xs text-[#ba1a1a]">Emergency Hub</span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
