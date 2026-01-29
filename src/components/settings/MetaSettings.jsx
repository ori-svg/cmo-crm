
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Facebook, Save, AlertCircle, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, Unlink, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const META_APP_ID = '1509969996807376'; // Replace with your actual Meta App ID if needed, or ensure it's loaded from env
const META_REDIRECT_URI = 'https://cmo-crm.com/api/functions/meta-oauth-callback';
const META_ADS_CONFIG_ID = '1322185842920896'; // Configuration ID for Meta Ads

export default function MetaSettings({ metaSettings, onUpdate, currentCompanyId }) {
  const [settings, setSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadSettings();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    const { MetaSettings } = await import("@/api/entities");
    
    // טען הגדרות לפי החברה הנוכחית
    const settingsList = await MetaSettings.filter({ company_id: currentCompanyId });
    if (settingsList.length > 0) {
      setSettings(settingsList[0]);
    } else {
      setSettings({
        access_token: "",
        ad_account_id: "",
        pixel_id: "",
        page_id: "",
        app_id: "",
        app_secret: "",
        status: "מנותק",
        company_id: currentCompanyId
      });
    }
    setIsLoading(false);
  };

  const handleOAuthConnect = () => {
    setIsConnecting(true);

    // ✅ שימוש ב-Configuration ID במקום scope
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${META_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&` +
      `config_id=${META_ADS_CONFIG_ID}&` + // ← שימוש ב-Configuration ID
      `state=${currentCompanyId}&` +
      `response_type=code&` +
      `display=popup`;

    const popup = window.open(
      authUrl,
      'Meta Ads OAuth',
      'width=600,height=700,scrollbars=yes'
    );

    let checkPopupInterval;
    if (popup) {
      checkPopupInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupInterval);
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage); // Clean up listener even if popup closes manually
        }
      }, 1000);
    } else {
      setIsConnecting(false);
      alert("חיבור חסום על ידי חוסם חלונות קופצים. אנא אפשר חלונות קופצים לאתר זה.");
      return;
    }

    const handleMessage = async (event) => {
      // Ensure the message is from a trusted origin, ideally from your redirect URI domain
      // For simplicity, we're checking for specific event data, but origin validation is recommended in production
      if (event.data && (event.data.event === 'meta_connected' || event.data.event === 'meta_error')) {
        clearInterval(checkPopupInterval);
        setIsConnecting(false);
        
        if (popup) popup.close();
        
        window.removeEventListener('message', handleMessage);
        
        if (event.data.event === 'meta_connected') {
          console.log('✅ Meta Ads OAuth success:', event.data);
          alert("✅ Meta Ads חוברו בהצלחה!");
          if (onUpdate) {
            await onUpdate();
          }
          await loadSettings();
        } else if (event.data.event === 'meta_error') {
          alert(`שגיאה בחיבור: ${event.data.error || 'חיבור נכשל'}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { MetaSettings } = await import("@/api/entities");
    
    const dataToSave = {
      ...settings,
      company_id: currentCompanyId
    };
    
    try {
      if (settings?.id) {
        await MetaSettings.update(settings.id, dataToSave);
      } else {
        const newSettings = await MetaSettings.create(dataToSave);
        setSettings(newSettings);
      }
      if (onUpdate) onUpdate();
      alert("הגדרות נשמרו בהצלחה!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("שגיאה בשמירת ההגדרות.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings?.access_token) {
      alert("נא למלא Access Token");
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me?access_token=${settings.access_token}`
      );

      if (response.ok) {
        alert("✅ החיבור תקין!");
        const updatedSettings = { ...settings, status: "מחובר", last_refresh: new Date().toISOString() };
        setSettings(updatedSettings);
        
        const { MetaSettings } = await import("@/api/entities");
        if (settings.id) {
          await MetaSettings.update(settings.id, updatedSettings);
        }
      } else {
        const errorData = await response.json();
        alert(`❌ החיבור נכשל. בדוק את ה-Access Token. ${errorData.error?.message || ''}`);
        setSettings({ ...settings, status: "שגיאה" });
      }
    } catch (error) {
      alert("❌ שגיאה בבדיקת החיבור");
      setSettings({ ...settings, status: "שגיאה" });
    }
  };

  const handleDisconnect = async () => {
    if (!settings) return;
    
    setIsDisconnecting(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      
      if (settings.id) {
        await base44.entities.MetaSettings.delete(settings.id);
      }
      
      setShowDisconnectDialog(false);
      // Reset settings to initial disconnected state
      setSettings({
        access_token: "",
        ad_account_id: "",
        pixel_id: "",
        page_id: "",
        app_id: "",
        app_secret: "",
        status: "מנותק",
        company_id: currentCompanyId
      });
      
      if (onUpdate) {
        await onUpdate();
      }
      
      alert('✅ Meta Ads נותק בהצלחה');
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert(`❌ שגיאה בניתוק: ${error.message}`);
    }
    setIsDisconnecting(false);
  };

  if (!currentUser || !currentCompanyId) {
    return <div>טוען...</div>;
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <p className="text-gray-600 text-sm">טוען הגדרות Meta...</p>
        </CardContent>
      </Card>
    );
  }

  const isConnected = settings?.status === "מחובר";

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader 
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-b cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Facebook className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Meta (Facebook) Ads</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle2 className="w-3 h-3 ml-1" />
                      מחובר
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                      <AlertCircle className="w-3 h-3 ml-1" />
                      {settings?.status || "מנותק"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </Button>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>חשוב:</strong> הגדרות אלו ספציפיות לחברה הנוכחית בלבד.
                <br />
                חיבור דרך OAuth מומלץ לקבלת גישה מאובטחת ארוכת טווח.
              </AlertDescription>
            </Alert>

            {/* Status Banner when connected */}
            {isConnected && settings && (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900 text-lg">Meta Ads מחובר!</p>
                    {settings.ad_account_id && (
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>חשבון מודעות:</strong> {settings.ad_account_id}
                      </p>
                    )}
                    {settings.pixel_id && (
                      <p className="text-sm text-green-700 mt-1">
                        <strong>✅ Pixel ID:</strong> {settings.pixel_id} (Conversions API מוכן!)
                      </p>
                    )}
                    {!settings.pixel_id && (
                      <p className="text-sm text-orange-700 mt-1">
                        <strong>⚠️ Pixel ID חסר</strong> - Conversions API לא יעבוד
                      </p>
                    )}
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white text-sm px-4 py-2">
                  פעיל
                </Badge>
              </div>
            )}

            {/* ✅ NEW: Warning if connected without Pixel */}
            {isConnected && !settings?.pixel_id && (
              <Alert className="bg-orange-50 border-orange-300">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-sm text-orange-900">
                  <strong>שים לב:</strong> לא נמצא Pixel ID. ללא Pixel, ה-Conversions API לא יעבוד.
                  <br />
                  אנא הזן את ה-Pixel ID ידנית למטה או התחבר מחדש עם חשבון שיש לו פיקסל.
                </AlertDescription>
              </Alert>
            )}

            {settings?.last_refresh && (
              <p className="text-xs text-gray-500 text-center">
                רענון אחרון: {new Date(settings.last_refresh).toLocaleString('he-IL')}
              </p>
            )}

            {/* Connect or Disconnect buttons */}
            {!isConnected ? (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-900 mb-3 text-lg">חיבור מהיר דרך OAuth</h3>
                <p className="text-sm text-blue-800 mb-4">
                  התחבר לחשבון Meta Ads שלך בקליק אחד וקבל גישה אוטומטית לנתוני הקמפיינים
                </p>
                <Button
                  onClick={handleOAuthConnect}
                  disabled={isConnecting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-white"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                      מתחבר...
                    </>
                  ) : (
                    <>
                      <Facebook className="w-5 h-5 ml-2" />
                      התחבר עם Meta
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDisconnectDialog(true)}
                  variant="outline"
                  className="flex-1 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <Unlink className="w-4 h-4 ml-2" />
                  נתק Meta Ads
                </Button>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-4">או הזן פרטים ידנית:</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access_token">Access Token *</Label>
                  <Input
                    id="access_token"
                    type="password"
                    value={settings?.access_token || ""}
                    onChange={(e) => setSettings({...settings, access_token: e.target.value})}
                    placeholder="EAAxx..."
                  />
                  <p className="text-xs text-gray-500">
                    טוקן גישה ארוך טווח מ-Meta (System User Token מומלץ)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad_account_id">Ad Account ID</Label>
                  <Input
                    id="ad_account_id"
                    value={settings?.ad_account_id || ""}
                    onChange={(e) => setSettings({...settings, ad_account_id: e.target.value})}
                    placeholder="act_123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pixel_id">Pixel ID</Label>
                  <Input
                    id="pixel_id"
                    value={settings?.pixel_id || ""}
                    onChange={(e) => setSettings({...settings, pixel_id: e.target.value})}
                    placeholder="123456789012345"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page_id">Page ID</Label>
                  <Input
                    id="page_id"
                    value={settings?.page_id || ""}
                    onChange={(e) => setSettings({...settings, page_id: e.target.value})}
                    placeholder="123456789012345"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app_id">App ID</Label>
                    <Input
                      id="app_id"
                      value={settings?.app_id || ""}
                      onChange={(e) => setSettings({...settings, app_id: e.target.value})}
                      placeholder="123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="app_secret">App Secret</Label>
                    <Input
                      id="app_secret"
                      type="password"
                      value={settings?.app_secret || ""}
                      onChange={(e) => setSettings({...settings, app_secret: e.target.value})}
                      placeholder="xxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  בדוק חיבור
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {isSaving ? "שומר..." : "שמור הגדרות"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              נתק Meta Ads
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-3">
              <p>
                <strong>האם אתה בטוח שברצונך לנתק את Meta Ads?</strong>
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ שים לב:</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                  <li>לא תוכל לסנכרן נתוני קמפיינים</li>
                  <li>הדאשבורד לא יציג נתונים מ-Meta</li>
                  <li>נתונים קיימים יישמרו אך לא יתעדכנו</li>
                  <li>תצטרך להתחבר מחדש כדי להמשיך לקבל נתונים</li>
                </ul>
              </div>
              {settings && settings.ad_account_id && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                  <p className="text-gray-700">
                    <strong>חשבון שינותק:</strong> {settings.ad_account_id}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
            >
              ביטול
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDisconnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  מנתק...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 ml-2" />
                  כן, נתק Meta Ads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
