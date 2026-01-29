import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, RefreshCw, CheckCircle, XCircle, Unlink, Phone, AlertCircle, Key } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import WhatsAppSetupWizard from "./WhatsAppSetupWizard";

export default function WhatsAppSettingsComponent({ whatsappSettings, onUpdate, currentCompanyId }) {
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [certPhoneNumberId, setCertPhoneNumberId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('sync-whatsapp-templates', {
        company_id: currentCompanyId
      });
      
      if (response.data.success) {
        alert(`✅ סונכרנו ${response.data.synced_count} תבניות`);
        await onUpdate();
      } else {
        alert(`❌ שגיאה בסנכרון: ${response.data.error}`);
      }
    } catch (error) {
      alert(`❌ שגיאה: ${error.message}`);
    }
    setIsSyncing(false);
  };

  const handleDisconnect = async () => {
    if (!whatsappSettings) return;
    
    setIsDisconnecting(true);
    try {
      const { WhatsAppSettings } = await import("@/api/entities");
      await WhatsAppSettings.delete(whatsappSettings.id);
      
      setShowDisconnectDialog(false);
      await onUpdate();
      
      alert('✅ WhatsApp נותק בהצלחה');
    } catch (error) {
      alert(`❌ שגיאה בניתוק: ${error.message}`);
    }
    setIsDisconnecting(false);
  };

  const handleRequestPin = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('❌ יש להזין מספר טלפון תקין');
      return;
    }

    setIsRequestingPin(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('request-whatsapp-pin', {
        phoneNumber: phoneNumber,
        companyId: currentCompanyId
      });

      if (response.data.success) {
        alert('✅ קוד אימות נשלח ל-SMS! בדוק את הטלפון שלך.');
        setShowPhoneDialog(false);
        setShowPinDialog(true);
      } else {
        alert(`❌ ${response.data.error}`);
      }
    } catch (error) {
      alert(`❌ שגיאה בבקשת הקוד: ${error.message}`);
    }
    setIsRequestingPin(false);
  };

  const handleVerifyPhone = async () => {
    if (!pin || pin.length !== 6) {
      alert('❌ יש להזין קוד בן 6 ספרות');
      return;
    }

    setIsVerifying(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('confirm-whatsapp-phone', {
        phoneNumberId: whatsappSettings.phone_number_id,
        pin: pin,
        companyId: currentCompanyId
      });

      if (response.data.success) {
        alert('✅ מספר הטלפון אושר בהצלחה!');
        setShowPinDialog(false);
        setPin('');
        setPhoneNumber('');
        await onUpdate();
      } else {
        alert(`❌ ${response.data.error}`);
      }
    } catch (error) {
      alert(`❌ שגיאה באישור המספר: ${error.message}`);
    }
    setIsVerifying(false);
  };

  const handleCertificateUpload = async () => {
    if (!certificateFile) {
      alert('❌ יש לבחור קובץ תעודה');
      return;
    }

    // נסה להשתמש במספר שהוזן או במספר מהגדרות קיימות
    const phoneIdToUse = certPhoneNumberId || whatsappSettings?.phone_number_id;
    
    if (!phoneIdToUse) {
      alert('❌ יש להזין מספר טלפון (Phone Number ID)');
      return;
    }

    setIsUploadingCert(true);
    try {
      // המרת הקובץ ל-Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Certificate = e.target.result.split(',')[1]; // Remove data:*/*;base64, prefix

        const { base44 } = await import("@/api/base44Client");
        const response = await base44.functions.invoke('confirm-whatsapp-certificate', {
          phoneNumberId: phoneIdToUse,
          certificate: base64Certificate,
          password: certificatePassword || undefined,
          companyId: currentCompanyId
        });

        if (response.data.success) {
          alert('✅ מספר הטלפון אושר בהצלחה באמצעות תעודה!');
          setShowCertificateDialog(false);
          setCertificateFile(null);
          setCertificatePassword('');
          setCertPhoneNumberId('');
          await onUpdate();
        } else {
          alert(`❌ ${response.data.error}`);
        }
        setIsUploadingCert(false);
      };
      reader.onerror = () => {
        alert('❌ שגיאה בקריאת הקובץ');
        setIsUploadingCert(false);
      };
      reader.readAsDataURL(certificateFile);
    } catch (error) {
      alert(`❌ שגיאה באישור התעודה: ${error.message}`);
      setIsUploadingCert(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">WhatsApp Business API</h3>
              <p className="text-sm text-gray-600 font-normal">חבר את WhatsApp Business שלך</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {!whatsappSettings || whatsappSettings.status !== "מחובר" ? (
            <>
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-sm text-yellow-900">
                  <strong>⚠️ WhatsApp לא מחובר</strong>
                  <br />
                  התחבר ל-WhatsApp Business API כדי לשלוח הודעות ללקוחות שלך
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setShowSetupWizard(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 h-12"
              >
                <MessageCircle className="w-5 h-5 ml-2" />
                התחבר ל-WhatsApp
              </Button>
            </>
          ) : (
            <>
              {/* Phone Number Status Alert */}
              {whatsappSettings.phone_number_status === 'Pending' && (
                <Alert className="bg-orange-50 border-orange-200 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <AlertDescription className="text-sm text-orange-900">
                    <strong>⚠️ מספר הטלפון ממתין לאישור</strong>
                    <br />
                    נא להזין את קוד האימות שהתקבל ב-SMS או בשיחה למספר שנרשם
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    whatsappSettings.phone_number_status === 'Approved' 
                      ? 'bg-green-600' 
                      : 'bg-orange-500'
                  }`}>
                    {whatsappSettings.phone_number_status === 'Approved' ? (
                      <CheckCircle className="w-7 h-7 text-white" />
                    ) : (
                      <AlertCircle className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${
                      whatsappSettings.phone_number_status === 'Approved' 
                        ? 'text-green-900' 
                        : 'text-orange-900'
                    }`}>
                      {whatsappSettings.phone_number_status === 'Approved' 
                        ? 'WhatsApp מחובר!' 
                        : 'WhatsApp מחובר - ממתין לאישור'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className={`w-4 h-4 ${
                        whatsappSettings.phone_number_status === 'Approved' 
                          ? 'text-green-700' 
                          : 'text-orange-700'
                      }`} />
                      <p className={`text-sm ${
                        whatsappSettings.phone_number_status === 'Approved' 
                          ? 'text-green-700' 
                          : 'text-orange-700'
                      }`}>
                        <strong>מספר:</strong> {whatsappSettings.phone_number_id}
                      </p>
                    </div>
                    {whatsappSettings.business_account_id && (
                      <p className={`text-xs mt-1 ${
                        whatsappSettings.phone_number_status === 'Approved' 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        Business Account: {whatsappSettings.business_account_id}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={`text-white text-sm px-4 py-2 ${
                  whatsappSettings.phone_number_status === 'Approved' 
                    ? 'bg-green-600' 
                    : 'bg-orange-500'
                }`}>
                  {whatsappSettings.phone_number_status === 'Approved' ? 'מאושר' : 'ממתין לאישור'}
                </Badge>
              </div>

              {whatsappSettings.last_sync && (
                <p className="text-xs text-gray-500 text-center">
                  סונכרן לאחרונה: {new Date(whatsappSettings.last_sync).toLocaleString('he-IL')}
                </p>
              )}

              {/* Verify Phone Button - show only if Pending */}
              {whatsappSettings.phone_number_status === 'Pending' && (
                <Button
                  onClick={() => setShowPhoneDialog(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12"
                >
                  <Phone className="w-5 h-5 ml-2" />
                  אשר מספר טלפון
                </Button>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSync}
                  disabled={isSyncing || whatsappSettings.phone_number_status !== 'Approved'}
                  variant="outline"
                  className="flex-1 border-green-200 hover:bg-green-50"
                >
                  <RefreshCw className={`w-4 h-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'מסנכרן...' : 'סנכרן תבניות'}
                </Button>

                <Button
                  onClick={() => setShowDisconnectDialog(true)}
                  variant="outline"
                  className="flex-1 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <Unlink className="w-4 h-4 ml-2" />
                  נתק WhatsApp
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>💡 טיפ:</strong> סנכרן תבניות באופן קבוע כדי לקבל את התבניות החדשות ביותר שאושרו על ידי Meta
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Phone Number Verification Section */}
      <Card className="shadow-lg border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">אישור מספר טלפון חדש</h3>
              <p className="text-sm text-gray-600 font-normal">אשר מספר טלפון WhatsApp Business</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="bg-purple-50 border-purple-200">
            <AlertDescription className="text-sm text-purple-900">
              <strong>📱 איך זה עובד?</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>הזן את מספר הטלפון שברצונך לאשר</li>
                <li>קבל קוד אימות ב-SMS</li>
                <li>הזן את הקוד לאישור</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowPhoneDialog(true)}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-12"
            >
              <Phone className="w-5 h-5 ml-2" />
              אישור עם SMS
            </Button>
            <Button
              onClick={() => setShowCertificateDialog(true)}
              variant="outline"
              className="flex-1 border-purple-300 hover:bg-purple-50 h-12"
            >
              <Key className="w-5 h-5 ml-2" />
              אישור עם תעודה
            </Button>
          </div>
          </CardContent>
          </Card>

      {/* Setup Wizard Dialog */}
      <WhatsAppSetupWizard
        open={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onComplete={async () => {
          setShowSetupWizard(false);
          await onUpdate();
        }}
        currentCompanyId={currentCompanyId}
      />

      {/* Phone Number Entry Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Phone className="w-6 h-6" />
              הזן מספר טלפון לאישור
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-3">
              <p>
                <strong>הזן את מספר הטלפון שברצונך לאשר</strong>
              </p>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>💡 חשוב:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>הזן מספר עם קידומת מדינה (לדוגמה: 972541234567)</li>
                    <li>המספר חייב להיות זמין ב-WhatsApp Business שלך</li>
                    <li>ישלח SMS עם קוד אימות למספר זה</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">מספר טלפון (עם קידומת מדינה)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="972541234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl font-mono tracking-wider"
                />
                <p className="text-xs text-gray-500 text-center">
                  הזן רק ספרות (כולל קידומת מדינה)
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPhoneDialog(false);
                setPhoneNumber('');
              }}
              disabled={isRequestingPin}
            >
              ביטול
            </Button>
            <Button
              onClick={handleRequestPin}
              disabled={isRequestingPin || phoneNumber.length < 10}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isRequestingPin ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  שולח SMS...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 ml-2" />
                  שלח קוד אימות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Verification Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Key className="w-6 h-6" />
              אישור מספר טלפון
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-3">
              <p>
                <strong>הזן את קוד האימות (PIN) שקיבלת</strong>
              </p>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>💡 איפה למצוא את הקוד?</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>קוד בן 6 ספרות נשלח אליך ב-SMS</li>
                    <li>או התקבל בשיחה טלפונית</li>
                    <li>הזן את הקוד כדי לאשר את המספר</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="pin">קוד אימות (6 ספרות)</Label>
                <Input
                  id="pin"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-xs text-gray-500 text-center">
                  הזן רק ספרות (6 ספרות)
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p className="text-gray-700">
                  <strong>מספר טלפון:</strong> {phoneNumber || (whatsappSettings && whatsappSettings.phone_number_id)}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPinDialog(false);
                setPin('');
              }}
              disabled={isVerifying}
            >
              ביטול
            </Button>
            <Button
              onClick={handleVerifyPhone}
              disabled={isVerifying || pin.length !== 6}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  מאמת...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  אשר מספר
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              נתק WhatsApp Business
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-3">
              <p>
                <strong>האם אתה בטוח שברצונך לנתק את WhatsApp?</strong>
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ שים לב:</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                  <li>לא תוכל לשלוח הודעות WhatsApp</li>
                  <li>לא תוכל לקבל הודעות נכנסות</li>
                  <li>קמפיינים מתוזמנים לא יישלחו</li>
                  <li>תצטרך להתחבר מחדש כדי להמשיך להשתמש בשירות</li>
                </ul>
              </div>
              {whatsappSettings && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                  <p className="text-gray-700">
                    <strong>מספר שינותק:</strong> {whatsappSettings.phone_number_id}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
            >
              ביטול
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDisconnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  מנתק...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 ml-2" />
                  כן, נתק WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Certificate Upload Dialog */}
        <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Key className="w-6 h-6" />
              אישור מספר טלפון באמצעות תעודה
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-3">
              <p>
                <strong>העלה את קובץ התעודה (Certificate) שקיבלת מ-Meta</strong>
              </p>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>💡 מידע חשוב:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>התעודה יכולה להיות בפורמט .p12, .pem, או .txt</li>
                    <li>התעודה מתקבלת מ-Meta לאחר הגשת בקשה</li>
                    <li>אם התעודה מוגנת בסיסמה, הזן אותה בשדה המתאים</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certPhoneId">Phone Number ID</Label>
                  <Input
                    id="certPhoneId"
                    type="text"
                    placeholder={whatsappSettings?.phone_number_id || "הזן Phone Number ID"}
                    value={certPhoneNumberId}
                    onChange={(e) => setCertPhoneNumberId(e.target.value)}
                  />
                  {whatsappSettings?.phone_number_id && !certPhoneNumberId && (
                    <p className="text-xs text-gray-500">
                      ברירת מחדל: {whatsappSettings.phone_number_id}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate">קובץ תעודה (.p12, .pem, .txt)</Label>
                  <Input
                    id="certificate"
                    type="file"
                    accept=".p12,.pem,.pfx,.txt"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {certificateFile && (
                    <p className="text-xs text-green-600">
                      ✓ נבחר: {certificateFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certPassword">סיסמה לתעודה (אופציונלי)</Label>
                  <Input
                    id="certPassword"
                    type="password"
                    placeholder="הזן סיסמה אם קיימת"
                    value={certificatePassword}
                    onChange={(e) => setCertificatePassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p className="text-gray-700">
                  <strong>מספר טלפון שיאושר:</strong> {certPhoneNumberId || whatsappSettings?.phone_number_id || 'לא הוזן'}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCertificateDialog(false);
                setCertificateFile(null);
                setCertificatePassword('');
                setCertPhoneNumberId('');
              }}
              disabled={isUploadingCert}
            >
              ביטול
            </Button>
            <Button
              onClick={handleCertificateUpload}
              disabled={isUploadingCert || !certificateFile || (!certPhoneNumberId && !whatsappSettings?.phone_number_id)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isUploadingCert ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  מעלה ומאשר...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 ml-2" />
                  אשר עם תעודה
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
        </>
        );
        }