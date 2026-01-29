import React from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Automation } from "@/api/entities";

export default function AutomationsTable({ automations, isLoading, onToggle, onEdit, onRefresh }) {
  const handleDelete = async (automation) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את "${automation.name}"?`)) {
      await Automation.delete(automation.id);
      onRefresh();
    }
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-lg">
        <div className="p-6 space-y-4">
          {Array(5).fill(0).map((_, i) =>
          <Skeleton key={i} className="h-16 w-full" />
          )}
        </div>
      </Card>);

  }

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-50 hover:to-purple-100">
                <TableHead className="font-bold text-purple-900 min-w-[200px]">שם</TableHead>
                <TableHead className="font-bold text-purple-900 min-w-[150px]">טריגר</TableHead>
                <TableHead className="font-bold text-purple-900 min-w-[150px]">פעולה</TableHead>
                <TableHead className="font-bold text-purple-900 min-w-[150px]">הרצה אחרונה</TableHead>
                <TableHead className="font-bold text-purple-900 min-w-[100px] text-center">סטטוס</TableHead>
                <TableHead className="font-bold text-purple-900 min-w-[120px] text-center">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.length === 0 ?
              <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Zap className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">אין אוטומציות להצגה</p>
                      <p className="text-sm text-gray-400">התחל ליצור אוטומציות חדשות</p>
                    </div>
                  </TableCell>
                </TableRow> :

              automations.map((automation) =>
              <TableRow
                key={automation.id}
                className="hover:bg-purple-50/50 transition-colors">

                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{automation.name}</p>
                        {automation.description &&
                    <p className="text-xs text-gray-500 mt-1">{automation.description}</p>
                    }
                        {automation.trigger_condition &&
                    <p className="text-xs text-purple-600 mt-1">
                            תנאי: {automation.trigger_condition}
                          </p>
                    }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                        {automation.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                        {automation.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {automation.last_run ?
                  format(new Date(automation.last_run), "dd MMM yyyy HH:mm", { locale: he }) :

                  <span className="text-gray-400">טרם הורצה</span>
                  }
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <button
                      onClick={() => onToggle(automation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      automation.is_active ? 'bg-purple-600' : 'bg-gray-300'}`
                      }>

                          <span className="bg-white mx-2 rounded-full inline-block h-4 w-4 transform transition-transform translate-x-1" />




                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(automation)}
                      className="hover:bg-purple-100">

                          <Edit className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(automation)}
                      className="hover:bg-red-100">

                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>);

}