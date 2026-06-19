'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Navigation, Crosshair, Users } from 'lucide-react';

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

function MapIframe({ lat, lng }: { lat: number; lng: number }) {
  // Use a ref + direct DOM manipulation to update src without React re-mounting the iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSrcRef = useRef<string>('');

  useEffect(() => {
    const newSrc = `https://maps.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}&z=15&output=embed`;
    if (newSrc !== lastSrcRef.current && iframeRef.current) {
      lastSrcRef.current = newSrc;
      iframeRef.current.src = newSrc;
    }
  }, [lat, lng]);

  const initialSrc = `https://maps.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}&z=15&output=embed`;

  return (
    <iframe
      ref={iframeRef}
      src={initialSrc}
      className="w-full h-full border-0"
      loading="lazy"
      title="Live group location map"
      allowFullScreen
    />
  );
}

export default function LiveLocationMap({ groupId, currentUserId, currentUserName, initialCenter = { lat: 20.5937, lng: 78.9629 } }: LiveLocationMapProps) {
  const { socket, isConnected } = useSocket({ groupId, userId: currentUserId });
  
  // All member locations including self, keyed by userId
  const [memberLocations, setMemberLocations] = useState<Record<string, LocationUpdate>>({});
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  // Listen for socket location updates from OTHER members
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdated = (update: LocationUpdate) => {
      setMemberLocations(prev => ({ ...prev, [update.userId]: { ...update } }));
    };

    socket.on('location_updated', handleLocationUpdated);

    return () => {
      socket.off('location_updated', handleLocationUpdated);
    };
  }, [socket]);

  // Update MY OWN location in the memberLocations map as well (so it shows on the list)
  const updateMyLocation = useCallback((lat: number, lng: number, isFirst: boolean) => {
    setMemberLocations(prev => ({
      ...prev,
      [currentUserId]: {
        userId: currentUserId,
        lat,
        lng,
        name: currentUserName,
        timestamp: new Date().toISOString(),
      }
    }));

    if (socket) {
      socket.emit('update_location', {
        groupId,
        name: currentUserName,
        lat,
        lng,
        startSharing: isFirst, // ← triggers the 2-hour session on the server
      });
    }
  }, [socket, groupId, currentUserId, currentUserName]);

  const toggleLocationSharing = useCallback(() => {
    if (isSharing && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsSharing(false);
      // Remove self from the live locations list
      setMemberLocations(prev => {
        const next = { ...prev };
        delete next[currentUserId];
        return next;
      });
    } else {
      if ('geolocation' in navigator) {
        let firstCall = true;
        setIsSharing(true);

        const id = navigator.geolocation.watchPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            updateMyLocation(lat, lng, firstCall);
            firstCall = false;
          },
          (error) => {
            console.error('Geolocation error:', error);
            setIsSharing(false);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        setWatchId(id);
        setFocusedUserId(currentUserId);
      } else {
        alert('Geolocation is not supported by your browser');
      }
    }
  }, [isSharing, watchId, currentUserId, updateMyLocation]);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  // Determine the center of the map
  const focusedLocation = focusedUserId ? memberLocations[focusedUserId] : null;
  const myLocation = memberLocations[currentUserId];
  const center = focusedLocation
    ? { lat: focusedLocation.lat, lng: focusedLocation.lng }
    : myLocation
    ? { lat: myLocation.lat, lng: myLocation.lng }
    : initialCenter;

  const allLocations = Object.values(memberLocations);
  const onlineCount = allLocations.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px] relative">
      
      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={toggleLocationSharing}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-md transition-colors ${
            isSharing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {isSharing ? <Navigation size={18} className="animate-pulse" /> : <Crosshair size={18} />}
          <span className="text-sm">{isSharing ? 'Stop Sharing' : 'Share Location'}</span>
        </button>
      </div>

      {/* Status badge */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        <span className="text-xs font-semibold text-gray-700">Group Radar</span>
        {onlineCount > 0 && (
          <span className="text-xs font-bold text-emerald-600">• {onlineCount} live</span>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 w-full bg-gray-100 relative">
        <MapIframe lat={center.lat} lng={center.lng} />

        {/* Member location pills */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <div className="flex items-center gap-1.5">
              <Users size={12} />
              <span>Live Locations</span>
            </div>
            <span className={onlineCount > 0 ? 'text-emerald-600' : 'text-gray-400'}>
              {onlineCount > 0 ? `${onlineCount} sharing` : 'No one sharing yet'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {allLocations.length === 0 && (
              <span className="text-[10px] text-gray-400 italic">
                Press &quot;Share Location&quot; to broadcast your position to the group in real-time.
              </span>
            )}
            {allLocations.map((loc) => {
              const isMe = loc.userId === currentUserId;
              const isFocused = focusedUserId === loc.userId;
              return (
                <button
                  key={loc.userId}
                  onClick={() => setFocusedUserId(isFocused ? null : loc.userId)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    isFocused
                      ? isMe
                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                        : 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : isMe
                      ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {isMe ? 'You' : loc.name}: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </button>
              );
            })}
          </div>

          {focusedUserId && (
            <p className="text-[9px] text-gray-400 text-center">
              Tap a name again to unpin • Map centers on selected member
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
