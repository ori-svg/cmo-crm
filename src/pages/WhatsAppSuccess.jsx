import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function WhatsAppSuccess() {
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");
      const state = urlParams.get("state"); // company_id

      if (error) {
        setStatus("error");
        setMessage(errorDescription || error);
        setTimeout(() => window.close(), 5000);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("חסר קוד אימות");
        setTimeout(() => window.close(), 5000);
        return;
      }

      // שלח את הקוד לשרת לטיפול
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke("exchange-whatsapp-code", {
        code,
        company_id: state
      });

      if (response.data.success) {
        setStatus("success");
        setDetails(response.data);
        setMessage("WhatsApp חובר בהצלחה!");
        
        // שלח הודעה לחלון הראשי
        if (window.opener) {
          window.opener.postMessage({
            event: "whatsapp_connected",
            success: true,
            data: response.data
          }, "*");
        }
        
        setTimeout(() => window.close(), 3000);
      } else {
        throw new Error(response.data.error || "שגיאה בחיבור");
      }

    } catch (err) {
      console.error("WhatsApp callback error:", err);
      setStatus("error");
      setMessage(err.message || "שגיאה לא ידועה");
      
      if (window.opener) {
        window.opener.postMessage({
          event: "whatsapp_error",
          error: err.message
        }, "*");
      }
      
      setTimeout(() => window.close(), 5000);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: status === "success" 
          ? "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)"
          : status === "error"
          ? "linear-gradient(135deg, #fee 0%, #fcc 100%)"
          : "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)"
      }}
      dir="rtl"
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">מחבר WhatsApp...</h2>
              <p className="text-gray-600">אנא המתן</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">{message}</h2>
              {details && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4 text-right text-sm">
                  {details.waba_id && (
                    <p className="text-green-800"><strong>Business Account:</strong> {details.waba_id}</p>
                  )}
                  {details.phone_number_id && (
                    <p className="text-green-800 mt-1"><strong>Phone ID:</strong> {details.phone_number_id}</p>
                  )}
                  {details.display_phone && (
                    <p className="text-green-800 mt-1"><strong>מספר:</strong> {details.display_phone}</p>
                  )}
                </div>
              )}
              <p className="text-gray-500 text-sm mt-4">החלון ייסגר בעוד 3 שניות...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">שגיאה בחיבור</h2>
              <p className="text-red-700">{message}</p>
              <p className="text-gray-500 text-sm mt-4">החלון ייסגר בעוד 5 שניות...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}