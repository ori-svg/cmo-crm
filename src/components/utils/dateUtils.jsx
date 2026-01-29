/**
 * פונקציות עזר לעיצוב תאריכים ושעות
 * פורמט: DD/MM/YYYY HH:mm (שעון ישראל)
 */

/**
 * המרת תאריך ל-DD/MM/YYYY (בזמן מקומי - ישראל)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    // המר מ-ISO string ל-Date object
    // הדפדפן יבצע המרה אוטומטית מ-UTC לזמן המקומי
    const date = new Date(dateString);
    
    // וודא שהתאריך תקין
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return '';
    }
    
    // שימוש באזור הזמן של ישראל במפורש
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Jerusalem'
    };
    
    const formatter = new Intl.DateTimeFormat('he-IL', options);
    const parts = formatter.formatToParts(date);
    
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * המרת שעה ל-HH:mm (24 שעות, זמן ישראל)
 */
export const formatTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // וודא שהתאריך תקין
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return '';
    }
    
    // שימוש באזור הזמן של ישראל במפורש
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jerusalem'
    };
    
    return new Intl.DateTimeFormat('he-IL', options).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * המרת תאריך ושעה ל-DD/MM/YYYY HH:mm (שעון ישראל)
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  const date = formatDate(dateString);
  const time = formatTime(dateString);
  
  if (!date || !time) return '';
  
  return `${date} ${time}`;
};