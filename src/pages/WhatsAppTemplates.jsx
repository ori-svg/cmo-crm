import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import TemplatesManager from "../components/whatsapp/TemplatesManager";

export default function WhatsAppTemplatesPage({ currentCompanyId, currentUser: propsUser }) {
  const [whatsappSettings, setWhatsappSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(propsUser);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadSettings();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to load user:", error);
    }
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { WhatsAppSettings } = await import("@/api/entities");
      // טען הגדרות לפי החברה הנוכחית
      const settingsList = await WhatsAppSettings.filter({ company_id: currentCompanyId });
      if (settingsList.length > 0) {
        setWhatsappSettings(settingsList[0]);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    setIsLoading(false);
  };

  const handleTestSend = async () => {
    if (!testPhone || !testTemplate) {
      alert("אנא מלא את כל השדות");
      return;
    }

    setIsTesting(true);

    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('test-whatsapp-send', {
        template_name: testTemplate,
        phone_number: testPhone,
        company_id: currentCompanyId
      });

      if (response.data.success) {
        alert(`✅ הודעה נשלחה!\nMessage ID: ${response.data.message_id}\nStatus: ${response.data.status}`);
      } else {
        alert(`❌ שגיאה: ${response.data.error}\nקוד שגיאה: ${response.data.error_code || 'N/A'}`);
      }
    } catch (error) {
      alert(`❌ שגיאה: ${error.message}`);
    }

    setIsTesting(false);
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('check-whatsapp-status', {
        company_id: currentCompanyId
      });
      
      if (response.data.success) {
        setStatusInfo(response.data);
        
        const info = response.data.insights;
        let message = `📱 מצב החשבון:\n\n`;
        message += `📞 מספר: ${info.phone_number}\n`;
        message += `⭐ דירוג איכות: ${info.quality_rating}\n`;
        message += `🔧 מצב חשבון: ${info.account_mode}\n`;
        message += `📊 Messaging Tier: ${info.messaging_tier}\n`;
        message += `✅ סטטוס אימות: ${info.code_verification_status}\n`;
        message += `🏢 Official Business: ${info.is_official ? 'Yes' : 'No'}\n\n`;
        message += `📝 תבניות:\n`;
        message += `- מאושרות: ${info.approved_templates}\n`;
        message += `- סה"כ: ${info.total_templates}\n\n`;
        
        if (info.code_verification_status !== 'VERIFIED') {
          message += `⚠️ המספר לא מאומת! זה עלול למנוע משלוח קמפיינים MARKETING.`;
        }
        
        alert(message);
      } else {
        alert(`❌ שגיאה: ${response.data.error || 'אירעה שגיאה בלתי צפויה בעת בדיקת הסטטוס.'}`);
      }
    } catch (error) {
      alert(`שגיאה: ${error.message}`);
    }
    setIsCheckingStatus(false);
  };

  if (!currentUser || !currentCompanyId) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            תבניות הודעות WhatsApp
          </h1>
          <p className="text-gray-500 mt-2">נהל את תבניות ההודעות המאושרות שלך</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleCheckStatus}
            variant="outline"
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? "בודק..." : "בדוק סטטוס חשבון"}
          </Button>
          <Button
            onClick={() => setShowTestDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 ml-2" />
            בדיקת שליחה
          </Button>
        </div>
      </div>

      {statusInfo && statusInfo.insights.code_verification_status !== 'VERIFIED' && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-sm text-red-900">
            <strong>⚠️ המספר לא מאומת!</strong>
            <br />
            סטטוס אימות: {statusInfo.insights.code_verification_status}
            <br />
            זה עלול למנוע שליחת קמפיינים MARKETING. פנה לתמיכה של Meta לפרטים.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">טוען...</p>
          </CardContent>
        </Card>
      ) : !whatsappSettings || whatsappSettings.status !== "מחובר" ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">WhatsApp לא מחובר. עבור להגדרות כדי להתחבר.</p>
          </CardContent>
        </Card>
      ) : (
        <TemplatesManager 
          whatsappSettings={whatsappSettings} 
          currentCompanyId={currentCompanyId}
        />
      )}

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>בדיקת שליחת הודעה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>מספר טלפון</Label>
              <Input
                placeholder="050-1234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>שם טמפלייט</Label>
              <Input
                placeholder="hello_world"
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={isTesting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isTesting ? "שולח..." : "שלח הודעת בדיקה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}