import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export default function ConversionFunnel({ leads, clients }) {
  const totalLeads = leads.length;
  const contacted = leads.filter(l => l.status !== "חדש").length;
  const qualified = leads.filter(l => l.status === "מוסמך" || l.status === "לקוח").length;
  const converted = clients.length;

  const stages = [
    { name: "לידים", count: totalLeads, percentage: 100 },
    { name: "נוצר קשר", count: contacted, percentage: totalLeads > 0 ? (contacted / totalLeads * 100) : 0 },
    { name: "מוסמכים", count: qualified, percentage: totalLeads > 0 ? (qualified / totalLeads * 100) : 0 },
    { name: "הומרו ללקוחות", count: converted, percentage: totalLeads > 0 ? (converted / totalLeads * 100) : 0 }
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          משפך המרה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {stages.map((stage, index) => (
            <React.Fragment key={index}>
              <div className="flex-1">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white text-center relative overflow-hidden"
                  style={{ 
                    opacity: 1 - (index * 0.15),
                    transform: `scale(${1 - (index * 0.05)})`
                  }}
                >
                  <p className="text-sm font-medium mb-2">{stage.name}</p>
                  <p className="text-3xl font-bold">{stage.count}</p>
                  <p className="text-xs mt-2 opacity-90">{stage.percentage.toFixed(0)}%</p>
                </div>
              </div>
              {index < stages.length - 1 && (
                <ChevronLeft className="w-6 h-6 text-gray-400 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}