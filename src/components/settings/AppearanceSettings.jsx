import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AppearanceSettings({ currentCompanyId }) {
  const [settings, setSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploadingLogo] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadSettings();
    }
  }, [currentUser, currentCompanyId]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { Company } = await import("@/api/entities");
      const companies = await Company.filter({ id: currentCompanyId });
      
      if (companies.length > 0) {
        const company = companies[0];
        setSettings({
          primary_color: company.primary_color || "#1e40af",
          secondary_color: company.secondary_color || "#10b981",
          accent_color: company.accent_color || "#f59e0b",
          company_name: company.name || "CMO CRM",
          logo_url: company.logo_url || null
        });
      } else {
        // הגדרות ברירת מחדל לחברה חדשה
        setSettings({
          primary_color: "#1e40af",
          secondary_color: "#10b981",
          accent_color: "#f59e0b",
          company_name: "CMO CRM",
          logo_url: null
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!currentCompanyId) {
      alert("נא לבחור חברה תחילה");
      return;
    }

    setIsSaving(true);
    try {
      const { Company } = await import("@/api/entities");
      await Company.update(currentCompanyId, {
        name: settings.company_name,
        logo_url: settings.logo_url,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color
      });
      
      alert("✅ ההגדרות נשמרו בהצלחה!");
      // Reload page to apply new colors
      window.location.reload();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("שגיאה בשמירת ההגדרות");
    }
    setIsSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSettings({ ...settings, logo_url: file_url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("שגיאה בהעלאת לוגו");
    }
    setIsUploadingLogo(false);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <p className="text-gray-600 text-sm">טוען...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCompanyId) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              נא לבחור חברה כדי לערוך את הגדרות המראה
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader 
        className="bg-gradient-to-r from-purple-50 to-purple-100 border-b cursor-pointer hover:bg-purple-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-xl">מראה ועיצוב</CardTitle>
          </div>
          <Button variant="ghost" size="icon">
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company_name">שם החברה</Label>
            <Input
              id="company_name"
              value={settings?.company_name || ""}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="CMO CRM"
            />
          </div>

          <div className="space-y-4">
            <Label>לוגו החברה</Label>
            <div className="flex items-center gap-4">
              {settings?.logo_url && (
                <div className="w-24 h-24 border-2 border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload").click()}
                  disabled={isUploading}
                  className="w-full gap-2"
                >
                  {isUploading ? (
                    <>מעלה...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      העלה לוגו
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  קבצים נתמכים: PNG, JPG, SVG (עד 2MB)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">צבע ראשי</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primary_color"
                  value={settings?.primary_color || "#1e40af"}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings?.primary_color || "#1e40af"}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">צבע משני</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="secondary_color"
                  value={settings?.secondary_color || "#10b981"}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings?.secondary_color || "#10b981"}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">צבע הדגשה</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="accent_color"
                  value={settings?.accent_color || "#f59e0b"}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings?.accent_color || "#f59e0b"}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">תצוגה מקדימה:</p>
            <div className="flex gap-3 flex-wrap">
              <div
                className="w-20 h-20 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: settings?.primary_color }}
              >
                ראשי
              </div>
              <div
                className="w-20 h-20 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: settings?.secondary_color }}
              >
                משני
              </div>
              <div
                className="w-20 h-20 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: settings?.accent_color }}
              >
                הדגשה
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Save className="w-4 h-4 ml-2" />
            {isSaving ? "שומר..." : "שמור הגדרות"}
          </Button>

          <p className="text-xs text-gray-500">
            לאחר שמירת ההגדרות, הדף יטען מחדש כדי להחיל את השינויים
          </p>
        </CardContent>
      )}
    </Card>
  );
}