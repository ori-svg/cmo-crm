import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = 'https://cmo-crm.com/api/functions/google-calendar-callback';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    
    console.log('📅 Google Calendar OAuth callback called');
    console.log('Query params:', Object.fromEntries(url.searchParams));

    try {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const state = url.searchParams.get('state'); // This contains user_id

        if (error) {
            console.error('OAuth Error:', error);
            return new Response(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>שגיאה</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            text-align: center; 
                            padding: 50px; 
                            background: linear-gradient(135deg, #fee 0%, #fcc 100%);
                        }
                        .error { 
                            background: white; 
                            padding: 40px; 
                            border-radius: 16px; 
                            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                            max-width: 500px; 
                            margin: 0 auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h1 style="color: #c00;">❌ שגיאה בחיבור</h1>
                        <p>${error}</p>
                        <p style="font-size: 14px; color: #999;">החלון ייסגר אוטומטית בעוד 3 שניות...</p>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ 
                                event: "google_calendar_error",
                                error: "${error}"
                            }, "*");
                        }
                        setTimeout(() => window.close(), 3000);
                    </script>
                </body>
                </html>
            `, {
                status: 400,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        if (!code) {
            return new Response('Missing code', { status: 400 });
        }

        if (!state) {
            return new Response('Missing user ID in state', { status: 400 });
        }

        const userId = state; // The user_id was passed in state parameter

        console.log('📝 Got authorization code for user:', userId);
        console.log('📝 Exchanging code for tokens...');

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('Token exchange error:', tokenData.error);
            throw new Error(tokenData.error_description || tokenData.error);
        }

        console.log('✅ Got access token');

        const { access_token, refresh_token, expires_in } = tokenData;

        // Calculate token expiry
        const tokenExpiry = new Date(Date.now() + (expires_in * 1000)).toISOString();

        // Use service role to save settings (no user auth needed)
        const base44 = createClientFromRequest(req);

        // Get user info to get company_id
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const user = users.length > 0 ? users[0] : null;

        // Save to database using service role
        const existingSettings = await base44.asServiceRole.entities.GoogleCalendarSettings.filter({
            user_id: userId
        });
        
        const saveData = {
            user_id: userId,
            company_id: user?.company_id || null,
            access_token: access_token,
            refresh_token: refresh_token,
            token_expiry: tokenExpiry,
            calendar_id: 'primary',
            sync_enabled: true,
            status: "מחובר",
            last_sync: new Date().toISOString(),
            error_message: null
        };

        if (existingSettings.length > 0) {
            await base44.asServiceRole.entities.GoogleCalendarSettings.update(existingSettings[0].id, saveData);
            console.log('✅ Updated existing settings');
        } else {
            await base44.asServiceRole.entities.GoogleCalendarSettings.create(saveData);
            console.log('✅ Created new settings');
        }

        console.log('✅ Saved Google Calendar settings for user:', userId);

        // Return success page
        return new Response(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>חיבור הצליח</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
                    }
                    .success {
                        background: white;
                        padding: 50px 40px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                        margin: 20px auto;
                        max-width: 550px;
                        animation: slideIn 0.5s ease-out;
                    }
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(-30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    h1 { color: #22c55e; font-size: 36px; }
                    .checkmark {
                        font-size: 80px;
                        animation: pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    }
                    @keyframes pop {
                        0% { transform: scale(0) rotate(0deg); }
                        50% { transform: scale(1.3) rotate(180deg); }
                        100% { transform: scale(1) rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="success">
                    <div class="checkmark">✅</div>
                    <h1>חיבור הצליח!</h1>
                    <p>Google Calendar מחובר בהצלחה למערכת</p>
                    <p style="color: #666; margin-top: 20px;">
                        📅 כל האירועים שלך יסתנכרנו אוטומטית
                    </p>
                    <p style="font-size: 14px; color: #999; margin-top: 25px;">
                        החלון ייסגר אוטומטית בעוד 3 שניות...
                    </p>
                </div>
                <script>
                    console.log('✅ Google Calendar connected successfully');
                    
                    if (window.opener) {
                        window.opener.postMessage({ 
                            event: "google_calendar_connected",
                            success: true
                        }, "*");
                    }
                    
                    setTimeout(() => {
                        window.close();
                    }, 3000);
                </script>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (error) {
        console.error('Error in callback:', error);
        
        return new Response(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>שגיאה</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #fee 0%, #fcc 100%);
                    }
                    .error { 
                        background: white; 
                        padding: 40px; 
                        border-radius: 16px; 
                        max-width: 500px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                        margin: 0 auto;
                    }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1 style="color: #c00;">❌ שגיאה</h1>
                    <p>${error.message}</p>
                    <p style="font-size: 14px; color: #999; margin-top: 20px;">החלון ייסגר אוטומטית בעוד 5 שניות...</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ 
                            event: "google_calendar_error",
                            error: "${error.message}"
                        }, "*");
                    }
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
            </html>
        `, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
});