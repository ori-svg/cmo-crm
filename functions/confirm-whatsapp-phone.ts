import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Only POST method is allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);
        
        // בדיקת הרשאות - משתמש מחובר
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // קבלת נתונים מהבקשה
        const { phoneNumberId, pin, companyId } = await req.json();

        console.log('📞 Confirming WhatsApp phone:', { phoneNumberId, companyId });

        // ולידציה
        if (!phoneNumberId || !pin) {
            return Response.json({
                success: false,
                error: 'חסרים פרמטרים - phoneNumberId ו-pin נדרשים'
            }, { status: 400 });
        }

        if (pin.length !== 6) {
            return Response.json({
                success: false,
                error: 'קוד PIN חייב להיות בן 6 ספרות'
            }, { status: 400 });
        }

        // שליפת הגדרות WhatsApp
        const settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
            company_id: companyId,
            phone_number_id: phoneNumberId
        });

        if (settings.length === 0) {
            return Response.json({
                success: false,
                error: 'מספר טלפון לא נמצא במערכת'
            }, { status: 404 });
        }

        const whatsappSettings = settings[0];
        const accessToken = whatsappSettings.access_token;

        if (!accessToken) {
            return Response.json({
                success: false,
                error: 'Access Token חסר - נא להתחבר מחדש'
            }, { status: 400 });
        }

        console.log('🔑 Registering phone with PIN...');

        // קריאה ל-Meta API לאישור המספר
        const registerResponse = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    pin: pin
                })
            }
        );

        const registerData = await registerResponse.json();

        console.log('📱 Meta API Response:', registerData);

        if (!registerResponse.ok) {
            // טיפול בשגיאות ספציפיות
            let errorMessage = 'שגיאה באישור המספר';
            
            if (registerData.error) {
                if (registerData.error.message.includes('Invalid pin')) {
                    errorMessage = 'קוד PIN שגוי - נסה שוב';
                } else if (registerData.error.message.includes('expired')) {
                    errorMessage = 'קוד PIN פג תוקף - בקש קוד חדש';
                } else {
                    errorMessage = registerData.error.message;
                }
            }

            console.error('❌ Registration failed:', registerData.error);

            // עדכון סטטוס ל-Rejected
            await base44.asServiceRole.entities.WhatsAppSettings.update(
                whatsappSettings.id,
                {
                    phone_number_status: 'Rejected',
                    error_message: errorMessage
                }
            );

            return Response.json({
                success: false,
                error: errorMessage,
                details: registerData.error
            }, { status: 400 });
        }

        // ✅ אישור הצליח
        console.log('✅ Phone verified successfully');

        // עדכון סטטוס ל-Approved
        await base44.asServiceRole.entities.WhatsAppSettings.update(
            whatsappSettings.id,
            {
                phone_number_status: 'Approved',
                status: 'מחובר',
                error_message: null,
                last_sync: new Date().toISOString()
            }
        );

        return Response.json({
            success: true,
            message: 'מספר הטלפון אושר בהצלחה!',
            phone_number_id: phoneNumberId,
            status: 'Approved'
        });

    } catch (error) {
        console.error('❌ Error confirming WhatsApp phone:', error);
        return Response.json({
            success: false,
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});