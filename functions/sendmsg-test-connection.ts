import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { company_id } = await req.json();

        if (!company_id) {
            return Response.json({ 
                success: false, 
                error: 'Missing company_id' 
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
                error: 'SendMsg credentials not configured' 
            }, { status: 400 });
        }

        const baseUrl = company.sendmsg_base_url || 'https://gconvertrest.sendmsg.co.il';
        const tokenUrl = `${baseUrl}/api/Sendmsg/token`;
        
        console.log('🧪 Testing SendMsg connection...');
        
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

        // לוג הבדיקה
        await base44.asServiceRole.entities.SendMsgLog.create({
            company_id: company_id,
            action: 'sendmsg_token',
            request_url: tokenUrl,
            request_body: { siteID: company.sendmsg_site_id },
            response_status: tokenResponse.status,
            response_body: tokenData,
            success: tokenResponse.ok
        });

        if (!tokenResponse.ok) {
            const errorMsg = tokenData.Message || tokenData.message || 'Connection failed';
            
            if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('incorrect')) {
                return Response.json({
                    success: false,
                    error: 'פרטי התחברות שגויים - בדוק את Site ID והסיסמה'
                });
            }
            
            return Response.json({
                success: false,
                error: errorMsg
            });
        }

        const token = tokenData.Token || tokenData.token;
        if (!token) {
            return Response.json({
                success: false,
                error: 'No token received from SendMsg'
            });
        }

        // שמור טוקן
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (11 * 60 + 50) * 60 * 1000);

        await base44.asServiceRole.entities.Company.update(company_id, {
            sendmsg_token: token,
            sendmsg_token_created_at: now.toISOString(),
            sendmsg_token_expires_at: expiresAt.toISOString()
        });

        console.log('✅ SendMsg connection successful');
        
        return Response.json({
            success: true,
            message: 'Connection successful',
            token_expires_at: expiresAt.toISOString()
        });

    } catch (error) {
        console.error('❌ Error testing SendMsg connection:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});