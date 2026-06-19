'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';

interface RouteRadarProps {
  tripId: string;
  groupId: string;
  currentDayNumber: number;
}

interface Node {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  isHiddenGem: boolean;
}

interface Edge {
  from: string;
  to: string;
  durationMinutes: number;
  congestionRatio: number;
  status: 'clear' | 'moderate' | 'congested';
}

interface RadarData {
  nodes: Node[];
  edges: Edge[];
  optimalOrder: string[];
  nearestHospital: { name: string; lat: number; lng: number } | null;
  stats: {
    totalDurationMinutes: number;
    congestedSegments: number;
    pathsProcessed: number;
  };
}

export function CooperativeRouteRadar({ tripId, groupId, currentDayNumber }: RouteRadarProps) {
  const { socket } = useSocket();
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/trips/${tripId}/route-radar?dayNumber=${currentDayNumber}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch route radar');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      fetchCountRef.current += 1;
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRadarData();
    // Re-fetch every 5 minutes
    const interval = setInterval(fetchRadarData, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, currentDayNumber]);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = (payload: { tripId: string }) => {
      if (payload.tripId === tripId) {
        fetchRadarData();
      }
    };
    socket.on('route_refreshed', handleRefresh);
    return () => {
      socket.off('route_refreshed', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, tripId]);

  const handleManualRefresh = () => {
    if (socket) {
      socket.emit('refresh_route_radar', { groupId, tripId });
    }
    fetchRadarData();
  };

  // Normalize lat/lng to percentages for SVG rendering
  const { normalizedNodes } = useMemo(() => {
    if (!data || data.nodes.length === 0) return { normalizedNodes: [] };
    
    // Include hospital in bounds calculation
    const allCoords = [...data.nodes];
    if (data.nearestHospital) {
      allCoords.push({ ...data.nearestHospital, id: 'hosp', type: 'hospital', isHiddenGem: false });
    }

    const minLat = Math.min(...allCoords.map(n => n.lat));
    const maxLat = Math.max(...allCoords.map(n => n.lat));
    const minLng = Math.min(...allCoords.map(n => n.lng));
    const maxLng = Math.max(...allCoords.map(n => n.lng));

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    // Add 20% padding
    const padding = 0.2;
    
    const getNormalized = (lat: number, lng: number) => {
      // SVG Y is inverted (top is 0)
      const x = ((lng - minLng) / lngRange) * (1 - padding * 2) + padding;
      const y = 1 - (((lat - minLat) / latRange) * (1 - padding * 2) + padding);
      return { x: x * 100, y: y * 100 };
    };

    const normNodes = data.nodes.map(n => ({
      ...n,
      ...getNormalized(n.lat, n.lng)
    }));

    let normHosp = null;
    if (data.nearestHospital) {
      normHosp = {
        ...data.nearestHospital,
        ...getNormalized(data.nearestHospital.lat, data.nearestHospital.lng)
      };
    }

    return {
      normalizedNodes: normNodes,
      nearestHospital: normHosp,
      viewBoxBounds: true
    };
  }, [data]);

  const getEdgeColor = (status: Edge['status']) => {
    switch (status) {
      case 'clear': return '#5cba74';
      case 'moderate': return '#e69c24';
      case 'congested': return '#ba1a1a';
      default: return '#5cba74';
    }
  };

  return (
    <div className="bg-[#f0eee9] p-6 rounded-2xl border border-[#ddc0b9]/40 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-journal-headline text-xl text-[#8f361d]">
            Cooperative Route Radar
          </h3>
          <p className="text-xs text-[#89726c] mt-1">
            Real-time traffic and dynamic Dijkstra routing for Day {currentDayNumber}.
          </p>
        </div>
        <button 
          onClick={handleManualRefresh}
          disabled={loading}
          className="text-[10px] bg-[#8f361d]/10 text-[#8f361d] px-2 py-1 rounded font-bold hover:bg-[#8f361d]/20 transition disabled:opacity-50"
        >
          {loading ? 'SYNCING...' : 'SYNC'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#ba1a1a]/30 bg-[#ba1a1a]/5 p-5 h-[320px] flex flex-col justify-center items-center text-center">
          <span className="text-[#ba1a1a] font-bold text-sm mb-2">Radar Offline</span>
          <p className="text-xs text-[#89726c]">{error}</p>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-[#ddc0b9] bg-[#e4e2dd] p-5 h-[320px] flex justify-center items-center animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#8f361d] animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-[#ddc0b9] shadow-inner relative bg-[#1b1c19] text-[#fbf9f4] p-5 h-[320px] flex flex-col justify-between">
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1.5 z-10 border border-[#ddc0b9]/20 text-[8px] font-bold text-[#fdb55c]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fdb55c] animate-ping" />
            DIJKSTRA TRAFFIC LAYER ACTIVE
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative border border-[#ddc0b9]/10 rounded-lg p-2 bg-black/40 overflow-hidden">
            {/* Grid system lines */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,#2c2d2a_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />

            <div className="relative w-full h-full">
              {/* Edges Layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {data.edges.map((edge, idx) => {
                  const fromNode = normalizedNodes.find(n => n.id === edge.from);
                  const toNode = normalizedNodes.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;
                  
                  const color = getEdgeColor(edge.status);
                  
                  return (
                    <g key={`edge-${idx}`}>
                      <line 
                        x1={`${fromNode.x}%`} y1={`${fromNode.y}%`} 
                        x2={`${toNode.x}%`} y2={`${toNode.y}%`} 
                        stroke={color} strokeWidth={edge.status === 'congested' ? "3.5" : "2"} 
                        strokeOpacity="0.4"
                      />
                      <path 
                        d={`M ${fromNode.x}% ${fromNode.y}% L ${toNode.x}% ${toNode.y}%`} 
                        fill="transparent" 
                        stroke={color} 
                        strokeWidth="1.5" 
                        strokeDasharray="6" 
                        className="animate-dash" 
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Nodes Layer */}
              {normalizedNodes.map((node, i) => (
                <div 
                  key={node.id}
                  className="absolute flex flex-col items-center group z-10"
                  style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold shadow-lg ${node.isHiddenGem ? 'bg-[#ba1a1a] text-white animate-pulse' : i === 0 ? 'bg-[#5cba74] text-white' : 'bg-[#fdb55c] text-[#1b1c19]'}`}>
                    {node.isHiddenGem ? 'HG' : i === 0 ? '1' : i + 1}
                  </div>
                  <span className="absolute top-6 text-[8px] bg-black/80 text-white px-1.5 py-0.5 rounded border border-[#ddc0b9]/20 max-w-[80px] truncate text-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {node.name}
                  </span>
                </div>
              ))}

              {/* Nearest Hospital Node */}
              {data.nearestHospital && (() => {
                // Manually calculate hospital position
                const allCoords = [...data.nodes, { ...data.nearestHospital, id: 'hosp', type: 'hospital', isHiddenGem: false }];
                const minLat = Math.min(...allCoords.map(n => n.lat));
                const maxLat = Math.max(...allCoords.map(n => n.lat));
                const minLng = Math.min(...allCoords.map(n => n.lng));
                const maxLng = Math.max(...allCoords.map(n => n.lng));
                const latRange = maxLat - minLat || 0.01;
                const lngRange = maxLng - minLng || 0.01;
                const padding = 0.2;
                const hx = ((data.nearestHospital.lng - minLng) / lngRange) * (1 - padding * 2) + padding;
                const hy = 1 - (((data.nearestHospital.lat - minLat) / latRange) * (1 - padding * 2) + padding);

                return (
                  <div 
                    className="absolute flex flex-col items-center group z-10"
                    style={{ left: `${hx * 100}%`, top: `${hy * 100}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-5 h-5 bg-white border-2 border-[#ba1a1a] flex items-center justify-center text-[12px] font-bold text-[#ba1a1a] shadow-lg animate-pulse rounded-sm">
                      +
                    </div>
                    <span className="absolute top-6 text-[8px] bg-black/80 text-[#ba1a1a] font-bold px-1.5 py-0.5 rounded border border-[#ba1a1a]/40 max-w-[80px] truncate text-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {data.nearestHospital.name}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Dijkstra analytics */}
          <div className="text-[10px] text-[#89726c] flex justify-between items-center border-t border-[#ddc0b9]/10 pt-2.5">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${data.stats.congestedSegments > 0 ? 'bg-[#ba1a1a]' : 'bg-[#5cba74]'}`} />
              {data.stats.congestedSegments > 0 
                ? <span className="text-[#ba1a1a]"><strong>{data.stats.congestedSegments}</strong> congested segment(s)</span>
                : <span className="text-[#5cba74]">All routes clear</span>
              }
            </span>
            <span>Total driving: <strong>{data.stats.totalDurationMinutes} mins</strong></span>
          </div>
        </div>
      )}
      
      <Link
        href="/safety"
        className="block text-center bg-[#ba1a1a] text-white py-2.5 rounded-xl font-journal-label text-[10px] uppercase tracking-widest hover:opacity-90 transition-opacity"
      >
        LAUNCH SECURITY DESK
      </Link>
    </div>
  );
}
