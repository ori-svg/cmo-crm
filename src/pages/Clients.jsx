import React, { useState, useEffect } from "react";
import { Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

import ClientsTable from "../components/clients/ClientsTable";
import AddClientDialog from "../components/clients/AddClientDialog";
import ClientsStats from "../components/clients/ClientsStats";

const SUPER_ADMIN_EMAIL = "ori@omerdaffan.com";

export default function ClientsPage({ currentCompanyId, currentUser: propsUser }) {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(propsUser);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadClients();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadClients = async () => {
    setIsLoading(true);
    const isSuperAdmin = currentUser.email === SUPER_ADMIN_EMAIL;
    const isCompanyAdmin = currentUser.user_role === 'company_admin';
    
    let data;
    
    if (isSuperAdmin || isCompanyAdmin) {
      // Super Admin או Company Admin - הצג לקוחות של החברה הנוכחית
      data = await Client.filter({ company_id: currentCompanyId }, "-created_date");
    } else {
      // Member - הצג רק לקוחות שיצר בחברה הנוכחית
      data = await Client.filter({ 
        created_by: currentUser.email,
        company_id: currentCompanyId 
      }, "-created_date");
    }
    
    setClients(data);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadClients();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddClient = async (clientData) => {
    // הוסף את ה-company_id ללקוח החדש
    const dataToCreate = {
      ...clientData,
      company_id: currentCompanyId
    };
    
    await Client.create(dataToCreate);
    setShowAddDialog(false);
    await loadClients();
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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              ניהול לקוחות
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">נהל את כל הלקוחות שלך במקום אחד</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 md:flex-none"
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              רענן נתונים
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="flex-1 md:flex-none bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף לקוח
            </Button>
          </div>
        </motion.div>

        <ClientsStats clients={clients} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ClientsTable
            clients={clients}
            isLoading={isLoading}
            onRefresh={loadClients}
          />
        </motion.div>

        <AddClientDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddClient}
        />
      </div>
    </div>
  );
}