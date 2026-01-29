import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        console.log('📥 Received payload:', payload);
        
        const { action, company_id, email } = payload;

        if (!company_id) {
            console.error('❌ Missing company_id in request');
            return Response.json({ 
                success: false, 
                error: 'Missing company_id' 
            }, { status: 400 });
        }
        
        if (action === 'remove' && !email) {
            console.error('❌ Missing email for removal action');
            return Response.json({ 
                success: false, 
                error: 'Missing email for removal action' 
            }, { status: 400 });
        }

        // טען הגדרות החברה
        const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
        if (companies.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Company not found' 
            }, { status: 404 });
        }

        const company = companies[0];

        if (!company.sendmsg_site_id || !company.sendmsg_api_password) {
            return Response.json({ 
                success: false, 
                error: 'SendMsg not configured for this company' 
            }, { status: 400 });
        }

        const baseUrl = company.sendmsg_base_url || 'https://gconvertrest.sendmsg.co.il';

        // קבל או צור טוקן
        const token = await getSendMsgToken(base44, company, baseUrl);
        
        if (!token) {
            return Response.json({ 
                success: false, 
                error: 'Failed to get SendMsg token' 
            }, { status: 500 });
        }

        // אם זו בקשת הסרה
        if (action === 'remove' && email) {
            const result = await setUserRemovalStatus(
                base44, 
                company_id, 
                email, 
                token, 
                baseUrl
            );
            return Response.json(result);
        }

        return Response.json({ 
            success: false, 
            error: 'Invalid action' 
        }, { status: 400 });

    } catch (error) {
        console.error('❌ Error in sendmsg-manage:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

async function getSendMsgToken(base44, company, baseUrl) {
    try {
        // בדוק אם יש טוקן תקף
        if (company.sendmsg_token && company.sendmsg_token_expires_at) {
            const expiresAt = new Date(company.sendmsg_token_expires_at);
            const now = new Date();
            const bufferTime = 60 * 1000; // דקת ביטחון

            if (expiresAt.getTime() > now.getTime() + bufferTime) {
                console.log('✅ Using existing valid token');
                return company.sendmsg_token;
            }
        }

        // צור טוקן חדש
        console.log('🔄 Creating new SendMsg token...');
        const tokenUrl = `${baseUrl}/api/Sendmsg/token`;
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                siteID: company.sendmsg_site_id,
                password: company.sendmsg_api_password
            })
        });

        const tokenData = await tokenResponse.json();

        // לוג יצירת טוקן (with try-catch to prevent blocking)
        try {
            await base44.asServiceRole.entities.SendMsgLog.create({
            company_id: company.id,
            action: 'sendmsg_token',
            request_url: tokenUrl,
            request_body: { siteID: company.sendmsg_site_id },
            response_status: tokenResponse.status,
            response_body: tokenData,
            success: tokenResponse.ok
            });
        } catch (logError) {
            console.warn('⚠️ Failed to log token creation:', logError.message);
        }

        if (!tokenResponse.ok) {
            const errorMsg = tokenData.Message || tokenData.message || 'Token creation failed';
            
            if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('incorrect')) {
                throw new Error('פרטי התחברות שגויים - בדוק את Site ID והסיסמה');
            }
            
            throw new Error(errorMsg);
        }

        const token = tokenData.Token || tokenData.token;
        if (!token) {
            throw new Error('No token received from SendMsg');
        }

        // שמור טוקן עם תוקף של 11:50 שעות
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (11 * 60 + 50) * 60 * 1000);

        await base44.asServiceRole.entities.Company.update(company.id, {
            sendmsg_token: token,
            sendmsg_token_created_at: now.toISOString(),
            sendmsg_token_expires_at: expiresAt.toISOString()
        });

        console.log('✅ New token created and saved');
        return token;

    } catch (error) {
        console.error('❌ Error getting SendMsg token:', error);
        return null;
    }
}

async function setUserRemovalStatus(base44, company_id, email, token, baseUrl, isRetry = false) {
    try {
        const changeStatusUrl = `${baseUrl}/api/Sendmsg/ChangeUpdateStatus`;
        
        console.log(`📤 Setting removal status for: ${email}`);
        
        const response = await fetch(changeStatusUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                EmailAddress: email,
                StatusEmail: 'AskedRemoval'
            })
        });

        const responseData = await response.json();

        // לוג הבקשה (with try-catch to prevent blocking)
        try {
            await base44.asServiceRole.entities.SendMsgLog.create({
            company_id: company_id,
            action: 'sendmsg_change_status',
            request_url: changeStatusUrl,
            request_body: {
                EmailAddress: email,
                StatusEmail: 'AskedRemoval'
            },
            response_status: response.status,
            response_body: responseData,
            success: response.ok
            });
        } catch (logError) {
            console.warn('⚠️ Failed to log removal request:', logError.message);
        }

        // אם נכשל עם 401 וזה לא ניסיון חוזר - נסה שוב עם טוקן חדש
        if (response.status === 401 && !isRetry) {
            console.log('🔄 Token expired, retrying with new token...');
            
            // אפס טוקן נוכחי
            const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
            const company = companies[0];
            
            await base44.asServiceRole.entities.Company.update(company_id, {
                sendmsg_token: null,
                sendmsg_token_expires_at: null
            });

            // קבל טוקן חדש
            const newToken = await getSendMsgToken(base44, company, baseUrl);
            if (!newToken) {
                return {
                    success: false,
                    error: 'Failed to refresh token'
                };
            }

            // נסה שוב עם הטוקן החדש
            return await setUserRemovalStatus(base44, company_id, email, newToken, baseUrl, true);
        }

        if (!response.ok) {
            return {
                success: false,
                error: responseData.Message || responseData.message || 'Failed to set removal status',
                response: responseData
            };
        }

        console.log('✅ Removal status set successfully');
        return {
            success: true,
            message: 'User marked for removal in SendMsg',
            response: responseData
        };

    } catch (error) {
        console.error('❌ Error setting removal status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}