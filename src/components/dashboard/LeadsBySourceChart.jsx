import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function LeadsBySourceChart({ leads }) {
  const sourceCount = leads.reduce((acc, lead) => {
    const source = lead.source || "לא ידוע";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(sourceCount).map(([source, count]) => ({
    מקור: source,
    לידים: count
  }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
          לידים לפי מקור
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="מקור" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
            <Bar dataKey="לידים" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}