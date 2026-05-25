'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Map as MapIcon, Clock, Navigation } from 'lucide-react';

interface ItineraryItem {
  id: string;
  name: string;
  type: string;
  time: string;
  description: string;
  isCompleted: boolean;
  estimatedDurationMinutes: number;
}

interface ChecklistNavigationProps {
  dayNumber: number;
  items: ItineraryItem[];
  onToggleComplete?: (itemId: string, isCompleted: boolean) => void;
  onNavigate?: (itemId: string) => void;
}

export default function ChecklistNavigation({ dayNumber, items, onToggleComplete, onNavigate }: ChecklistNavigationProps) {
  const [localItems, setLocalItems] = useState(items);

  const handleToggle = (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setLocalItems(prev => prev.map(item => item.id === id ? { ...item, isCompleted: newStatus } : item));
    onToggleComplete?.(id, newStatus);
  };

  const completedCount = localItems.filter(i => i.isCompleted).length;
  const progress = localItems.length === 0 ? 0 : (completedCount / localItems.length) * 100;
  
  const nextUpIndex = localItems.findIndex(i => !i.isCompleted);
  const nextUp = nextUpIndex !== -1 ? localItems[nextUpIndex] : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MapIcon size={20} className="text-blue-600" />
            Day {dayNumber} Itinerary
          </h3>
          <span className="text-xs font-semibold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600">
            {completedCount} / {localItems.length} Done
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {nextUp && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 mt-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full flex-shrink-0">
              <Navigation size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-blue-800 tracking-wider mb-0.5">Up Next</p>
              <h4 className="font-semibold text-blue-900 text-sm">{nextUp.name}</h4>
              <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                <Clock size={12} /> {nextUp.time} • ~{nextUp.estimatedDurationMinutes} mins
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {localItems.map((item, index) => {
          const isNext = index === nextUpIndex;
          
          return (
            <div 
              key={item.id} 
              className={`p-4 flex gap-4 transition-colors ${item.isCompleted ? 'bg-gray-50/50 opacity-75' : 'bg-white hover:bg-gray-50'}`}
            >
              <button 
                onClick={() => handleToggle(item.id, item.isCompleted)}
                className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
              >
                {item.isCompleted ? (
                  <CheckCircle2 size={24} className="text-emerald-500" />
                ) : (
                  <Circle size={24} className={isNext ? "text-blue-500" : "text-gray-300"} />
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`font-medium ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.name}
                  </h4>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
                
                <p className={`text-sm mt-1 line-clamp-2 ${item.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.description}
                </p>

                {!item.isCompleted && (
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => onNavigate?.(item.id)}
                      className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <Navigation size={12} /> Get Directions
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
