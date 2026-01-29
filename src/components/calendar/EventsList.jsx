import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import { formatDate, formatTime } from "../utils/dateUtils";

export default function EventsList({ selectedDate, events, onDelete }) {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg">
          אירועים ב-{formatDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">אין אירועים ליום זה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-orange-50 to-orange-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(event)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                )}
                
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.status && (
                    <Badge className={
                      event.status === "מתוכנן" ? "bg-blue-100 text-blue-800 mt-2" :
                      event.status === "בוצע" ? "bg-green-100 text-green-800 mt-2" :
                      "bg-red-100 text-red-800 mt-2"
                    }>
                      {event.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}