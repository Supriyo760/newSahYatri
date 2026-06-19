'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSocket } from '@/hooks/useSocket';

const MapWithNoSSR = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex justify-center items-center bg-[#e4e2dd]">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#8f361d] animate-spin" />
    </div>
  )
});

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
        <div className="rounded-xl overflow-hidden border border-[#ddc0b9] shadow-inner relative bg-[#e4e2dd] text-[#fbf9f4] h-[320px] flex flex-col justify-between">
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1.5 z-[1000] border border-[#ddc0b9]/50 text-[8px] font-bold text-[#fdb55c] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fdb55c] animate-ping" />
            LIVE TRAFFIC LAYER ACTIVE
          </div>

          <div className="flex-1 relative w-full h-full">
            <MapWithNoSSR 
              nodes={data.nodes}
              edges={data.edges}
              nearestHospital={data.nearestHospital}
            />
          </div>

          {/* Dijkstra analytics */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md px-4 py-2 text-[10px] text-[#89726c] flex justify-between items-center border-t border-[#ddc0b9]/40 z-[1000]">
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
