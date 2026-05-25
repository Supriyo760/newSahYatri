'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useSocket } from '@/hooks/useSocket';
import { MapPin, Navigation, Crosshair } from 'lucide-react';

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
  const { socket, isConnected } = useSocket({ groupId });
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

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
        {!mapsApiKey || mapsApiKey.includes('Placeholder') ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <MapPin size={48} className="mb-4 opacity-50" />
            <p>Google Maps API Key not configured</p>
          </div>
        ) : (
          <APIProvider apiKey={mapsApiKey}>
            <Map
              defaultCenter={initialCenter}
              defaultZoom={13}
              mapId="sahyatri_live_map"
              gestureHandling="greedy"
              disableDefaultUI={true}
            >
              {myLocation && (
                <AdvancedMarker position={myLocation}>
                  <Pin background={'#2563eb'} borderColor={'#1d4ed8'} glyphColor={'#fff'} />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded-md shadow-md border border-gray-200 text-xs font-bold text-blue-700">
                    You
                  </div>
                </AdvancedMarker>
              )}

              {Object.values(memberLocations).map((loc) => (
                <AdvancedMarker key={loc.userId} position={{ lat: loc.lat, lng: loc.lng }}>
                  <Pin background={'#10b981'} borderColor={'#059669'} glyphColor={'#fff'} />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded-md shadow-md border border-gray-200 text-xs font-semibold text-gray-800">
                    {loc.name}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  );
}
