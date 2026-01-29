import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, RefreshCw, Calendar as CalendarIcon } from "lucide-react";

const GOOGLE_CLIENT_ID = '180604576139-knmjpnagq50k5n6o1b68o8vu55f6niae.apps.googleusercontent.com';
const REDIRECT_URI = 'https://cmo-crm.com/api/functions/google-calendar-callback';

export default function GoogleCalendarConnect({ currentUser, onSync }) {
  const [settings, setSettings] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadSettings();
    }
  }, [currentUser]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.event === 'google_calendar_connected' && event.data.success) {
        setIsConnecting(false);
        loadSettings();
        handleSync();
      } else if (event.data.event === 'google_calendar_error') {
        setError(event.data.error);
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadSettings = async () => {
    if (!currentUser) return;

    try {
      const { GoogleCalendarSettings } = await import("@/api/entities");
      const settingsList = await GoogleCalendarSettings.filter({ user_id: currentUser.id });
      
      console.log('📅 Google Calendar Settings:', settingsList);
      
      if (settingsList.length > 0) {
        setSettings(settingsList[0]);
        console.log('✅ Settings found:', settingsList[0]);
      } else {
        setSettings(null);
        console.log('ℹ️ No settings found');
      }
    } catch (error) {
      console.error("❌ Error loading Google Calendar settings:", error);
    }
  };

  const handleConnect = () => {
    setIsConnecting(true);
    setError(null);

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${currentUser.id}`;

    const width = 600;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    console.log('🔗 Opening Google OAuth popup...');

    const popup = window.open(
      authUrl,
      'Google Calendar Login',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      setError('חלון ה-Popup נחסם. אנא אפשר popups עבור אתר זה.');
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    console.log('🔄 Starting sync...');
    setIsSyncing(true);
    setError(null);

    try {
      const { base44 } = await import("@/api/base44Client");
      
      console.log('📞 Calling sync-google-calendar function...');
      
      const response = await base44.functions.invoke('sync-google-calendar', {
        direction: 'from_google'
      });

      console.log('📥 Sync response:', response);

      if (response.data.success) {
        console.log(`✅ Synced ${response.data.imported} events from Google`);
        setError(null);
        if (onSync) {
          console.log('🔄 Calling onSync callback...');
          await onSync();
        }
        await loadSettings();
      } else {
        console.error('❌ Sync failed:', response.data);
        setError(response.data.error || 'שגיאה בסנכרון');
      }
    } catch (error) {
      console.error('❌ Error syncing:', error);
      setError(`שגיאה בסנכרון: ${error.message}`);
    } finally {
      setIsSyncing(false);
      console.log('✅ Sync completed');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('האם אתה בטוח שברצונך לנתק את Google Calendar?')) return;

    try {
      const { GoogleCalendarSettings } = await import("@/api/entities");
      
      if (settings?.id) {
        await GoogleCalendarSettings.update(settings.id, {
          sync_enabled: false,
          status: "מנותק"
        });
      }

      setSettings(null);
      console.log('✅ Disconnected from Google Calendar');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  };

  const isConnected = settings?.status === "מחובר";

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Google Calendar</h3>
            <div className="flex items-center gap-2 mt-1">
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="w-3 h-3 ml-1" />
                  מחובר
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  מנותק
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'מסנכרן...' : 'סנכרן עכשיו'}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                נתק
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {isConnecting ? 'מתחבר...' : 'התחבר'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200 mt-4">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-sm text-red-900">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {isConnected && settings?.last_sync && (
        <p className="text-xs text-gray-500 mt-4">
          סנכרון אחרון: {new Date(settings.last_sync).toLocaleString('he-IL')}
        </p>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>📅 סנכרון דו-כיווני עם Google Calendar</p>
        <ul className="mr-4 mt-2 space-y-1 text-xs">
          <li>• אירועים מ-Google יופיעו אוטומטית כאן</li>
          <li>• אירועים חדשים שתיצור יישמרו ב-Google</li>
          <li>• עדכונים מתסנכרנים בשני הכיוונים</li>
        </ul>
      </div>
    </div>
  );
}