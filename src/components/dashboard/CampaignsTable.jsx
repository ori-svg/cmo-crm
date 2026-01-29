import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export default function CampaignsTable({ campaigns, clients = [] }) {
  // חישוב לקוחות והכנסות לפי קמפיין
  const clientsByCampaign = {};
  clients.forEach(client => {
    const campaignName = client.fb_campaign;
    if (campaignName) {
      if (!clientsByCampaign[campaignName]) {
        clientsByCampaign[campaignName] = {
          count: 0,
          revenue: 0
        };
      }
      clientsByCampaign[campaignName].count += 1;
      clientsByCampaign[campaignName].revenue += client.revenue_total || client.revenue_amount || 0;
    }
  });

  // קבץ קמפיינים לפי campaign_id וסכום נתונים
  const groupedCampaigns = {};
  
  campaigns.forEach(campaign => {
    const id = campaign.campaign_id;
    if (!groupedCampaigns[id]) {
      groupedCampaigns[id] = {
        campaign_id: id,
        campaign_name: campaign.campaign_name,
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        purchases: 0,
        purchase_value: 0,
        clients_count: 0,
        clients_revenue: 0
      };
    }
    
    groupedCampaigns[id].spend += campaign.spend || 0;
    groupedCampaigns[id].impressions += campaign.impressions || 0;
    groupedCampaigns[id].clicks += campaign.clicks || 0;
    groupedCampaigns[id].leads += campaign.leads || 0;
    groupedCampaigns[id].purchases += campaign.purchases || 0;
    groupedCampaigns[id].purchase_value += campaign.purchase_value || 0;
    
    // הוסף נתוני לקוחות מהמערכת שלנו
    const campaignName = campaign.campaign_name;
    if (clientsByCampaign[campaignName]) {
      groupedCampaigns[id].clients_count = clientsByCampaign[campaignName].count;
      groupedCampaigns[id].clients_revenue = clientsByCampaign[campaignName].revenue;
    }
  });

  const campaignsArray = Object.values(groupedCampaigns)
    .map(c => ({
      ...c,
      cost_per_lead: c.leads > 0 ? c.spend / c.leads : 0,
      // ROAS מחושב מהכנסות לקוחות במערכת שלנו
      roas: c.spend > 0 ? c.clients_revenue / c.spend : 0,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          ביצועי קמפיינים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-bold text-right">שם קמפיין</TableHead>
                <TableHead className="font-bold text-center">הוצאה</TableHead>
                <TableHead className="font-bold text-center">לידים</TableHead>
                <TableHead className="font-bold text-center">עלות לליד</TableHead>
                <TableHead className="font-bold text-center">לקוחות</TableHead>
                <TableHead className="font-bold text-center">הכנסות</TableHead>
                <TableHead className="font-bold text-center">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    אין נתוני קמפיינים להצגה
                  </TableCell>
                </TableRow>
              ) : (
                campaignsArray.map((campaign) => (
                  <TableRow key={campaign.campaign_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium max-w-[200px] truncate text-right">
                      {campaign.campaign_name}
                    </TableCell>
                    <TableCell className="text-center">
                      ₪{campaign.spend.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {campaign.leads}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      ₪{campaign.cost_per_lead.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {campaign.clients_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      ₪{campaign.clients_revenue.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={campaign.roas > 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
                      >
                        {campaign.roas.toFixed(2)}x
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}