import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AddClientDialog({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "פעיל",
    revenue_amount: "",
    revenue_type: "חד פעמי",
    payment_date: "",
    source: "",
    fb_campaign: "",
    notes: "",
    tags: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;

    await onSave({
      ...formData,
      revenue_amount: formData.revenue_amount ? parseFloat(formData.revenue_amount) : 0,
      revenue_total: formData.revenue_amount ? parseFloat(formData.revenue_amount) : 0,
      // If payment_date is empty, default to today's date
      payment_date: formData.payment_date || todayFormatted
    });
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "פעיל",
      revenue_amount: "",
      revenue_type: "חד פעמי",
      payment_date: "",
      source: "",
      fb_campaign: "",
      notes: "",
      tags: []
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-900">
            הוספת לקוח חדש
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">שם הלקוח *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="הזן שם מלא"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="example@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="050-1234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="פעיל">פעיל</SelectItem>
                  <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                  <SelectItem value="ממתין">ממתין</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="revenue_type">אופי ההכנסה</Label>
              <Select
                value={formData.revenue_type}
                onValueChange={(value) => setFormData({...formData, revenue_type: value})}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="חד פעמי">חד פעמי</SelectItem>
                  <SelectItem value="ריטיינר חודשי">ריטיינר חודשי</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue_amount">סכום הכנסה (₪) *</Label>
              <Input
                id="revenue_amount"
                type="number"
                step="0.01"
                value={formData.revenue_amount}
                onChange={(e) => setFormData({...formData, revenue_amount: e.target.value})}
                required
                placeholder="0.00"
              />
              {formData.revenue_type === "ריטיינר חודשי" && (
                <p className="text-xs text-gray-500">
                  סכום חודשי. המערכת תחשב את סך ההכנסות לפי מספר החודשים
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">תאריך תשלום</Label> {/* Updated label text */}
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
              />
              <p className="text-xs text-gray-500">
                השאר ריק לתאריך היום, או הזן תאריך ספציפי {/* Updated helper text */}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">מקור</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                placeholder="למשל: פייסבוק, גוגל..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fb_campaign">קמפיין</Label>
              <Input
                id="fb_campaign"
                value={formData.fb_campaign}
                onChange={(e) => setFormData({...formData, fb_campaign: e.target.value})}
                placeholder="שם הקמפיין"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="הוסף הערות..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-green-600 to-green-700">
              שמור לקוח
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}