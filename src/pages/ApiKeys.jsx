import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, Key, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    company_id: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadData = async () => {
    setIsLoading(true);
    const { ApiKey } = await import("@/api/entities");
    const { Company } = await import("@/api/entities");
    
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUser.email);
    
    if (isSuperAdmin) {
      // Super Admin רואה הכל - לא תלוי בחברה פעילה
      const allKeys = await ApiKey.list("-created_date");
      setApiKeys(allKeys);
      
      const allCompanies = await Company.list();
      setCompanies(allCompanies);
    } else {
      // Company Admin רואה רק מפתחות של החברה שלו
      const keys = await ApiKey.filter({ company_id: currentUser.company_id }, "-created_date");
      setApiKeys(keys);
      
      const company = await Company.filter({ id: currentUser.company_id });
      setCompanies(company);
    }
    
    setIsLoading(false);
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'cmo_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = async () => {
    if (!formData.name || !formData.company_id) {
      alert("אנא מלא את כל השדות");
      return;
    }

    const { ApiKey } = await import("@/api/entities");
    const newKey = generateApiKey();
    
    await ApiKey.create({
      name: formData.name,
      company_id: formData.company_id,
      key: newKey,
      is_active: true,
      usage_count: 0
    });

    setShowAddDialog(false);
    setFormData({ name: "", company_id: "" });
    await loadData();
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק מפתח זה?")) return;
    
    const { ApiKey } = await import("@/api/entities");
    await ApiKey.delete(keyId);
    await loadData();
  };

  const handleToggleKey = async (keyId, currentStatus) => {
    const { ApiKey } = await import("@/api/entities");
    await ApiKey.update(keyId, { is_active: !currentStatus });
    await loadData();
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  };

  if (!currentUser) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUser.email);

  if (!isSuperAdmin && currentUser.user_role !== 'company_admin') {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">אין הרשאה</h2>
          <p className="text-gray-500">רק מנהלי חברה ומנהלי מערכת יכולים לנהל מפתחות API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              מפתחות API
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              {isSuperAdmin ? "נהל מפתחות API לכל החברות" : "נהל מפתחות API לחברה שלך"}
            </p>
          </div>
          
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Plus className="w-4 h-4 ml-2" />
            צור מפתח חדש
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">טוען...</p>
              </CardContent>
            </Card>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Key className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">אין מפתחות API עדיין</p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  variant="outline"
                  className="mt-4"
                >
                  צור מפתח ראשון
                </Button>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-purple-600" />
                        {apiKey.name}
                      </CardTitle>
                      {isSuperAdmin && (
                        <Badge variant="outline" className="mt-2">
                          {getCompanyName(apiKey.company_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={apiKey.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {apiKey.is_active ? "פעיל" : "מושהה"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm break-all border-2 border-gray-200">
                    <div className="flex items-center justify-between gap-4">
                      <code className="flex-1">{apiKey.key}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyKey(apiKey.key)}
                      >
                        {copiedKey === apiKey.key ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>
                      <span className="font-semibold">שימושים:</span> {apiKey.usage_count || 0}
                    </div>
                    {apiKey.last_used && (
                      <div>
                        <span className="font-semibold">שימוש אחרון:</span>{" "}
                        {new Date(apiKey.last_used).toLocaleString('he-IL')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleKey(apiKey.id, apiKey.is_active)}
                    >
                      {apiKey.is_active ? "השהה" : "הפעל"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteKey(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      מחק
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </motion.div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>צור מפתח API חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם המפתח</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="למשל: Zapier Integration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">חברה</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({...formData, company_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר חברה" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleCreateKey}>
                צור מפתח
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}