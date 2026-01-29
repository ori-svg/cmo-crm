import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

async function refreshAccessToken(refreshToken) {
    console.log('🔄 Refreshing access token...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    
    console.log('🔑 Token refresh response:', data);
    
    if (data.error) {
        throw new Error(data.error_description || data.error);
    }

    return {
        access_token: data.access_token,
        expires_in: data.expires_in
    };
}

async function getAccessToken(base44, userId) {
    console.log('📋 Getting access token for user:', userId);
    
    const settings = await base44.asServiceRole.entities.GoogleCalendarSettings.filter({
        user_id: userId
    });

    console.log('⚙️ Found settings:', settings.length);

    if (settings.length === 0) {
        throw new Error('Google Calendar not connected');
    }

    const setting = settings[0];
    console.log('📅 Current settings status:', setting.status);
    console.log('⏰ Token expiry:', setting.token_expiry);

    // Check if token expired
    if (new Date(setting.token_expiry) <= new Date()) {
        console.log('⚠️ Token expired, refreshing...');
        
        const { access_token, expires_in } = await refreshAccessToken(setting.refresh_token);
        
        const newExpiry = new Date(Date.now() + (expires_in * 1000)).toISOString();
        
        await base44.asServiceRole.entities.GoogleCalendarSettings.update(setting.id, {
            access_token: access_token,
            token_expiry: newExpiry
        });

        console.log('✅ Token refreshed successfully');
        return access_token;
    }

    console.log('✅ Using existing token');
    return setting.access_token;
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        console.log('🔄 Sync function called');
        
        const user = await base44.auth.me();
        console.log('👤 User:', user?.id, user?.email);
        
        if (!user) {
            console.error('❌ No user found');
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const body = await req.json();
        const { direction, event_id, company_id } = body;

        console.log('📍 Sync direction:', direction);
        console.log('🎯 Event ID:', event_id);

        const accessToken = await getAccessToken(base44, user.id);
        console.log('🔑 Got access token:', accessToken ? 'Yes' : 'No');

        if (direction === 'from_google') {
            console.log('📥 Syncing FROM Google Calendar...');
            
            // חשב חודשיים קדימה מהיום
            const now = new Date();
            const twoMonthsFromNow = new Date(now);
            twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
            
            console.log('📅 Syncing range:', now.toISOString(), 'to', twoMonthsFromNow.toISOString());
            
            // Fetch events from Google Calendar (2 months only)
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
                `timeMin=${now.toISOString()}&` +
                `timeMax=${twoMonthsFromNow.toISOString()}&` +
                `maxResults=250&` +
                `singleEvents=true&` +
                `orderBy=startTime`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            const data = await response.json();

            console.log('📊 Google API response status:', response.status);

            if (data.error) {
                console.error('❌ Google API error:', data.error);
                throw new Error(data.error.message || 'Google API error');
            }

            console.log(`📥 Found ${data.items?.length || 0} events from Google`);

            // Use company_id from request or fallback to user's company
            const companyId = company_id || user.company_id;
            console.log('🏢 Using company_id:', companyId, '(from request:', company_id, ', from user:', user.company_id, ')');

            // Import to our system
            let imported = 0;
            for (const event of data.items || []) {
                try {
                    // Check if already exists
                    const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
                        google_event_id: event.id
                    });

                    const eventData = {
                        title: event.summary || 'ללא כותרת',
                        description: event.description || '',
                        start_time: event.start.dateTime || event.start.date,
                        end_time: event.end.dateTime || event.end.date,
                        location: event.location || '',
                        status: 'מתוכנן',
                        google_event_id: event.id,
                        company_id: companyId
                    };

                    if (existing.length === 0) {
                        await base44.asServiceRole.entities.CalendarEvent.create(eventData);
                        console.log('✅ Created event:', event.summary);
                        imported++;
                    } else {
                        await base44.asServiceRole.entities.CalendarEvent.update(existing[0].id, eventData);
                        console.log('✅ Updated event:', event.summary);
                        imported++;
                    }
                } catch (eventError) {
                    console.error('❌ Error processing event:', event.summary, eventError);
                }
            }

            // Update last sync
            const settings = await base44.asServiceRole.entities.GoogleCalendarSettings.filter({
                user_id: user.id
            });
            
            if (settings.length > 0) {
                await base44.asServiceRole.entities.GoogleCalendarSettings.update(settings[0].id, {
                    last_sync: new Date().toISOString()
                });
            }

            console.log(`✅ Sync completed: ${imported} events`);

            return Response.json({ 
                success: true,
                imported: imported
            });

        } else if (direction === 'to_google') {
            console.log('📤 Syncing TO Google Calendar...');
            
            // Push our event to Google
            const events = await base44.entities.CalendarEvent.filter({
                id: event_id
            });

            if (events.length === 0) {
                console.error('❌ Event not found:', event_id);
                return Response.json({ 
                    success: false,
                    error: 'Event not found' 
                }, { status: 404 });
            }

            const event = events[0];
            console.log('📤 Syncing event:', event.title);

            const googleEvent = {
                summary: event.title,
                description: event.description || '',
                location: event.location || '',
                start: {
                    dateTime: event.start_time,
                    timeZone: 'Asia/Jerusalem'
                },
                end: {
                    dateTime: event.end_time || event.start_time,
                    timeZone: 'Asia/Jerusalem'
                }
            };

            let response;
            if (event.google_event_id) {
                // Update existing
                console.log('🔄 Updating existing Google event:', event.google_event_id);
                
                response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.google_event_id}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(googleEvent)
                    }
                );
            } else {
                // Create new
                console.log('➕ Creating new Google event');
                
                response = await fetch(
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(googleEvent)
                    }
                );
            }

            const data = await response.json();

            console.log('📊 Google API response status:', response.status);

            if (data.error) {
                console.error('❌ Google API error:', data.error);
                throw new Error(data.error.message || 'Google API error');
            }

            // Save Google event ID
            await base44.entities.CalendarEvent.update(event_id, {
                google_event_id: data.id
            });

            console.log('✅ Synced to Google:', event.title);

            return Response.json({ 
                success: true,
                google_event_id: data.id
            });
        }

        console.error('❌ Invalid direction:', direction);
        return Response.json({ 
            success: false,
            error: 'Invalid direction' 
        }, { status: 400 });

    } catch (error) {
        console.error('❌ Error syncing calendar:', error);
        console.error('❌ Error stack:', error.stack);
        
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});