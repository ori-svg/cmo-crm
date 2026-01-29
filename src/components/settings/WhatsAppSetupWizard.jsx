import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageCircle,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Zap,
  Sparkles,
  Save,
} from "lucide-react";

const META_APP_ID = "1509969996807376";
const WHATSAPP_CONFIG_ID = "1358988332537820";
const REDIRECT_URI = "https://cmo-crm.com/api/functions/whatsapp-oauth-callback";

export default function WhatsAppSetupWizard({
  open,
  onClose,
  onComplete,
  currentCompanyId,
}) {
  const [activeTab, setActiveTab] = useState("embedded");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // ✅ שדות החיבור הידני
  const [manualData, setManualData] = useState({
    business_account_id: "",
    phone_number_id: "",
    access_token: "",
    webhook_verify_token: "cmo_crm_whatsapp_2024_secure_token"
  });

  // ✅ לחיצה על "התחבר ל-WhatsApp" (Embedded Signup)
  const handleEmbeddedSignup = () => {
    setConnectionError(null);
    setIsConnecting(true);

    if (onClose) onClose();

    // Embedded Signup רגיל - מאפשר לבחור מספרים קיימים מ-Meta Business
    const signupUrl =
      `https://www.facebook.com/v18.0/dialog/oauth` +
      `?client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${currentCompanyId}` +
      `&config_id=${WHATSAPP_CONFIG_ID}` +
      `&response_type=code` +
      `&override_default_response_type=true` +
      `&scope=whatsapp_business_management,whatsapp_business_messaging`;

    console.log("🚀 Opening WhatsApp Embedded Signup:", signupUrl);

    const width = 700;
    const height = 850;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      signupUrl,
      "WhatsAppEmbeddedSignup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      setConnectionError("הדפדפן חסם את הפופאפ. אפשר פופאפים ונסה שוב.");
      setIsConnecting(false);
      return;
    }

    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        setIsConnecting(false);
        console.log("❌ Popup closed by user");
      }
    }, 1000);
  };

  // ✅ שמירה ידנית
  const handleManualConnect = async () => {
    // ולידציה
    if (!manualData.business_account_id || !manualData.phone_number_id || !manualData.access_token) {
      alert("יש למלא את כל השדות החובה");
      return;
    }

    setIsSaving(true);
    setConnectionError(null);

    try {
      const { base44 } = await import("@/api/base44Client");
      
      // בדוק אם יש הגדרות קיימות
      const existingSettings = await base44.entities.WhatsAppSettings.filter({
        company_id: currentCompanyId
      });

      const settingsData = {
        company_id: currentCompanyId,
        business_account_id: manualData.business_account_id,
        phone_number_id: manualData.phone_number_id,
        access_token: manualData.access_token,
        webhook_verify_token: manualData.webhook_verify_token,
        status: "מחובר",
        last_sync: new Date().toISOString()
      };

      if (existingSettings.length > 0) {
        await base44.entities.WhatsAppSettings.update(
          existingSettings[0].id,
          settingsData
        );
        console.log("✅ Updated WhatsApp settings manually");
      } else {
        await base44.entities.WhatsAppSettings.create(settingsData);
        console.log("✅ Created WhatsApp settings manually");
      }

      alert("✅ WhatsApp חובר בהצלחה!");
      
      if (onComplete) {
        await onComplete();
      }
      
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error("❌ Error in manual WhatsApp connection:", error);
      setConnectionError(`שגיאה: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <div>חיבור WhatsApp Business</div>
              <p className="text-sm text-gray-500 font-normal mt-1">
                בחר שיטת חיבור
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="embedded" className="gap-2">
              <Zap className="w-4 h-4" /> חיבור מהיר
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <KeyRound className="w-4 h-4" /> חיבור ידני
            </TabsTrigger>
          </TabsList>

          {/* 🔹 חיבור מהיר */}
          <TabsContent value="embedded" className="space-y-6 py-2">
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>חיבור מהיר ל־WhatsApp (מומלץ)</strong>
                <br />
                נפתח פופאפ יחיד בלבד לתהליך הרשמי של Meta, ללא צורך בחלונות נוספים.
              </AlertDescription>
            </Alert>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> יתרונות:
              </h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  פופאפ יחיד בלבד - ללא כפילויות
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  תהליך רשמי ומאובטח של Meta
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  תמיכה מלאה במספרים קיימים מ-Meta Business Suite
                </li>
              </ul>
            </div>

            {connectionError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  {connectionError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                ביטול
              </Button>
              <Button
                onClick={handleEmbeddedSignup}
                disabled={isConnecting}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-base font-bold"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                    מתחבר...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 ml-2" />
                    התחבר ל־WhatsApp
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* 🔹 חיבור ידני */}
          <TabsContent value="manual" className="space-y-4 py-2">
            <Alert className="bg-purple-50 border-purple-200">
              <KeyRound className="w-5 h-5 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <strong>חיבור ידני</strong>
                <br />
                מלא את פרטי ה־API שלך מ-Meta Business Suite
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_account_id">
                  Business Account ID *
                </Label>
                <Input
                  id="business_account_id"
                  value={manualData.business_account_id}
                  onChange={(e) => setManualData({...manualData, business_account_id: e.target.value})}
                  placeholder="481478901720899"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  מזהה חשבון העסק ב-WhatsApp Business
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number_id">
                  Phone Number ID *
                </Label>
                <Input
                  id="phone_number_id"
                  value={manualData.phone_number_id}
                  onChange={(e) => setManualData({...manualData, phone_number_id: e.target.value})}
                  placeholder="486609121210528"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  מזהה מספר הטלפון ב-WhatsApp Business API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access_token">
                  Access Token *
                </Label>
                <Input
                  id="access_token"
                  type="password"
                  value={manualData.access_token}
                  onChange={(e) => setManualData({...manualData, access_token: e.target.value})}
                  placeholder="EAAxx..."
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  System User Token מ-Meta Business Suite (לא פג תוקף)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_verify_token">
                  Webhook Verify Token
                </Label>
                <Input
                  id="webhook_verify_token"
                  value={manualData.webhook_verify_token}
                  onChange={(e) => setManualData({...manualData, webhook_verify_token: e.target.value})}
                  placeholder="cmo_crm_whatsapp_2024_secure_token"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  טוקן זה ישמש לאימות ה-Webhook מול Meta
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>איפה למצוא את הפרטים?</strong>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    <li>עבור ל-Meta Business Suite</li>
                    <li>Settings → WhatsApp accounts</li>
                    <li>בחר את החשבון שלך</li>
                    <li>העתק Business Account ID ו-Phone Number ID</li>
                    <li>צור System User Token עם הרשאות whatsapp_business_messaging</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>

            {connectionError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  {connectionError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                ביטול
              </Button>
              <Button
                onClick={handleManualConnect}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 h-12"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 ml-2" />
                    שמור והתחבר
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-gray-500 pt-4">
          🔒 כל התהליך מאובטח ומאושר על ידי Meta
        </p>
      </DialogContent>
    </Dialog>
  );
}