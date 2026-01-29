import React from "react";
import { Card } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Activity } from "lucide-react";

export default function ClientsStats({ clients }) {
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === "פעיל").length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.revenue_total || 0), 0);
  const avgRevenue = totalClients > 0 ? totalRevenue / totalClients : 0;

  const stats = [
    {
      title: "סה״כ לקוחות",
      value: totalClients,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "לקוחות פעילים",
      value: activeClients,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "סה״כ הכנסות",
      value: `₪${totalRevenue.toFixed(0)}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "הכנסה ממוצעת",
      value: `₪${avgRevenue.toFixed(2)}`,
      icon: TrendingUp,
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