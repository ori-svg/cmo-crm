import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

const SendMessageDialog = React.lazy(() => import("../components/whatsapp/SendMessageDialog"));
const CampaignsList = React.lazy(() => import("../components/whatsapp/CampaignsList"));
const WhatsAppStats = React.lazy(() => import("../components/whatsapp/WhatsAppStats"));

export default function WhatsAppCampaignsPage({ currentCompanyId, currentUser: propsUser }) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [whatsappSettings, setWhatsappSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(propsUser);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId && showSendDialog) {
      loadWhatsAppSettings();
    }
  }, [currentUser, currentCompanyId, showSendDialog]);

  const loadUser = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  };

  const loadWhatsAppSettings = async () => {
    setIsLoading(true);
    try {
      const { WhatsAppSettings } = await import("@/api/entities");
      const settings = await WhatsAppSettings.filter({ company_id: currentCompanyId });
      if (settings.length > 0) {
        setWhatsappSettings(settings[0]);
      } else {
        setWhatsappSettings(null);
      }
    } catch (error) {
      console.error("Failed to load WhatsApp settings:", error);
      setWhatsappSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              קמפייני דיוור WhatsApp
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              שלח הודעות Marketing ללקוחות שלך
            </p>
          </div>
          
          <Button
            onClick={() => setShowSendDialog(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            size="lg"
          >
            <Send className="w-5 h-5 ml-2" />
            קמפיין חדש
          </Button>
        </motion.div>

        <React.Suspense fallback={<div className="text-center py-4">טוען סטטיסטיקות...</div>}>
          <WhatsAppStats currentCompanyId={currentCompanyId} />
        </React.Suspense>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>שים לב:</strong> ניתן לשלוח רק תבניות (Templates) מאושרות על ידי Meta.
            </AlertDescription>
          </Alert>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-900">
              <strong>⏰ תזמון קמפיינים:</strong> עבור תזמון אוטומטי, יש להגדיר Cron Job חיצוני שקורא לפונקציה <code className="bg-amber-100 px-1 py-0.5 rounded">check-scheduled-campaigns</code> כל דקה.
              <br />
              <a href="https://cron-job.org" target="_blank" className="text-amber-700 hover:text-amber-900 underline font-semibold">
                לחץ כאן להגדרת Cron Job חינמי →
              </a>
            </AlertDescription>
          </Alert>
        </motion.div>

        <React.Suspense fallback={<div className="text-center py-8">טוען קמפיינים...</div>}>
          <CampaignsList currentCompanyId={currentCompanyId} currentUser={currentUser} />
        </React.Suspense>

        {showSendDialog && (
          <React.Suspense fallback={null}>
            <SendMessageDialog
              open={showSendDialog}
              onClose={() => setShowSendDialog(false)}
              whatsappSettings={whatsappSettings}
              currentCompanyId={currentCompanyId}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}