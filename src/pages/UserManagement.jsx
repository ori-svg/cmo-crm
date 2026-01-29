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
import {
  UserPlus,
  Shield,
  Users,
  Trash2,
  Mail,
  Building2,
  Edit,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutDashboard,
  MessageSquare,
  Send,
  ClipboardList,
  Zap,
  Calendar,
  Key,
  Settings
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

const ALL_PAGES = [
  { id: "Dashboard", name: "דאשבורד", icon: "LayoutDashboard" },
  { id: "Leads", name: "לידים", icon: "UserPlus" },
  { id: "Clients", name: "לקוחות", icon: "Users" },
  { id: "WhatsAppConversations", name: "WhatsApp - אינבוקס", icon: "MessageSquare" },
  { id: "WhatsAppCampaigns", name: "WhatsApp - קמפיינים", icon: "Send" },
  { id: "WhatsAppTemplates", name: "WhatsApp - תבניות", icon: "ClipboardList" },
  { id: "Automations", name: "אוטומציות", icon: "Zap" },
  { id: "Calendar", name: "יומן", icon: "Calendar" },
  { id: "Quotes", name: "הצעות מחיר", icon: "ClipboardList" },
  { id: "Settings", name: "הגדרות", icon: "Settings" },
  { id: "ApiKeys", name: "מפתחות API", icon: "Key" },
  { id: "UserManagement", name: "ניהול משתמשים", icon: "Shield" }
];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [showPagesDialog, setShowPagesDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newPendingUser, setNewPendingUser] = useState({
    email: "",
    full_name: "",
    company_id: "",
    user_role: "user",
    notes: ""
  });
  const [createdPendingEmail, setCreatedPendingEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!SUPER_ADMIN_EMAILS.includes(currentUser.email)) {
        window.location.href = "/";
        return;
      }
      loadUsers();
      loadPendingUsers();
      loadCompanies();
    }
  }, [currentUser]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('listUsers');

      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setIsLoading(false);
  };

  const loadPendingUsers = async () => {
    try {
      const { PendingUser } = await import("@/api/entities");
      const pending = await PendingUser.list("-created_date");
      setPendingUsers(pending.filter(p => p.status !== "הושלם"));
    } catch (error) {
      console.error("Error loading pending users:", error);
    }
  };

  const loadCompanies = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('listCompanies');

      if (response.data.success) {
        setCompanies(response.data.companies);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const handleCreatePendingUser = async () => {
    if (!newPendingUser.email || !newPendingUser.full_name) {
      alert("נא למלא אימייל ושם מלא");
      return;
    }

    try {
      const { PendingUser } = await import("@/api/entities");

      const existing = await PendingUser.filter({
        email: newPendingUser.email,
        status: "ממתין להזמנה"
      });

      if (existing.length > 0) {
        alert("כבר קיימת הזמנה ממתינה עבור אימייל זה");
        return;
      }

      const companyId = newPendingUser.company_id === "none" || !newPendingUser.company_id
        ? null
        : newPendingUser.company_id;

      await PendingUser.create({
        ...newPendingUser,
        company_id: companyId,
        status: "ממתין להזמנה",
        invitation_sent_date: new Date().toISOString()
      });

      setCreatedPendingEmail(newPendingUser.email);
      setShowInviteDialog(false);
      setShowInstructionsDialog(true);
      setNewPendingUser({
        email: "",
        full_name: "",
        company_id: "",
        user_role: "user",
        notes: ""
      });

      await loadPendingUsers();
    } catch (error) {
      console.error("Error creating pending user:", error);
      alert("שגיאה ביצירת הזמנה");
    }
  };

  const handleMarkAsInvited = async (pendingUserId) => {
    try {
      const { PendingUser } = await import("@/api/entities");
      await PendingUser.update(pendingUserId, {
        status: "הוזמן",
        invitation_sent_date: new Date().toISOString()
      });
      await loadPendingUsers();
      alert("✅ סומן כהוזמן");
    } catch (error) {
      console.error("Error updating pending user:", error);
    }
  };

  const handleDeletePendingUser = async (pendingUserId) => {
    if (!confirm("האם למחוק את ההזמנה הממתינה?")) return;

    try {
      const { PendingUser } = await import("@/api/entities");
      await PendingUser.delete(pendingUserId);
      await loadPendingUsers();
    } catch (error) {
      console.error("Error deleting pending user:", error);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('updateUserDetails', {
        user_id: editingUser.id,
        company_id: editingUser.company_id,
        user_role: editingUser.user_role,
        status: editingUser.status
      });

      if (response.data.success) {
        alert("המשתמש עודכן בהצלחה");
        setShowEditDialog(false);
        setEditingUser(null);
        await loadUsers();
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("שגיאה בעדכון משתמש");
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
      alert("לא ניתן למחוק את משתמש האדמין");
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail}?`)) {
      return;
    }

    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('deleteUser', { user_id: userId });

      if (response.data.success) {
        alert("המשתמש נמחק בהצלחה");
        await loadUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("שגיאה במחיקת משתמש");
    }
  };

  const handleEditPages = (user) => {
    setEditingUser({
      ...user,
      allowed_pages: user.allowed_pages || []
    });
    setShowPagesDialog(true);
  };

  const handleTogglePage = (pageId) => {
    if (!editingUser) return;

    const currentPages = editingUser.allowed_pages || [];
    let newPages;

    if (currentPages.includes(pageId)) {
      newPages = currentPages.filter(p => p !== pageId);
    } else {
      newPages = [...currentPages, pageId];
    }

    setEditingUser({
      ...editingUser,
      allowed_pages: newPages
    });
  };

  const handleToggleAllPages = () => {
    if (!editingUser) return;

    const currentPages = editingUser.allowed_pages || [];

    if (currentPages.length === ALL_PAGES.length) {
      setEditingUser({
        ...editingUser,
        allowed_pages: []
      });
    } else {
      setEditingUser({
        ...editingUser,
        allowed_pages: ALL_PAGES.map(p => p.id)
      });
    }
  };

  const handleSavePages = async () => {
    if (!editingUser) return;

    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('updateUserDetails', {
        user_id: editingUser.id,
        allowed_pages: editingUser.allowed_pages
      });

      if (response.data.success) {
        alert("הרשאות הדפים עודכנו בהצלחה");
        setShowPagesDialog(false);
        setEditingUser(null);
        await loadUsers();
      }
    } catch (error) {
      console.error("Error updating pages:", error);
      alert("שגיאה בעדכון הרשאות");
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : "לא משויך";
  };

  const getStatusBadge = (status) => {
    const styles = {
      "ממתין להזמנה": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "הוזמן": "bg-blue-100 text-blue-800 border-blue-200",
      "הושלם": "bg-green-100 text-green-800 border-green-200",
      "בוטל": "bg-red-100 text-red-800 border-red-200"
    };

    const icons = {
      "ממתין להזמנה": Clock,
      "הוזמן": Mail,
      "הושלם": CheckCircle2,
      "בוטל": AlertCircle
    };

    const Icon = icons[status];

    return (
      <Badge className={`${styles[status]} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  if (!currentUser || !SUPER_ADMIN_EMAILS.includes(currentUser.email)) {
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
              ניהול משתמשים
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              <Shield className="w-4 h-4 inline ml-1" />
              אזור אדמין - ניהול משתמשי המערכת
            </p>
          </div>

          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <UserPlus className="w-4 h-4 ml-2" />
            הזמן משתמש חדש
          </Button>
        </motion.div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-grid">
            <TabsTrigger value="active" className="gap-2">
              <Users className="w-4 h-4" />
              משתמשים פעילים ({users.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              ממתינים להזמנה ({pendingUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  משתמשים רשומים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">טוען...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">פעולות</TableHead>
                          <TableHead className="text-right">הרשאות דפים</TableHead>
                          <TableHead className="text-right">תאריך הצטרפות</TableHead>
                          <TableHead className="text-right">תפקיד</TableHead>
                          <TableHead className="text-right">חברה</TableHead>
                          <TableHead className="text-right">אימייל</TableHead>
                          <TableHead className="text-right">שם מלא</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex gap-2">
                                {!SUPER_ADMIN_EMAILS.includes(user.email) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditUser(user)}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user.id, user.email)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {SUPER_ADMIN_EMAILS.includes(user.email) ? (
                                <Badge className="bg-purple-100 text-purple-800">
                                  גישה מלאה
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditPages(user)}
                                  className="gap-2"
                                >
                                  <Shield className="w-3 h-3" />
                                  {user.allowed_pages && user.allowed_pages.length > 0
                                    ? `${user.allowed_pages.length} דפים`
                                    : "כל הדפים"
                                  }
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-600 text-right">
                              {new Date(user.created_date).toLocaleDateString('he-IL')}
                            </TableCell>
                            <TableCell className="text-right">
                              {SUPER_ADMIN_EMAILS.includes(user.email) ? (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                  <Shield className="w-3 h-3 ml-1" />
                                  אדמין ראשי
                                </Badge>
                              ) : user.user_role === 'company_admin' ? (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  מנהל חברה
                                </Badge>
                              ) : (
                                <Badge variant="outline">משתמש</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                {user.company_id ? (
                                  getCompanyName(user.company_id)
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                    ללא חברה
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-right">{user.full_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  משתמשים ממתינים להזמנה
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין משתמשים ממתינים
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">פעולות</TableHead>
                          <TableHead className="text-right">תאריך יצירה</TableHead>
                          <TableHead className="text-right">סטטוס</TableHead>
                          <TableHead className="text-right">תפקיד</TableHead>
                          <TableHead className="text-right">חברה</TableHead>
                          <TableHead className="text-right">אימייל</TableHead>
                          <TableHead className="text-right">שם מלא</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map((pending) => (
                          <TableRow key={pending.id}>
                            <TableCell>
                              <div className="flex gap-2">
                                {pending.status === "ממתין להזמנה" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkAsInvited(pending.id)}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4 ml-1" />
                                    סמן כהוזמן
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePendingUser(pending.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 text-right">
                              {new Date(pending.created_date).toLocaleDateString('he-IL')}
                            </TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(pending.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {pending.user_role === 'company_admin' ? 'מנהל חברה' : 'משתמש'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {getCompanyName(pending.company_id)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {pending.email}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-right">{pending.full_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Pending User Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>הזמנת משתמש חדש</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newPendingUser.email}
                  onChange={(e) => setNewPendingUser({...newPendingUser, email: e.target.value})}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">שם מלא *</Label>
                <Input
                  id="full_name"
                  value={newPendingUser.full_name}
                  onChange={(e) => setNewPendingUser({...newPendingUser, full_name: e.target.value})}
                  placeholder="שם פרטי ומשפחה"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">חברה</Label>
                <Select
                  value={newPendingUser.company_id || "none"}
                  onValueChange={(value) => setNewPendingUser({...newPendingUser, company_id: value})}
                >
                  <SelectTrigger className="brand-select">
                    <SelectValue placeholder="בחר חברה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא חברה</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">תפקיד</Label>
                <Select
                  value={newPendingUser.user_role}
                  onValueChange={(value) => setNewPendingUser({...newPendingUser, user_role: value})}
                >
                  <SelectTrigger className="brand-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">משתמש רגיל</SelectItem>
                    <SelectItem value="company_admin">מנהל חברה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleCreatePendingUser}
                className="bg-purple-600 hover:bg-purple-700"
              >
                צור הזמנה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Instructions Dialog */}
        <Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                הזמנה נוצרה בהצלחה!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900 font-semibold mb-2">
                  📧 פרטי המשתמש נשמרו במערכת
                </p>
                <p className="text-sm text-green-700">
                  אימייל: <strong>{createdPendingEmail}</strong>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  שלבים הבאים:
                </h4>
                <ol className="text-sm text-blue-800 space-y-2 pr-4 list-decimal list-inside">
                  <li>פתח טאב חדש ועבור ל-<strong>Dashboard של base44</strong></li>
                  <li>לחץ על <strong>Settings → Team</strong></li>
                  <li>לחץ על <strong>"Invite User"</strong></li>
                  <li>הזן את האימייל: <strong className="bg-white px-2 py-0.5 rounded">{createdPendingEmail}</strong></li>
                  <li>בחר תפקיד: <strong>"User"</strong></li>
                  <li>שלח את ההזמנה</li>
                </ol>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">
                  ✨ מה יקרה אחר כך?
                </h4>
                <p className="text-sm text-purple-700">
                  כשהמשתמש ישלים את ההרשמה ויכנס לראשונה למערכת, הפרטים שהגדרת (חברה, תפקיד) יתעדכנו אוטומטית!
                </p>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  💡 אחרי שתשלח את ההזמנה, חזור לכאן ולחץ על "סמן כהוזמן" בטבלת ההזמנות הממתינות
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowInstructionsDialog(false)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                הבנתי, תודה!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>עריכת משתמש</DialogTitle>
            </DialogHeader>

            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>שם מלא</Label>
                  <Input
                    value={editingUser.full_name || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">לא ניתן לשנות שם</p>
                </div>

                <div className="space-y-2">
                  <Label>אימייל</Label>
                  <Input
                    value={editingUser.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">לא ניתן לשנות אימייל</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_company">חברה</Label>
                  <Select
                    value={editingUser.company_id || "none"}
                    onValueChange={(value) => setEditingUser({...editingUser, company_id: value === "none" ? null : value})}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue placeholder="בחר חברה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא חברה</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_role">תפקיד</Label>
                  <Select
                    value={editingUser.user_role || "user"}
                    onValueChange={(value) => setEditingUser({...editingUser, user_role: value})}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">משתמש רגיל</SelectItem>
                      <SelectItem value="company_admin">מנהל חברה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_status">סטטוס</Label>
                  <Select
                    value={editingUser.status || "פעיל"}
                    onValueChange={(value) => setEditingUser({...editingUser, status: value})}
                  >
                    <SelectTrigger className="brand-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="פעיל">פעיל</SelectItem>
                      <SelectItem value="מושהה">מושהה</SelectItem>
                      <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleUpdateUser}
                className="bg-purple-600 hover:bg-purple-700"
              >
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pages Permissions Dialog */}
        <Dialog open={showPagesDialog} onOpenChange={setShowPagesDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                הרשאות דפים - {editingUser?.full_name}
              </DialogTitle>
            </DialogHeader>

            {editingUser && (
              <div className="space-y-4 py-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    <strong>הערה:</strong> אם לא מסומן אף דף, המשתמש יקבל גישה לכל הדפים (ברירת מחדל).
                    <br />
                    סמן דפים ספציפיים כדי להגביל את הגישה.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold">בחר הכל / בטל הכל</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAllPages}
                  >
                    {(editingUser.allowed_pages || []).length === ALL_PAGES.length ? "בטל הכל" : "בחר הכל"}
                  </Button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {ALL_PAGES.map((page) => {
                    const isChecked = (editingUser.allowed_pages || []).includes(page.id);

                    return (
                      <div
                        key={page.id}
                        onClick={() => handleTogglePage(page.id)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isChecked
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isChecked
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-gray-300'
                        }`}>
                          {isChecked && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{page.name}</p>
                          <p className="text-xs text-gray-500">/{page.id}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-900">
                    <strong>דפים נבחרים:</strong> {
                      (editingUser.allowed_pages || []).length === 0
                        ? "כל הדפים (ברירת מחדל)"
                        : `${(editingUser.allowed_pages || []).length} מתוך ${ALL_PAGES.length}`
                    }
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPagesDialog(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSavePages}
                className="bg-purple-600 hover:bg-purple-700"
              >
                שמור הרשאות
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}