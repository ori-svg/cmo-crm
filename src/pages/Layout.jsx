
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CompanySelector from "./components/layout/CompanySelector";
import NoCompanyMessage from "./components/layout/NoCompanyMessage";
import CompleteProfileDialog from "./components/layout/CompleteProfileDialog";

import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  Zap,
  Settings,
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  X,
  MessageCircle,
  ChevronUp,
  ClipboardList,
  MessageSquare,
  Send,
  Shield,
  Building2,
  Key,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

const navigationItems = [
  {
    title: "דאשבורד", // Reordered for better common UX
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    pageId: "Dashboard", // Added explicit pageId
  },
  {
    title: "לידים",
    url: createPageUrl("Leads"),
    icon: UserPlus,
    pageId: "Leads",
  },
  {
    title: "לקוחות",
    url: createPageUrl("Clients"),
    icon: Users,
    pageId: "Clients",
  },
  {
    title: "WhatsApp", // This item is now a collapsible parent
    icon: MessageCircle,
    pageId: "WhatsApp", // Parent doesn't have URL, but has pageId for grouping
    children: [ // Nested child items for WhatsApp functionalities
      {
        title: "אינבוקס", // Changed from "שיחות והודעות"
        url: createPageUrl("WhatsAppConversations"), // New page URL for conversations
        icon: MessageSquare, // Icon for message conversations
        pageId: "WhatsAppConversations",
      },
      {
        title: "קמפייני דיוור", // Changed from "קמפיינים"
        url: createPageUrl("WhatsAppCampaigns"), // New page URL for campaigns
        icon: Send, // Changed icon from Zap to Send
        pageId: "WhatsAppCampaigns",
      },
      {
        title: "תבניות הודעות", // Templates (as per "Collapse לתבניות")
        url: createPageUrl("WhatsAppTemplates"), // New page URL for templates
        icon: ClipboardList, // Icon for templates
        pageId: "WhatsAppTemplates",
      },
    ],
  },
  {
    title: "אוטומציות",
    url: createPageUrl("Automations"),
    icon: Zap,
    pageId: "Automations",
  },
  {
    title: "יומן",
    url: createPageUrl("Calendar"),
    icon: Calendar,
    pageId: "Calendar",
  },
  {
    title: "הצעות מחיר",
    url: createPageUrl("Quotes"),
    icon: ClipboardList,
    pageId: "Quotes",
  },
  {
    title: "הגדרות",
    url: createPageUrl("Settings"),
    icon: Settings,
    pageId: "Settings",
  },
  {
    title: "מפתחות API", // New: API Keys navigation item
    url: createPageUrl("ApiKeys"),
    icon: Key,
    pageId: "ApiKeys",
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appSettings, setAppSettings] = useState(null);
  const [openCollapsibles, setOpenCollapsibles] = useState({});
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true); // New state

  useEffect(() => {
    document.title = "Cmo Crm";
    loadUser();
    checkAndUpdateUserFromPending();
    
    // נקה memory leaks
    return () => {
      // ניקוי כל ה-intervals/timeouts שנשארו
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadCurrentCompany();
      
      // בדוק אם המשתמש צריך להשלים פרופיל
      if (!user.full_name || user.full_name.trim() === "") {
        setShowProfileDialog(true);
      }
    }
  }, [user]);

  // טען הגדרות מראה כשהחברה הנוכחית משתנה
  useEffect(() => {
    if (user && currentCompanyId) {
      loadAppSettings();
    }
  }, [user, currentCompanyId]);

  useEffect(() => {
    // Initialize openCollapsibles state based on the current active path
    const initialOpen = {};
    // Ensure user is loaded before calling getFilteredNavigationItems,
    // otherwise it might return an empty array initially.
    // Also, wrap the call in a conditional to prevent issues if user isn't available yet.
    if (user) {
        const navItemsToCheck = getFilteredNavigationItems();

        navItemsToCheck.forEach(item => {
        if (item.children) {
            // If any child URL matches the current path, open its parent collapsible
            if (item.children.some(child => location.pathname === child.url)) {
            initialOpen[item.title] = true;
            }
        }
        });
    }
    setOpenCollapsibles(initialOpen);

  }, [location.pathname, user]); // Re-evaluate initial open state when the URL or user changes

  const loadUser = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadAppSettings = async () => {
    try {
      if (!user || !currentCompanyId) return;

      const { Company } = await import("@/api/entities");
      const companies = await Company.filter({ id: currentCompanyId });
      
      if (companies.length > 0) {
        const company = companies[0];
        const newSettings = {
          primary_color: company.primary_color || "#1e40af",
          secondary_color: company.secondary_color || "#10b981",
          accent_color: company.accent_color || "#f59e0b",
          company_name: company.name || "CMO CRM",
          logo_url: company.logo_url || null
        };
        
        setAppSettings(newSettings);
        
        // שמור ב-localStorage למניעת מצמוץ בטעינות הבאות
        localStorage.setItem(`company_settings_${currentCompanyId}`, JSON.stringify(newSettings));
      } else {
        // Default settings
        setAppSettings({
          primary_color: "#1e40af",
          secondary_color: "#10b981",
          accent_color: "#f59e0b",
          company_name: "CMO CRM",
          logo_url: null
        });
      }
    } catch (error) {
      console.error("Error loading app settings:", error);
    }
  };

  const loadCurrentCompany = async () => {
    if (!user) {
      setIsLoadingCompany(false);
      return;
    }

    // טען את החברה הנוכחית מ-localStorage או מהמשתמש
    const savedCompanyId = localStorage.getItem(`currentCompany_${user.id}`);
    
    if (savedCompanyId) {
      setCurrentCompanyId(savedCompanyId);
      
      // טען הגדרות שמורות מ-localStorage למניעת מצמוץ
      const savedSettings = localStorage.getItem(`company_settings_${savedCompanyId}`);
      if (savedSettings) {
        try {
          setAppSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error("Error parsing saved settings:", e);
        }
      }
    } else if (user.company_id) {
      setCurrentCompanyId(user.company_id);
      localStorage.setItem(`currentCompany_${user.id}`, user.company_id);
      
      // טען הגדרות שמורות
      const savedSettings = localStorage.getItem(`company_settings_${user.company_id}`);
      if (savedSettings) {
        try {
          setAppSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error("Error parsing saved settings:", e);
        }
      }
    } else if (user.user_role === 'company_admin') {
      const { CompanyUser } = await import("@/api/entities");
      const userCompanies = await CompanyUser.filter({ user_id: user.id });
      if (userCompanies.length > 0) {
        setCurrentCompanyId(userCompanies[0].company_id);
        localStorage.setItem(`currentCompany_${user.id}`, userCompanies[0].company_id);
        
        // טען הגדרות שמורות
        const savedSettings = localStorage.getItem(`company_settings_${userCompanies[0].company_id}`);
        if (savedSettings) {
          try {
            setAppSettings(JSON.parse(savedSettings));
          } catch (e) {
            console.error("Error parsing saved settings:", e);
          }
        }
      }
    }
    
    setIsLoadingCompany(false);
  };

  const handleCompanyChange = async (companyId) => {
    console.log('🔄 Changing company to:', companyId);
    
    // שמור את החברה החדשה
    setCurrentCompanyId(companyId);
    if (user) {
      localStorage.setItem(`currentCompany_${user.id}`, companyId);
    }
    
    // טען הגדרות של החברה החדשה מיד
    try {
      const { Company } = await import("@/api/entities");
      const companies = await Company.filter({ id: companyId });
      
      if (companies.length > 0) {
        const company = companies[0];
        const newSettings = {
          primary_color: company.primary_color || "#1e40af",
          secondary_color: company.secondary_color || "#10b981",
          accent_color: company.accent_color || "#f59e0b",
          company_name: company.name || "CMO CRM",
          logo_url: company.logo_url || null
        };
        
        setAppSettings(newSettings);
        localStorage.setItem(`company_settings_${companyId}`, JSON.stringify(newSettings));
        
        console.log('✅ Settings updated for new company:', newSettings.company_name);
      }
    } catch (error) {
      console.error("Error loading new company settings:", error);
    }
    
    // רענן את הדף לטעינת נתונים של החברה החדשה
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const checkAndUpdateUserFromPending = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const currentUser = await base44.auth.me();
      
      if (!currentUser) return;

      // Check if this user has a pending record
      const { PendingUser } = await import("@/api/entities");
      const pendingUsers = await PendingUser.filter({ 
        email: currentUser.email,
        status: "הוזמן"
      });

      if (pendingUsers.length > 0) {
        const pendingUser = pendingUsers[0];
        
        // Update the actual user with data from pending user
        await base44.auth.updateMe({
          company_id: pendingUser.company_id,
          user_role: pendingUser.user_role,
          status: "פעיל"
        });

        // Mark pending as completed
        await PendingUser.update(pendingUser.id, {
          status: "הושלם",
          registered_user_id: currentUser.id
        });

        console.log("✅ User details updated from pending user");
        
        // Reload user to get updated data
        await loadUser();
      }
    } catch (error) {
      console.error("Error checking pending user:", error);
    }
  };

  const handleLogout = async () => {
    try {
        const { base44 } = await import("@/api/base44Client");
        await base44.auth.logout();
        // Redirect to login or home page after logout
        window.location.href = createPageUrl("Login"); // Or your desired post-logout page
    } catch (error) {
        console.error("Error during logout:", error);
    }
  };

  const handleProfileComplete = async () => {
    setShowProfileDialog(false);
    await loadUser(); // רענן את נתוני המשתמש
  };

  const primaryColor = appSettings?.primary_color || "#1e40af";
  const secondaryColor = appSettings?.secondary_color || "#10b981";
  const accentColor = appSettings?.accent_color || "#f59e0b";
  const companyName = appSettings?.company_name || "CMO CRM";
  const logoUrl = appSettings?.logo_url;

  // Function to toggle the open/collapsed state of a navigation item
  const toggleCollapsible = (title) => {
    setOpenCollapsibles((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // פילטר תפריט לפי הרשאות
  const getFilteredNavigationItems = () => {
    // console.log('🔍 getFilteredNavigationItems called');
    // console.log('   User:', user);
    
    if (!user) {
      // console.log('   ❌ No user - returning empty array');
      return [];
    }

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email);
    const isCompanyAdmin = user.user_role === 'company_admin';

    // console.log('   Super Admin?', isSuperAdmin);
    // console.log('   Company Admin?', isCompanyAdmin);

    let items = [...navigationItems];

    // Super Admin רואה הכל + ניהול חברות + ניהול משתמשים
    if (isSuperAdmin) {
      // console.log('   ✅ Super Admin - showing all items + management pages');
      items.push(
        {
          title: "ניהול חברות",
          url: createPageUrl("CompanyManagement"),
          icon: Building2,
          pageId: "CompanyManagement",
        },
        {
          title: "ניהול משתמשים",
          url: createPageUrl("UserManagement"),
          icon: Shield,
          pageId: "UserManagement",
        }
      );
      // console.log('   Final items count:', items.length);
      return items;
    }

    // בדוק allowed_pages
    // console.log('   Checking allowed_pages...');
    // console.log('   allowed_pages value:', user.allowed_pages);
    // console.log('   allowed_pages type:', typeof user.allowed_pages);
    // console.log('   Is array?', Array.isArray(user.allowed_pages));
    // console.log('   Length:', user.allowed_pages?.length);

    // סינון לפי allowed_pages אם קיים ולא ריק
    if (user.allowed_pages && Array.isArray(user.allowed_pages) && user.allowed_pages.length > 0) {
      // console.log('   ✅ Has allowed_pages - filtering...');
      // console.log('   Allowed pages:', user.allowed_pages);
      
      let filteredItems = items.filter(item => {
        if (item.children) {
          // Parent with children
          const hasAllowedChild = item.children.some(child => 
            user.allowed_pages.includes(child.pageId)
          );
          // console.log(`   Parent "${item.title}": hasAllowedChild=${hasAllowedChild}`);
          return hasAllowedChild;
        } else {
          // Regular item
          const isAllowed = user.allowed_pages.includes(item.pageId);
          // console.log(`   Item "${item.title}" (${item.pageId}): isAllowed=${isAllowed}`);
          return isAllowed;
        }
      }).map(item => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => {
              const isAllowed = user.allowed_pages.includes(child.pageId);
              // console.log(`     Child "${child.title}" (${child.pageId}): isAllowed=${isAllowed}`);
              return isAllowed;
            })
          };
        }
        return item;
      });
      
      // console.log('   ✅ Final filtered items:', filteredItems.map(i => i.title));
      // console.log('   Count:', filteredItems.length);
      return filteredItems;
    } else {
      // אין allowed_pages או ריק - הצג לפי תפקיד
      // console.log('   ℹ️ No allowed_pages or empty - using role-based filtering');
      
      if (isCompanyAdmin) {
        // console.log('   ✅ Company Admin - showing all items');
        // console.log('   Count:', items.length);
        return items;
      }

      // Member - רק דאשבורד, לידים ויומן
      // console.log('   ℹ️ Regular user - showing Dashboard, Leads, Calendar only');
      items = items.filter(item => 
        item.pageId === "Dashboard" ||
        item.pageId === "Leads" || 
        item.pageId === "Calendar"
      );
      // console.log('   Count:', items.length);
      return items;
    }
  };

  const finalNavigationItems = useMemo(() => {
    return getFilteredNavigationItems();
  }, [user]); // memoize navigation items
  
  // console.log('📋 FINAL NAVIGATION ITEMS:', finalNavigationItems.map(i => i.title));
  // console.log('📋 Count:', finalNavigationItems.length);

  // Show loading while checking company
  if (isLoadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500">טוען...</div>
      </div>
    );
  }

  // בדיקה: אם המשתמש לא Super Admin ואין לו חברה - הצג הודעה
  if (user && !SUPER_ADMIN_EMAILS.includes(user.email) && !user.company_id && !currentCompanyId) {
    return <NoCompanyMessage user={user} />;
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <style>{`
        :root {
          --brand-primary: ${primaryColor};
          --brand-secondary: ${secondaryColor};
          --brand-accent: ${accentColor};
        }
        
        .brand-gradient {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        }
        
        .brand-button {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        }
        
        .brand-button:hover {
          opacity: 0.9;
        }
        
        /* Styled Select Dropdowns */
        .brand-select [data-radix-select-trigger] {
          border: 2px solid ${primaryColor}20;
          transition: all 0.2s;
        }
        
        .brand-select [data-radix-select-trigger]:hover {
          border-color: ${primaryColor};
          box-shadow: 0 0 0 3px ${primaryColor}10;
        }
        
        .brand-select [data-radix-select-trigger]:focus {
          border-color: ${primaryColor};
          box-shadow: 0 0 0 3px ${primaryColor}20;
        }
        
        /* Select Content Styling */
        [data-radix-select-content] {
          border: 2px solid ${primaryColor}20;
          box-shadow: 0 10px 25px -5px ${primaryColor}20;
        }
        
        [data-radix-select-item][data-highlighted] {
          background-color: ${primaryColor}10;
          color: ${primaryColor};
        }
        
        [data-radix-select-item]:hover {
          background-color: ${primaryColor}15;
        }
      `}</style>

      {/* Sidebar for Desktop - FIXED */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-l border-gray-200 shadow-lg flex-shrink-0 fixed top-0 right-0 h-screen overflow-hidden">
        <div className="border-b border-gray-200 p-6 brand-gradient flex-shrink-0">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md p-1">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                  C
                </span>
              </div>
            )}
            <div>
              <h2 className="font-bold text-xl text-white">{companyName}</h2>
              <p className="text-xs text-white opacity-90">מערכת ניהול לקוחות</p>
            </div>
          </div>
        </div>
        
        {/* Company Selector */}
        {user && (SUPER_ADMIN_EMAILS.includes(user.email) || user.user_role === 'company_admin') && (
          <div className="flex-shrink-0">
            <CompanySelector 
              user={user}
              currentCompanyId={currentCompanyId}
              onCompanyChange={handleCompanyChange}
            />
          </div>
        )}

        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {finalNavigationItems.map((item) => {
              if (item.children) {
                // Render collapsible parent item
                const isOpen = openCollapsibles[item.title];
                const hasActiveChild = item.children.some(child => location.pathname === child.url);

                return (
                  <div key={item.title}>
                    <button
                      onClick={() => toggleCollapsible(item.title)}
                      className={`flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        (hasActiveChild || isOpen)
                          ? 'text-white shadow-md'
                          : 'text-gray-700'
                      }`}
                      style={(hasActiveChild || isOpen) ? {
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                      } : {}}
                      onMouseEnter={(e) => {
                        if (!hasActiveChild && !isOpen) {
                          e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!hasActiveChild && !isOpen) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isOpen && (
                      <div className="mt-1 space-y-1 pr-4"> {/* Indent child items in RTL */}
                        {item.children.map((child) => {
                          const isChildActive = location.pathname === child.url;
                          return (
                            <Link
                              key={child.title}
                              to={child.url}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                isChildActive
                                  ? 'text-white shadow-md'
                                  : 'text-gray-700'
                              }`}
                              style={isChildActive ? {
                                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                              } : {}}
                              onMouseEnter={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <child.icon className="w-5 h-5" />
                              <span className="font-medium text-sm">{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Render regular navigation item
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'text-white shadow-md' 
                        : 'text-gray-700'
                    }`}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    } : {}}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                );
              }
            })}
          </div>
        </nav>

        {/* User section - ALWAYS VISIBLE at bottom */}
        <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
                    {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900">
                      {user?.full_name || "משתמש"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 ml-2" />
                  התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-center text-sm text-gray-500">טוען...</div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 md:hidden flex flex-col ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="border-b border-gray-200 p-6 brand-gradient">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md p-1">
                  <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                    C
                  </span>
                </div>
              )}
              <div>
                <h2 className="font-bold text-xl text-white">{companyName}</h2>
                <p className="text-xs text-white opacity-90">מערכת ניהול לקוחות</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Company Selector for mobile */}
        {user && (SUPER_ADMIN_EMAILS.includes(user.email) || user.user_role === 'company_admin') && (
          <CompanySelector 
            user={user}
            currentCompanyId={currentCompanyId}
            onCompanyChange={handleCompanyChange}
          />
        )}
        
        <nav className="flex-1 p-3 overflow-y-auto pb-24"> {/* Added pb-24 for fixed bottom user section */}
          <div className="space-y-1">
            {finalNavigationItems.map((item) => {
              if (item.children) {
                // Render collapsible parent item for mobile
                const isOpen = openCollapsibles[item.title];
                const hasActiveChild = item.children.some(child => location.pathname === child.url);

                return (
                  <div key={item.title}>
                    <button
                      onClick={() => toggleCollapsible(item.title)}
                      className={`flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        (hasActiveChild || isOpen)
                          ? 'text-white shadow-md'
                          : 'text-gray-700'
                      }`}
                      style={(hasActiveChild || isOpen) ? {
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                      } : {}}
                      onMouseEnter={(e) => {
                        if (!hasActiveChild && !isOpen) {
                          e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!hasActiveChild && !isOpen) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isOpen && (
                      <div className="mt-1 space-y-1 pr-4"> {/* Indent child items in RTL */}
                        {item.children.map((child) => {
                          const isChildActive = location.pathname === child.url;
                          return (
                            <Link
                              key={child.title}
                              to={child.url}
                              onClick={() => setSidebarOpen(false)} // Close mobile sidebar on child item click
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                isChildActive
                                  ? 'text-white shadow-md'
                                  : 'text-gray-700'
                              }`}
                              style={isChildActive ? {
                                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                              } : {}}
                              onMouseEnter={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <child.icon className="w-5 h-5" />
                              <span className="font-medium text-sm">{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Render regular navigation item for mobile
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)} // Close mobile sidebar on item click
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'text-white shadow-md' 
                        : 'text-gray-700'
                    }`}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    } : {}}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                      }
                    }}
                    onMouseLeave={(e) => {
                        if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                );
              }
            })}
          </div>
        </nav>

        {/* User section for mobile - FIXED AT BOTTOM */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-white">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
                    {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900">
                      {user?.full_name || "משתמש"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 ml-2" />
                  התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-center text-sm text-gray-500">טוען...</div>
          )}
        </div>
      </aside>

      {/* Main Content - WITH MARGIN FOR SIDEBAR */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-gray-50 to-blue-50 md:mr-64">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold" style={{ color: primaryColor }}>
              {companyName}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children ? (
            React.isValidElement(children) ? (
              React.cloneElement(children, { currentCompanyId, currentUser: user })
            ) : (
              <div className="p-8 text-center">
                <div className="text-red-600 text-lg">שגיאה: תוכן לא תקין</div>
                <div className="text-gray-600 text-sm mt-2">children is not a valid React element</div>
              </div>
            )
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-600 text-lg">טוען תוכן...</div>
              <div className="text-gray-400 text-sm mt-2">Location: {location.pathname}</div>
            </div>
          )}
        </div>
      </main>

      {/* Complete Profile Dialog */}
      <CompleteProfileDialog
        open={showProfileDialog}
        onComplete={handleProfileComplete}
      />
    </div>
  );
}
