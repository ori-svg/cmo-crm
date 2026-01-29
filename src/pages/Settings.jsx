import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

// Import components
import MetaSettingsComponent from "../components/settings/MetaSettings";
import AppearanceSettings from "../components/settings/AppearanceSettings";
import WebhooksSettings from "../components/settings/WebhooksSettings";
import WhatsAppSettingsComponent from "../components/settings/WhatsAppSettings";

export default function SettingsPage({ currentCompanyId, currentUser: propsUser }) {
  const [metaSettings, setMetaSettings] = useState(null);
  const [whatsappSettings, setWhatsAppSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(propsUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadMetaSettings();
      loadWhatsAppSettings();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadMetaSettings = async () => {
    setIsLoading(true);
    const { MetaSettings } = await import("@/api/entities");
    
    const settings = await MetaSettings.filter({ company_id: currentCompanyId });
    if (settings.length > 0) {
      setMetaSettings(settings[0]);
    } else {
      setMetaSettings(null);
    }
    setIsLoading(false);
  };

  const loadWhatsAppSettings = async () => {
    const { WhatsAppSettings } = await import("@/api/entities");
    
    const settings = await WhatsAppSettings.filter({ company_id: currentCompanyId });
    if (settings.length > 0) {
      setWhatsAppSettings(settings[0]);
    } else {
      setWhatsAppSettings(null);
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
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
            הגדרות
          </h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">נהל את הגדרות המערכת והאינטגרציות</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <AppearanceSettings currentCompanyId={currentCompanyId} />
          <WhatsAppSettingsComponent 
            whatsappSettings={whatsappSettings} 
            onUpdate={loadWhatsAppSettings}
            currentCompanyId={currentCompanyId}
          />
          <MetaSettingsComponent 
            metaSettings={metaSettings} 
            onUpdate={loadMetaSettings}
            currentCompanyId={currentCompanyId}
          />
          <WebhooksSettings />
        </motion.div>
      </div>
    </div>
  );
}