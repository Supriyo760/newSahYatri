'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { GripVertical, Plus, Trash2, Save, Users } from 'lucide-react';

interface ItineraryItem {
  id: string;
  name: string;
  time: string;
  type: string;
}

interface CollaborativeItineraryBuilderProps {
  groupId: string;
  tripId: string;
  initialItems: ItineraryItem[];
  currentUserId: string;
}

export default function CollaborativeItineraryBuilder({ groupId, tripId, initialItems, currentUserId }: CollaborativeItineraryBuilderProps) {
  const { socket, isConnected } = useSocket({ groupId, userId: currentUserId });
  const [items, setItems] = useState<ItineraryItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [activeEditors, setActiveEditors] = useState<number>(1);

  // Listen for socket updates from other users
  useEffect(() => {
    if (!socket) return;
    
    socket.on('itinerary_updated', (data: { items: ItineraryItem[], updaterId: string }) => {
      if (data.updaterId !== currentUserId) {
        setItems(data.items);
      }
    });

    socket.on('editor_count_update', (count: number) => {
      setActiveEditors(count);
    });
    
    return () => {
      socket.off('itinerary_updated');
      socket.off('editor_count_update');
    };
  }, [socket, currentUserId]);

  const broadcastUpdate = (newItems: ItineraryItem[]) => {
    if (socket) {
      socket.emit('update_itinerary', {
        groupId,
        tripId,
        items: newItems,
        updaterId: currentUserId
      });
    }
  };

  const handleItemChange = (id: string, field: keyof ItineraryItem, value: string) => {
    const newItems = items.map(item => item.id === id ? { ...item, [field]: value } : item);
    setItems(newItems);
    broadcastUpdate(newItems);
  };

  const handleRemove = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    broadcastUpdate(newItems);
  };

  const handleAdd = () => {
    const newItem: ItineraryItem = {
      id: `new_${Date.now()}`,
      name: '',
      time: '12:00',
      type: 'attraction'
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    broadcastUpdate(newItems);
  };

  const saveToDb = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/collaborative-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Could not save itinerary');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-xl">
        <div>
          <h3 className="font-bold text-gray-800">Collaborative Itinerary</h3>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Users size={12} /> {activeEditors} user{activeEditors !== 1 ? 's' : ''} currently editing
          </p>
        </div>
        
        <div className="flex gap-2">
          <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            {isConnected ? 'Syncing Live' : 'Offline'}
          </span>
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            Weather & Traffic: Simulated Data
          </span>
          <button 
            onClick={saveToDb}
            disabled={isSaving}
            className="text-xs bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-2 shadow-sm group hover:border-blue-300 transition-colors">
              <div className="cursor-grab text-gray-400 hover:text-gray-600 px-1">
                <GripVertical size={16} />
              </div>
              
              <input 
                type="time" 
                value={item.time}
                onChange={(e) => handleItemChange(item.id, 'time', e.target.value)}
                className="w-24 text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              
              <input 
                type="text" 
                value={item.name}
                onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                placeholder="Activity name"
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              
              <select 
                value={item.type}
                onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                className="w-32 text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="attraction">Attraction</option>
                <option value="food">Food</option>
                <option value="transport">Transport</option>
                <option value="hidden_gem">Hidden Gem</option>
              </select>
              
              <button 
                onClick={() => handleRemove(item.id)}
                className="text-gray-400 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={handleAdd}
          className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Activity
        </button>
      </div>
    </div>
  );
}
