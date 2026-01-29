import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Save } from "lucide-react";

export default function SavedViewsMenu({ savedViews, onLoadView, onSaveView }) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState("");

  const handleSave = () => {
    if (viewName.trim()) {
      onSaveView(viewName);
      setViewName("");
      setShowSaveDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            תצוגות שמורות
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {savedViews.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => onLoadView(view)}
            >
              {view.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
            <Save className="w-4 h-4 ml-2" />
            שמור תצוגה נוכחית
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שמור תצוגה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="viewName">שם התצוגה</Label>
              <Input
                id="viewName"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="לדוגמה: לידים חדשים מפייסבוק"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}