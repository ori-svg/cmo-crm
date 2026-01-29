
import React, { useState, useEffect } from "react";
import { CalendarEvent } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { he } from "date-fns/locale";

import CalendarGrid from "../components/calendar/CalendarGrid";
import EventsList from "../components/calendar/EventsList";
import AddEventDialog from "../components/calendar/AddEventDialog";
import GoogleCalendarConnect from "../components/calendar/GoogleCalendarConnect";

export default function CalendarPage({ currentCompanyId, currentUser: propsUser }) {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(propsUser);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadEvents();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadEvents = async () => {
    const { CalendarEvent: CalendarEventDynamic } = await import("@/api/entities"); 
    
    const data = await CalendarEventDynamic.filter({ company_id: currentCompanyId }, "-start_time");
    setEvents(data);
  };

  const handleAddEvent = async (eventData) => {
    if (currentUser && currentCompanyId) {
      const newEvent = await CalendarEvent.create({ 
        ...eventData, 
        company_id: currentCompanyId 
      });

      // Sync to Google Calendar
      try {
        const { base44 } = await import("@/api/base44Client");
        await base44.functions.invoke('sync-google-calendar', {
          direction: 'to_google',
          event_id: newEvent.id
        });
        console.log('✅ Event synced to Google Calendar');
      } catch (error) {
        console.error('Error syncing to Google:', error);
      }
    } else {
      console.error("Cannot add event: No current user or company ID available.");
    }
    setShowAddDialog(false);
    await loadEvents();
  };

  const handleDeleteEvent = async (event) => {
    try {
      await CalendarEvent.delete(event.id);
      console.log('✅ Event deleted from CRM');
      
      // Try to delete from Google Calendar if it has google_event_id
      if (event.google_event_id) {
        try {
          const { base44 } = await import("@/api/base44Client");
          await base44.functions.invoke('delete-google-event', {
            event_id: event.id,
            google_event_id: event.google_event_id
          });
          console.log('✅ Event deleted from Google Calendar');
        } catch (error) {
          console.error('Error deleting from Google:', error);
        }
      }
      
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('שגיאה במחיקת האירוע');
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const eventsOnSelectedDate = events.filter(event => 
    event.start_time && isSameDay(new Date(event.start_time), selectedDate)
  );

  if (!currentUser || !currentCompanyId) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-full mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
              יומן
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">נהל פגישות ואירועים</p>
          </div>
          
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
            disabled={!currentUser}
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף אירוע
          </Button>
        </motion.div>

        {/* Google Calendar Connect */}
        <GoogleCalendarConnect 
          currentUser={currentUser}
          onSync={loadEvents}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevMonth}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold">
                  {format(currentDate, "MM/yyyy")}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              
              <CalendarGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                events={events}
              />
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <EventsList
              selectedDate={selectedDate}
              events={eventsOnSelectedDate}
              onDelete={handleDeleteEvent}
            />
          </div>
        </div>

        <AddEventDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddEvent}
        />
      </div>
    </div>
  );
}
