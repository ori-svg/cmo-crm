import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Mail, Building2 } from "lucide-react";
import { motion } from "framer-motion";

const SUPER_ADMIN_EMAIL = "ori@omerdaffan.com";

export default function NoCompanyMessage({ user }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-amber-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              👋 שלום {user?.full_name}!
            </h1>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-right">
                  <p className="text-amber-900 font-semibold mb-2">
                    אינך משויך לשום חברה
                  </p>
                  <p className="text-sm text-amber-800">
                    כרגע אין לך גישה למערכת כיוון שחשבונך טרם שויך לחברה.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                מה עליך לעשות?
              </h3>
              <div className="text-sm text-blue-800 space-y-2 text-right">
                <p>
                  1. צור קשר עם <strong>מנהל המערכת</strong>
                </p>
                <p>
                  2. בקש שישייכו אותך לחברה
                </p>
                <p>
                  3. לאחר השיוך - תוכל לגשת למערכת
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">פרטי קשר למנהל המערכת:</p>
              <a 
                href={`mailto:${SUPER_ADMIN_EMAIL}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {SUPER_ADMIN_EMAIL}
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                האימייל שלך: <strong>{user?.email}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}