import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Send, Loader2 } from "lucide-react";

export default function NewLeadFormPage() {
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: ""
  });

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      // קבל את ה-slug מה-URL
      const urlParams = new URLSearchParams(window.location.search);
      const slug = urlParams.get("company");

      if (!slug) {
        setError("לא נמצא מזהה חברה");
        setIsLoading(false);
        return;
      }

      // טען את החברה מהשרת (ללא צורך באימות)
      const response = await fetch(`/api/getCompanyBySlug?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      
      if (!data.success || !data.company) {
        setError("החברה לא נמצאה");
        setIsLoading(false);
        return;
      }

      setCompany(data.company);
    } catch (err) {
      console.error("Error loading company:", err);
      setError("שגיאה בטעינת הטופס");
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.phone) {
      alert("יש למלא שם פרטי וטלפון");
      return;
    }

    setIsSubmitting(true);

    try {
      // שלח לפונקציה בשרת שתיצור את הליד ותשלח מייל (ללא אימות)
      const response = await fetch('/api/submitLeadForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          lead_data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            notes: formData.notes,
            source: "טופס אתר"
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsSubmitted(true);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error("Error submitting lead:", err);
      alert("שגיאה בשליחת הטופס, נסה שוב");
    }
    setIsSubmitting(false);
  };

  const primaryColor = company?.primary_color || "#1e40af";
  const secondaryColor = company?.secondary_color || "#10b981";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50" dir="rtl">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50" dir="rtl">
        <Card className="w-full max-w-md mx-4 shadow-xl">
          <CardContent className="p-8 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">תודה רבה!</h2>
            <p className="text-gray-600">הפרטים נקלטו בהצלחה, ניצור איתך קשר בהקדם.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <CardTitle 
            className="text-2xl font-bold"
            style={{ color: primaryColor }}
          >
            {company?.name || "צור קשר"}
          </CardTitle>
          <p className="text-gray-500 mt-2">השאירו פרטים ונחזור אליכם בהקדם</p>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">שם פרטי *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                  placeholder="הזן שם פרטי"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">שם משפחה</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  placeholder="הזן שם משפחה"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
                placeholder="050-1234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הודעה</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="איך נוכל לעזור לך?"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white py-6 text-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : (
                <Send className="w-5 h-5 ml-2" />
              )}
              {isSubmitting ? "שולח..." : "שלח פרטים"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}