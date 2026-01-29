
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Trash2, MessageCircle, Clock, FileText, Tag } from "lucide-react";
import { formatDateTime } from "../utils/dateUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CampaignsList({ currentCompanyId, currentUser }) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  // campaignToStop and campaignToRun states are no longer used based on the new UI
  // const [campaignToStop, setCampaignToStop] = useState(null);
  // const [campaignToRun, setCampaignToRun] = useState(null);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadCampaigns();
    }
  }, [currentUser, currentCompanyId]);

  useEffect(() => {
    if (!currentUser || !currentCompanyId) return;
    
    // Check for campaigns that could potentially be "בתהליך" (in progress) or "מתוזמן" (scheduled)
    // The previous implementation used "בתהליך" and "מתוזמן" for auto-refresh
    // For the new UI, we primarily just load campaign data, not actively monitor progress bars on this component.
    // However, if the backend still updates 'בתהליך', we might want to refresh.
    // Let's keep the auto-refresh for "בתהליך" status to ensure stats are updated.
    const hasActiveCampaigns = campaigns.some(c => c.status === "בתהליך");
    
    if (hasActiveCampaigns) {
      // Increased interval from 3 seconds to 10 seconds to reduce load
      const interval = setInterval(() => {
        loadCampaigns(true);
      }, 10000); // Changed from 3000 to 10000
      
      return () => clearInterval(interval);
    }
  }, [campaigns, currentUser, currentCompanyId]);

  const loadCampaigns = async (silent = false) => {
    if (!currentUser || !currentCompanyId) {
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    
    try {
      const { WhatsAppCampaign } = await import("@/api/entities");
      
      const data = await WhatsAppCampaign.filter({ 
        company_id: currentCompanyId 
      }, "-created_date"); // Sort by creation date, descending
      setCampaigns(data);
      
      console.log('✅ Campaigns loaded:', data.length);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      setCampaigns([]);
    }
    
    if (!silent) setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCampaigns();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeleteCampaign = async (campaignId) => {
    try {
      const { WhatsAppCampaign } = await import("@/api/entities");
      await WhatsAppCampaign.delete(campaignId);
      await loadCampaigns();
      setCampaignToDelete(null);
    } catch (error) {
      console.error("Error deleting campaign:", error);
      alert("שגיאה במחיקת הקמפיין");
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      "טיוטה": "bg-gray-100 text-gray-800",
      "מתוזמן": "bg-blue-100 text-blue-800",
      "בתהליך": "bg-yellow-100 text-yellow-800",
      "הושלם": "bg-green-100 text-green-800",
      "נכשל": "bg-red-100 text-red-800",
      "הושלם חלקית": "bg-orange-100 text-orange-800",
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            קמפיינים אחרונים
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={!currentUser || !currentCompanyId || isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>טוען קמפיינים...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">עדיין לא נשלחו קמפיינים</p>
              <p className="text-sm text-gray-400 mt-2">לחץ על "קמפיין חדש" כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {campaign.template_name && <span>📝 {campaign.template_name}</span>}
                        {campaign.recipient_type && <span>👥 {campaign.recipient_type === 'leads' ? 'לידים' : 'לקוחות'}</span>}
                        <span>📅 {formatDateTime(campaign.created_date)}</span>
                      </div>

                      {/* תזמון */}
                      {campaign.scheduled_time && campaign.status === 'מתוזמן' && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                          <Clock className="w-4 h-4" />
                          <span>מתוזמן ל: {formatDateTime(campaign.scheduled_time)}</span>
                        </div>
                      )}

                      {/* סינונים */}
                      {(campaign.filter_by_proposal || (campaign.filter_by_tags && campaign.filter_by_tags.length > 0)) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {campaign.filter_by_proposal && (
                            <Badge variant="outline" className="bg-green-50 border-green-300 text-green-800">
                              <FileText className="w-3 h-3 ml-1" />
                              הצעה: {campaign.filter_by_proposal}
                            </Badge>
                          )}
                          {campaign.filter_by_tags && campaign.filter_by_tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50 border-purple-300 text-purple-800">
                              <Tag className="w-3 h-3 ml-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCampaignToDelete(campaign.id)} // Open delete confirmation dialog
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* סטטיסטיקות */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{campaign.total_sent || 0}</p>
                      <p className="text-xs text-gray-500">נשלחו</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{campaign.total_delivered || 0}</p>
                      <p className="text-xs text-gray-500">נמסרו</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{campaign.total_read || 0}</p>
                      <p className="text-xs text-gray-500">נקראו</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{campaign.total_replied || 0}</p>
                      <p className="text-xs text-gray-500">ענו</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{campaign.total_failed || 0}</p>
                      <p className="text-xs text-gray-500">נכשלו</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* אישור מחיקת קמפיין - Retained */}
      <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחק קמפיין?</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק קמפיין זה?
              <br />
              פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteCampaign(campaignToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
