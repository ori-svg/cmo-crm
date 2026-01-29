import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CompleteProfileDialog({ open, onComplete }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      alert("נא למלא שם פרטי");
      return;
    }

    setIsLoading(true);

    try {
      const { base44 } = await import("@/api/base44Client");
      
      const fullName = lastName.trim() 
        ? `${firstName.trim()} ${lastName.trim()}`
        : firstName.trim();

      await base44.auth.updateMe({
        full_name: fullName
      });

      onComplete();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("שגיאה בשמירת הפרטים. נסה שוב.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" hideClose>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            👋 שלום! בוא נשלים את הפרופיל שלך
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            כדי להתחיל, נשמח לדעת איך לקרוא לך
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">שם פרטי *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="לדוגמה: יוסי"
                  autoFocus
                  required
                  className="text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">שם משפחה</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="לדוגמה: כהן (אופציונלי)"
                  className="text-lg h-12"
                />
                <p className="text-xs text-gray-500">
                  אופציונלי - אבל עוזר לנו לפנות אליך בצורה מכובדת יותר 😊
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">למה אנחנו צריכים את זה?</p>
                  <p>השם שלך יופיע בתפריט, בהודעות ובדוחות. זה עוזר לנו (ולצוות שלך) לזהות מי עושה מה במערכת.</p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !firstName.trim()}
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? "שומר..." : "המשך למערכת"}
            </Button>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}