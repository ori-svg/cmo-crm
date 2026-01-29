import React from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  "פעיל": "bg-green-100 text-green-800 border-green-200",
  "לא פעיל": "bg-gray-100 text-gray-800 border-gray-200",
  "ממתין": "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function ClientsTable({ clients, isLoading }) {
  const navigate = useNavigate();

  const handleEditClient = (clientId) => {
    navigate(createPageUrl(`ClientDetail?id=${clientId}`));
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-lg">
        <div className="p-6 space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-green-50 to-green-100 hover:from-green-50 hover:to-green-100">
                <TableHead className="font-bold text-green-900 min-w-[150px]">שם</TableHead>
                <TableHead className="font-bold text-green-900 min-w-[120px]">תאריך הצטרפות</TableHead>
                <TableHead className="font-bold text-green-900 min-w-[200px]">פרטי קשר</TableHead>
                <TableHead className="font-bold text-green-900 min-w-[100px]">סטטוס</TableHead>
                <TableHead className="font-bold text-green-900 min-w-[120px]">סה״כ הכנסות</TableHead>
                <TableHead className="font-bold text-green-900 text-left min-w-[80px]">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <DollarSign className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">אין לקוחות להצגה</p>
                      <p className="text-sm text-gray-400">התחל להוסיף לקוחות חדשים למערכת</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="hover:bg-green-50/50 transition-colors cursor-pointer"
                    onClick={() => handleEditClient(client.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="max-w-[150px] truncate">
                        {client.name}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(client.created_date), "dd MMM yyyy", { locale: he })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 truncate max-w-[180px]">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 whitespace-nowrap">{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[client.status]} border whitespace-nowrap`}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {client.revenue_total ? (
                        <span className="font-semibold text-green-600">
                          ₪{client.revenue_total.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClient(client.id);
                        }}
                        className="hover:bg-green-100"
                      >
                        <Edit className="w-4 h-4 text-green-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}