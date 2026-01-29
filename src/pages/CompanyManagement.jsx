import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Users, Trash2, Upload, LogIn, ArrowRight, Edit, Link, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

export default function CompanyManagementPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false); // New state
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null); // New state
  const [companyUsers, setCompanyUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // New state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [base44Client, setBase44Client] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);

  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    slug: "",
    logo_url: "",
    primary_color: "#1e40af",
    secondary_color: "#10b981",
    accent_color: "#f59e0b",
    parent_company_id: "",
    company_admin_user_id: "",
    is_parent_company: false,
    notification_email: "",
  });

  useEffect(() => {
    const initBase44 = async () => {
      const { base44 } = await import("@/api/base44Client");
      setBase44Client(base44);
    };
    initBase44();
  }, []);

  useEffect(() => {
    if (base44Client) {
      loadUser();
    }
  }, [base44Client]);

  useEffect(() => {
    if (currentUser && base44Client) {
      loadCompanies();
      loadUsers();
    }
  }, [currentUser, base44Client]);

  const loadUser = async () => {
    if (!base44Client) return;
    const user = await base44Client.auth.me();
    setCurrentUser(user);
  };

  const loadCompanies = async () => {
    if (!base44Client) return;
    setIsLoading(true);
    try {
      const response = await base44Client.functions.invoke('listCompanies');
      
      if (response.data.success) {
        setCompanies(response.data.companies);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    }
    setIsLoading(false);
  };

  const loadUsers = async () => {
    if (!base44Client) return;
    try {
      const response = await base44Client.functions.invoke('listUsers');
      
      if (response.data.success) {
        setUsers(response.data.users.filter(u => !u.company_id || u.user_role === 'company_admin'));
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleLogoUpload = async (e) => {
    if (!base44Client) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { file_url } = await base44Client.integrations.Core.UploadFile({ file });
      setNewCompanyData({ ...newCompanyData, logo_url: file_url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("שגיאה בהעלאת לוגו");
    }
    setIsUploadingLogo(false);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyData.name) {
      alert("נא למלא את שם החברה");
      return;
    }

    // אם זו חברת בת - לא צריך מנהל
    // אם זו לא חברת בת - צריך מנהל
    const isSubCompany = newCompanyData.parent_company_id && newCompanyData.parent_company_id !== "none";
    
    if (!isSubCompany && !newCompanyData.company_admin_user_id) {
      alert("נא לבחור מנהל לחברה");
      return;
    }
    
    if (!base44Client) return;

    setIsCreating(true);
    try {
      // המר "none" ל-null
      const parentCompanyId = newCompanyData.parent_company_id === "none" || !newCompanyData.parent_company_id
        ? null
        : newCompanyData.parent_company_id;

      const dataToSend = {
        ...newCompanyData,
        parent_company_id: parentCompanyId
      };

      // אם זו חברת בת - אל תשלח company_admin_user_id
      if (isSubCompany) {
        delete dataToSend.company_admin_user_id;
      }

      const response = await base44Client.functions.invoke('createCompany', dataToSend);

      if (response.data.success) {
        alert(`✅ חברה נוצרה בהצלחה!`);
        setShowCreateDialog(false);
        setNewCompanyData({
          name: "",
          slug: "",
          logo_url: "",
          primary_color: "#1e40af",
          secondary_color: "#10b981",
          accent_color: "#f59e0b",
          parent_company_id: "",
          company_admin_user_id: "",
          is_parent_company: false,
          notification_email: "",
        });
        await loadCompanies();
        await loadUsers();
      } else {
        alert(`שגיאה ביצירת חברה: ${response.data.error}`);
      }
    } catch (error) {
      console.error("Error creating company:", error);
      alert("שגיאה ביצירת חברה");
    }
    setIsCreating(false);
  };

  const handleEditCompany = (company) => {
    setEditingCompany({
      id: company.id,
      name: company.name,
      slug: company.slug || "",
      logo_url: company.logo_url || "",
      primary_color: company.primary_color || "#1e40af",
      secondary_color: company.secondary_color || "#10b981",
      accent_color: company.accent_color || "#f59e0b",
      parent_company_id: company.parent_company_id || "",
      company_admin_user_id: company.company_admin_user_id || "",
      is_parent_company: company.is_parent_company || false,
      notification_email: company.notification_email || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany.name) {
      alert("נא למלא את שם החברה");
      return;
    }

    // אם זו חברת בת - לא צריך מנהל
    const isSubCompany = editingCompany.parent_company_id && editingCompany.parent_company_id !== "none";
    
    if (!isSubCompany && !editingCompany.company_admin_user_id) {
      alert("נא לבחור מנהל לחברה");
      return;
    }

    if (!base44Client) return;

    setIsUpdating(true);
    try {
      // נקה את ה-parent_company_id - אם "none" או ריק, שלח null
      const parentCompanyId = editingCompany.parent_company_id === "none" || !editingCompany.parent_company_id 
        ? null 
        : editingCompany.parent_company_id;

      const dataToSend = {
        company_id: editingCompany.id,
        name: editingCompany.name,
        slug: editingCompany.slug,
        logo_url: editingCompany.logo_url,
        primary_color: editingCompany.primary_color,
        secondary_color: editingCompany.secondary_color,
        accent_color: editingCompany.accent_color,
        parent_company_id: parentCompanyId,
        is_parent_company: editingCompany.is_parent_company,
        notification_email: editingCompany.notification_email,
      };

      // אם זו לא חברת בת - שלח גם company_admin_user_id
      if (!isSubCompany) {
        dataToSend.company_admin_user_id = editingCompany.company_admin_user_id;
      }

      const response = await base44Client.functions.invoke('updateCompany', dataToSend);

      if (response.data.success) {
        alert(`✅ החברה עודכנה בהצלחה!`);
        setShowEditDialog(false);
        setEditingCompany(null);
        await loadCompanies();
        await loadUsers();
      } else {
        alert(`שגיאה בעדכון חברה: ${response.data.error}`);
      }
    } catch (error) {
      console.error("Error updating company:", error);
      alert("שגיאה בעדכון חברה");
    }
    setIsUpdating(false);
  };

  const handleLogoUploadForEdit = async (e) => {
    if (!base44Client) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { file_url } = await base44Client.integrations.Core.UploadFile({ file });
      setEditingCompany({ ...editingCompany, logo_url: file_url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("שגיאה בהעלאת לוגו");
    }
    setIsUploadingLogo(false);
  };

  const handleShowUsers = async (company) => {
    if (!base44Client) return;
    setSelectedCompany(company);
    try {
      const response = await base44Client.functions.invoke('listCompanyUsers', { company_id: company.id });
      
      if (response.data.success) {
        setCompanyUsers(response.data.users);
      }
    } catch (error) {
      console.error("Error loading company users:", error);
    }
    setShowUsersDialog(true);
  };

  const handleDeleteCompany = async (companyId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את החברה? כל המשתמשים והנתונים שלה יימחקו!")) {
      return;
    }
    if (!base44Client) return;

    try {
      const response = await base44Client.functions.invoke('deleteCompany', { company_id: companyId });
      
      if (response.data.success) {
        alert("החברה נמחקה בהצלחה");
        await loadCompanies();
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("שגיאה במחיקת חברה");
    }
  };

  const handleEnterCompany = (company) => {
    // שמור את החברה הנוכחית ב-localStorage
    localStorage.setItem(`currentCompany_${currentUser.id}`, company.id);
    
    // רענן את הדף כדי לטעון את החברה החדשה
    window.location.href = createPageUrl("Dashboard");
  };

  const copyLeadFormLink = (company) => {
    if (!company.slug) {
      alert("יש להגדיר slug לחברה כדי ליצור קישור לטופס");
      return;
    }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}${createPageUrl("NewLeadForm")}?company=${company.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(company.id);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUser?.email);

  if (!currentUser || !isSuperAdmin) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg text-red-600">אין לך הרשאות גישה לעמוד זה</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-full mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              ניהול חברות
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              <Building2 className="w-4 h-4 inline ml-1" />
              נהל את החברות והמשתמשים שלהן
            </p>
          </div>
          
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Plus className="w-4 h-4 ml-2" />
            חברה חדשה
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-8">טוען חברות...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card 
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  style={{
                    background: `linear-gradient(135deg, ${company.primary_color}15 0%, ${company.secondary_color}15 100%)`
                  }}
                >
                  <CardHeader 
                    className="border-b"
                    style={{
                      background: `linear-gradient(135deg, ${company.primary_color} 0%, ${company.secondary_color} 100%)`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <img 
                          src={company.logo_url} 
                          alt={company.name}
                          className="w-12 h-12 rounded-lg bg-white p-1 object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
                          <Building2 className="w-6 h-6" style={{ color: company.primary_color }} />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg">
                          {company.name}
                        </CardTitle>
                        <Badge className="bg-white bg-opacity-20 text-white border-white border-opacity-30 mt-1">
                          {company.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: company.primary_color }}
                        title="צבע ראשי"
                      />
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: company.secondary_color }}
                        title="צבע משני"
                      />
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: company.accent_color }}
                        title="צבע הדגשה"
                      />
                    </div>

                    <Button
                      onClick={() => handleEnterCompany(company)}
                      className="w-full mb-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg group-hover:shadow-xl transition-all"
                    >
                      <LogIn className="w-4 h-4 ml-2" />
                      כנס למערכת החברה
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>

                    {company.slug && (
                      <Button
                        onClick={() => copyLeadFormLink(company)}
                        variant="outline"
                        className="w-full mb-3 text-green-600 border-green-300 hover:bg-green-50"
                      >
                        {copiedSlug === company.id ? (
                          <>
                            <Check className="w-4 h-4 ml-2" />
                            הקישור הועתק!
                          </>
                        ) : (
                          <>
                            <Link className="w-4 h-4 ml-2" />
                            העתק קישור לטופס לידים
                          </>
                        )}
                      </Button>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowUsers(company)}
                        className="flex-1"
                      >
                        <Users className="w-4 h-4 ml-1" />
                        משתמשים
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditCompany(company)}
                        className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        ערוך
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCompany(company.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Company Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-purple-900">
                יצירת חברה חדשה
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">שם החברה *</Label>
                <Input
                  id="company_name"
                  value={newCompanyData.name}
                  onChange={(e) => setNewCompanyData({...newCompanyData, name: e.target.value})}
                  placeholder="לדוגמה: חברת ABC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">מזהה לטופס לידים (Slug)</Label>
                <Input
                  id="slug"
                  value={newCompanyData.slug}
                  onChange={(e) => setNewCompanyData({...newCompanyData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  placeholder="company-name"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500">
                  באנגלית בלבד, ללא רווחים. לדוגמה: my-company
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_email">אימייל לקבלת התראות על לידים</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={newCompanyData.notification_email}
                  onChange={(e) => setNewCompanyData({...newCompanyData, notification_email: e.target.value})}
                  placeholder="admin@company.com"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_parent_company"
                    checked={newCompanyData.is_parent_company}
                    onChange={(e) => setNewCompanyData({...newCompanyData, is_parent_company: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_parent_company" className="cursor-pointer">
                    חברה זו היא חברת אם (תוכל לנהל חברות בת)
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  חברת אם תוכל ליצור ולנהל חברות בת תחתיה
                </p>
              </div>

              {!newCompanyData.is_parent_company && companies.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="parent_company">חברת אם (אופציונלי)</Label>
                  <Select
                    value={newCompanyData.parent_company_id || "none"}
                    onValueChange={(value) => setNewCompanyData({...newCompanyData, parent_company_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר חברת אם" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">אין חברת אם</SelectItem>
                      {companies.filter(c => c.is_parent_company).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    אם תבחר חברת אם, המנהל של חברת האם יוכל לגשת גם לחברה זו
                  </p>
                </div>
              )}

              {/* הצג את שדה המנהל רק אם אין חברת אם */}
              {(!newCompanyData.parent_company_id || newCompanyData.parent_company_id === "none") && (
                <div className="space-y-2">
                  <Label htmlFor="company_admin">מנהל החברה *</Label>
                  <Select
                    value={newCompanyData.company_admin_user_id}
                    onValueChange={(value) => setNewCompanyData({...newCompanyData, company_admin_user_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר משתמש שינהל את החברה" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    רק משתמשים ללא חברה מוצגים כאן
                  </p>
                </div>
              )}

              {/* הצג הודעה אם זו חברת בת */}
              {newCompanyData.parent_company_id && newCompanyData.parent_company_id !== "none" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    💡 <strong>חברת בת:</strong> מנהל חברת האם יקבל גישה אוטומטית לחברה זו
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="logo">לוגו החברה</Label>
                <div className="flex items-center gap-4">
                  {newCompanyData.logo_url && (
                    <div className="w-20 h-20 border-2 border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={newCompanyData.logo_url}
                        alt="Logo preview"
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
                      disabled={isUploadingLogo}
                      className="w-full gap-2"
                    >
                      {isUploadingLogo ? (
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">צבע ראשי</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={newCompanyData.primary_color}
                    onChange={(e) => setNewCompanyData({...newCompanyData, primary_color: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">צבע משני</Label>
                  <Input
                    id="secondary_color"
                    type="color"
                    value={newCompanyData.secondary_color}
                    onChange={(e) => setNewCompanyData({...newCompanyData, secondary_color: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">צבע הדגשה</Label>
                  <Input
                    id="accent_color"
                    type="color"
                    value={newCompanyData.accent_color}
                    onChange={(e) => setNewCompanyData({...newCompanyData, accent_color: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                ביטול
              </Button>
              <Button 
                onClick={handleCreateCompany}
                disabled={isCreating}
                className="bg-gradient-to-r from-purple-600 to-purple-700"
              >
                {isCreating ? "יוצר..." : "צור חברה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Company Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-purple-900">
                עריכת חברה
              </DialogTitle>
            </DialogHeader>
            
            {editingCompany && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_company_name">שם החברה *</Label>
                  <Input
                    id="edit_company_name"
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                    placeholder="לדוגמה: חברת ABC"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_slug">מזהה לטופס לידים (Slug)</Label>
                  <Input
                    id="edit_slug"
                    value={editingCompany.slug}
                    onChange={(e) => setEditingCompany({...editingCompany, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    placeholder="company-name"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500">
                    באנגלית בלבד, ללא רווחים. לדוגמה: my-company
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_notification_email">אימייל לקבלת התראות על לידים</Label>
                  <Input
                    id="edit_notification_email"
                    type="email"
                    value={editingCompany.notification_email}
                    onChange={(e) => setEditingCompany({...editingCompany, notification_email: e.target.value})}
                    placeholder="admin@company.com"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit_is_parent_company"
                      checked={editingCompany.is_parent_company}
                      onChange={(e) => setEditingCompany({...editingCompany, is_parent_company: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="edit_is_parent_company" className="cursor-pointer">
                      חברה זו היא חברת אם (תוכל לנהל חברות בת)
                    </Label>
                  </div>
                </div>

                {!editingCompany.is_parent_company && companies.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_parent_company">חברת אם (אופציונלי)</Label>
                    <Select
                      value={editingCompany.parent_company_id || "none"}
                      onValueChange={(value) => setEditingCompany({...editingCompany, parent_company_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר חברת אם" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">אין חברת אם</SelectItem>
                        {companies.filter(c => c.is_parent_company && c.id !== editingCompany.id).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      אם תבחר חברת אם, המנהל של חברת האם יוכל לגשת גם לחברה זו
                    </p>
                  </div>
                )}

                {/* הצג את שדה המנהל רק אם אין חברת אם */}
                {(!editingCompany.parent_company_id || editingCompany.parent_company_id === "none") && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_company_admin">מנהל החברה *</Label>
                    <Select
                      value={editingCompany.company_admin_user_id}
                      onValueChange={(value) => setEditingCompany({...editingCompany, company_admin_user_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר משתמש שינהל את החברה" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* הצג הודעה אם זו חברת בת */}
                {editingCompany.parent_company_id && editingCompany.parent_company_id !== "none" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      💡 <strong>חברת בת:</strong> מנהל חברת האם יקבל גישה אוטומטית לחברה זו
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit_logo">לוגו החברה</Label>
                  <div className="flex items-center gap-4">
                    {editingCompany.logo_url && (
                      <div className="w-20 h-20 border-2 border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                        <img
                          src={editingCompany.logo_url}
                          alt="Logo preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        id="edit-logo-upload"
                        accept="image/*"
                        onChange={handleLogoUploadForEdit}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("edit-logo-upload").click()}
                        disabled={isUploadingLogo}
                        className="w-full gap-2"
                      >
                        {isUploadingLogo ? (
                          <>מעלה...</>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            העלה לוגו
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_primary_color">צבע ראשי</Label>
                    <Input
                      id="edit_primary_color"
                      type="color"
                      value={editingCompany.primary_color}
                      onChange={(e) => setEditingCompany({...editingCompany, primary_color: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_secondary_color">צבע משני</Label>
                    <Input
                      id="edit_secondary_color"
                      type="color"
                      value={editingCompany.secondary_color}
                      onChange={(e) => setEditingCompany({...editingCompany, secondary_color: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_accent_color">צבע הדגשה</Label>
                    <Input
                      id="edit_accent_color"
                      type="color"
                      value={editingCompany.accent_color}
                      onChange={(e) => setEditingCompany({...editingCompany, accent_color: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                ביטול
              </Button>
              <Button 
                onClick={handleUpdateCompany}
                disabled={isUpdating}
                className="bg-gradient-to-r from-purple-600 to-purple-700"
              >
                {isUpdating ? "מעדכן..." : "שמור שינויים"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Company Users Dialog */}
        <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                משתמשי {selectedCompany?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              {companyUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין משתמשים בחברה זו</p>
              ) : (
                <div className="space-y-2">
                  {companyUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Badge>
                        {user.user_role === 'company_admin' ? 'מנהל' : 'משתמש'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}