'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Navigation, Crosshair } from 'lucide-react';

interface LocationUpdate {
  userId: string;
  lat: number;
  lng: number;
  name: string;
  timestamp: string;
}

interface LiveLocationMapProps {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  initialCenter?: { lat: number; lng: number };
}

export default function LiveLocationMap({ groupId, currentUserId, currentUserName, initialCenter = { lat: 20.5937, lng: 78.9629 } }: LiveLocationMapProps) {
  const { socket, isConnected } = useSocket({ groupId, userId: currentUserId });
  const [memberLocations, setMemberLocations] = useState<Record<string, LocationUpdate>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Listen for socket location updates
  useEffect(() => {
    if (!socket) return;
    
    socket.on('location_updated', (update: LocationUpdate) => {
      setMemberLocations(prev => ({ ...prev, [update.userId]: update }));
    });
    
    return () => {
      socket.off('location_updated');
    };
  }, [socket]);

  // Toggle sharing
  const toggleLocationSharing = useCallback(() => {
    if (isSharing && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsSharing(false);
    } else {
      if ('geolocation' in navigator) {
        setIsSharing(true);
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setMyLocation({ lat, lng });
            
            if (socket) {
              socket.emit('update_location', {
                groupId,
                userId: currentUserId,
                name: currentUserName,
                lat,
                lng,
              });
            }
          },
          (error) => {
            console.error('Error watching position:', error);
            setIsSharing(false);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
        setWatchId(id);
      } else {
        alert('Geolocation is not supported by your browser');
      }
    }
  }, [isSharing, watchId, socket, groupId, currentUserId, currentUserName]);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const center = myLocation || initialCenter;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px] relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={toggleLocationSharing}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-md transition-colors ${
            isSharing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {isSharing ? <Navigation size={18} className="animate-pulse" /> : <Crosshair size={18} />}
          <span className="text-sm">{isSharing ? 'Sharing Live' : 'Share Location'}</span>
        </button>
      </div>

      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-xs font-semibold text-gray-700">Group Radar</span>
      </div>

      <div className="flex-1 w-full bg-gray-100">
        <div className="relative w-full h-full overflow-hidden bg-slate-100">
          <iframe
            src={`https://maps.google.com/maps?q=${center.lat},${center.lng}&z=13&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            title="Live group location map"
            allowFullScreen
          />

          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span>Your group locations</span>
              <span>{Object.keys(memberLocations).length + (myLocation ? 1 : 0)} active</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {myLocation && (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                  You: {myLocation.lat.toFixed(3)}, {myLocation.lng.toFixed(3)}
                </span>
              )}
              {Object.values(memberLocations).map((loc) => (
                <span key={loc.userId} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                  {loc.name}: {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                </span>
              ))}
              {!myLocation && Object.keys(memberLocations).length === 0 && (
                <span className="text-[10px] text-gray-500">
                  Start sharing to broadcast your current position to the group.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
