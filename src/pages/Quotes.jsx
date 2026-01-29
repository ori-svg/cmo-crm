import React, { useState, useEffect } from "react";
import { Quote } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Edit,
  Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "../components/utils/dateUtils";

export default function QuotesPage({ currentCompanyId, currentUser }) {
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      loadUser();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentCompanyId) {
      loadQuotes();
    }
  }, [currentCompanyId]);

  useEffect(() => {
    filterQuotes();
  }, [quotes, searchTerm, statusFilter]);

  const loadUser = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const user = await base44.auth.me();
      if (!user) {
        console.error("No user found");
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadQuotes = async () => {
    setIsLoading(true);
    try {
      const allQuotes = await Quote.filter({ company_id: currentCompanyId });
      setQuotes(allQuotes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error("Error loading quotes:", error);
    }
    setIsLoading(false);
  };

  const filterQuotes = () => {
    let filtered = [...quotes];

    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.lead_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((q) => q.status === statusFilter);
    }

    setFilteredQuotes(filtered);
  };

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      await Quote.update(quoteId, { status: newStatus });
      await loadQuotes();
    } catch (error) {
      console.error("Error updating quote status:", error);
    }
  };

  const handleEditQuote = (quote) => {
    setEditingQuote({
      ...quote,
      valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : ""
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQuote || !editingQuote.amount || editingQuote.amount <= 0) {
      alert("יש להזין סכום תקין");
      return;
    }

    try {
      await Quote.update(editingQuote.id, {
        amount: parseFloat(editingQuote.amount),
        description: editingQuote.description,
        valid_until: editingQuote.valid_until || null,
        notes: editingQuote.notes,
        status: editingQuote.status
      });

      setShowEditDialog(false);
      setEditingQuote(null);
      await loadQuotes();
    } catch (error) {
      console.error("Error updating quote:", error);
      alert("שגיאה בעדכון הצעת המחיר");
    }
  };

  const handleDeleteQuote = async (quoteId, leadName) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הצעת המחיר עבור ${leadName}?`)) {
      try {
        await Quote.delete(quoteId);
        await loadQuotes();
      } catch (error) {
        console.error("Error deleting quote:", error);
        alert("שגיאה במחיקת הצעת המחיר");
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      "ממתין לתשובה": { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      "אושר": { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      "נדחה": { color: "bg-red-100 text-red-800", icon: XCircle },
      "פג תוקף": { color: "bg-gray-100 text-gray-800", icon: Calendar }
    };

    const config = statusConfig[status] || statusConfig["ממתין לתשובה"];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 ml-1" />
        {status}
      </Badge>
    );
  };

  const stats = {
    total: quotes.length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.amount || 0), 0),
    pending: quotes.filter((q) => q.status === "ממתין לתשובה").length,
    approved: quotes.filter((q) => q.status === "אושר").length,
    approvalRate: quotes.length > 0 
      ? ((quotes.filter((q) => q.status === "אושר").length / quotes.length) * 100).toFixed(1)
      : 0
  };

  if (!currentUser || !currentCompanyId) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                הצעות מחיר
              </h1>
              <p className="text-gray-500 mt-1">מעקב אחר כל ההצעות שיצאו ללקוחות</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-semibold">סה"כ הצעות</p>
                    <p className="text-3xl font-bold text-purple-900 mt-1">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-semibold">סכום כולל</p>
                    <p className="text-3xl font-bold text-green-900 mt-1">
                      ₪{stats.totalAmount.toLocaleString('he-IL')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-semibold">ממתינות לתשובה</p>
                    <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-semibold">אחוז אישור</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">{stats.approvalRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="חפש לפי שם, אימייל או תיאור..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px] brand-select">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="ממתין לתשובה">ממתין לתשובה</SelectItem>
                    <SelectItem value="אושר">אושר</SelectItem>
                    <SelectItem value="נדחה">נדחה</SelectItem>
                    <SelectItem value="פג תוקף">פג תוקף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quotes List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                רשימת הצעות מחיר ({filteredQuotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">טוען...</div>
              ) : filteredQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-semibold">אין הצעות מחיר</p>
                  <p className="text-gray-400 text-sm mt-1">
                    הצעות מחיר ייווצרו אוטומטית כשתשנה סטטוס ליד ל"יצאה הצעת מחיר"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-white to-purple-50"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-900">
                              {quote.lead_name}
                            </h3>
                            {getStatusBadge(quote.status)}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>📧 {quote.lead_email}</p>
                            {quote.lead_phone && <p>📱 {quote.lead_phone}</p>}
                            {quote.description && (
                              <p className="text-gray-700 mt-2">📝 {quote.description}</p>
                            )}
                            {quote.valid_until && (
                              <p className="text-orange-600">
                                ⏰ תוקף עד: {formatDate(quote.valid_until)}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              נוצר: {formatDate(quote.created_date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="text-left">
                            <p className="text-2xl font-bold text-purple-900">
                              ₪{quote.amount.toLocaleString('he-IL')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQuote(quote)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteQuote(quote.id, quote.lead_name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Select
                              value={quote.status}
                              onValueChange={(value) => handleStatusChange(quote.id, value)}
                            >
                              <SelectTrigger className="w-[180px] brand-select">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ממתין לתשובה">ממתין לתשובה</SelectItem>
                                <SelectItem value="אושר">אושר</SelectItem>
                                <SelectItem value="נדחה">נדחה</SelectItem>
                                <SelectItem value="פג תוקף">פג תוקף</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* דיאלוג עריכת הצעת מחיר */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-900">
              עריכת הצעת מחיר
            </DialogTitle>
          </DialogHeader>

          {editingQuote && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>לקוח</Label>
                <Input
                  value={editingQuote.lead_name || ""}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_amount">סכום הצעת המחיר (₪) *</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  value={editingQuote.amount}
                  onChange={(e) => setEditingQuote({...editingQuote, amount: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">תיאור ההצעה</Label>
                <Textarea
                  id="edit_description"
                  value={editingQuote.description || ""}
                  onChange={(e) => setEditingQuote({...editingQuote, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_valid_until">תוקף ההצעה</Label>
                <Input
                  id="edit_valid_until"
                  type="date"
                  value={editingQuote.valid_until}
                  onChange={(e) => setEditingQuote({...editingQuote, valid_until: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_notes">הערות נוספות</Label>
                <Textarea
                  id="edit_notes"
                  value={editingQuote.notes || ""}
                  onChange={(e) => setEditingQuote({...editingQuote, notes: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_status">סטטוס</Label>
                <Select
                  value={editingQuote.status}
                  onValueChange={(value) => setEditingQuote({...editingQuote, status: value})}
                >
                  <SelectTrigger className="brand-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ממתין לתשובה">ממתין לתשובה</SelectItem>
                    <SelectItem value="אושר">אושר</SelectItem>
                    <SelectItem value="נדחה">נדחה</SelectItem>
                    <SelectItem value="פג תוקף">פג תוקף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingQuote(null);
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-gradient-to-r from-orange-600 to-orange-700"
            >
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}