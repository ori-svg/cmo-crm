import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime } from "../utils/dateUtils";
import { Checkbox } from "@/components/ui/checkbox";

const defaultStatusColors = {
  "חדש": "bg-blue-100 text-blue-800 border-blue-200",
  "נוצר קשר": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "מוסמך": "bg-purple-100 text-purple-800 border-purple-200",
  "יצאה הצעת מחיר": "bg-orange-100 text-orange-800 border-orange-200",
  "לקוח": "bg-green-100 text-green-800 border-green-200",
  "אבוד": "bg-red-100 text-red-800 border-red-200"
};

// צבעים אוטומטיים לסטטוסים מותאמים אישית
const colorPalette = [
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-lime-100 text-lime-800 border-lime-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200"
];

const getStatusColor = (status) => {
  if (defaultStatusColors[status]) {
    return defaultStatusColors[status];
  }
  // צור צבע קבוע לכל סטטוס לפי hash של השם
  const hash = status.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorPalette[hash % colorPalette.length];
};

export default function LeadsTable({
  leads,
  isLoading,
  onRefresh,
  selectedLeadIds = [],
  onSelectLead,
  onSelectAll
}) {
  const navigate = useNavigate();

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState([
  "first_name",
  "last_name",
  "email",
  "phone",
  "source",
  "status"]
  );

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
      loadTableSettings();
    }
  }, [effectiveCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadEffectiveCompany = async () => {
    // בדוק אם החברה הנוכחית היא חברת בת
    const companyId = localStorage.getItem(`currentCompany_${currentUser.id}`);

    if (!companyId) {
      setEffectiveCompanyId(currentUser.company_id);
      return;
    }

    try {
      const { Company } = await import("@/api/entities");
      const companies = await Company.filter({ id: companyId });

      if (companies.length > 0 && companies[0].parent_company_id) {
        // זו חברת בת - השתמש בחברת האם להגדרות טבלה
        setEffectiveCompanyId(companies[0].parent_company_id);
      } else {
        setEffectiveCompanyId(companyId);
      }
    } catch (error) {
      console.error("Error loading effective company:", error);
      setEffectiveCompanyId(companyId);
    }
  };

  const loadTableSettings = () => {
    // טען הגדרות עמודות מ-localStorage לפי החברה האפקטיבית
    const saved = localStorage.getItem(`leadsTableColumns_${effectiveCompanyId}`);

    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
        console.log(`✅ Loaded table settings for company: ${effectiveCompanyId}`);
      } catch (e) {
        console.error("Error parsing saved columns:", e);
      }
    }
  };

  const handleEditLead = (leadId) => {
    navigate(createPageUrl(`LeadDetail?id=${leadId}`));
  };

  // ✅ פונקציה לבדיקה האם עמודה מוצגת
  const isColumnVisible = (columnId) => {
    return visibleColumns.includes(columnId);
  };

  // ✅ NEW: בדיקה האם כל הלידים בדף הנוכחי נבחרו
  const isAllSelected = leads.length > 0 && leads.every((lead) => selectedLeadIds.includes(lead.id));
  const isSomeSelected = selectedLeadIds.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-lg">
        <div className="p-6 space-y-4">
          {Array(5).fill(0).map((_, i) =>
          <Skeleton key={i} className="h-16 w-full" />
          )}
        </div>
      </Card>);

  }

  // Calculate the number of visible columns for colspan
  const getColSpan = () => {
    let count = 2; // Checkbox + Actions are always visible
    if (isColumnVisible("first_name") || isColumnVisible("last_name")) count++;
    if (isColumnVisible("created_date")) count++;
    if (isColumnVisible("email") || isColumnVisible("phone")) count++;
    if (isColumnVisible("source")) count++;
    if (isColumnVisible("fb_campaign")) count++;
    if (isColumnVisible("status")) count++;
    // Tags and Proposals are always visible in this version
    count += 2;
    if (isColumnVisible("notes")) count++;
    return count;
  };

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <Table dir="rtl">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-50 hover:to-blue-100">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onCheckedChange={(checked) => onSelectAll(!!checked)} />

                </TableHead>
                {(isColumnVisible("first_name") || isColumnVisible("last_name")) &&
                <TableHead className="font-bold text-blue-900 min-w-[150px] text-right">שם</TableHead>
                }
                {isColumnVisible("created_date") &&
                <TableHead className="font-bold text-blue-900 min-w-[120px] text-right">תאריך יצירה</TableHead>
                }
                {(isColumnVisible("email") || isColumnVisible("phone")) &&
                <TableHead className="font-bold text-blue-900 min-w-[200px] text-right">פרטי קשר</TableHead>
                }
                {isColumnVisible("source") &&
                <TableHead className="font-bold text-blue-900 min-w-[100px] text-right">מקור</TableHead>
                }
                {isColumnVisible("fb_campaign") &&
                <TableHead className="font-bold text-blue-900 min-w-[150px] text-right">קמפיין</TableHead>
                }
                {isColumnVisible("status") &&
                <TableHead className="font-bold text-blue-900 min-w-[100px] text-right">סטטוס</TableHead>
                }
                <TableHead className="font-bold text-blue-900 min-w-[150px] text-right">טאגים</TableHead>
                <TableHead className="font-bold text-blue-900 min-w-[200px] text-right">הצעות</TableHead>
                {isColumnVisible("notes") &&
                <TableHead className="font-bold text-blue-900 min-w-[200px] text-right">הערות</TableHead>
                }
                <TableHead className="font-bold text-blue-900 text-left min-w-[80px]">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ?
              <TableRow>
                  <TableCell colSpan={getColSpan()} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">אין לידים להצגה</p>
                      <p className="text-sm text-gray-400">התחל להוסיף לידים חדשים למערכת</p>
                    </div>
                  </TableCell>
                </TableRow> :

              leads.map((lead) =>
              <TableRow
                key={lead.id}
                className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={(e) => {
                  // אם לחצו על checkbox או על התווית שלו - לא לנווט
                  if (e.target.tagName === 'INPUT' || e.target.closest('button[role="checkbox"]')) {
                    return;
                  }
                  handleEditLead(lead.id);
                }}>

                    <TableCell onClick={(e) => e.stopPropagation()} className="px-3 py-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <Checkbox
                    checked={selectedLeadIds.includes(lead.id)}
                    onCheckedChange={(checked) => onSelectLead(lead.id, !!checked)} className="mx-3 rounded-sm peer h-4 w-4 shrink-0 border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />

                    </TableCell>
                    
                    {(isColumnVisible("first_name") || isColumnVisible("last_name")) &&
                <TableCell className="font-medium text-right">
                        <div className="max-w-[150px] truncate">
                          {lead.first_name} {lead.last_name}
                        </div>
                      </TableCell>
                }
                    
                    {isColumnVisible("created_date") &&
                <TableCell className="whitespace-nowrap text-right">
                        {formatDate(lead.created_date)}
                      </TableCell>
                }
                    
                    {(isColumnVisible("email") || isColumnVisible("phone")) &&
                <TableCell className="text-right">
                        <div className="flex flex-col gap-1">
                          {isColumnVisible("email") && lead.email &&
                    <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 truncate max-w-[180px]">{lead.email}</span>
                            </div>
                    }
                          {isColumnVisible("phone") && lead.phone &&
                    <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 whitespace-nowrap">{lead.phone}</span>
                            </div>
                    }
                        </div>
                      </TableCell>
                }
                    
                    {isColumnVisible("source") &&
                <TableCell className="text-right">
                        <Badge variant="outline" className="bg-gray-50 whitespace-nowrap">
                          {lead.source || "לא ידוע"}
                        </Badge>
                      </TableCell>
                }
                    
                    {isColumnVisible("fb_campaign") &&
                <TableCell className="text-right">
                        {lead.fb_campaign ?
                  <span className="text-gray-900 text-sm whitespace-nowrap">
                            {lead.fb_campaign}
                          </span> :

                  <span className="text-gray-400">-</span>
                  }
                      </TableCell>
                }
                    
                    {isColumnVisible("status") &&
                <TableCell className="text-right">
                        <Badge className={`${getStatusColor(lead.status)} border whitespace-nowrap`}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                }
                    
                    <TableCell className="text-right">
                      {lead.tags && lead.tags.length > 0 ?
                  <div className="flex flex-wrap gap-1 justify-end">
                          {lead.tags.slice(0, 3).map((tag, idx) =>
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 rounded-full px-2 py-1 flex items-center gap-1">

                              <Tag className="w-3 h-3 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-800">{tag}</span>
                            </div>
                    )}
                          {lead.tags.length > 3 &&
                    <Badge variant="outline" className="text-xs">
                              +{lead.tags.length - 3}
                            </Badge>
                    }
                        </div> :

                  <span className="text-gray-400">-</span>
                  }
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {lead.proposals && lead.proposals.length > 0 ?
                  <div className="flex flex-wrap gap-2 justify-end">
                          {lead.proposals.map((proposal, idx) =>
                    <div
                      key={idx}
                      className={
                      typeof proposal === 'object' && proposal !== null ?
                      "bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg px-3 py-1" :
                      "bg-gradient-to-r from-green-100 to-teal-100 border border-green-200 rounded-lg px-3 py-1"
                      }>

                              <div className={`text-xs font-semibold ${typeof proposal === 'object' && proposal !== null ? 'text-purple-900' : 'text-green-900'}`}>
                                {typeof proposal === 'object' && proposal !== null ? proposal.campaign : proposal}
                              </div>
                              {typeof proposal === 'object' && proposal !== null &&
                      <div className="text-[10px] text-purple-600">
                                  {formatDate(proposal.date)}
                                </div>
                      }
                            </div>
                    )}
                        </div> :

                  <span className="text-gray-400">-</span>
                  }
                    </TableCell>
                    
                    {isColumnVisible("notes") &&
                <TableCell className="text-right">
                        {lead.notes ?
                  <div className="max-w-[200px] truncate text-sm text-gray-600">
                            {lead.notes}
                          </div> :

                  <span className="text-gray-400">-</span>
                  }
                      </TableCell>
                }
                    
                    <TableCell className="text-left">
                      <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditLead(lead.id);
                    }}
                    className="hover:bg-blue-100">

                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>);

}