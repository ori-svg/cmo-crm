import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

const SUPER_ADMIN_EMAILS = ["ori@omerdaffan.com", "cmo@omerdaffan.com"];

export default function CompanySelector({ user, currentCompanyId, onCompanyChange }) {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user, currentCompanyId]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const { Company } = await import("@/api/entities");
      
      if (SUPER_ADMIN_EMAILS.includes(user.email)) {
        // Super Admin רואה את כל החברות
        const response = await base44.functions.invoke('listCompanies');
        if (response.data.success) {
          console.log('🏢 Super Admin - All companies:', response.data.companies.length);
          setCompanies(response.data.companies);
        }
      } else if (user.user_role === 'company_admin') {
        // Company Admin - טען את כל החברות שיש לו גישה אליהן
        const { CompanyUser } = await import("@/api/entities");
        
        const allCompanies = await Company.list();
        
        // מצא את כל החברות שהמשתמש יכול לגשת אליהן דרך CompanyUser
        const userCompanies = await CompanyUser.filter({ user_id: user.id });
        const accessibleCompanyIds = userCompanies.map(cu => cu.company_id);
        
        console.log('👤 User accessible company IDs:', accessibleCompanyIds);
        
        // התחל עם החברות שיש למשתמש גישה ישירה אליהן
        let accessibleCompanies = allCompanies.filter(c => accessibleCompanyIds.includes(c.id));
        
        console.log('📋 Base accessible companies:', accessibleCompanies.map(c => c.name));
        
        // עבור כל החברות הנגישות - בדוק אם הן חברות אם או בת והוסף קשרים
        const companiesToProcess = [...accessibleCompanies];
        
        for (const company of companiesToProcess) {
          console.log(`🔍 Processing company: ${company.name} (is_parent: ${company.is_parent_company}, parent_id: ${company.parent_company_id})`);
          
          // אם זו חברת אם - הוסף את כל החברות הבת שלה
          if (company.is_parent_company) {
            console.log(`🏢 ${company.name} is a parent company - looking for sub-companies`);
            const subCompanies = allCompanies.filter(c => 
              c.parent_company_id === company.id && 
              !accessibleCompanies.find(ac => ac.id === c.id)
            );
            if (subCompanies.length > 0) {
              console.log(`➕ Adding ${subCompanies.length} sub-companies:`, subCompanies.map(c => c.name));
              accessibleCompanies = [...accessibleCompanies, ...subCompanies];
            } else {
              console.log(`   No sub-companies found`);
            }
          }
          
          // אם זו חברת בת - הוסף את חברת האם
          if (company.parent_company_id) {
            console.log(`🔗 ${company.name} is a sub-company - looking for parent`);
            const parentCompany = allCompanies.find(c => c.id === company.parent_company_id);
            if (parentCompany && !accessibleCompanies.find(ac => ac.id === parentCompany.id)) {
              console.log(`➕ Adding parent company: ${parentCompany.name}`);
              accessibleCompanies.push(parentCompany);
            }
          }
        }
        
        console.log('✅ Final accessible companies:', accessibleCompanies.length);
        console.log('   Companies:', accessibleCompanies.map(c => c.name));
        
        setCompanies(accessibleCompanies);
      } else {
        // User רגיל - בדוק אם יש לו גישה למספר חברות דרך CompanyUser
        const { CompanyUser } = await import("@/api/entities");
        
        const allCompanies = await Company.list();
        const userCompanies = await CompanyUser.filter({ user_id: user.id });
        
        if (userCompanies.length > 0) {
          let accessibleCompanies = userCompanies
            .map(cu => allCompanies.find(c => c.id === cu.company_id))
            .filter(c => c);
          
          // עבור כל החברות הנגישות - בדוק קשרים
          const companiesToProcess = [...accessibleCompanies];
          
          for (const company of companiesToProcess) {
            // אם זו חברת אם - הוסף את החברות הבת
            if (company.is_parent_company) {
              const subCompanies = allCompanies.filter(c => 
                c.parent_company_id === company.id && 
                !accessibleCompanies.find(ac => ac.id === c.id)
              );
              accessibleCompanies = [...accessibleCompanies, ...subCompanies];
            }
            
            // אם זו חברת בת - הוסף את חברת האם
            if (company.parent_company_id) {
              const parentCompany = allCompanies.find(c => c.id === company.parent_company_id);
              if (parentCompany && !accessibleCompanies.find(ac => ac.id === parentCompany.id)) {
                accessibleCompanies.push(parentCompany);
              }
            }
          }
          
          console.log('🏢 Regular User - Accessible companies:', accessibleCompanies.length);
          setCompanies(accessibleCompanies);
        }
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    }
    setIsLoading(false);
  };

  // הצג את הסלקטור אם יש יותר מחברה אחת
  if (isLoading || companies.length <= 1) {
    console.log('🚫 CompanySelector check - isLoading:', isLoading, 'companies:', companies.length);
    if (!isLoading && companies.length > 0) {
      console.log('   Available companies:', companies.map(c => c.name));
    }
    return null;
  }

  // מצא את החברה הנוכחית
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  console.log('📍 Current company in selector:', currentCompany?.name, '(ID:', currentCompanyId, ')');
  console.log('📋 Total companies in selector:', companies.length);

  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">חברה פעילה:</span>
      </div>
      <Select value={currentCompanyId || ""} onValueChange={onCompanyChange}>
        <SelectTrigger className="w-full brand-select">
          <SelectValue placeholder="בחר חברה" />
        </SelectTrigger>
        <SelectContent>
          {companies.map(company => (
            <SelectItem key={company.id} value={company.id}>
              <div className="flex items-center gap-2">
                {company.logo_url && (
                  <img src={company.logo_url} alt="" className="w-5 h-5 rounded object-contain" />
                )}
                <span>{company.name}</span>
                {company.parent_company_id && (
                  <span className="text-xs text-gray-400">(חברת בת)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}