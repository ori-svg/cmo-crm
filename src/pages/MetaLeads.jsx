import React, { useState, useEffect } from "react";
import { MetaLead, Lead } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function MetaLeadsPage() {
  const [metaLeads, setMetaLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadMetaLeads();
  }, []);

  const loadMetaLeads = async () => {
    setIsLoading(true);
    const data = await MetaLead.list("-created_time");
    setMetaLeads(data);
    setIsLoading(false);
  };

  const handleImportToCRM = async (metaLead) => {
    setIsImporting(true);
    try {
      // יצירת ליד חדש ב-CRM
      const newLead = await Lead.create({
        first_name: metaLead.full_name?.split(' ')[0] || "",
        last_name: metaLead.full_name?.split(' ').slice(1).join(' ') || "",
        email: metaLead.email,
        phone: metaLead.phone,
        source: "Facebook",
        fb_campaign: metaLead.campaign_name,
        fb_lead_id: metaLead.lead_id,
        status: "חדש"
      });

      // עדכון שהליד יובא
      await MetaLead.update(metaLead.id, {
        imported_to_crm: true,
        crm_lead_id: newLead.id
      });

      await loadMetaLeads();
      alert("הליד יובא בהצלחה ל-CRM! ✓");
    } catch (error) {
      alert(`שגיאה: ${error.message}`);
    }
    setIsImporting(false);
  };

  const handleImportAll = async () => {
    setIsImporting(true);
    const unimportedLeads = metaLeads.filter(l => !l.imported_to_crm);
    
    for (const metaLead of unimportedLeads) {
      await handleImportToCRM(metaLead);
    }
    
    setIsImporting(false);
    alert(`יובאו ${unimportedLeads.length} לידים ל-CRM! ✓`);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
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
              לידים מ-Meta
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">לידים שנמשכו מ-Facebook Lead Ads</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={loadMetaLeads}
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              רענן
            </Button>
            <Button
              onClick={handleImportAll}
              disabled={isImporting || metaLeads.filter(l => !l.imported_to_crm).length === 0}
              className="bg-gradient-to-r from-green-600 to-green-700"
            >
              <Download className="w-4 h-4 ml-2" />
              ייבא הכל ל-CRM
            </Button>
          </div>
        </motion.div>

        <Card className="overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <TableHead className="font-bold text-blue-900">שם</TableHead>
                  <TableHead className="font-bold text-blue-900">פרטי קשר</TableHead>
                  <TableHead className="font-bold text-blue-900">קמפיין</TableHead>
                  <TableHead className="font-bold text-blue-900">תאריך</TableHead>
                  <TableHead className="font-bold text-blue-900">סטטוס</TableHead>
                  <TableHead className="font-bold text-blue-900">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metaLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <p className="text-gray-500">אין לידים מ-Meta עדיין</p>
                      <p className="text-sm text-gray-400 mt-2">עבור להגדרות כדי למשוך לידים</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  metaLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-blue-50/50">
                      <TableCell className="font-medium">{lead.full_name || "לא צוין"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{lead.email || "-"}</div>
                          <div className="text-gray-500">{lead.phone || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50">
                          {lead.campaign_name || "לא ידוע"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {lead.created_time ? format(new Date(lead.created_time), "dd MMM yyyy", { locale: he }) : "-"}
                      </TableCell>
                      <TableCell>
                        {lead.imported_to_crm ? (
                          <Badge className="bg-green-100 text-green-800">יובא</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">ממתין</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!lead.imported_to_crm && (
                          <Button
                            size="sm"
                            onClick={() => handleImportToCRM(lead)}
                            disabled={isImporting}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ArrowRight className="w-4 h-4 ml-1" />
                            ייבא
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}