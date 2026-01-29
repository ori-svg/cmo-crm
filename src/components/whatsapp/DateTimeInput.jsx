import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DateTimeInput({ value, onChange, label, min }) {
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");

  useEffect(() => {
    if (value) {
      try {
        // המר מ-ISO string (UTC) לזמן מקומי
        const date = new Date(value);
        
        // בדוק אם התאריך תקין
        if (isNaN(date.getTime())) {
          console.error('Invalid date value:', value);
          return;
        }
        
        // פורמט DD/MM/YYYY (בזמן מקומי)
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setDateValue(`${day}/${month}/${year}`);
        
        // פורמט HH:mm (24 שעות, בזמן מקומי)
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setTimeValue(`${hours}:${minutes}`);
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
  }, [value]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDateValue(newDate);
    updateDateTime(newDate, timeValue);
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    updateDateTime(dateValue, newTime);
  };

  const updateDateTime = (date, time) => {
    if (!date || !time) return;
    
    try {
      // המר DD/MM/YYYY HH:mm לזמן מקומי
      const dateParts = date.split('/');
      const timeParts = time.split(':');
      
      if (dateParts.length !== 3 || timeParts.length !== 2) {
        console.warn('Invalid date or time format');
        return;
      }
      
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const year = parseInt(dateParts[2]);
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      // בדוק שכל הערכים הם מספרים תקינים
      if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
        console.warn('Invalid numeric values in date/time');
        return;
      }
      
      // בדוק שהערכים בטווח תקין
      if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
        console.warn('Date values out of valid range');
        return;
      }
      
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.warn('Time values out of valid range');
        return;
      }
      
      // צור Date object בזמן המקומי
      // זה יוצר Date עם הזמן המקומי שהמשתמש הקליד
      const dateObj = new Date(year, month, day, hours, minutes, 0, 0);
      
      // בדוק שהתאריך שנוצר הוא תקין
      if (isNaN(dateObj.getTime())) {
        console.warn('Created invalid date object');
        return;
      }
      
      // שמור כ-ISO string (עם Z)
      // toISOString() ממיר אוטומטית את הזמן המקומי ל-UTC
      // למשל: אם בישראל (UTC+2) המשתמש בחר 12:12, זה ישמר כ-10:12:00Z
      const isoString = dateObj.toISOString();
      
      console.log('💾 Saving scheduled time:', {
        local: `${date} ${time}`,
        utc: isoString,
        timestamp: dateObj.getTime()
      });
      
      onChange(isoString);
    } catch (error) {
      console.error('Error in updateDateTime:', error);
    }
  };

  const handleDateBlur = () => {
    try {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        let day = parseInt(parts[0]) || 1;
        let month = parseInt(parts[1]) || 1;
        const year = parseInt(parts[2]) || new Date().getFullYear();
        
        // תקן ערכים שחורגים מהטווח
        day = Math.max(1, Math.min(31, day));
        month = Math.max(1, Math.min(12, month));
        
        const formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        setDateValue(formatted);
        updateDateTime(formatted, timeValue);
      }
    } catch (error) {
      console.error('Error in handleDateBlur:', error);
    }
  };

  const handleTimeBlur = () => {
    try {
      const parts = timeValue.split(':');
      if (parts.length === 2) {
        const hours = String(Math.min(23, Math.max(0, parseInt(parts[0]) || 0))).padStart(2, '0');
        const minutes = String(Math.min(59, Math.max(0, parseInt(parts[1]) || 0))).padStart(2, '0');
        
        const formatted = `${hours}:${minutes}`;
        setTimeValue(formatted);
        updateDateTime(dateValue, formatted);
      }
    } catch (error) {
      console.error('Error in handleTimeBlur:', error);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="DD/MM/YYYY"
            value={dateValue}
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            className="text-center"
          />
          <p className="text-xs text-gray-500 mt-1 text-center">תאריך</p>
        </div>
        <div className="flex-1">
          <Input
            type="text"
            placeholder="HH:MM"
            value={timeValue}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
            className="text-center"
          />
          <p className="text-xs text-gray-500 mt-1 text-center">שעה</p>
        </div>
      </div>
    </div>
  );
}