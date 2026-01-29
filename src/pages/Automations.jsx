import React, { useState, useEffect } from "react";
import { Automation } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

import AutomationsTable from "../components/automations/AutomationsTable";
import AddAutomationDialog from "../components/automations/AddAutomationDialog";

const SUPER_ADMIN_EMAIL = "ori@omerdaffan.com";

export default function AutomationsPage({ currentCompanyId, currentUser: propsUser }) {
  const [automations, setAutomations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [currentUser, setCurrentUser] = useState(propsUser);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState(null);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadEffectiveCompany();
    }
  }, [currentUser, currentCompanyId]);

  useEffect(() => {
    if (currentUser && effectiveCompanyId) {
      loadAutomations();
    }
  }, [currentUser, effectiveCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadEffectiveCompany = async () => {
    // בדוק אם החברה הנוכחית היא חברת בת
    // אם כן - האוטומציות צריכות להיות של חברת האם
    const { Company } = await import("@/api/entities");
    const companies = await Company.filter({ id: currentCompanyId });
    
    if (companies.length > 0 && companies[0].parent_company_id) {
      // זו חברת בת - השתמש בחברת האם לאוטומציות
      console.log('🔗 Sub-company detected - using parent company for automations');
      setEffectiveCompanyId(companies[0].parent_company_id);
    } else {
      // זו חברת אם או עצמאית - השתמש בחברה הנוכחית
      setEffectiveCompanyId(currentCompanyId);
    }
  };

  const loadAutomations = async () => {
    setIsLoading(true);
    const { Automation } = await import("@/api/entities");
    
    const isSuperAdmin = currentUser.email === SUPER_ADMIN_EMAIL;
    const isCompanyAdmin = currentUser.user_role === 'company_admin';
    
    let data;
    
    if (isSuperAdmin || isCompanyAdmin) {
      // הצג אוטומציות של החברה האפקטיבית (חברת אם)
      data = await Automation.filter({ company_id: effectiveCompanyId }, "-created_date");
      console.log(`📋 Loaded ${data.length} automations for company: ${effectiveCompanyId}`);
    } else {
      // Member - הצג רק אוטומציות שיצר
      data = await Automation.filter({ 
        created_by: currentUser.email,
        company_id: effectiveCompanyId 
      }, "-created_date");
    }
    
    setAutomations(data);
    setIsLoading(false);
  };

  const handleAddAutomation = async (automationData) => {
    // שמור את האוטומציה תחת החברה האפקטיבית (חברת אם)
    const dataToSave = {
      ...automationData,
      company_id: effectiveCompanyId
    };
    
    if (editingAutomation) {
      await Automation.update(editingAutomation.id, dataToSave);
    } else {
      await Automation.create(dataToSave);
    }
    setShowAddDialog(false);
    setEditingAutomation(null);
    await loadAutomations();
  };

  const handleToggleAutomation = async (automation) => {
    await Automation.update(automation.id, {
      is_active: !automation.is_active
    });
    await loadAutomations();
  };

  const handleEditAutomation = (automation) => {
    setEditingAutomation(automation);
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingAutomation(null);
  };

  if (!currentUser || !currentCompanyId || !effectiveCompanyId) {
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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              אוטומציות
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">נהל אוטומציות וטריגרים במערכת</p>
            {effectiveCompanyId !== currentCompanyId && (
              <p className="text-xs text-blue-600 mt-1">
                ℹ️ אוטומציות משותפות בין חברת אם וחברות בת
              </p>
            )}
          </div>
          
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף אוטומציה
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AutomationsTable
            automations={automations}
            isLoading={isLoading}
            onToggle={handleToggleAutomation}
            onEdit={handleEditAutomation}
            onRefresh={loadAutomations}
          />
        </motion.div>

        <AddAutomationDialog
          open={showAddDialog}
          onClose={handleCloseDialog}
          onSave={handleAddAutomation}
          editingAutomation={editingAutomation}
        />
      </div>
    </div>
  );
}