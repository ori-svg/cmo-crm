import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";

export default function StatsBar({ leads }) {
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === "חדש").length;
  const convertedLeads = leads.filter(l => l.status === "לקוח").length;
  const avgCost = leads.reduce((sum, l) => sum + (l.lead_cost || 0), 0) / (totalLeads || 1);
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(1) : 0;

  const stats = [
    {
      title: "סה״כ לידים",
      value: totalLeads,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "לידים חדשים",
      value: newLeads,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "הומרו ללקוחות",
      value: convertedLeads,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "עלות ממוצעת",
      value: `₪${avgCost.toFixed(2)}`,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 font-medium truncate">{stat.title}</p>
              <p className="text-xl md:text-2xl font-bold mt-1 md:mt-2 truncate">{stat.value}</p>
              {stat.title === "הומרו ללקוחות" && (
                <p className="text-xs text-gray-400 mt-1">שיעור המרה: {conversionRate}%</p>
              )}
            </div>
            <div className={`${stat.bgColor} p-2 md:p-3 rounded-xl flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}