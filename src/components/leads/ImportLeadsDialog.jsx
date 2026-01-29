import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertCircle, CheckCircle2, X, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Lead } from "@/api/entities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export default function ImportLeadsDialog({ open, onClose, onImportComplete, currentCompanyId }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: preview/import
  const [rawData, setRawData] = useState([]); // נתונים גולמיים מהקובץ
  const [headers, setHeaders] = useState([]); // כותרות העמודות
  const [columnMapping, setColumnMapping] = useState({}); // מיפוי עמודות לשדות
  const [parsedLeads, setParsedLeads] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  
  // הגדרות גלובליות לכל הלידים המיובאים
  const [globalSettings, setGlobalSettings] = useState({
    source: "",
    status: "",
    tag: "",
    campaign: ""
  });
  
  // רשימות מותאמות אישית
  const [availableSources, setAvailableSources] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  // שדות אפשריים למיפוי
  const availableFields = [
    { value: "full_name", label: "שם מלא (יפוצל אוטומטית)" },
    { value: "first_name", label: "שם פרטי" },
    { value: "last_name", label: "שם משפחה" },
    { value: "email", label: "אימייל" },
    { value: "phone", label: "טלפון" },
    { value: "source", label: "מקור" },
    { value: "status", label: "סטטוס" },
    { value: "fb_campaign", label: "קמפיין" },
    { value: "notes", label: "הערות" },
    { value: "ignore", label: "התעלם" }
  ];

  // טען רשימות מותאמות בפתיחה
  React.useEffect(() => {
    if (open) {
      const companyKey = currentCompanyId ? `_${currentCompanyId}` : '';
      
      const savedSources = localStorage.getItem(`lead_sources${companyKey}`);
      setAvailableSources(savedSources ? JSON.parse(savedSources) : ["Facebook", "Google", "Organic", "Referral", "Other"]);
      
      const savedStatuses = localStorage.getItem(`lead_statuses${companyKey}`);
      setAvailableStatuses(savedStatuses ? JSON.parse(savedStatuses) : ["חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"]);
      
      const savedTags = localStorage.getItem(`lead_tags${companyKey}`);
      setAvailableTags(savedTags ? JSON.parse(savedTags) : []);
    }
  }, [open, currentCompanyId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedLeads([]);
    setImportResults(null);
    setImportProgress(0);
    setGlobalSettings({ source: "", status: "", tag: "", campaign: "" });

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setErrors(['הקובץ ריק']);
        setIsProcessing(false);
        return;
      }

      // קרא את שורת הכותרות (או השורה הראשונה)
      const firstLine = lines[0];
      const detectedHeaders = firstLine.split(/[,;]/).map(h => h.trim().replace(/['"]/g, ''));
      
      setHeaders(detectedHeaders);
      
      // קרא את כל השורות
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/['"]/g, ''));
        data.push(parts);
      }
      
      setRawData(data);
      
      // נסה לזהות אוטומטית מיפוי עמודות
      const autoMapping = {};
      detectedHeaders.forEach((header, idx) => {
        const lowerHeader = header.toLowerCase();
        
        if (lowerHeader.includes('full name') || lowerHeader.includes('שם מלא')) {
          autoMapping[idx] = 'full_name';
        } else if (lowerHeader.includes('first') || lowerHeader.includes('שם פרטי') || lowerHeader === 'שם') {
          autoMapping[idx] = 'first_name';
        } else if (lowerHeader.includes('last') || lowerHeader.includes('שם משפחה') || lowerHeader === 'משפחה') {
          autoMapping[idx] = 'last_name';
        } else if (lowerHeader.includes('email') || lowerHeader.includes('אימייל') || lowerHeader.includes('מייל')) {
          autoMapping[idx] = 'email';
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('טלפון') || lowerHeader.includes('פלאפון')) {
          autoMapping[idx] = 'phone';
        } else if (lowerHeader.includes('source') || lowerHeader.includes('מקור')) {
          autoMapping[idx] = 'source';
        } else if (lowerHeader.includes('status') || lowerHeader.includes('סטטוס')) {
          autoMapping[idx] = 'status';
        } else if (lowerHeader.includes('campaign') || lowerHeader.includes('קמפיין')) {
          autoMapping[idx] = 'fb_campaign';
        } else if (lowerHeader.includes('note') || lowerHeader.includes('הערה')) {
          autoMapping[idx] = 'notes';
        } else {
          autoMapping[idx] = 'ignore';
        }
      });
      
      setColumnMapping(autoMapping);
      setStep(2); // עבור לשלב המיפוי

    } catch (error) {
      console.error('Error parsing CSV:', error);
      setErrors([`שגיאה בעיבוד הקובץ: ${error.message}`]);
    }

    setIsProcessing(false);
    event.target.value = '';
  };

  const handleMapping = () => {
    // המר את הנתונים לפי המיפוי
    const leads = [];
    const parseErrors = [];
    const newStatuses = new Set(); // לאיסוף סטטוסים חדשים

    rawData.forEach((row, rowIdx) => {
      const lead = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        source: 'Other',
        status: 'חדש', // 🎯 סטטוס דיפולטי
        fb_campaign: '',
        tags: [],
        notes: `יובא מקובץ CSV ב-${new Date().toLocaleString('he-IL')}`
      };

      // מפה את העמודות
      Object.keys(columnMapping).forEach(colIdx => {
        const field = columnMapping[colIdx];
        if (field !== 'ignore' && row[colIdx]) {
          if (field === 'full_name') {
            // פצל שם מלא לשם פרטי ושם משפחה
            const nameParts = row[colIdx].trim().split(/\s+/);
            lead.first_name = nameParts[0] || '';
            lead.last_name = nameParts.slice(1).join(' ') || '';
          } else if (field === 'status') {
            // ✅ אם יש עמודת סטטוס בקובץ - השתמש בה, אחרת השאר "חדש"
            const importedStatus = row[colIdx]?.trim();
            if (importedStatus) {
              lead.status = importedStatus;
              
              // בדוק אם הסטטוס חדש
              const savedStatuses = localStorage.getItem("lead_statuses");
              const existingStatuses = savedStatuses ? JSON.parse(savedStatuses) : [
                "חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"
              ];
              if (!existingStatuses.includes(lead.status)) {
                newStatuses.add(lead.status);
              }
            }
            // אם אין ערך - השאר את הדיפולט "חדש"
          } else if (field === 'notes') {
            lead[field] = (lead[field] || '') + '\n' + row[colIdx];
          } else {
            lead[field] = row[colIdx];
          }
        }
      });
      
      // החל הגדרות גלובליות (מחליפות את מה שבקובץ אם נבחרו)
      if (globalSettings.source) {
        lead.source = globalSettings.source;
      }
      if (globalSettings.status) {
        lead.status = globalSettings.status;
      }
      if (globalSettings.campaign) {
        lead.fb_campaign = globalSettings.campaign;
      }
      if (globalSettings.tag) {
        lead.tags = [globalSettings.tag];
      }

      // וולידציה בסיסית
      if (!lead.first_name) {
        parseErrors.push(`שורה ${rowIdx + 2}: חסר שם פרטי`);
        return;
      }

      if (!lead.email && !lead.phone) {
        parseErrors.push(`שורה ${rowIdx + 2}: חסר אימייל וטלפון - חייב לפחות אחד מהם`);
        return;
      }

      // בדיקת אימייל תקין אם קיים
      if (lead.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lead.email)) {
          parseErrors.push(`שורה ${rowIdx + 2}: אימייל לא תקין - ${lead.email}`);
          return;
        }
      }

      leads.push(lead);
    });

    // אם יש סטטוסים חדשים, הוסף אותם ל-localStorage
    if (newStatuses.size > 0) {
      const savedStatuses = localStorage.getItem("lead_statuses");
      const existingStatuses = savedStatuses ? JSON.parse(savedStatuses) : [
        "חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"
      ];
      const updatedStatuses = [...existingStatuses, ...Array.from(newStatuses)];
      localStorage.setItem("lead_statuses", JSON.stringify(updatedStatuses));
      
      console.log(`✅ הוספו ${newStatuses.size} סטטוסים חדשים:`, Array.from(newStatuses));
    }

    setParsedLeads(leads);
    setErrors(parseErrors);
    setStep(3); // עבור לתצוגה מקדימה
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    
    const results = {
      success: 0,
      merged: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      // בדוק לידים קיימים
      const existingLeads = await Lead.list();

      // עיבוד בקבוצות של 5 לידים בכל פעם
      const BATCH_SIZE = 5;
      const DELAY_BETWEEN_BATCHES = 1000; // 1 שנייה בין קבוצות
      const DELAY_BETWEEN_LEADS = 200; // 200ms בין לידים באותה קבוצה

      for (let i = 0; i < parsedLeads.length; i += BATCH_SIZE) {
        const batch = parsedLeads.slice(i, i + BATCH_SIZE);
        
        for (const lead of batch) {
          try {
            // בדוק כפילויות לפי טלפון או אימייל
            const duplicate = existingLeads.find(l => 
              (l.phone && lead.phone && l.phone === lead.phone) ||
              (l.email && lead.email && l.email.toLowerCase() === lead.email.toLowerCase())
            );

            if (duplicate) {
              console.log(`⚡ נמצא ליד כפול - ממזג נתונים ומעלה לראש:`, lead.first_name, lead.last_name);
              
              // אתחל campaign_history אם לא קיים
              const campaignHistory = duplicate.campaign_history || [];
              
              // הוסף את הקמפיין הנוכחי להיסטוריה אם יש
              if (lead.fb_campaign) {
                campaignHistory.push({
                  campaign: lead.fb_campaign,
                  source: lead.source,
                  date: new Date().toISOString(),
                  form_responses: lead.form_responses || '',
                  notes: lead.notes || ''
                });
              }

              // מזג הערות
              const mergedNotes = [
                duplicate.notes || '',
                `\n\n[${new Date().toLocaleString('he-IL')}] ייבוא חוזר:`,
                lead.notes || '',
                lead.fb_campaign ? `קמפיין: ${lead.fb_campaign}` : '',
                lead.form_responses ? `תשובות: ${lead.form_responses}` : ''
              ].filter(Boolean).join('\n');

              // עדכן ליד קיים - updated_date יתעדכן אוטומטית ויקפיץ אותו לראש
              await Lead.update(duplicate.id, {
                campaign_history: campaignHistory,
                notes: mergedNotes.trim(),
                fb_campaign: lead.fb_campaign || duplicate.fb_campaign,
                form_responses: lead.form_responses || duplicate.form_responses
              });

              results.merged++;
              
              // עדכן את הליד ברשימת הלידים הקיימים
              const leadIndex = existingLeads.findIndex(l => l.id === duplicate.id);
              if (leadIndex !== -1) {
                existingLeads[leadIndex].updated_date = new Date().toISOString();
              }
            } else {
              // צור ליד חדש
              const leadData = {
                ...lead,
                company_id: currentCompanyId,
                campaign_history: lead.fb_campaign ? [{
                  campaign: lead.fb_campaign,
                  source: lead.source,
                  date: new Date().toISOString(),
                  form_responses: lead.form_responses || '',
                  notes: lead.notes || ''
                }] : []
              };

              await Lead.create(leadData);
              results.success++;
              
              // הוסף את הליד החדש לרשימת הלידים הקיימים
              existingLeads.push(leadData);
            }

            // Delay קצר בין לידים באותה קבוצה
            if (batch.indexOf(lead) < batch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LEADS));
            }

          } catch (error) {
            console.error('Error creating/updating lead:', error);
            results.errors++;
            results.errorDetails.push(`${lead.first_name} ${lead.last_name} (${lead.email || lead.phone}): ${error.message}`);
          }

          // עדכן progress bar
          const progress = Math.round(((i + batch.indexOf(lead) + 1) / parsedLeads.length) * 100);
          setImportProgress(progress);
        }

        // Delay ארוך יותר בין קבוצות
        if (i + BATCH_SIZE < parsedLeads.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      setImportResults(results);

    } catch (error) {
      console.error('Error importing leads:', error);
      alert(`שגיאה בייבוא: ${error.message}`);
    }

    setIsImporting(false);
    setImportProgress(0);
  };

  const handleClose = () => {
    if (importResults && importResults.success > 0) {
      onImportComplete();
    }
    setStep(1);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedLeads([]);
    setErrors([]);
    setImportResults(null);
    setImportProgress(0);
    onClose();
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setRawData([]);
      setHeaders([]);
      setColumnMapping({});
    } else if (step === 3) {
      setStep(2);
      setParsedLeads([]);
      setErrors([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-900 flex items-center gap-3">
            ייבוא לידים מקובץ CSV
            <div className="flex gap-2 mr-auto">
              <Badge variant={step === 1 ? "default" : step > 1 ? "secondary" : "outline"}>1</Badge>
              <Badge variant={step === 2 ? "default" : step > 2 ? "secondary" : "outline"}>2</Badge>
              <Badge variant={step === 3 ? "default" : "outline"}>3</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* שלב 1: העלאת קובץ */}
          {step === 1 && (
            <>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <strong>הוראות:</strong>
                  <br />
                  1. העלה קובץ CSV עם שורת כותרות
                  <br />
                  2. בחר איזו עמודה מייצגת איזה שדה
                  <br />
                  3. בדוק תצוגה מקדימה וייבא
                </AlertDescription>
              </Alert>

              {!rawData.length && !importResults && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg"
                  >
                    לחץ להעלאת קובץ CSV
                  </label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isProcessing && (
                    <div className="mt-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                      <p className="text-sm text-gray-600 mt-2">מעבד קובץ...</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* שלב 2: מיפוי עמודות */}
          {step === 2 && (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>נמצאו {rawData.length} שורות ו-{headers.length} עמודות</strong>
                  <br />
                  בחר מה כל עמודה מייצגת. זיהינו אוטומטית חלק מהשדות.
                </AlertDescription>
              </Alert>

              {/* הגדרות גלובליות לכל הלידים */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-4">הגדרות לכל הלידים המיובאים (אופציונלי):</h3>
                <p className="text-xs text-blue-700 mb-4">
                  הגדרות אלו יחולו על כל הלידים ויחליפו ערכים מהקובץ אם נבחרו
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm text-blue-800 mb-2 block">מקור</Label>
                    <Select
                      value={globalSettings.source || "none"}
                      onValueChange={(value) => setGlobalSettings({...globalSettings, source: value === "none" ? "" : value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="לפי הקובץ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">לפי הקובץ</SelectItem>
                        {availableSources.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-blue-800 mb-2 block">סטטוס</Label>
                    <Select
                      value={globalSettings.status || "none"}
                      onValueChange={(value) => setGlobalSettings({...globalSettings, status: value === "none" ? "" : value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="לפי הקובץ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">לפי הקובץ</SelectItem>
                        {availableStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-blue-800 mb-2 block">טאג</Label>
                    <Select
                      value={globalSettings.tag || "none"}
                      onValueChange={(value) => setGlobalSettings({...globalSettings, tag: value === "none" ? "" : value})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="ללא טאג" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא טאג</SelectItem>
                        {availableTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-blue-800 mb-2 block">קמפיין</Label>
                    <input
                      type="text"
                      value={globalSettings.campaign}
                      onChange={(e) => setGlobalSettings({...globalSettings, campaign: e.target.value})}
                      placeholder="שם הקמפיין"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">מיפוי עמודות:</h3>
                
                {headers.map((header, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-4 items-center bg-white p-3 rounded-lg border">
                    <div>
                      <Label className="text-sm text-gray-600">עמודה {idx + 1}:</Label>
                      <div className="font-semibold text-gray-900 mt-1">{header}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        דוגמה: {rawData[0]?.[idx] || '-'}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-gray-600 mb-2 block">מייצג את:</Label>
                      <Select
                        value={columnMapping[idx] || 'ignore'}
                        onValueChange={(value) => setColumnMapping({...columnMapping, [idx]: value})}
                      >
                        <SelectTrigger className="brand-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* שלב 3: תצוגה מקדימה */}
          {step === 3 && !importResults && (
            <>
              {/* שגיאות */}
              {errors.length > 0 && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription>
                    <strong className="text-red-900">שגיאות בקובץ:</strong>
                    <ul className="mt-2 text-sm text-red-800 list-disc list-inside max-h-40 overflow-y-auto">
                      {errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {parsedLeads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">
                          מוכן לייבוא!
                        </p>
                        <p className="text-sm text-green-700">
                          {parsedLeads.length} לידים תקינים נמצאו
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar בזמן ייבוא */}
                  {isImporting && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">
                          מייבא לידים...
                        </span>
                        <span className="text-sm text-blue-700">
                          {importProgress}%
                        </span>
                      </div>
                      <Progress value={importProgress} className="h-2" />
                      <p className="text-xs text-blue-600 mt-2">
                        אנא המתן, תהליך זה עשוי לקחת מספר דקות
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      תצוגה מקדימה (10 ראשונים):
                    </p>
                    <div className="space-y-2">
                      {parsedLeads.slice(0, 10).map((lead, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border text-sm">
                          <div className="font-semibold text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-gray-600 mt-1 space-y-1">
                            <div>📧 {lead.email}</div>
                            {lead.phone && <div>📱 {lead.phone}</div>}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline">{lead.source}</Badge>
                              <Badge className="bg-blue-100 text-blue-800">{lead.status}</Badge>
                              {lead.fb_campaign && <Badge className="bg-purple-100 text-purple-800">{lead.fb_campaign}</Badge>}
                              {lead.tags && lead.tags.length > 0 && lead.tags.map((tag, tagIdx) => (
                                <Badge key={tagIdx} className="bg-green-100 text-green-800">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {parsedLeads.length > 10 && (
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        ועוד {parsedLeads.length - 10} לידים...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* תוצאות ייבוא */}
          {importResults && (
            <div className="space-y-3">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription>
                  <strong className="text-green-900">הייבוא הושלם!</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>✅ לידים חדשים:</span>
                      <strong className="text-green-800">{importResults.success}</strong>
                    </div>
                    {importResults.merged > 0 && (
                      <div className="flex justify-between text-blue-700">
                        <span>🔄 לידים ממוזגים (עלו לראש הטבלה):</span>
                        <strong>{importResults.merged}</strong>
                      </div>
                    )}
                    {importResults.errors > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>❌ שגיאות:</span>
                        <strong>{importResults.errors}</strong>
                      </div>
                    )}
                  </div>
                  {importResults.merged > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-800">
                        💡 <strong>לידים ממוזגים:</strong> זוהו לידים קיימים במערכת (לפי טלפון/אימייל), 
                        והמידע החדש מהייבוא נוסף להיסטוריית הקמפיינים וההערות שלהם.
                        <br />
                        🚀 <strong>הלידים הכפולים עלו לראש הטבלה</strong> - הם יופיעו כעת ברשימת הלידים בתור המעודכנים האחרונים.
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {importResults.errorDetails.length > 0 && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription>
                    <strong className="text-red-900">פרטי שגיאות:</strong>
                    <ul className="mt-2 text-sm text-red-800 list-disc list-inside max-h-40 overflow-y-auto">
                      {importResults.errorDetails.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 1 && !importResults && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowRight className="w-4 h-4 ml-2" />
              חזור
            </Button>
          )}
          
          <Button variant="outline" onClick={handleClose}>
            {importResults ? 'סגור' : 'ביטול'}
          </Button>
          
          {step === 2 && (
            <Button
              onClick={handleMapping}
              className="bg-gradient-to-r from-blue-600 to-blue-700"
            >
              המשך לתצוגה מקדימה
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          )}
          
          {step === 3 && parsedLeads.length > 0 && !importResults && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-gradient-to-r from-blue-600 to-blue-700"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייבא {importProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  ייבא {parsedLeads.length} לידים
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}