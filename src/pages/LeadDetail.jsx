import React, { useState, useEffect } from "react";
import { Lead } from "@/api/entities";
import { CalendarEvent } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, Save, Trash2, FileText, X, Plus, Calendar as CalendarIcon, Clock, MapPin, Upload, Download, File, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { AutomationEngine } from "../components/utils/AutomationEngine";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { formatDate, formatDateTime, formatTime } from "../components/utils/dateUtils";

export default function LeadDetailPage({ currentCompanyId }) {
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [originalLead, setOriginalLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [conversionData, setConversionData] = useState({
    revenue_amount: "",
    revenue_type: "חד פעמי",
    setup_fee: "",
    monthly_recurring: ""
  });
  const [meetingData, setMeetingData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    status: "מתוכנן"
  });
  const [quoteData, setQuoteData] = useState({
    amount: "",
    description: "",
    valid_until: "",
    notes: ""
  });
  const [proposals, setProposals] = useState([
    "חבילה בסיסית",
    "חבילה מתקדמת",
    "חבילה פרימיום",
    "הצעה מותאמת אישית"
  ]);
  const [statuses, setStatuses] = useState([
    "חדש",
    "נוצר קשר",
    "מוסמך",
    "יצאה הצעת מחיר",
    "לקוח",
    "אבוד"
  ]);
  const [availableTags, setAvailableTags] = useState([
    "דחוף",
    "VIP",
    "עדיפות גבוהה",
    "לתזכורת",
    "לא מעוניין כרגע"
  ]);
  const [availableSources, setAvailableSources] = useState([]); // ✅ NEW
  
  const [newProposal, setNewProposal] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get("id");

  useEffect(() => {
    if (leadId) {
      loadLead();
      loadMeetings();
    }
  }, [leadId]);

  // טען הגדרות כשיש companyId (מהליד או מה-prop)
  useEffect(() => {
    const companyId = lead?.company_id || currentCompanyId;
    if (companyId) {
      loadSettings(companyId);
    }
  }, [lead?.company_id, currentCompanyId]);

  const loadSettings = (companyId) => {
    // טען הצעות לפי חברה
    const proposalsKey = companyId ? `lead_proposals_${companyId}` : "lead_proposals";
    const savedProposals = localStorage.getItem(proposalsKey);
    if (savedProposals) {
      try {
        setProposals(JSON.parse(savedProposals));
      } catch (e) {
        setProposals(["חבילה בסיסית", "חבילה מתקדמת", "חבילה פרימיום", "הצעה מותאמת אישית"]);
      }
    }

    // טען סטטוסים (גלובלי)
    const savedStatuses = localStorage.getItem("lead_statuses");
    if (savedStatuses) {
      try {
        setStatuses(JSON.parse(savedStatuses));
      } catch (e) {
        // keep defaults
      }
    }

    // טען טאגים לפי חברה
    const tagsKey = companyId ? `lead_tags_${companyId}` : "lead_tags";
    const savedTags = localStorage.getItem(tagsKey);
    if (savedTags) {
      try {
        setAvailableTags(JSON.parse(savedTags));
      } catch (e) {
        setAvailableTags(["דחוף", "VIP", "עדיפות גבוהה", "לתזכורת", "לא מעוניין כרגע"]);
      }
    }

    // טען מקורות לפי חברה
    const sourcesKey = companyId ? `lead_sources_${companyId}` : "lead_sources";
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

  const loadLead = async () => {
    setIsLoading(true);
    const leads = await Lead.list();
    const foundLead = leads.find(l => l.id === leadId);
    if (foundLead) {
      if (foundLead.proposals && Array.isArray(foundLead.proposals)) {
        const hasNewStructure = foundLead.proposals.some(p => typeof p === 'object' && p.campaign);
        
        if (!hasNewStructure) {
          foundLead.proposals = foundLead.proposals.filter(p => typeof p === 'string');
        }
      } else {
        foundLead.proposals = [];
      }
      
      // אתחל campaign_history אם לא קיים
      if (!foundLead.campaign_history) {
        foundLead.campaign_history = [];
      }
      // Initialize tags if not present
      if (!foundLead.tags) {
        foundLead.tags = [];
      }
      // Initialize files if not present
      if (!foundLead.files) {
        foundLead.files = [];
      }
      
      setLead(foundLead);
      setOriginalLead(foundLead);
    }
    setIsLoading(false);
  };

  const loadMeetings = async () => {
    const allMeetings = await CalendarEvent.list("-start_time");
    const leadMeetings = allMeetings.filter(m => m.related_lead_id === leadId);
    setMeetings(leadMeetings);
  };

  const handleAddProposal = () => {
    if (newProposal.trim() && !lead.proposals.includes(newProposal.trim())) {
      setLead({
        ...lead,
        proposals: [...lead.proposals, newProposal.trim()]
      });
      setNewProposal("");
    }
  };

  const handleRemoveProposal = (proposalToRemove) => {
    setLead({
      ...lead,
      proposals: lead.proposals.filter(p => p !== proposalToRemove)
    });
  };

  const handleQuickAddProposal = (proposal) => {
    if (!lead.proposals.includes(proposal)) {
      setLead({
        ...lead,
        proposals: [...lead.proposals, proposal]
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !lead.tags?.includes(newTag.trim())) {
      setLead({
        ...lead,
        tags: [...(lead.tags || []), newTag.trim()]
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setLead({
      ...lead,
      tags: (lead.tags || []).filter(t => t !== tagToRemove)
    });
  };

  const handleQuickAddTag = (tag) => {
    if (!(lead.tags || []).includes(tag)) {
      setLead({
        ...lead,
        tags: [...(lead.tags || []), tag]
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingFile(true);

    try {
      const { base44 } = await import("@/api/base44Client");
      
      // העלה את הקובץ
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // הוסף לרשימת הקבצים
      const newFile = {
        name: file.name,
        url: file_url,
        size: file.size,
        uploaded_date: new Date().toISOString()
      };

      setLead({
        ...lead,
        files: [...(lead.files || []), newFile]
      });

      alert(`✅ הקובץ "${file.name}" הועלה בהצלחה`);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("שגיאה בהעלאת הקובץ");
    } finally {
      setIsUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleRemoveFile = (fileUrl) => {
    if (confirm("האם למחוק את הקובץ?")) {
      setLead({
        ...lead,
        files: (lead.files || []).filter(f => f.url !== fileUrl)
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = async () => {
    setIsSaving(true);

    const statusChanged = originalLead && originalLead.status !== lead.status;

    await Lead.update(leadId, lead);

    if (statusChanged) {
      if (lead.status === "לקוח") {
        setShowConversionDialog(true);
        setIsSaving(false);
        return;
      }

      if (lead.status === "יצאה הצעת מחיר") {
        setShowQuoteDialog(true);
        setIsSaving(false);
        return;
      }

      await AutomationEngine.runAutomations("שינוי סטטוס", {
        leadId: leadId,
        lead: lead,
        oldStatus: originalLead.status,
        newStatus: lead.status
      });
    }

    await AutomationEngine.runAutomations("עדכון ליד", {
      leadId: leadId,
      lead: lead
    });

    setIsSaving(false);
    navigate(createPageUrl("Leads"));
  };

  const handleCompleteQuote = async () => {
    const amount = parseFloat(quoteData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("יש להזין סכום תקין");
      return;
    }

    try {
      const { Quote } = await import("@/api/entities");
      
      await Quote.create({
        company_id: lead.company_id,
        lead_id: lead.id,
        lead_name: `${lead.first_name} ${lead.last_name}`,
        lead_email: lead.email,
        lead_phone: lead.phone,
        amount: amount,
        description: quoteData.description,
        valid_until: quoteData.valid_until || null,
        notes: quoteData.notes || "",
        status: "ממתין לתשובה"
      });

      setShowQuoteDialog(false);
      alert("✅ הצעת המחיר נוצרה בהצלחה!");
      navigate(createPageUrl("Leads"));
    } catch (error) {
      console.error("Error creating quote:", error);
      alert("שגיאה ביצירת הצעת המחיר");
    }
  };

  const handleCompleteConversion = async () => { // This corresponds to outline's handleConvertToClient
    if (conversionData.revenue_type === "הקמה + מתמשך") {
      // ✅ NEW: ולידציה חדשה
      const setupFee = parseFloat(conversionData.setup_fee);
      const monthlyRecurring = parseFloat(conversionData.monthly_recurring);
      
      if (isNaN(setupFee) || setupFee < 0 || isNaN(monthlyRecurring) || monthlyRecurring <= 0) {
        alert("יש להזין תשלום הקמה ותשלום מתמשך תקינים");
        return;
      }

      // ✅ שליחת אירוע המרה למטא (אוטומטית)
      try {
        const { MetaConversionHelper } = await import("../components/utils/MetaConversionHelper");
        const totalValue = setupFee + monthlyRecurring; // For the initial purchase, sum up setup fee and first month's recurring
        await MetaConversionHelper.sendPurchaseEvent(lead, totalValue);
      } catch (error) {
        console.error('Error sending purchase event to Meta:', error);
      }

      const success = await AutomationEngine.completeClientConversion(
        lead,
        setupFee, // תשלום הקמה
        conversionData.revenue_type,
        monthlyRecurring // תשלום מתמשך
      );

      if (success) {
        setShowConversionDialog(false); // Retain original state setter name
        navigate(createPageUrl("Clients"));
      }
    } else {
      // תהליך רגיל
      const amount = parseFloat(conversionData.revenue_amount);
      if (isNaN(amount) || amount <= 0) {
        alert("יש להזין סכום הכנסה תקין");
        return;
      }

      // ✅ שליחת אירוע המרה למטא (אוטומטית)
      try {
        const { MetaConversionHelper } = await import("../components/utils/MetaConversionHelper");
        await MetaConversionHelper.sendPurchaseEvent(lead, amount);
      } catch (error) {
        console.error('Error sending purchase event to Meta:', error);
      }

      const success = await AutomationEngine.completeClientConversion(
        lead,
        amount,
        conversionData.revenue_type
      );

      if (success) {
        setShowConversionDialog(false); // Retain original state setter name
        navigate(createPageUrl("Clients"));
      }
    }
  };

  const handleDelete = async () => {
    if (confirm("האם אתה בטוח שברצונך למחוק ליד זה?")) {
      await Lead.delete(leadId);
      navigate(createPageUrl("Leads"));
    }
  };

  const handleOpenMeetingDialog = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    setMeetingData({
      title: `פגישה עם ${lead.first_name} ${lead.last_name}`,
      description: "",
      start_time: tomorrow.toISOString().slice(0, 16),
      end_time: endTime.toISOString().slice(0, 16),
      location: "",
      status: "מתוכנן"
    });
    setShowMeetingDialog(true);
  };

  const handleSaveMeeting = async () => { // This corresponds to outline's handleScheduleMeeting
    if (!meetingData.title || !meetingData.start_time) {
      alert("יש לממלא לפחות כותרת וזמן התחלה");
      return;
    }

    const eventToCreate = {
      ...meetingData,
      related_lead_id: leadId,
      company_id: lead.company_id // Using lead.company_id as currentCompanyId was not defined
    };

    await CalendarEvent.create(eventToCreate);

    setShowMeetingDialog(false);
    await loadMeetings();
    
    setMeetingData({
      title: "",
      description: "",
      start_time: "",
      end_time: "",
      location: "",
      status: "מתוכנן"
    });

    // ✅ שליחת אירוע פגישה נקבעה למטא (אוטומטית)
    try {
      const { MetaConversionHelper } = await import("../components/utils/MetaConversionHelper");
      await MetaConversionHelper.sendScheduleEvent(lead, eventToCreate);
    } catch (error) {
      console.error('Error sending schedule event to Meta:', error);
    }

    const { AutomationEngine } = await import("../components/utils/AutomationEngine");
    await AutomationEngine.runAutomations("יצירת פגישה", {
      lead: lead,
      event: eventToCreate
    });
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק פגישה זו?")) {
      await CalendarEvent.delete(meetingId);
      await loadMeetings();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">ליד לא נמצא</p>
          <Button onClick={() => navigate(createPageUrl("Leads"))} className="mt-4">
            חזור ללידים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Leads"))}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזור
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              פרטי ליד
            </h1>
            <p className="text-gray-500 mt-1 text-sm">ערוך את פרטי הליד</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                מידע בסיסי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* שם */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">שם פרטי *</Label>
                  <Input
                    id="first_name"
                    value={lead.first_name || ""}
                    onChange={(e) => setLead({...lead, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">שם משפחה</Label>
                  <Input
                    id="last_name"
                    value={lead.last_name || ""}
                    onChange={(e) => setLead({...lead, last_name: e.target.value})}
                  />
                </div>
              </div>

              {/* אימייל וטלפון */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={lead.email || ""}
                    onChange={(e) => setLead({...lead, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון *</Label>
                  <Input
                    id="phone"
                    value={lead.phone || ""}
                    onChange={(e) => setLead({...lead, phone: e.target.value})}
                  />
                </div>
              </div>

              {/* יום הולדת ומין */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">יום הולדת</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={lead.birthday || ""}
                    onChange={(e) => setLead({...lead, birthday: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">מין</Label>
                  <Select
                    value={lead.gender || ""}
                    onValueChange={(value) => setLead({...lead, gender: value})}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue placeholder="בחר..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="זכר">זכר</SelectItem>
                      <SelectItem value="נקבה">נקבה</SelectItem>
                      <SelectItem value="אחר">אחר</SelectItem>
                      <SelectItem value="לא מעוניין לציין">לא מעונייין לציין</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">מקור</Label>
                  <Select
                    value={lead.source || "Other"}
                    onValueChange={(value) => setLead({...lead, source: value})}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* ✅ NEW: מקורות דינמיים */}
                      {availableSources.map((source, idx) => (
                        <SelectItem key={idx} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">סטטוס</Label>
                  <Select
                    value={lead.status || "חדש"}
                    onValueChange={(value) => setLead({...lead, status: value})}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fb_campaign">קמפיין ראשי</Label>
                <Input
                  id="fb_campaign"
                  value={lead.fb_campaign || ""}
                  onChange={(e) => setLead({...lead, fb_campaign: e.target.value})}
                  placeholder="שם הקמפיין שממנו הגיע הליד"
                />
              </div>

              {/* טאגים */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  טאגים
                </Label>

                <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  {/* טאגים נבחרים */}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {lead.tags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-md"
                        >
                          <Tag className="w-3 h-3" />
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

                  {/* טאגים מהירים */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">הוספה מהירה:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAddTag(tag)}
                          disabled={lead.tags?.includes(tag)}
                          className="border-purple-300 hover:bg-purple-100"
                        >
                          <Plus className="w-3 h-3 ml-1" />
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* הוספת טאג חדש */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="טאג מותאם אישית..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף
                    </Button>
                  </div>
                </div>
              </div>

              {/* היסטוריית קמפיינים */}
              {lead.campaign_history && lead.campaign_history.length > 0 && (
                <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-purple-900 text-lg">
                      היסטוריית קמפיינים ({lead.campaign_history.length})
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {lead.campaign_history.map((entry, idx) => (
                      <Card key={idx} className="bg-white border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                                <Badge className="bg-purple-100 text-purple-800">#{idx + 1}</Badge>
                                {entry.campaign}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateTime(entry.date)}
                              </p>
                            </div>
                            {entry.source && (
                              <Badge variant="outline" className="bg-blue-50">
                                {entry.source}
                              </Badge>
                            )}
                          </div>
                          
                          {entry.form_responses && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <strong className="text-gray-700">תשובות מהטופס:</strong>
                              <pre className="mt-1 whitespace-pre-wrap text-gray-600">
                                {entry.form_responses}
                              </pre>
                            </div>
                          )}
                          
                          {entry.notes && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                              <strong className="text-gray-700">הערות:</strong>
                              <p className="mt-1 text-gray-600">{entry.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="mt-3 p-3 bg-white rounded border border-purple-200">
                    <p className="text-xs text-purple-800">
                      💡 <strong>ליד חוזר:</strong> ליד זה נרשם {lead.campaign_history.length} פעמים ממקורות שונים. 
                      כל רישום נשמר להיסטוריה.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label>הצעות שנשלחו</Label>

                {/* הצעות מיובאות מ-Meta (קריאה בלבד) */}
                {lead.proposals && lead.proposals.some(p => typeof p === 'object') && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 font-semibold">הצעות מקמפיינים:</p>
                    <div className="grid gap-3">
                      {lead.proposals.filter(p => typeof p === 'object').map((proposal, idx) => (
                        <Card key={idx} className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-purple-900">
                                קמפיין: {proposal.campaign}
                              </h4>
                              <Badge variant="outline" className="bg-white">
                                #{idx + 1}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>תאריך:</strong> {formatDateTime(proposal.date)}</p>
                              <p><strong>טופס:</strong> {proposal.form}</p>
                              {proposal.responses && (
                                <div className="mt-2 p-2 bg-white rounded border border-purple-100">
                                  <p className="font-semibold mb-1">תשובות:</p>
                                  <pre className="text-xs whitespace-pre-wrap">{proposal.responses}</pre>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* הצעות ידניות */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 font-semibold">הצעות ידניות:</p>

                  {/* הצעות נבחרות */}
                  {lead.proposals.filter(p => typeof p === 'string').length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {lead.proposals.filter(p => typeof p === 'string').map((proposal, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-green-100 to-teal-100 border-2 border-green-300 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm"
                        >
                          <span className="font-semibold text-green-900">{proposal}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProposal(proposal)}
                            className="hover:bg-green-200 rounded-full p-1 transition-colors"
                          >
                            <X className="w-3 h-3 text-green-700" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* הצעות מהירות */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">הוספה מהירה:</p>
                    <div className="flex flex-wrap gap-2">
                      {proposals.map((proposal, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAddProposal(proposal)}
                          disabled={lead.proposals.includes(proposal)}
                          className="border-green-200 hover:bg-green-50"
                        >
                          <Plus className="w-3 h-3 ml-1" />
                          {proposal}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* הוספת הצעה חדשה */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="הצעה מותאמת אישית..."
                      value={newProposal}
                      onChange={(e) => setNewProposal(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProposal())}
                    />
                    <Button
                      type="button"
                      onClick={handleAddProposal}
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form_responses">תשובות מהטופס</Label>
                <Textarea
                  id="form_responses"
                  value={lead.form_responses || ""}
                  onChange={(e) => setLead({...lead, form_responses: e.target.value})}
                  rows={6}
                  placeholder="תשובות שהליד ענה בטופס הלידים..."
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                  id="notes"
                  value={lead.notes || ""}
                  onChange={(e) => setLead({...lead, notes: e.target.value})}
                  rows={4}
                  placeholder="הוסף הערות..."
                />
              </div>

              {/* קבצים מצורפים */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <File className="w-4 h-4 text-blue-600" />
                  קבצים מצורפים
                </Label>

                <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                  {/* קבצים קיימים */}
                  {lead.files && lead.files.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {lead.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-lg p-3 border border-blue-200 flex items-center justify-between hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <File className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {formatDateTime(file.uploaded_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4 text-blue-600" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.url)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      אין קבצים מצורפים
                    </div>
                  )}

                  {/* כפתור העלאה */}
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {isUploadingFile ? (
                        <>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                            <Upload className="w-6 h-6 text-blue-600" />
                          </div>
                          <span className="text-sm text-blue-600 font-semibold">מעלה קובץ...</span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Upload className="w-6 h-6 text-blue-600" />
                          </div>
                          <span className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                            לחץ להעלאת קובץ
                          </span>
                          <span className="text-xs text-gray-500">
                            PDF, Word, Excel, תמונות וכו'
                          </span>
                        </>
                      )}
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploadingFile}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {isSaving ? "שומר..." : "שמור שינויים"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  מחק ליד
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* פגישות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-orange-600" />
                פגישות
              </CardTitle>
              <Button
                onClick={handleOpenMeetingDialog}
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-orange-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                קבע פגישה
              </Button>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>אין פגישות מתוכננות</p>
                  <p className="text-sm mt-1">לחץ על "קבע פגישה" כדי להוסיף</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-orange-50 to-orange-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            meeting.status === "מתוכנן" ? "bg-blue-100 text-blue-800" :
                            meeting.status === "בוצע" ? "bg-green-100 text-green-800" :
                            "bg-red-100 text-red-800"
                          }>
                            {meeting.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      
                      {meeting.description && (
                        <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                      )}
                      
                      <div className="flex flex-col gap-1 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDateTime(meeting.start_time)}
                            {meeting.end_time && ` - ${formatTime(meeting.end_time)}`}
                          </span>
                        </div>
                        
                        {meeting.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span>{meeting.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* דיאלוג קביעת פגישה */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-900 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              קביעת פגישה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_title">כותרת *</Label>
              <Input
                id="meeting_title"
                value={meetingData.title}
                onChange={(e) => setMeetingData({...meetingData, title: e.target.value})}
                placeholder="שם האירוע"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_description">תיאור</Label>
              <Textarea
                id="meeting_description"
                value={meetingData.description}
                onChange={(e) => setMeetingData({...meetingData, description: e.target.value})}
                placeholder="פרטים נוספים על הפגישה..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting_start">תאריך ושעת התחלה *</Label>
                <Input
                  id="meeting_start"
                  type="datetime-local"
                  value={meetingData.start_time}
                  onChange={(e) => setMeetingData({...meetingData, start_time: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="meeting_end">תאריך ושעת סיום</Label>
                <Input
                  id="meeting_end"
                  type="datetime-local"
                  value={meetingData.end_time}
                  onChange={(e) => setMeetingData({...meetingData, end_time: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_location">מיקום</Label>
              <Input
                id="meeting_location"
                value={meetingData.location}
                onChange={(e) => setMeetingData({...meetingData, location: e.target.value})}
                placeholder="כתובת או קישור לזום"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_status">סטטוס</Label>
              <Select
                value={meetingData.status}
                onValueChange={(value) => setMeetingData({...meetingData, status: value})}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="מתוכנן">מתוכנן</SelectItem>
                  <SelectItem value="בוצע">בוצע</SelectItem>
                  <SelectItem value="בוטל">בוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveMeeting} className="bg-gradient-to-r from-orange-600 to-orange-700">
              <CalendarIcon className="w-4 h-4 ml-2" />
              שמור פגישה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג הצעת מחיר */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-900">
              הצעת מחיר חדשה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              הזן את פרטי הצעת המחיר עבור {lead.first_name} {lead.last_name}
            </p>

            <div className="space-y-2">
              <Label htmlFor="quote_amount">סכום הצעת המחיר (₪) *</Label>
              <Input
                id="quote_amount"
                type="number"
                step="0.01"
                value={quoteData.amount}
                onChange={(e) => setQuoteData({...quoteData, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote_description">תיאור ההצעה</Label>
              <Textarea
                id="quote_description"
                value={quoteData.description}
                onChange={(e) => setQuoteData({...quoteData, description: e.target.value})}
                placeholder="פרט את תוכן הצעת המחיר..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote_valid_until">תוקף ההצעה</Label>
              <Input
                id="quote_valid_until"
                type="date"
                value={quoteData.valid_until}
                onChange={(e) => setQuoteData({...quoteData, valid_until: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote_notes">הערות נוספות</Label>
              <Textarea
                id="quote_notes"
                value={quoteData.notes}
                onChange={(e) => setQuoteData({...quoteData, notes: e.target.value})}
                placeholder="הערות פנימיות..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLead({...lead, status: originalLead.status});
                setShowQuoteDialog(false);
                navigate(createPageUrl("Leads"));
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleCompleteQuote}
              className="bg-gradient-to-r from-orange-600 to-orange-700"
            >
              שמור הצעת מחיר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג המרה ללקוח */}
      {showConversionDialog && (
        <Dialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-green-900">
                המרת ליד ללקוח
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-gray-600">
                כדי להעביר את הליד ללקוחות, נדרש למלא פרטי הכנסה
              </p>

              <div className="space-y-2">
                <Label htmlFor="revenue_type">אופי ההכנסה *</Label>
                <Select
                  value={conversionData.revenue_type}
                  onValueChange={(value) => setConversionData({
                    ...conversionData, 
                    revenue_type: value,
                    // ✅ אפס שדות כשמשנים סוג
                    revenue_amount: value === "הקמה + מתמשך" ? "" : conversionData.revenue_amount,
                    setup_fee: "",
                    monthly_recurring: ""
                  })}
                >
                  <SelectTrigger className="brand-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="חד פעמי">חד פעמי</SelectItem>
                    <SelectItem value="ריטיינר חודשי">ריטיינר חודשי</SelectItem>
                    <SelectItem value="הקמה + מתמשך">הקמה + מתמשך</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ✅ NEW: תצוגה מותנית לפי סוג */}
              {conversionData.revenue_type === "הקמה + מתמשך" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="setup_fee">תשלום הקמה (₪) *</Label>
                    <Input
                      id="setup_fee"
                      type="number"
                      step="0.01"
                      value={conversionData.setup_fee}
                      onChange={(e) => setConversionData({...conversionData, setup_fee: e.target.value})}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500">
                      תשלום חד פעמי בחודש הראשון
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthly_recurring">תשלום מתמשך חודשי (₪) *</Label>
                    <Input
                      id="monthly_recurring"
                      type="number"
                      step="0.01"
                      value={conversionData.monthly_recurring}
                      onChange={(e) => setConversionData({...conversionData, monthly_recurring: e.target.value})}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500">
                      תשלום חוזר מדי חודש החל מהחודש הראשון
                    </p>
                  </div>

                  {/* ✅ תצוגת סיכום */}
                  {conversionData.setup_fee && conversionData.monthly_recurring && (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border-2 border-green-200">
                      <h4 className="font-bold text-green-900 mb-2">💰 סיכום הכנסות:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">חודש ראשון:</span>
                          <span className="font-bold text-green-900">
                            ₪{(parseFloat(conversionData.setup_fee || "0") + parseFloat(conversionData.monthly_recurring || "0")).toLocaleString('he-IL')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>(הקמה + מתמשך)</span>
                        </div>
                        <div className="border-t border-green-300 my-2"></div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">מחודש שני ואילך:</span>
                          <span className="font-bold text-green-900">
                            ₪{parseFloat(conversionData.monthly_recurring || "0").toLocaleString('he-IL')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>/חודש</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="revenue_amount">סכום הכנסה (₪) *</Label>
                    <Input
                      id="revenue_amount"
                      type="number"
                      step="0.01"
                      value={conversionData.revenue_amount}
                      onChange={(e) => setConversionData({...conversionData, revenue_amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>

                  {conversionData.revenue_type === "ריטיינר חודשי" && (
                    <p className="text-xs text-gray-500">
                      סכום חודשי. המערכת תחשב את סך ההכנסות לפי מספר החודשים
                    </p>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLead({...lead, status: originalLead.status});
                  setShowConversionDialog(false);
                  navigate(createPageUrl("Leads"));
                }}
              >
                ביטול
              </Button>
              <Button
                onClick={handleCompleteConversion}
                className="bg-gradient-to-r from-green-600 to-green-700"
              >
                אישור והמרה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}