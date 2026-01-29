import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Send, CheckCircle2, MessageCircle, XCircle } from "lucide-react";

export default function WhatsAppStats({ currentCompanyId }) {
  const [stats, setStats] = useState({
    total_sent: 0,
    total_delivered: 0,
    total_read: 0,
    total_failed: 0
  });

  useEffect(() => {
    if (currentCompanyId) {
      loadStats();
    }
  }, [currentCompanyId]);

  const loadStats = async () => {
    const { WhatsAppMessage } = await import("@/api/entities");
    
    // טען הודעות לפי החברה הנוכחית
    const messages = await WhatsAppMessage.filter({ 
      direction: "יוצא",
      company_id: currentCompanyId 
    });
    
    setStats({
      total_sent: messages.length,
      total_delivered: messages.filter(m => m.status === "נמסר" || m.status === "נקרא").length,
      total_read: messages.filter(m => m.status === "נקרא").length,
      total_failed: messages.filter(m => m.status === "נכשל").length
    });
  };

  const statCards = [
    {
      title: "הודעות נשלחו",
      value: stats.total_sent,
      icon: Send,
      color: "bg-blue-500"
    },
    {
      title: "הודעות נמסרו",
      value: stats.total_delivered,
      icon: CheckCircle2,
      color: "bg-green-500"
    },
    {
      title: "הודעות נקראו",
      value: stats.total_read,
      icon: MessageCircle,
      color: "bg-purple-500"
    },
    {
      title: "הודעות נכשלו",
      value: stats.total_failed,
      icon: XCircle,
      color: "bg-red-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}