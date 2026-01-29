import React, { useState, useEffect } from "react";
import { Lead, Client, MetaCampaign } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import RevenueChart from "../components/dashboard/RevenueChart";
import LeadsBySourceChart from "../components/dashboard/LeadsBySourceChart";
import ConversionFunnel from "../components/dashboard/ConversionFunnel";
import CampaignsTable from "../components/dashboard/CampaignsTable";

const ADMIN_EMAIL = "ori@omerdaffan.com";

export default function DashboardPage({ currentCompanyId, currentUser: propsUser }) {
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("month");
  const [currentUser, setCurrentUser] = useState(propsUser);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadData();
    }
  }, [currentUser, currentCompanyId, dateRange]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadData = async () => {
    const isSuperAdmin = currentUser.email === ADMIN_EMAIL;
    const isCompanyAdmin = currentUser.user_role === 'company_admin';
    
    // חשב תאריכים לסינון
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "max":
        startDate = new Date(0);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let leadsData, clientsData, campaignsData;
    
    if (isSuperAdmin || isCompanyAdmin) {
      // הצג נתונים של החברה הנוכחית
      leadsData = await Lead.filter({ company_id: currentCompanyId }, "-created_date");
      clientsData = await Client.filter({ company_id: currentCompanyId }, "-created_date");
      
      // סנכרן קמפיינים לפי טווח תאריכים
      try {
        const { base44 } = await import("@/api/base44Client");
        await base44.functions.invoke('sync-meta-campaigns', {
          date_preset: dateRange === "week" ? "last_7d" : 
                       dateRange === "month" ? "last_30d" : 
                       dateRange === "year" ? "last_365d" : "maximum"
        });
      } catch (error) {
        console.error('שגיאה בסנכרון קמפיינים:', error);
      }
      
      campaignsData = await MetaCampaign.filter({ company_id: currentCompanyId }, "-date");
    } else {
      // Member - הצג רק נתונים שיצר
      leadsData = await Lead.filter({ 
        created_by: currentUser.email,
        company_id: currentCompanyId 
      }, "-created_date");
      clientsData = await Client.filter({ 
        created_by: currentUser.email,
        company_id: currentCompanyId 
      }, "-created_date");
      campaignsData = await MetaCampaign.filter({ 
        created_by: currentUser.email,
        company_id: currentCompanyId 
      }, "-date");
    }
    
    setLeads(leadsData);
    setClients(clientsData);
    setCampaigns(campaignsData);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Sync Meta campaigns first
      const { base44 } = await import("@/api/base44Client");
      const syncResponse = await base44.functions.invoke('sync-meta-campaigns');
      
      if (syncResponse.data.success) {
        console.log('✅ קמפיינים סונכרנו:', syncResponse.data.synced);
      }
    } catch (error) {
      console.error('שגיאה בסנכרון קמפיינים:', error);
    }
    
    // Then reload data
    await loadData();
    
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getFilteredData = () => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "max":
        startDate = new Date(0);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const filteredLeads = leads.filter(l => 
      new Date(l.created_date) >= startDate && new Date(l.created_date) <= now
    );

    const filteredClients = clients.filter(c => {
      const clientDate = c.payment_date 
        ? new Date(c.payment_date) 
        : new Date(c.created_date);
      
      if (c.revenue_type === "חד פעמי") {
        return clientDate >= startDate && clientDate <= now;
      }
      
      return clientDate <= now;
    });

    const filteredCampaigns = campaigns.filter(c => 
      c.date && new Date(c.date) >= startDate && new Date(c.date) <= now
    );

    return { filteredLeads, filteredClients, filteredCampaigns };
  };

  const { filteredLeads, filteredClients, filteredCampaigns } = getFilteredData();

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
              דאשבורד
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">מעקב אחר ביצועים ואנליטיקות</p>
          </div>
          
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px] brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">שבוע אחרון</SelectItem>
                <SelectItem value="month">חודש אחרון</SelectItem>
                <SelectItem value="year">שנה אחרונה</SelectItem>
                <SelectItem value="max">כל התקופה</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              רענן נתונים
            </Button>
          </div>
        </motion.div>

        <DashboardKPIs 
          leads={filteredLeads} 
          clients={filteredClients} 
          campaigns={filteredCampaigns}
          dateRange={dateRange}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <RevenueChart 
            campaigns={filteredCampaigns} 
            leads={filteredLeads}
            clients={filteredClients}
            dateRange={dateRange}
          />
          <LeadsBySourceChart leads={filteredLeads} />
        </div>

        <ConversionFunnel leads={filteredLeads} clients={filteredClients} />

        <CampaignsTable campaigns={filteredCampaigns} clients={filteredClients} />
      </div>
    </div>
  );
}