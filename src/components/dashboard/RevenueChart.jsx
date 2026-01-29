import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

export default function RevenueChart({ campaigns, leads, clients, dateRange }) {
  // קבץ נתונים לפי תאריך
  const groupedByDate = {};
  
  // הוסף הוצאות מקמפיינים
  campaigns.forEach(campaign => {
    if (!campaign.date) return;
    
    const date = campaign.date;
    if (!groupedByDate[date]) {
      groupedByDate[date] = {
        date: date,
        spend: 0,
        revenue: 0
      };
    }
    
    groupedByDate[date].spend += campaign.spend || 0;
  });

  // הוסף הכנסות מלקוחות
  clients.forEach(client => {
    // קבע את התאריך - תאריך תשלום או תאריך יצירה
    const clientDate = client.payment_date 
      ? new Date(client.payment_date).toISOString().split('T')[0]
      : new Date(client.created_date).toISOString().split('T')[0];
    
    if (!groupedByDate[clientDate]) {
      groupedByDate[clientDate] = {
        date: clientDate,
        spend: 0,
        revenue: 0
      };
    }
    
    // חשב הכנסה לפי סוג הלקוח
    if (client.revenue_type === "הקמה + מתמשך") {
      // הכנסה ראשונית: הקמה + חודש ראשון
      const initialRevenue = (client.setup_fee || 0) + (client.monthly_recurring || 0);
      groupedByDate[clientDate].revenue += initialRevenue;
    } else {
      // חד פעמי או ריטיינר חודשי
      groupedByDate[clientDate].revenue += client.revenue_amount || 0;
    }
  });

  const chartData = Object.values(groupedByDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(item => ({
      date: item.date,
      הוצאות: Math.round(item.spend),
      הכנסות: Math.round(item.revenue)
    }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          הוצאות מול הכנסות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(parseISO(date), "dd/MM", { locale: he })}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              labelFormatter={(date) => format(parseISO(date), "dd MMMM yyyy", { locale: he })}
              formatter={(value) => `₪${value.toLocaleString('he-IL')}`}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="הוצאות" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="הכנסות" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}