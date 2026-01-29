import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default function CalendarGrid({ currentDate, selectedDate, setSelectedDate, events }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: he });
  const calendarEnd = endOfWeek(monthEnd, { locale: he });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

  const getEventsForDay = (day) => {
    return events.filter(event => 
      event.start_time && isSameDay(new Date(event.start_time), day)
    );
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => setSelectedDate(day)}
              className={`h-16 flex flex-col items-center justify-center p-1 ${
                !isCurrentMonth ? "text-gray-300" : ""
              } ${isSelected ? "bg-orange-100 hover:bg-orange-200 border-2 border-orange-500" : ""} ${
                isToday && !isSelected ? "bg-blue-50 border border-blue-300" : ""
              }`}
            >
              <span className="text-sm font-medium">{format(day, "d")}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-orange-500 rounded-full" />
                  ))}
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}