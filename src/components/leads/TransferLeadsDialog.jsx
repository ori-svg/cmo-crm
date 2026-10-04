import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeftRight, Loader2 } from "lucide-react";

const NO_AGENT = "none";

export default function TransferLeadsDialog({ open, onClose, onConfirm, selectedCount, currentCompanyId }) {
  const [companies, setCompanies] = useState([]);
  const [usersByCompany, setUsersByCompany] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [mode, setMode] = useState("move");
  const [assignedUserId, setAssignedUserId] = useState(NO_AGENT);

  useEffect(() => {
    if (open) {
      setTargetCompanyId("");
      setMode("move");
      setAssignedUserId(NO_AGENT);
      loadTargets();
    }
  }, [open]);

  const loadTargets = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await base44.functions.invoke('transfer-leads', { action: 'list_targets' });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'שגיאה בטעינת החברות');
      }
      setCompanies(response.data.companies || []);
      setUsersByCompany(response.data.users_by_company || {});
    } catch (error) {
      console.error('Error loading transfer targets:', error);
      setLoadError(error.response?.data?.error || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const targetCompanies = companies.filter(c => c.id !== currentCompanyId);
  const targetUsers = usersByCompany[targetCompanyId] || [];
  const targetCompany = companies.find(c => c.id === targetCompanyId);

  const handleConfirm = () => {
    if (!targetCompany) return;

    const actionLabel = mode === 'move' ? 'להעביר' : 'להעתיק';
    const confirmed = window.confirm(
      `${actionLabel} ${selectedCount} לידים ל"${targetCompany.name}", כולל כל ההיסטוריה, הפגישות, הצעות המחיר והודעות הווטסאפ שלהם?`
    );
    if (!confirmed) return;

    onConfirm({
      targetCompanyId,
      targetCompanyName: targetCompany.name,
      mode,
      assignedUserId: assignedUserId === NO_AGENT ? null : assignedUserId
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-orange-600" />
            העברת לידים לחברה אחרת
          </DialogTitle>
          <DialogDescription>
            {selectedCount} לידים נבחרו. הסטטוס, ההערות, הקבצים, ההיסטוריה וכל הרשומות המקושרות יעברו יחד עם הליד.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            טוען חברות...
          </div>
        ) : loadError ? (
          <div className="text-red-600 text-sm py-4">{loadError}</div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>חברת יעד</Label>
              <Select
                value={targetCompanyId}
                onValueChange={(value) => {
                  setTargetCompanyId(value);
                  setAssignedUserId(NO_AGENT);
                }}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue placeholder="בחר חברה" />
                </SelectTrigger>
                <SelectContent>
                  {targetCompanies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>סוג פעולה</Label>
              <RadioGroup value={mode} onValueChange={setMode} className="space-y-2">
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="move" id="transfer-mode-move" className="mt-1" />
                  <Label htmlFor="transfer-mode-move" className="font-normal cursor-pointer">
                    <span className="font-semibold">העברה</span> - הליד עובר לחברה החדשה ולא יופיע יותר בחברה הנוכחית
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="copy" id="transfer-mode-copy" className="mt-1" />
                  <Label htmlFor="transfer-mode-copy" className="font-normal cursor-pointer">
                    <span className="font-semibold">העתקה</span> - נוצר עותק בחברה החדשה והמקור נשאר בחברה הנוכחית
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>שיוך לנציג בחברה החדשה</Label>
              <Select
                value={assignedUserId}
                onValueChange={setAssignedUserId}
                disabled={!targetCompanyId}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AGENT}>ללא שיוך</SelectItem>
                  {targetUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetCompanyId && targetUsers.length === 0 && (
                <p className="text-xs text-gray-500">אין נציגים משויכים לחברה הזו</p>
              )}
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              מנויים לסדרות הודעות אוטומטיות שייכים לחברה הנוכחית: בהעברה הם עוברים יחד עם הליד אבל נעצרים, ובהעתקה הם לא מועתקים.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!targetCompanyId || isLoading || !!loadError}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {mode === 'move' ? 'העבר לידים' : 'העתק לידים'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
