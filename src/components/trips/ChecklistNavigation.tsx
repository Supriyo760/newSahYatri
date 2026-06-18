'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, Map as MapIcon, Clock, Navigation, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface ItineraryItem {
  id: string;
  name: string;
  type: string;
  time: string;
  description: string;
  isCompleted?: boolean;
  estimatedDurationMinutes: number;
}

export interface ChecklistDay {
  dayNumber: number;
  items: ItineraryItem[];
}

interface ChecklistNavigationProps {
  days: ChecklistDay[];
  onNavigate?: (itemId: string) => void;
}

export default function ChecklistNavigation({ days, onNavigate }: ChecklistNavigationProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  if (!days || days.length === 0) {
    return <div className="p-6 text-center text-xs text-gray-500">No itinerary days available.</div>;
  }

  const currentDay = days[currentDayIndex];
  const items = currentDay.items;

  // Derive status
  const completedCount = items.filter(i => completedItems[i.id]).length;
  const progress = items.length === 0 ? 0 : (completedCount / items.length) * 100;
  
  const nextUpIndex = items.findIndex(i => !completedItems[i.id]);
  const nextUp = nextUpIndex !== -1 ? items[nextUpIndex] : null;

  const isAllCompleted = items.length > 0 && completedCount === items.length;
  const hasNextDay = currentDayIndex < days.length - 1;
  const hasPrevDay = currentDayIndex > 0;

  const handleToggle = (id: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const goToNextDay = () => {
    if (hasNextDay) setCurrentDayIndex(prev => prev + 1);
  };

  const goToPrevDay = () => {
    if (hasPrevDay) setCurrentDayIndex(prev => prev - 1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full max-h-[600px]">
      <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col gap-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon size={20} className="text-blue-600" />
            <h3 className="font-bold text-gray-900">
              Day {currentDay.dayNumber}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600">
              {completedCount} / {items.length} Done
            </span>
            <div className="flex bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
              <button 
                onClick={goToPrevDay} 
                disabled={!hasPrevDay}
                className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors border-r border-gray-200"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={goToNextDay} 
                disabled={!hasNextDay}
                className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
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

      <div className="divide-y divide-gray-50 overflow-y-auto flex-1">
        {items.map((item, index) => {
          const isCompleted = !!completedItems[item.id];
          const isNext = index === nextUpIndex;
          
          return (
            <div 
              key={item.id} 
              className={`p-4 flex gap-4 transition-colors ${isCompleted ? 'bg-gray-50/50 opacity-75' : 'bg-white hover:bg-gray-50'}`}
            >
              <button 
                onClick={() => handleToggle(item.id)}
                className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
              >
                {isCompleted ? (
                  <CheckCircle2 size={24} className="text-emerald-500" />
                ) : (
                  <Circle size={24} className={isNext ? "text-blue-500" : "text-gray-300"} />
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.name}
                  </h4>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
                
                <p className={`text-sm mt-1 line-clamp-2 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.description}
                </p>

                {!isCompleted && (
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

        {isAllCompleted && (
          <div className="p-6 bg-emerald-50 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
              <CheckCircle size={24} />
            </div>
            <h4 className="font-bold text-emerald-900 mb-1">Day {currentDay.dayNumber} Complete!</h4>
            <p className="text-xs text-emerald-700 mb-4">Great job finishing all activities for today.</p>
            {hasNextDay ? (
              <button
                onClick={goToNextDay}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm active:scale-95"
              >
                Proceed to Day {days[currentDayIndex + 1].dayNumber}
              </button>
            ) : (
              <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">
                Journey Completed 🎉
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
