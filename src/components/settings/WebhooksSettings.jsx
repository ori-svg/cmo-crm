
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Webhook, Copy, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Code, Key } from "lucide-react";

export default function WebhooksSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false); // This state seems unused now, can be removed if not planned for future use
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  // Webhook endpoints
  const incomingWebhookUrl = `https://cmo-crm.com/api/functions/add-lead`;
  const makeWebhookUrl = `https://cmo-crm.com/api/functions/receiveLeadFromMake`;

  const handleCopyEndpoint = (url, name) => {
    navigator.clipboard.writeText(url);
    setCopiedEndpoint(name);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const examplePayload = `{
  "first_name": "ישראל",
  "last_name": "ישראלי",
  "email": "israel@example.com",
  "phone": "050-1234567",
  "source": "Facebook",
  "campaign": "קמפיין חורף 2024",
  "notes": "לקוח פוטנציאלי",
  "form_responses": {
    "איך שמעת עלינו?": "חיפוש בגוגל",
    "תקציב משוער": "5,000-10,000 ₪",
    "מתי תרצה להתחיל?": "בחודש הקרוב",
    "הערות נוספות": "מעוניין בשירות פרימיום"
  },
  "proposals": [
    {
      "name": "הצעת מחיר בסיסית",
      "price": 1200,
      "status": "נשלח"
    }
  ]
}`;

const exampleCurl = `curl -X POST https://cmo-crm.com/api/functions/add-lead \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "first_name": "ישראל",
    "last_name": "ישראלי",
    "email": "israel@example.com",
    "phone": "050-1234567",
    "source": "Facebook",
    "form_responses": {
      "שאלה 1": "תשובה 1",
      "שאלה 2": "תשובה 2"
    }
  }'`;

  return (
    <Card className="shadow-lg">
      <CardHeader 
        className="bg-gradient-to-r from-orange-50 to-orange-100 border-b cursor-pointer hover:bg-orange-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Webhook className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Webhooks & API</CardTitle>
              <p className="text-sm text-gray-600 mt-1">קבל לידים ממערכות חיצוניות</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="p-6 space-y-6">
          {/* הודעת API Key */}
          <Alert className="bg-purple-50 border-purple-200">
            <Key className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-900">
              <strong>שים לב:</strong> כדי לקלוט לידים דרך ה-API, יש ליצור מפתח API בעמוד "מפתחות API"
            </AlertDescription>
          </Alert>

          {/* API Endpoint להוספת לידים */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-orange-600" />
              <Label className="text-base font-semibold">API להוספת לידים</Label>
            </div>
            <p className="text-sm text-gray-600">
              השתמש ב-endpoint זה כדי להוסיף לידים חדשים מכל מערכת חיצונית. כל חברה צריכה API Key משלה.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-600">POST</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyEndpoint(incomingWebhookUrl, 'api')}
                  className="gap-2"
                >
                  {copiedEndpoint === 'api' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      העתק
                    </>
                  )}
                </Button>
              </div>
              <code className="text-sm font-mono break-all">
                {incomingWebhookUrl}
              </code>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Code className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>דרישות:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Header: <code className="bg-white px-2 py-1 rounded">X-API-Key: YOUR_API_KEY</code></li>
                  <li>או Query: <code className="bg-white px-2 py-1 rounded">?api_key=YOUR_API_KEY</code></li>
                  <li>שדות חובה: email או phone (לפחות אחד)</li>
                </ul>
                
                <strong className="block mt-4">דוגמת CURL:</strong>
                <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-x-auto" dir="ltr">
{exampleCurl}
                </pre>
                
                <strong className="block mt-4">דוגמת JSON Body:</strong>
                <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-x-auto" dir="ltr">
{examplePayload}
                </pre>
              </AlertDescription>
            </Alert>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Webhook className="w-5 h-5 text-orange-600" />
              <Label className="text-base font-semibold">Webhook מ-Make.com</Label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              endpoint ייעודי לקבלת לידים מ-Make.com (תומך בפורמט Make)
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-600">POST</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyEndpoint(makeWebhookUrl, 'make')}
                  className="gap-2"
                >
                  {copiedEndpoint === 'make' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      העתק
                    </>
                  )}
                </Button>
              </div>
              <code className="text-sm font-mono break-all">
                {makeWebhookUrl}
              </code>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-base font-semibold">Webhooks יוצאים</Label>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              הגדר Webhooks שיישלחו אוטומטית כאשר מתרחשים אירועים במערכת
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">ליד חדש נוצר</span>
                  <Badge className="bg-green-100 text-green-800">פעיל</Badge>
                </div>
                <p className="text-xs text-gray-600 mb-2">מופעל כאשר נוצר ליד חדש במערכת</p>
                <Input
                  placeholder="https://hook.make.com/your-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="text-sm"
                />
              </div>

              <Button variant="outline" className="w-full">
                + הוסף Webhook נוסף
              </Button>
            </div>
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-900">
              <strong>טיפ אבטחה:</strong> מומלץ להוסיף אימות (API key) לבקשות. 
              ניתן להוסיף header: <code>Authorization: Bearer YOUR_API_KEY</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
