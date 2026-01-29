
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, FileText, CheckCircle2, Clock, XCircle, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export default function TemplatesManager({ whatsappSettings, currentCompanyId }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadTemplates();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { WhatsAppTemplate } = await import("@/api/entities");
      
      // טען תבניות לפי החברה הנוכחית
      const data = await WhatsAppTemplate.filter({ 
        company_id: currentCompanyId 
      }, "-created_date");
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
    setIsLoading(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('sync-whatsapp-templates', {
        company_id: currentCompanyId
      });
      
      if (response.data.success) {
        alert(`✅ סונכרנו ${response.data.synced} תבניות מתוך ${response.data.total}`);
        await loadTemplates();
      } else {
        alert(`❌ שגיאה: ${response.data.error || 'שגיאה בסנכרון'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      let errorMsg = 'שגיאה בסנכרון התבניות';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ ${errorMsg}`);
    }
    setIsSyncing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "מאושר": return "bg-green-100 text-green-800 border-green-200";
      case "ממתין לאישור": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "נדחה": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "מאושר": return <CheckCircle2 className="w-4 h-4" />;
      case "ממתין לאישור": return <Clock className="w-4 h-4" />;
      case "נדחה": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <CardTitle>תבניות הודעות ({templates.length})</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              handleSync();
            }} 
            disabled={isSyncing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'מסנכרן...' : 'סנכרן מ-Meta'}
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">טוען...</div>
          ) : templates.length === 0 ? (
            <div className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <Clock className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                  <strong>אין תבניות!</strong>
                  <br />
                  לחץ על "סנכרן מ-Meta" כדי לייבא את התבניות שלך מ-Meta Business Manager.
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Button
                  onClick={() => window.open('https://business.facebook.com/wa/manage/message-templates/', '_blank')}
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 ml-2" />
                  צור תבניות ב-Meta
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{template.name}</h4>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{template.language}</Badge>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(template.status)} flex items-center gap-2`}>
                      {getStatusIcon(template.status)}
                      {template.status}
                    </Badge>
                  </div>

                  {template.header_content && (
                    <div className="bg-gray-50 rounded p-3 mb-2">
                      <p className="text-sm font-semibold text-gray-700">{template.header_content}</p>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 mb-2">
                    <p className="text-sm whitespace-pre-wrap">{template.content}</p>
                  </div>

                  {template.footer && (
                    <div className="text-xs text-gray-500 mt-2">
                      {template.footer}
                    </div>
                  )}

                  {template.variables && template.variables.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-1">משתנים בתבנית:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((v, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {template.buttons && template.buttons.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-2">כפתורים:</p>
                      <div className="flex flex-wrap gap-2">
                        {template.buttons.map((btn, i) => (
                          <Button key={i} variant="outline" size="sm" disabled>
                            {btn.text}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
