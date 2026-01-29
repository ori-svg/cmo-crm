import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  Send, 
  Users, 
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

import SendMessageDialog from "../components/whatsapp/SendMessageDialog";
import CampaignsList from "../components/whatsapp/CampaignsList";
import WhatsAppStats from "../components/whatsapp/WhatsAppStats";
import TemplatesManager from "../components/whatsapp/TemplatesManager";

export default function WhatsAppMarketingPage() {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [whatsappSettings, setWhatsappSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWhatsAppSettings();
  }, []);

  const loadWhatsAppSettings = async () => {
    setIsLoading(true);
    const { WhatsAppSettings } = await import("@/api/entities");
    const settings = await WhatsAppSettings.list();
    if (settings.length > 0) {
      setWhatsappSettings(settings[0]);
    }
    setIsLoading(false);
  };

  const isConnected = whatsappSettings?.status === "מחובר";

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              WhatsApp לא מחובר
            </h2>
            <p className="text-gray-600 mb-6">
              כדי לשלוח הודעות WhatsApp, עליך להתחבר תחילה
            </p>
            <Button
              onClick={() => window.location.href = "/pages/Settings"}
              className="bg-green-600 hover:bg-green-700"
            >
              לך להגדרות
            </Button>
          </CardContent>
        </Card>
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
              WhatsApp Marketing
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              שלח הודעות Marketing ללקוחות שלך
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link to={createPageUrl("WhatsAppMessages")}>
              <Button
                variant="outline"
                className="gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                הודעות ושיחות
              </Button>
            </Link>
            <Button
              onClick={() => setShowSendDialog(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              size="lg"
            >
              <Send className="w-5 h-5 ml-2" />
              שלח הודעה חדשה
            </Button>
          </div>
        </motion.div>

        <WhatsAppStats />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>שים לב:</strong> ניתן לשלוח רק תבניות (Templates) מאושרות על ידי Meta.
              <br />
              תבניות שטרם אושרו לא יישלחו.
            </AlertDescription>
          </Alert>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <TemplatesManager whatsappSettings={whatsappSettings} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CampaignsList />
        </motion.div>

        <SendMessageDialog
          open={showSendDialog}
          onClose={() => setShowSendDialog(false)}
          whatsappSettings={whatsappSettings}
        />
      </div>
    </div>
  );
}