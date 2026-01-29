import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Save, Plus, X, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AVAILABLE_COLUMNS = [
  { id: "first_name", label: "שם פרטי", default: true },
  { id: "last_name", label: "שם משפחה", default: true },
  { id: "email", label: "אימייל", default: true },
  { id: "phone", label: "טלפון", default: true },
  { id: "source", label: "מקור", default: true },
  { id: "status", label: "סטטוס", default: true },
  { id: "fb_campaign", label: "קמפיין", default: true },
  { id: "created_date", label: "תאריך יצירה", default: true },
  { id: "notes", label: "הערות", default: false },
];

export default function TableSettingsDialog({ open, onClose }) {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState(null);
  
  // ניהול טאגים
  const [availableTags, setAvailableTags] = useState([]);
  const [newTag, setNewTag] = useState("");

  // ניהול סטטוסים
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState("");
  const [editingStatus, setEditingStatus] = useState(null);
  const [editStatusValue, setEditStatusValue] = useState("");

  // ניהול הצעות
  const [availableProposals, setAvailableProposals] = useState([]);
  const [newProposal, setNewProposal] = useState("");
  const [editingProposal, setEditingProposal] = useState(null);
  const [editProposalValue, setEditProposalValue] = useState("");

  // ניהול מקורות
  const [availableSources, setAvailableSources] = useState([]);
  const [newSource, setNewSource] = useState("");
  const [editingSource, setEditingSource] = useState(null);
  const [editSourceValue, setEditSourceValue] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadEffectiveCompany();
    }
  }, [currentUser]);

  useEffect(() => {
    if (effectiveCompanyId) {
      loadSettings();
      loadTags();
      loadStatuses();
      loadProposals();
      loadSources(); // NEW
    }
  }, [effectiveCompanyId, open]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadEffectiveCompany = async () => {
    const companyId = localStorage.getItem(`currentCompany_${currentUser.id}`);
    
    if (!companyId) {
      setEffectiveCompanyId(currentUser.company_id);
      return;
    }

    try {
      const { Company } = await import("@/api/entities");
      const companies = await Company.filter({ id: companyId });
      
      if (companies.length > 0 && companies[0].parent_company_id) {
        setEffectiveCompanyId(companies[0].parent_company_id);
      } else {
        setEffectiveCompanyId(companyId);
      }
    } catch (error) {
      console.error("Error loading effective company:", error);
      setEffectiveCompanyId(companyId);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem(`leadsTableColumns_${effectiveCompanyId}`);
    
    if (saved) {
      try {
        setSelectedColumns(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved columns:", e);
        setSelectedColumns(AVAILABLE_COLUMNS.filter(col => col.default).map(col => col.id));
      }
    } else {
      setSelectedColumns(AVAILABLE_COLUMNS.filter(col => col.default).map(col => col.id));
    }
  };

  const loadTags = () => {
    const tagsKey = effectiveCompanyId ? `lead_tags_${effectiveCompanyId}` : "lead_tags";
    const savedTags = localStorage.getItem(tagsKey);
    if (savedTags) {
      try {
        setAvailableTags(JSON.parse(savedTags));
      } catch (e) {
        setAvailableTags(["דחוף", "VIP", "עדיפות גבוהה", "לתזכורת", "לא מעוניין כרגע"]);
      }
    } else {
      setAvailableTags(["דחוף", "VIP", "עדיפות גבוהה", "לתזכורת", "לא מעוניין כרגע"]);
    }
  };

  const loadStatuses = () => {
    const savedStatuses = localStorage.getItem("lead_statuses");
    if (savedStatuses) {
      try {
        setAvailableStatuses(JSON.parse(savedStatuses));
      } catch (e) {
        console.error("Error parsing saved statuses:", e);
        setAvailableStatuses([
          "חדש",
          "נוצר קשר",
          "מוסמך",
          "לקוח",
          "אבוד"
        ]);
      }
    } else {
      setAvailableStatuses([
        "חדש",
        "נוצר קשר",
        "מוסמך",
        "לקוח",
        "אבוד"
      ]);
    }
  };

  const loadProposals = () => {
    const proposalsKey = effectiveCompanyId ? `lead_proposals_${effectiveCompanyId}` : "lead_proposals";
    const savedProposals = localStorage.getItem(proposalsKey);
    if (savedProposals) {
      try {
        setAvailableProposals(JSON.parse(savedProposals));
      } catch (e) {
        setAvailableProposals(["חבילה בסיסית", "חבילת פרימיום", "חבילה עסקית", "ייעוץ ראשוני", "מנוי חודשי"]);
      }
    } else {
      setAvailableProposals(["חבילה בסיסית", "חבילת פרימיום", "חבילה עסקית", "ייעוץ ראשוני", "מנוי חודשי"]);
    }
  };

  const loadSources = () => {
    const sourcesKey = effectiveCompanyId ? `lead_sources_${effectiveCompanyId}` : "lead_sources";
    const savedSources = localStorage.getItem(sourcesKey);
    if (savedSources) {
      try {
        setAvailableSources(JSON.parse(savedSources));
      } catch (e) {
        setAvailableSources(["פייסבוק", "גוגל", "אתר", "Organic", "Referral", "Other"]);
      }
    } else {
      setAvailableSources(["פייסבוק", "גוגל", "אתר", "Organic", "Referral", "Other"]);
    }
  };

  const handleToggleColumn = (columnId) => {
    setSelectedColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleAddTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      const updatedTags = [...availableTags, newTag.trim()];
      setAvailableTags(updatedTags);
      const tagsKey = effectiveCompanyId ? `lead_tags_${effectiveCompanyId}` : "lead_tags";
      localStorage.setItem(tagsKey, JSON.stringify(updatedTags));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = availableTags.filter(t => t !== tagToRemove);
    setAvailableTags(updatedTags);
    const tagsKey = effectiveCompanyId ? `lead_tags_${effectiveCompanyId}` : "lead_tags";
    localStorage.setItem(tagsKey, JSON.stringify(updatedTags));
  };

  const handleAddStatus = () => {
    if (newStatus.trim() && !availableStatuses.includes(newStatus.trim())) {
      const updatedStatuses = [...availableStatuses, newStatus.trim()];
      setAvailableStatuses(updatedStatuses);
      localStorage.setItem("lead_statuses", JSON.stringify(updatedStatuses));
      setNewStatus("");
    }
  };

  const handleEditStatus = (oldStatus) => {
    setEditingStatus(oldStatus);
    setEditStatusValue(oldStatus);
  };

  const handleSaveEditStatus = () => {
    if (!editStatusValue.trim()) {
      alert("שם הסטטוס לא יכול להיות ריק");
      return;
    }

    if (editStatusValue === editingStatus) {
      setEditingStatus(null);
      return;
    }

    if (availableStatuses.includes(editStatusValue.trim())) {
      alert("סטטוס בשם זה כבר קיים");
      return;
    }

    const updatedStatuses = availableStatuses.map(s => 
      s === editingStatus ? editStatusValue.trim() : s
    );
    setAvailableStatuses(updatedStatuses);
    localStorage.setItem("lead_statuses", JSON.stringify(updatedStatuses));
    setEditingStatus(null);
    setEditStatusValue("");
  };

  const handleCancelEditStatus = () => {
    setEditingStatus(null);
    setEditStatusValue("");
  };

  const handleRemoveStatus = (statusToRemove) => {
    // מונע מחיקה של סטטוסים בסיסיים
    const basicStatuses = ["חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"];
    if (basicStatuses.includes(statusToRemove)) {
      alert("לא ניתן למחוק סטטוס בסיסי. ניתן רק לערוך את שמו.");
      return;
    }
    
    const updatedStatuses = availableStatuses.filter(s => s !== statusToRemove);
    setAvailableStatuses(updatedStatuses);
    localStorage.setItem("lead_statuses", JSON.stringify(updatedStatuses));
  };

  const handleAddProposal = () => {
    if (newProposal.trim() && !availableProposals.includes(newProposal.trim())) {
      const updatedProposals = [...availableProposals, newProposal.trim()];
      setAvailableProposals(updatedProposals);
      const proposalsKey = effectiveCompanyId ? `lead_proposals_${effectiveCompanyId}` : "lead_proposals";
      localStorage.setItem(proposalsKey, JSON.stringify(updatedProposals));
      setNewProposal("");
    }
  };

  const handleEditProposal = (oldProposal) => {
    setEditingProposal(oldProposal);
    setEditProposalValue(oldProposal);
  };

  const handleSaveEditProposal = () => {
    if (!editProposalValue.trim()) {
      alert("שם ההצעה לא יכול להיות ריק");
      return;
    }

    if (editProposalValue === editingProposal) {
      setEditingProposal(null);
      return;
    }

    if (availableProposals.includes(editProposalValue.trim())) {
      alert("הצעה בשם זה כבר קיימת");
      return;
    }

    const updatedProposals = availableProposals.map(p => 
      p === editingProposal ? editProposalValue.trim() : p
    );
    setAvailableProposals(updatedProposals);
    const proposalsKey = effectiveCompanyId ? `lead_proposals_${effectiveCompanyId}` : "lead_proposals";
    localStorage.setItem(proposalsKey, JSON.stringify(updatedProposals));
    setEditingProposal(null);
    setEditProposalValue("");
  };

  const handleCancelEditProposal = () => {
    setEditingProposal(null);
    setEditProposalValue("");
  };

  const handleRemoveProposal = (proposalToRemove) => {
    const updatedProposals = availableProposals.filter(p => p !== proposalToRemove);
    setAvailableProposals(updatedProposals);
    const proposalsKey = effectiveCompanyId ? `lead_proposals_${effectiveCompanyId}` : "lead_proposals";
    localStorage.setItem(proposalsKey, JSON.stringify(updatedProposals));
  };

  const handleAddSource = () => {
    if (newSource.trim() && !availableSources.includes(newSource.trim())) {
      const updatedSources = [...availableSources, newSource.trim()];
      setAvailableSources(updatedSources);
      const sourcesKey = effectiveCompanyId ? `lead_sources_${effectiveCompanyId}` : "lead_sources";
      localStorage.setItem(sourcesKey, JSON.stringify(updatedSources));
      setNewSource("");
    }
  };

  const handleEditSource = (oldSource) => {
    setEditingSource(oldSource);
    setEditSourceValue(oldSource);
  };

  const handleSaveEditSource = () => {
    if (!editSourceValue.trim()) {
      alert("שם המקור לא יכול להיות ריק");
      return;
    }

    if (editSourceValue === editingSource) {
      setEditingSource(null);
      return;
    }

    if (availableSources.includes(editSourceValue.trim())) {
      alert("מקור בשם זה כבר קיים");
      return;
    }

    const updatedSources = availableSources.map(s => 
      s === editingSource ? editSourceValue.trim() : s
    );
    setAvailableSources(updatedSources);
    const sourcesKey = effectiveCompanyId ? `lead_sources_${effectiveCompanyId}` : "lead_sources";
    localStorage.setItem(sourcesKey, JSON.stringify(updatedSources));
    setEditingSource(null);
    setEditSourceValue("");
  };

  const handleCancelEditSource = () => {
    setEditingSource(null);
    setEditSourceValue("");
  };

  const handleRemoveSource = (sourceToRemove) => {
    const updatedSources = availableSources.filter(s => s !== sourceToRemove);
    setAvailableSources(updatedSources);
    const sourcesKey = effectiveCompanyId ? `lead_sources_${effectiveCompanyId}` : "lead_sources";
    localStorage.setItem(sourcesKey, JSON.stringify(updatedSources));
  };

  const handleSave = () => {
    localStorage.setItem(`leadsTableColumns_${effectiveCompanyId}`, JSON.stringify(selectedColumns));
    console.log(`💾 Saved table settings for company: ${effectiveCompanyId}`);
    console.log(`📋 Selected columns:`, selectedColumns); // Added console log
    
    // ✅ רענן את הדף כדי שהטבלה תיטען עם העמודות החדשות
    window.location.reload();
  };

  if (!currentUser || !effectiveCompanyId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הגדרות טבלת לידים</DialogTitle>
          {effectiveCompanyId !== currentUser.company_id && (
            <p className="text-xs text-blue-600 mt-2">
              ℹ️ הגדרות משותפות בין חברת אם וחברות בת
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-5"> {/* Changed from 4 to 5 */}
            <TabsTrigger value="columns">עמודות</TabsTrigger>
            <TabsTrigger value="statuses">סטטוסים</TabsTrigger>
            <TabsTrigger value="sources">מקורות</TabsTrigger> {/* NEW */}
            <TabsTrigger value="proposals">הצעות</TabsTrigger>
            <TabsTrigger value="tags">טאגים</TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-4 py-4">
            <Label>בחר עמודות להצגה:</Label>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column.id} className="flex items-center gap-3">
                  <Checkbox
                    id={column.id}
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={() => handleToggleColumn(column.id)}
                  />
                  <Label
                    htmlFor={column.id}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="statuses" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>סטטוסים זמינים:</Label>
                <p className="text-xs text-gray-600">
                  סטטוסים אלו יהיו זמינים לבחירה בעת הוספת או עריכת ליד.
                  <br />
                  <strong>ניתן לערוך את שם כל סטטוס.</strong> סטטוסים בסיסיים לא ניתן למחוק.
                </p>
              </div>

              {/* רשימת סטטוסים קיימים */}
              {availableStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  {availableStatuses.map((status, idx) => {
                    const isBasicStatus = ["חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"].includes(status);
                    const isEditing = editingStatus === status;
                    
                    return (
                      <div
                        key={idx}
                        className={`rounded-full px-4 py-2 flex items-center gap-2 shadow-sm ${
                          isBasicStatus 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                            : 'bg-gradient-to-r from-teal-100 to-cyan-100 border border-teal-300'
                        }`}
                      >
                        {isEditing ? (
                          <>
                            <Input
                              value={editStatusValue}
                              onChange={(e) => setEditStatusValue(e.target.value)}
                              className="h-6 text-sm w-32"
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditStatus();
                                } else if (e.key === 'Escape') {
                                  handleCancelEditStatus();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditStatus}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditStatus}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`font-semibold text-sm ${isBasicStatus ? '' : 'text-teal-900'}`}>
                              {status}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEditStatus(status)}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                              title="ערוך סטטוס"
                            >
                              <Edit2 className={`w-3 h-3 ${isBasicStatus ? 'text-white' : 'text-teal-700'}`} />
                            </button>
                            {!isBasicStatus && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStatus(status)}
                                className="hover:bg-white/20 rounded-full p-1 transition-colors"
                                title="מחק סטטוס"
                              >
                                <X className="w-3 h-3 text-teal-700" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* הוספת סטטוס חדש */}
              <div className="space-y-2">
                <Label>הוסף סטטוס חדש:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="שם הסטטוס..."
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStatus())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddStatus}
                    variant="outline"
                    className="whitespace-nowrap border-blue-300 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* NEW: מקורות הגעה */}
          <TabsContent value="sources" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>מקורות זמינים:</Label>
                <p className="text-xs text-gray-600">
                  מקורות אלו יהיו זמינים לבחירה בעת הוספת או עריכת ליד.
                  <br />
                  <strong>ניתן לערוך ולמחוק כל מקור.</strong>
                </p>
              </div>

              {availableSources.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  {availableSources.map((source, idx) => {
                    const isEditing = editingSource === source;
                    
                    return (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
                      >
                        {isEditing ? (
                          <>
                            <Input
                              value={editSourceValue}
                              onChange={(e) => setEditSourceValue(e.target.value)}
                              className="h-6 text-sm w-32"
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditSource();
                                } else if (e.key === 'Escape') {
                                  handleCancelEditSource();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditSource}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                              <Save className="w-3 h-3 text-green-700" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditSource}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                              <X className="w-3 h-3 text-green-700" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-sm text-green-900">
                              {source}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEditSource(source)}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                              title="ערוך מקור"
                            >
                              <Edit2 className="w-3 h-3 text-green-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSource(source)}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                              title="מחק מקור"
                            >
                              <X className="w-3 h-3 text-green-700" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <Label>הוסף מקור חדש:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="שם המקור..."
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSource())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddSource}
                    variant="outline"
                    className="whitespace-nowrap border-green-300 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>הצעות זמינות:</Label>
                <p className="text-xs text-gray-600">
                  הצעות אלו יהיו זמינות לבחירה בעת הוספת או עריכת ליד.
                  <br />
                  <strong>ניתן לערוך ולמחוק כל הצעה.</strong>
                </p>
              </div>

              {/* רשימת הצעות קיימות */}
              {availableProposals.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  {availableProposals.map((proposal, idx) => {
                    const isEditing = editingProposal === proposal;
                    
                    return (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
                      >
                        {isEditing ? (
                          <>
                            <Input
                              value={editProposalValue}
                              onChange={(e) => setEditProposalValue(e.target.value)}
                              className="h-6 text-sm w-32"
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditProposal();
                                } else if (e.key === 'Escape') {
                                  handleCancelEditProposal();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditProposal}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                              <Save className="w-3 h-3 text-orange-700" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditProposal}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                              <X className="w-3 h-3 text-orange-700" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-sm text-orange-900">
                              {proposal}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEditProposal(proposal)}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                              title="ערוך הצעה"
                            >
                              <Edit2 className="w-3 h-3 text-orange-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProposal(proposal)}
                              className="hover:bg-white/20 rounded-full p-1 transition-colors"
                              title="מחק הצעה"
                            >
                              <X className="w-3 h-3 text-orange-700" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* הוספת הצעה חדשה */}
              <div className="space-y-2">
                <Label>הוסף הצעה חדשה:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="שם ההצעה..."
                    value={newProposal}
                    onChange={(e) => setNewProposal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProposal())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddProposal}
                    variant="outline"
                    className="whitespace-nowrap border-orange-300 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tags" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>טאגים זמינים:</Label>
                <p className="text-xs text-gray-600">
                  טאגים אלו יהיו זמינים לבחירה מהירה בעת הוספת או עריכת ליד
                </p>
              </div>

              {/* רשימת טאגים קיימים */}
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  {availableTags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
                    >
                      <span className="font-semibold text-sm">{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-white/20 rounded-full p-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* הוספת טאג חדש */}
              <div className="space-y-2">
                <Label>הוסף טאג חדש:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="שם הטאג..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    className="whitespace-nowrap border-purple-300 hover:bg-purple-50"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-blue-700">
            <Save className="w-4 h-4 ml-2" />
            שמור שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}