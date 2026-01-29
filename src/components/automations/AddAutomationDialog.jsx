
import React, { useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";

export default function AddAutomationDialog({ open, onClose, onSave, editingAutomation }) {
  const [formData, setFormData] = useState({
    name: "",
    trigger_type: "יצירת ליד",
    trigger_condition: "",
    action_type: "שליחת אימייל",
    action_config: {},
    is_active: true,
    description: ""
  });

  const [statuses, setStatuses] = useState([
    "חדש",
    "נוצר קשר",
    "מוסמך",
    "לקוח",
    "אבוד"
  ]);

  useEffect(() => {
    const savedStatuses = localStorage.getItem("lead_statuses");
    if (savedStatuses) {
      setStatuses(JSON.parse(savedStatuses));
    }

    // אם יש אוטומציה לעריכה, טען את הנתונים שלה
    if (editingAutomation) {
      setFormData({
        name: editingAutomation.name || "",
        trigger_type: editingAutomation.trigger_type || "יצירת ליד",
        trigger_condition: editingAutomation.trigger_condition || "",
        action_type: editingAutomation.action_type || "שליחת אימייל",
        action_config: editingAutomation.action_config || {},
        is_active: editingAutomation.is_active !== undefined ? editingAutomation.is_active : true,
        description: editingAutomation.description || ""
      });
    } else {
      setFormData({
        name: "",
        trigger_type: "יצירת ליד",
        trigger_condition: "",
        action_type: "שליחת אימייל",
        action_config: {},
        is_active: true,
        description: ""
      });
    }
  }, [open, editingAutomation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    setFormData({
      name: "",
      trigger_type: "יצירת ליד",
      trigger_condition: "",
      action_type: "שליחת אימייל",
      action_config: {},
      is_active: true,
      description: ""
    });
  };

  const showStatusCondition = formData.trigger_type === "שינוי סטטוס";
  const showWebhookConfig = formData.action_type === "Webhook";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-900">
            {editingAutomation ? "עריכת אוטומציה" : "הוספת אוטומציה חדשה"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">שם האוטומציה *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="לדוגמה: שליחת מייל לליד חדש"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger_type">טריגר</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({...formData, trigger_type: value, trigger_condition: ""})}
            >
              <SelectTrigger className="brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="יצירת ליד">יצירת ליד</SelectItem>
                <SelectItem value="עדכון ליד">עדכון ליד</SelectItem>
                <SelectItem value="שינוי סטטוס">שינוי סטטוס</SelectItem>
                <SelectItem value="יצירת לקוח">יצירת לקוח</SelectItem>
                <SelectItem value="עדכון לקוח">עדכון לקוח</SelectItem>
                <SelectItem value="יצירת פגישה">יצירת פגישה</SelectItem>
                <SelectItem value="קבלת Webhook">קבלת Webhook</SelectItem>
                <SelectItem value="תזמון יומי">תזמון יומי</SelectItem>
                <SelectItem value="תזמון שבועי">תזמון שבועי</SelectItem>
                <SelectItem value="הרצה ידנית">הרצה ידנית</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AnimatePresence>
            {showStatusCondition && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="trigger_condition">כאשר הסטטוס משתנה ל: *</Label>
                <Select
                  value={formData.trigger_condition}
                  onValueChange={(value) => setFormData({...formData, trigger_condition: value})}
                >
                  <SelectTrigger className="brand-select">
                    <SelectValue placeholder="בחר סטטוס..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-purple-600">
                  💡 האוטומציה תופעל רק כשהליד משתנה לסטטוס זה
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="action_type">פעולה</Label>
            <Select
              value={formData.action_type}
              onValueChange={(value) => setFormData({...formData, action_type: value, action_config: {}})}
            >
              <SelectTrigger className="brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="שליחת אירוע המרה למטא">📊 שליחת אירוע המרה למטא</SelectItem>
                <SelectItem value="העברה ללקוחות">העברה ללקוחות</SelectItem>
                <SelectItem value="עדכון דאשבורד">עדכון דאשבורד</SelectItem>
                <SelectItem value="שליחה ל-Meta API">שליחה ל-Meta API (ישן)</SelectItem>
                <SelectItem value="Webhook">שליחת Webhook</SelectItem>
                <SelectItem value="יצירת משימה">יצירת משימה</SelectItem>
                <SelectItem value="שליחת אימייל">שליחת אימייל</SelectItem>
                <SelectItem value="שליחת SMS">שליחת SMS</SelectItem>
                <SelectItem value="הוספת הערה">הוספת הערה</SelectItem>
                <SelectItem value="שינוי סטטוס">שינוי סטטוס</SelectItem>
                <SelectItem value="שיוך למשתמש">שיוך למשתמש</SelectItem>
                <SelectItem value="רענון נתוני Meta">רענון נתוני Meta</SelectItem>
                <SelectItem value="התראה">התראה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ הגדרות לשליחת אירוע המרה למטא */}
          <AnimatePresence>
            {formData.action_type === "שליחת אירוע המרה למטא" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div className="space-y-2">
                  <Label htmlFor="event_name">שם האירוע במטא *</Label>
                  <Select
                    value={formData.action_config.event_name || ""}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, event_name: value}
                    })}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue placeholder="בחר אירוע..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead - ליד חדש</SelectItem>
                      <SelectItem value="CompleteRegistration">CompleteRegistration - ליד מוסמך</SelectItem>
                      <SelectItem value="Contact">Contact - נוצר קשר</SelectItem>
                      <SelectItem value="SubmitApplication">SubmitApplication - הצעה נשלחה</SelectItem>
                      <SelectItem value="Schedule">Schedule - נקבעה פגישה</SelectItem>
                      <SelectItem value="Purchase">Purchase - רכישה</SelectItem>
                      <SelectItem value="AddToCart">AddToCart - הוסף לסל</SelectItem>
                      <SelectItem value="InitiateCheckout">InitiateCheckout - התחיל תהליך</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-600">
                    💡 אירוע זה יישלח למטא עבור אופטימיזציה של הקמפיינים
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_value">ערך (אופציונלי)</Label>
                  <Input
                    id="event_value"
                    type="number"
                    placeholder="למשל: 1000"
                    value={formData.action_config.value || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, value: e.target.value}
                    })}
                  />
                  <p className="text-xs text-gray-500">
                    שדה זה רלוונטי בעיקר לאירועי Purchase/רכישה
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ שמור את ההגדרות הישנות של Webhook */}
          <AnimatePresence>
            {showWebhookConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 p-4 bg-gray-50 rounded-lg border"
              >
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    placeholder="https://hook.make.com/..."
                    value={formData.action_config.webhook_url || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, webhook_url: e.target.value}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook_body">תוכן ה-Webhook (JSON)</Label>
                  <Textarea
                    id="webhook_body"
                    placeholder='כתוב JSON עם ערכים דינמיים'
                    value={formData.action_config.webhook_body || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      action_config: {...formData.action_config, webhook_body: e.target.value}
                    })}
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    השתמש בסוגריים מסולסלים כפולים עבור ערכים דינמיים: lead.name, lead.email, lead.phone
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label>תיאור (אופציונלי)</Label>
            <Textarea
              placeholder="הסבר קצר על מה האוטומציה עושה..."
              value={formData.description || ""}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-purple-700">
              {editingAutomation ? "עדכן אוטומציה" : "שמור אוטומציה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
