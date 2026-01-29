import React, { useState, useEffect } from "react";
import { Lead, SavedView } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Filter, Save, Eye, Settings, Upload, Download } from "lucide-react";
import { motion } from "framer-motion";

import LeadsTable from "../components/leads/LeadsTable";
import AddLeadDialog from "../components/leads/AddLeadDialog";
import LeadFilters from "../components/leads/LeadFilters";
import SavedViewsMenu from "../components/leads/SavedViewsMenu";
import StatsBar from "../components/leads/StatsBar";
import TableSettingsDialog from "../components/leads/TableSettingsDialog";
import ImportLeadsDialog from "../components/leads/ImportLeadsDialog";
import BulkActionsToolbar from "../components/leads/BulkActionsToolbar"; // Added

const ADMIN_EMAIL = "ori@omerdaffan.com";

export default function LeadsPage({ currentCompanyId, currentUser }) {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [savedViews, setSavedViews] = useState([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]); // ✅ NEW: מעקב אחר לידים נבחרים
  const [isBulkProcessing, setIsBulkProcessing] = useState(false); // ✅ NEW: מעקב אחר עיבוד
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 }); // ✅ NEW: התקדמות

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadLeads();
      loadSavedViews();
    }
  }, [currentUser, currentCompanyId]);

  useEffect(() => {
    applyFilters();
  }, [leads, filters]);

  // ✅ useEffect - מסנכרן הצעות, טאגים וסטטוסים חדשים ל-localStorage
  useEffect(() => {
    if (leads.length > 0) {
      console.log('🔄 Starting sync, total leads:', leads.length);
      syncProposalsToLocalStorage();
      syncTagsToLocalStorage();
      syncStatusesToLocalStorage();
    }
  }, [leads]);

  const syncProposalsToLocalStorage = () => {
    if (!currentCompanyId) return;
    
    try {
      const storageKey = `lead_proposals_${currentCompanyId}`;
      const savedProposals = localStorage.getItem(storageKey);
      let existingProposals = [];
      
      if (savedProposals) {
        try {
          existingProposals = JSON.parse(savedProposals);
        } catch (e) {
          existingProposals = [];
        }
      }

      const allProposalsFromLeads = new Set();
      
      leads.forEach(lead => {
        if (lead.proposals && Array.isArray(lead.proposals)) {
          lead.proposals.forEach(proposal => {
            if (typeof proposal === 'string' && proposal.trim()) {
              allProposalsFromLeads.add(proposal.trim());
            } else if (typeof proposal === 'object' && proposal.name) {
              allProposalsFromLeads.add(proposal.name.trim());
            }
          });
        }
      });

      const newProposals = [...allProposalsFromLeads].filter(
        proposal => !existingProposals.includes(proposal)
      );

      if (newProposals.length > 0) {
        const updatedProposals = [...existingProposals, ...newProposals];
        localStorage.setItem(storageKey, JSON.stringify(updatedProposals));
      }
    } catch (error) {
      console.error('❌ Error syncing proposals:', error);
    }
  };

  const syncTagsToLocalStorage = () => {
    if (!currentCompanyId) return;
    
    try {
      const storageKey = `lead_tags_${currentCompanyId}`;
      const savedTags = localStorage.getItem(storageKey);
      let existingTags = [];
      
      if (savedTags) {
        try {
          existingTags = JSON.parse(savedTags);
        } catch (e) {
          existingTags = [];
        }
      }

      const allTagsFromLeads = new Set();
      
      leads.forEach(lead => {
        if (lead.tags && Array.isArray(lead.tags)) {
          lead.tags.forEach(tag => {
            if (typeof tag === 'string' && tag.trim()) {
              allTagsFromLeads.add(tag.trim());
            }
          });
        }
      });

      const newTags = [...allTagsFromLeads].filter(
        tag => !existingTags.includes(tag)
      );

      if (newTags.length > 0) {
        const updatedTags = [...existingTags, ...newTags];
        localStorage.setItem(storageKey, JSON.stringify(updatedTags));
      }
    } catch (error) {
      console.error('❌ Error syncing tags:', error);
    }
  };

  const syncStatusesToLocalStorage = () => {
    if (!currentCompanyId) return;
    
    try {
      const storageKey = `lead_statuses_${currentCompanyId}`;
      const savedStatuses = localStorage.getItem(storageKey);
      let existingStatuses = [];
      
      if (savedStatuses) {
        try {
          existingStatuses = JSON.parse(savedStatuses);
        } catch (e) {
          existingStatuses = [];
        }
      }

      const allStatusesFromLeads = new Set();
      
      leads.forEach(lead => {
        if (lead.status && typeof lead.status === 'string' && lead.status.trim()) {
          allStatusesFromLeads.add(lead.status.trim());
        }
      });

      const newStatuses = [...allStatusesFromLeads].filter(
        status => !existingStatuses.includes(status)
      );

      if (newStatuses.length > 0) {
        const updatedStatuses = [...existingStatuses, ...newStatuses];
        localStorage.setItem(storageKey, JSON.stringify(updatedStatuses));
        console.log(`✅ Synced ${newStatuses.length} new statuses:`, newStatuses);
      }
    } catch (error) {
      console.error('❌ Error syncing statuses:', error);
    }
  };

  const loadLeads = async () => {
    if (!currentUser) return; 
    
    setIsLoading(true);
    
    const isSuperAdmin = currentUser.email === ADMIN_EMAIL;
    const isCompanyAdmin = currentUser.user_role === 'company_admin';
    
    let data;
    
    // מיון לפי תאריך יצירה - הכי חדש ראשון
    if (isSuperAdmin) {
      if (currentCompanyId) {
        data = await Lead.filter({ company_id: currentCompanyId }, "-created_date");
      } else {
        data = await Lead.list("-created_date");
      }
    } else if (isCompanyAdmin) {
      data = await Lead.filter({ company_id: currentCompanyId || currentUser.company_id }, "-created_date");
    } else {
      data = await Lead.filter({ 
        created_by: currentUser.email,
        company_id: currentUser.company_id 
      }, "-created_date");
    }
    
    setLeads(data);
    setSelectedLeadIds([]); // ✅ NEW: נקה בחירות אחרי טעינה
    setIsLoading(false);
  };

  const loadSavedViews = async () => {
    if (!currentUser) return; 
    
    const views = await SavedView.filter({ 
      view_type: "לידים",
      created_by: currentUser.email 
    });
    setSavedViews(views);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeads();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const applyFilters = () => {
    let filtered = [...leads];
    
    if (filters.status && filters.status !== "הכל") {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }
    
    if (filters.source && filters.source !== "הכל") {
      filtered = filtered.filter(lead => lead.source === filters.source);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.first_name?.toLowerCase().includes(searchLower) ||
        lead.last_name?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(searchLower)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(lead => {
        if (!lead.tags || lead.tags.length === 0) return false;
        return filters.tags.some(filterTag => lead.tags.includes(filterTag));
      });
    }

    setFilteredLeads(filtered);
  };

  const handleAddLead = async (leadData) => {
    if (!currentUser) return; 
    
    const dataToCreate = {
      ...leadData,
      company_id: currentCompanyId || currentUser.company_id
    };
    
    await Lead.create(dataToCreate);
    setShowAddDialog(false);
    await loadLeads();
    
    const { AutomationEngine } = await import("../components/utils/AutomationEngine");
    await AutomationEngine.runAutomations("יצירת ליד", {
      lead: dataToCreate
    });
  };

  const handleSaveView = async (viewName) => {
    await SavedView.create({
      name: viewName,
      view_type: "לידים",
      filters: filters,
      sort_by: "-updated_date"
    });
    await loadSavedViews();
  };

  const handleLoadView = async (view) => {
    setFilters(view.filters || {});
  };

  const handleExportCSV = () => {
    const headers = ['שם פרטי', 'שם משפחה', 'אימייל', 'טלפון', 'מקור', 'סטטוס', 'קמפיין', 'הערות'];
    const rows = filteredLeads.map(lead => [
      lead.first_name || '',
      lead.last_name || '',
      lead.email || '',
      lead.phone || '',
      lead.source || '',
      lead.status || '',
      lead.fb_campaign || '',
      lead.notes || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportComplete = async () => {
    setShowImportDialog(false);
    await loadLeads();
  };

  // ✅ UPDATED: פעולות מרובות עם עיכוב ו-progress
  const handleBulkStatusChange = async (newStatus) => {
    if (selectedLeadIds.length === 0) return;
    
    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedLeadIds.length });
    
    try {
      // עבד ליד אחרי ליד עם עיכוי
      for (let i = 0; i < selectedLeadIds.length; i++) {
        const leadId = selectedLeadIds[i];
        
        try {
          await Lead.update(leadId, { status: newStatus });
          setBulkProgress({ current: i + 1, total: selectedLeadIds.length });
          
          // עיכוי של 150ms בין עדכונים (למנוע rate limit)
          if (i < selectedLeadIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        } catch (error) {
          console.error(`Error updating lead ${leadId}:`, error);
        }
      }
      
      // רענן את הרשימה
      await loadLeads();
      setSelectedLeadIds([]);
      
    } catch (error) {
      console.error('Error in bulk status change:', error);
      alert(`שגיאה בעדכון סטטוס: ${error.message}`);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkSourceChange = async (newSource) => {
    if (selectedLeadIds.length === 0) return;
    
    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedLeadIds.length });
    
    try {
      // עבד ליד אחרי ליד עם עיכוי
      for (let i = 0; i < selectedLeadIds.length; i++) {
        const leadId = selectedLeadIds[i];
        
        try {
          await Lead.update(leadId, { source: newSource });
          setBulkProgress({ current: i + 1, total: selectedLeadIds.length });
          
          // עיכוי של 150ms בין עדכונים
          if (i < selectedLeadIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        } catch (error) {
          console.error(`Error updating lead ${leadId}:`, error);
        }
      }
      
      // רענן את הרשימה
      await loadLeads();
      setSelectedLeadIds([]);
      
    } catch (error) {
      console.error('Error in bulk source change:', error);
      alert(`שגיאה בעדכון מקור: ${error.message}`);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    
    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך למחוק ${selectedLeadIds.length} לידים? פעולה זו אינה ניתנת לביטוב.`
    );
    
    if (!confirmed) return;
    
    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedLeadIds.length });
    
    try {
      // מחק ליד אחרי ליד עם עיכוי
      for (let i = 0; i < selectedLeadIds.length; i++) {
        const leadId = selectedLeadIds[i];
        
        try {
          await Lead.delete(leadId);
          setBulkProgress({ current: i + 1, total: selectedLeadIds.length });
          
          // עיכוי של 150ms בין מחיקות
          if (i < selectedLeadIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        } catch (error) {
          console.error(`Error deleting lead ${leadId}:`, error);
        }
      }
      
      // רענן את הרשימה
      await loadLeads();
      setSelectedLeadIds([]);
      
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert(`שגיאה במחיקת לידים: ${error.message}`);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkTagsAdd = async (tagsToAdd) => {
    if (selectedLeadIds.length === 0 || tagsToAdd.length === 0) return;
    
    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedLeadIds.length });
    
    try {
      for (let i = 0; i < selectedLeadIds.length; i++) {
        const leadId = selectedLeadIds[i];
        const lead = leads.find(l => l.id === leadId);
        
        try {
          // מיזוג טאגים קיימים עם חדשים (ללא כפילויות)
          const existingTags = lead?.tags || [];
          const mergedTags = [...new Set([...existingTags, ...tagsToAdd])];
          
          await Lead.update(leadId, { tags: mergedTags });
          setBulkProgress({ current: i + 1, total: selectedLeadIds.length });
          
          if (i < selectedLeadIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        } catch (error) {
          console.error(`Error updating lead ${leadId}:`, error);
        }
      }
      
      await loadLeads();
      setSelectedLeadIds([]);
      
    } catch (error) {
      console.error('Error in bulk tags add:', error);
      alert(`שגיאה בהוספת טאגים: ${error.message}`);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleSelectLead = (leadId, isSelected) => {
    if (isSelected) {
      setSelectedLeadIds(prev => [...prev, leadId]);
    } else {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedLeadIds(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  // אם אין משתמש - הצג רק לואדר קטן במרכז הדף (לא להחליף את כל ה-layout)
  if (!currentUser) {
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-full mx-auto space-y-6">
          <div className="flex items-center justify-center py-20">
            <div className="text-lg text-gray-500">טוען נתוני משתמש...</div>
          </div>
        </div>
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
              ניהול לידים
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">נהל את כל הלידים שלך במקום אחד</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="flex-1 md:flex-none gap-2"
            >
              <Upload className="w-4 h-4" />
              ייבא CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex-1 md:flex-none gap-2"
              disabled={filteredLeads.length === 0}
            >
              <Download className="w-4 h-4" />
              ייצא CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(true)}
              className="flex-1 md:flex-none gap-2"
            >
              <Settings className="w-4 h-4" />
              הגדרות
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 md:flex-none"
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              רענן
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף ליד
            </Button>
          </div>
        </motion.div>

        <StatsBar leads={leads} />

        <TableSettingsDialog
          open={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
        />

        {/* ✅ UPDATED: Bulk Actions Toolbar with progress */}
        {selectedLeadIds.length > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedLeadIds.length}
            onStatusChange={handleBulkStatusChange}
            onSourceChange={handleBulkSourceChange}
            onTagsAdd={handleBulkTagsAdd}
            onDelete={handleBulkDelete}
            onCancel={() => setSelectedLeadIds([])}
            isProcessing={isBulkProcessing}
            progress={bulkProgress}
            currentCompanyId={currentCompanyId}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3"
        >
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            סינון
          </Button>
          
          <SavedViewsMenu
            savedViews={savedViews}
            onLoadView={handleLoadView}
            onSaveView={handleSaveView}
          />
        </motion.div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <LeadFilters filters={filters} setFilters={setFilters} currentCompanyId={currentCompanyId} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <LeadsTable
            leads={filteredLeads}
            isLoading={isLoading}
            onRefresh={loadLeads}
            selectedLeadIds={selectedLeadIds}
            onSelectLead={handleSelectLead}
            onSelectAll={handleSelectAll}
          />
        </motion.div>

        <AddLeadDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddLead}
          currentCompanyId={currentCompanyId}
        />

        <ImportLeadsDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImportComplete={handleImportComplete}
          currentCompanyId={currentCompanyId || currentUser.company_id}
        />
      </div>
    </div>
  );
}