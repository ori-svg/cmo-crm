import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * פונקציה לאישור סופי של מספר טלפון באמצעות תעודה (Certificate).
 *
 * @param {Request} req - אובייקט הבקשה.
 * @returns {Response}
 */
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
        const { phoneNumberId, certificate, password, companyId } = await req.json();

        console.log('📜 Confirming WhatsApp phone with certificate:', { phoneNumberId, companyId });

        // ולידציה
        if (!phoneNumberId || !certificate) {
            return Response.json({
                success: false,
                error: 'חסרים פרמטרים - phoneNumberId ו-certificate נדרשים'
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

        console.log('🔑 Registering phone with certificate...');

        // בניית גוף הבקשה
        const apiBody = {
            messaging_product: 'whatsapp',
            cert: certificate
        };

        if (password) {
            apiBody.password = password;
        }

        // קריאה ל-Meta API לאישור המספר עם תעודה
        const registerResponse = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiBody)
            }
        );

        const registerData = await registerResponse.json();

        console.log('📱 Meta API Response:', registerData);

        if (!registerResponse.ok) {
            // טיפול בשגיאות ספציפיות
            let errorMessage = 'שגיאה באישור התעודה';
            
            if (registerData.error) {
                if (registerData.error.message.includes('Invalid certificate')) {
                    errorMessage = 'תעודה לא תקינה - בדוק את הקובץ והסיסמה';
                } else if (registerData.error.message.includes('expired')) {
                    errorMessage = 'תעודה פגה תוקף';
                } else {
                    errorMessage = registerData.error.message;
                }
            }

            console.error('❌ Registration with certificate failed:', registerData.error);

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
        console.log('✅ Phone verified successfully with certificate');

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
            message: 'מספר הטלפון אושר בהצלחה באמצעות תעודה!',
            phone_number_id: phoneNumberId,
            status: 'Approved'
        });

    } catch (error) {
        console.error('❌ Error confirming WhatsApp phone with certificate:', error);
        return Response.json({
            success: false,
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});