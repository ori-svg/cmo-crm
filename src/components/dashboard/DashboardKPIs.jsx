
import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, BarChart3, Users } from "lucide-react";

export default function DashboardKPIs({ leads, clients, campaigns, dateRange }) {
  // חישוב סכום הוצאות מכל הקמפיינים בטווח
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  
  // חישוב הכנסות נכון לפי טווח התאריכים
  const now = new Date();
  let rangeStartDate = new Date();

  switch (dateRange) {
    case "week":
      rangeStartDate.setDate(now.getDate() - 7);
      break;
    case "month":
      rangeStartDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      rangeStartDate.setFullYear(now.getFullYear() - 1);
      break;
    case "max":
      rangeStartDate = new Date(0);
      break;
    default:
      rangeStartDate.setMonth(now.getMonth() - 1);
      break;
  }
  
  let totalRevenue = 0;
  
  clients.forEach(client => {
    // השתמש ב-payment_date אם קיים, אחרת ב-created_date
    const clientDate = client.payment_date 
      ? new Date(client.payment_date) 
      : new Date(client.created_date);
    
    // ✅ NEW: טיפול בהקמה + מתמשך
    if (client.revenue_type === "הקמה + מתמשך") {
      const setupFee = client.setup_fee || 0;
      const monthlyRecurring = client.monthly_recurring || 0;
      
      // תאריך התחלה = המאוחר מבין תאריך יצירת הלקוח או תחילת הטווח עבור חישוב חודשים מתמשכים
      const effectiveRecurringStartDate = clientDate > rangeStartDate ? clientDate : rangeStartDate;
      const monthsDiff = Math.floor((now - effectiveRecurringStartDate) / (1000 * 60 * 60 * 24 * 30.44));
      // נבטיח שלפחות חודש אחד יחושב עבור תשלום מתמשך אם הלקוח פעיל בטווח
      const monthsForRecurring = Math.max(1, monthsDiff);

      if (clientDate >= rangeStartDate && clientDate <= now) {
        // הלקוח נוצר בטווח
        // הוסף עמלת הקמה פעם אחת
        totalRevenue += setupFee;
        
        // הוסף תשלום חודשי מתמשך עבור החודשים שחלפו מאז היצירה, בתוך הטווח
        totalRevenue += monthlyRecurring * monthsForRecurring;
      } else if (clientDate < rangeStartDate) {
        // הלקוח נוצר לפני הטווח - חשב רק תשלומים מתמשכים בטווח
        // עמלת ההקמה אינה רלוונטית עבור טווח זה
        let monthsToCount = 0;
        switch(dateRange) {
          case "week":
            monthsToCount = 0.25; // רבע חודש
            break;
          case "month":
            monthsToCount = 1;
            break;
          case "year":
            monthsToCount = 12;
            break;
          case "max":
            // עבור טווח 'מקסימלי', כשהלקוח החל לפני תחילת הטווח שנבחר, חשב מיום יצירת הלקוח ועד עכשיו.
            monthsToCount = Math.floor((now - clientDate) / (1000 * 60 * 60 * 24 * 30.44));
            break;
          default:
            monthsToCount = 1; // ברירת מחדל לחודש אחד אם טווח התאריכים אינו תואם
            break;
        }
        totalRevenue += monthlyRecurring * monthsToCount;
      }
    } else if (client.revenue_type === "חד פעמי") {
      // לקוח חד פעמי - רק אם התשלום היה בטווח התאריכים
      if (clientDate >= rangeStartDate && clientDate <= now) {
        totalRevenue += client.revenue_amount || 0;
      }
    } else if (client.revenue_type === "ריטיינר חודשי") {
      // לקוח ריטיינר - חשב כמה חודשים בטווח
      const startDate = clientDate > rangeStartDate ? clientDate : rangeStartDate;
      
      // חשב כמה חודשים מתאריך ההתחלה עד עכשיו
      const monthsDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30.44));
      const monthsInRange = Math.max(0, monthsDiff);
      
      // אם הלקוח נוצר לפני תחילת הטווח, אבל עדיין פעיל - חשב לפי הטווח
      if (clientDate < rangeStartDate) {
        // חשב רק את החודשים שבטווח
        let monthsToCount = 0;
        switch(dateRange) {
          case "week":
            monthsToCount = 0.25; // רבע חודש
            break;
          case "month":
            monthsToCount = 1;
            break;
          case "year":
            monthsToCount = 12;
            break;
          case "max":
            // עבור טווח 'מקסימלי', כשהלקוח החל לפני תחילת הטווח שנבחר, חשב מיום יצירת הלקוח ועד עכשיו.
            monthsToCount = Math.floor((now - clientDate) / (1000 * 60 * 60 * 24 * 30.44));
            break;
          default:
            monthsToCount = 1; // ברירת מחדל לחודש אחד אם טווח התאריכים אינו תואם
            break;
        }
        totalRevenue += (client.revenue_amount || 0) * monthsToCount;
      } else {
        // הלקוח נוצר בטווח - חשב מתאריך היצירה
        totalRevenue += (client.revenue_amount || 0) * Math.max(1, monthsInRange);
      }
    }
  });
  
  // חישוב לידים מכל הקמפיינים
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
  const avgLeadCost = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
  const conversionRate = leads.length > 0 ? (clients.length / leads.length * 100) : 0;

  const kpis = [
    {
      title: "ROAS",
      value: `${roas.toFixed(2)}x`,
      subtitle: `החזר על השקעה`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: roas > 1 ? `+${((roas - 1) * 100).toFixed(0)}%` : `-${((1 - roas) * 100).toFixed(0)}%`
    },
    {
      title: "עלות לליד",
      value: `₪${avgLeadCost.toFixed(2)}`,
      subtitle: "ממוצע מקמפיינים",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: ""
    },
    {
      title: "סה״כ הכנסות",
      value: `₪${totalRevenue.toLocaleString('he-IL', {maximumFractionDigits: 0})}`,
      subtitle: "מלקוחות בטווח",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: ""
    },
    {
      title: "אחוז המרה",
      value: `${conversionRate.toFixed(1)}%`,
      subtitle: "מלידים ללקוחות",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      change: ""
    },
    {
      title: "סה״כ הוצאות",
      value: `₪${totalSpend.toLocaleString('he-IL', {maximumFractionDigits: 0})}`,
      subtitle: "השקעה בפרסום",
      icon: BarChart3,
      color: "text-red-600",
      bgColor: "bg-red-100",
      change: ""
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="p-4 md:p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${kpi.bgColor}`} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-xs md:text-sm text-gray-500 font-medium">{kpi.title}</p>
                {kpi.change && (
                  <span className={`text-xs font-semibold ${kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.change}
                  </span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold mb-1 truncate">{kpi.value}</p>
              <p className="text-xs text-gray-400">{kpi.subtitle}</p>
            </div>
            <div className={`${kpi.bgColor} p-2 md:p-3 rounded-xl flex-shrink-0`}>
              <kpi.icon className={`w-5 h-5 md:w-6 md:h-6 ${kpi.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
