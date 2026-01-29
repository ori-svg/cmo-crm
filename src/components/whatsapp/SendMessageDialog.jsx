import React, { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, Calendar, Users, Tag, FileText, Clock, Upload, X, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate, formatTime } from "../utils/dateUtils";
import DateTimeInput from "./DateTimeInput";

export default function SendMessageDialog({ open, onClose, whatsappSettings, currentCompanyId }) {
  const [campaignName, setCampaignName] = useState("");
  const [recipientType, setRecipientType] = useState("leads");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [filterByProposal, setFilterByProposal] = useState("");
  const [filterByTags, setFilterByTags] = useState([]);
  const [availableProposals, setAvailableProposals] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  
  // ✅ NEW: CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [csvPhoneNumbers, setCsvPhoneNumbers] = useState([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [csvError, setCsvError] = useState("");

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadLeads();
      loadClients();
      loadProposalsAndTags();
    }
  }, [open, currentCompanyId]);

  // ✅ NEW: Reset CSV when recipient type changes
  useEffect(() => {
    if (recipientType !== "csv") {
      setCsvFile(null);
      setCsvPhoneNumbers([]);
      setCsvError("");
    }
  }, [recipientType]);

  const loadTemplates = async () => {
    try {
      const { WhatsAppTemplate } = await import("@/api/entities");
      const templatesList = await WhatsAppTemplate.filter({ 
        company_id: currentCompanyId,
        status: "מאושר"
      });
      setTemplates(templatesList);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const loadLeads = async () => {
    try {
      const { Lead } = await import("@/api/entities");
      const leadsList = await Lead.filter({ company_id: currentCompanyId });
      setLeads(leadsList.filter(l => l.phone));
    } catch (error) {
      console.error("Error loading leads:", error);
    }
  };

  const loadClients = async () => {
    try {
      const { Client } = await import("@/api/entities");
      const clientsList = await Client.filter({ company_id: currentCompanyId });
      setClients(clientsList.filter(c => c.phone));
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadProposalsAndTags = () => {
    const savedProposals = localStorage.getItem("lead_proposals");
    if (savedProposals) {
      setAvailableProposals(JSON.parse(savedProposals));
    } else {
      setAvailableProposals([
        "חבילה בסיסית",
        "חבילה מתקדמת",
        "חבילה פרימיום",
        "הצעה מותאמת אישית"
      ]);
    }

    const savedTags = localStorage.getItem("lead_tags");
    if (savedTags) {
      setAvailableTags(JSON.parse(savedTags));
    } else {
      setAvailableTags([
        "דחוף",
        "VIP",
        "עדיפות גבוהה",
        "לתזכורת",
        "לא מעוניין כרגע"
      ]);
    }
  };

  // ✅ NEW: Handle CSV File Upload
  const handleCsvFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError("");
    setIsParsingCsv(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      const phoneNumbers = [];
      
      // Try to find phone numbers in each line
      for (const line of lines) {
        // Split by common delimiters: comma, semicolon, tab
        const cells = line.split(/[,;\t]/).map(cell => cell.trim());
        
        for (const cell of cells) {
          // Remove common phone number characters and keep only digits
          const cleaned = cell.replace(/[\s\-\(\)]/g, '');
          
          // Check if it looks like a phone number (8-15 digits, optionally starting with +)
          if (/^\+?\d{8,15}$/.test(cleaned)) {
            phoneNumbers.push(cleaned);
            break; // Take only first phone from each line
          }
        }
      }

      if (phoneNumbers.length === 0) {
        setCsvError("לא נמצאו מספרי טלפון תקינים בקובץ. ודא שהקובץ מכיל מספרי טלפון בפורמט נכון.");
      } else {
        setCsvPhoneNumbers(phoneNumbers);
        console.log('✅ Parsed phone numbers:', phoneNumbers);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setCsvError("שגיאה בקריאת הקובץ. ודא שזהו קובץ CSV תקין.");
    } finally {
      setIsParsingCsv(false);
    }
  };

  // ✅ NEW: Remove CSV File
  const handleRemoveCsvFile = () => {
    setCsvFile(null);
    setCsvPhoneNumbers([]);
    setCsvError("");
  };

  const handleToggleLead = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleToggleClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleToggleTag = (tag) => {
    setFilterByTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getFilteredLeads = () => {
    let filtered = [...leads];

    if (filterByProposal) {
      filtered = filtered.filter(lead => 
        lead.proposals && lead.proposals.includes(filterByProposal)
      );
    }

    if (filterByTags.length > 0) {
      filtered = filtered.filter(lead =>
        lead.tags && filterByTags.every(tag => lead.tags.includes(tag))
      );
    }

    return filtered;
  };

  const handleSend = async () => {
    if (!campaignName || !selectedTemplate) {
      alert("יש למלא שם קמפיין ולבחור תבנית");
      return;
    }

    // ✅ NEW: Validate CSV recipient type
    if (recipientType === "csv") {
      if (csvPhoneNumbers.length === 0) {
        alert("יש להעלות קובץ CSV עם מספרי טלפון תקינים");
        return;
      }
    } else if (recipientType === "leads" && selectedLeads.length === 0 && !filterByProposal && filterByTags.length === 0) {
      alert("יש לבחור לפחות ליד אחד או להגדיר סינון");
      return;
    } else if (recipientType === "clients" && selectedClients.length === 0) {
      alert("יש לבחור לפחות לקוח אחד");
      return;
    }

    if (isScheduled && !scheduledTime) {
      alert("יש להגדיר זמן תזמון");
      return;
    }

    setIsSending(true);

    try {
      const { WhatsAppCampaign } = await import("@/api/entities");
      
      const campaignData = {
        company_id: currentCompanyId,
        name: campaignName,
        template_name: selectedTemplate,
        recipient_type: recipientType,
        selected_recipients: recipientType === "leads" ? selectedLeads : 
                           recipientType === "clients" ? selectedClients : 
                           csvPhoneNumbers, // ✅ NEW: Use phone numbers from CSV
        filter_by_proposal: filterByProposal || null,
        filter_by_tags: filterByTags.length > 0 ? filterByTags : null,
        scheduled_time: isScheduled ? scheduledTime : null,
        status: isScheduled ? "מתוזמן" : "טיוטה"
      };

      console.log('📅 Creating campaign:', campaignData);

      const campaign = await WhatsAppCampaign.create(campaignData);

      if (!isScheduled) {
        const { base44 } = await import("@/api/base44Client");
        await base44.functions.invoke('send-whatsapp-campaign', {
          campaign_id: campaign.id,
          company_id: currentCompanyId
        });

        const recipientCount = recipientType === "csv" ? csvPhoneNumbers.length :
                               recipientType === "leads" ? selectedLeads.length :
                               selectedClients.length;
        
        alert(`✅ קמפיין "${campaignName}" נשלח בהצלחה ל-${recipientCount} נמענים!`);
      } else {
        const selectedDate = new Date(scheduledTime);
        const formattedDate = formatDate(selectedDate);
        const formattedTime = formatTime(selectedDate);
        
        alert(`⏰ קמפיין "${campaignName}" נקבע לשליחה ב-${formattedDate} בשעה ${formattedTime}`);
      }

      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error sending campaign:", error);
      alert(`שגיאה בשליחת הקמפיין: ${error.message}`);
    }

    setIsSending(false);
  };

  const filteredLeadsList = getFilteredLeads();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-900 flex items-center gap-2">
            <Send className="w-6 h-6" />
            קמפיין דיוור חדש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* שם קמפיין */}
          <div className="space-y-2">
            <Label htmlFor="campaign_name">שם הקמפיין *</Label>
            <Input
              id="campaign_name"
              placeholder="למשל: קמפיין קיץ 2024"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* תבנית */}
          <div className="space-y-2">
            <Label>תבנית הודעה *</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="brand-select">
                <SelectValue placeholder="בחר תבנית..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.name}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-xs text-red-600">
                אין תבניות מאושרות. עבור לעמוד התבניות כדי ליצור תבנית חדשה.
              </p>
            )}
          </div>

          {/* תזמון */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Checkbox
                id="schedule"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
              <Label htmlFor="schedule" className="flex items-center gap-2 cursor-pointer">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">תזמן קמפיין</span>
              </Label>
            </div>

            {isScheduled && (
              <div className="space-y-2">
                <DateTimeInput
                  label="זמן שליחה (שעון ישראל)"
                  value={scheduledTime}
                  onChange={setScheduledTime}
                />
                <p className="text-xs text-gray-600">
                  הקמפיין יישלח אוטומטיטית בזמן המדויק שנקבע (לפי שעון ישראל)
                </p>
              </div>
            )}
          </div>

          {/* סוג נמענים */}
          <div className="space-y-2">
            <Label>סוג נמענים *</Label>
            <Select value={recipientType} onValueChange={setRecipientType}>
              <SelectTrigger className="brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    לידים ({leads.length})
                  </div>
                </SelectItem>
                <SelectItem value="clients">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    לקוחות ({clients.length})
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    העלאה מקובץ CSV
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ NEW: CSV Upload Section */}
          {recipientType === "csv" && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-orange-900">העלאת קובץ CSV</h3>
              </div>

              <Alert className="bg-orange-100 border-orange-300">
                <AlertDescription className="text-sm text-orange-900">
                  <strong>📋 פורמט הקובץ:</strong>
                  <br />
                  • כל שורה צריכה להכיל מספר טלפון אחד
                  <br />
                  • ניתן להשתמש בפורמטים: 0501234567, 972501234567, +972-50-123-4567
                  <br />
                  • המערכת תזהה אוטומטית את מספרי הטלפון
                </AlertDescription>
              </Alert>

              {!csvFile ? (
                <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center hover:bg-orange-50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-orange-400 mb-3" />
                    <p className="font-semibold text-orange-900 mb-1">
                      לחץ להעלאת קובץ CSV
                    </p>
                    <p className="text-sm text-orange-600">
                      או גרור קובץ לכאן
                    </p>
                  </label>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{csvFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(csvFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCsvFile}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {isParsingCsv && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">מעבד קובץ...</span>
                    </div>
                  )}

                  {csvError && (
                    <Alert className="bg-red-50 border-red-300 mt-3">
                      <AlertDescription className="text-sm text-red-900">
                        ❌ {csvError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isParsingCsv && csvPhoneNumbers.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-900">
                          נמצאו {csvPhoneNumbers.length} מספרי טלפון תקינים
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                          {csvPhoneNumbers.slice(0, 10).map((phone, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono text-xs">
                              {phone}
                            </Badge>
                          ))}
                          {csvPhoneNumbers.length > 10 && (
                            <Badge variant="secondary" className="text-xs">
                              +{csvPhoneNumbers.length - 10} נוספים
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* סינונים - רק ללידים */}
          {recipientType === "leads" && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                סינון מתקדם
              </h3>

              {/* סינון לפי הצעה */}
              <div className="space-y-2">
                <Label>סינון לפי הצעה</Label>
                <Select value={filterByProposal} onValueChange={setFilterByProposal}>
                  <SelectTrigger className="brand-select">
                    <SelectValue placeholder="כל ההצעות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>כל ההצעות</SelectItem>
                    {availableProposals.map((proposal, idx) => (
                      <SelectItem key={idx} value={proposal}>
                        {proposal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterByProposal && (
                  <p className="text-xs text-purple-600">
                    📊 מסנן: {filteredLeadsList.length} לידים עם ההצעה "{filterByProposal}"
                  </p>
                )}
              </div>

              {/* סינון לפי טאגים */}
              <div className="space-y-2">
                <Label>סינון לפי טאגים</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant={filterByTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        filterByTags.includes(tag)
                          ? "bg-purple-600 text-white"
                          : "hover:bg-purple-100"
                      }`}
                      onClick={() => handleToggleTag(tag)}
                    >
                      <Tag className="w-3 h-3 ml-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                {filterByTags.length > 0 && (
                  <p className="text-xs text-purple-600">
                    📊 מסנן: {filteredLeadsList.length} לידים עם הטאגים שנבחרו
                  </p>
                )}
              </div>

              {(filterByProposal || filterByTags.length > 0) && (
                <Alert className="bg-purple-100 border-purple-300">
                  <AlertDescription className="text-sm text-purple-900">
                    <strong>ℹ️ שים לב:</strong> הקמפיין יישלח ל-{filteredLeadsList.length} לידים שעומדים בקריטריונים
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* בחירת נמענים */}
          {recipientType === "leads" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>בחירת לידים ({filterByProposal || filterByTags.length > 0 ? filteredLeadsList.length : leads.length})</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLeads(filteredLeadsList.map(l => l.id))}
                  >
                    בחר הכל
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLeads([])}
                  >
                    נקה הכל
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                {filteredLeadsList.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => handleToggleLead(lead.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{lead.phone} • {lead.email}</p>
                      {lead.proposals && lead.proposals.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {lead.proposals.slice(0, 2).map((prop, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {prop}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {lead.tags.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} className="text-xs bg-purple-100 text-purple-800">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                נבחרו: {selectedLeads.length} לידים
              </p>
            </div>
          )}

          {recipientType === "clients" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>בחירת לקוחות ({clients.length})</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedClients(clients.map(c => c.id))}
                  >
                    בחר הכל
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedClients([])}
                  >
                    נקה הכל
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => handleToggleClient(client.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.phone} • {client.email}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                נבחרו: {selectedClients.length} לקוחות
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 ml-2" />
            {isSending ? "שולח..." : isScheduled ? "קבע תזמון" : "שלח עכשיו"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}