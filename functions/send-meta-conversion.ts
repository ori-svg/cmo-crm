import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as crypto from 'node:crypto';

/**
 * שולח אירוע המרה ל-Meta Conversions API
 * 
 * @param {Object} params
 * @param {string} params.event_name - שם האירוע (Lead, CompleteRegistration, Purchase, etc.)
 * @param {Object} params.lead_data - נתוני הליד
 * @param {number} params.value - ערך ההמרה (אופציונלי, למשל לרכישה)
 * @param {string} params.currency - מטבע (ברירת מחדל: ILS)
 * @param {string} params.event_source_url - URL של מקור האירוע
 * @param {string} params.action_source - מקור הפעולה (website/app/email/etc.)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // אימות משתמש
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // קבלת הפרמטרים
    const body = await req.json();
    const {
      event_name,
      lead_data,
      value,
      currency = 'ILS',
      event_source_url = 'https://cmo-crm.com',
      action_source = 'website',
      company_id
    } = body;

    if (!event_name || !lead_data) {
      return Response.json({ 
        error: 'Missing required fields: event_name, lead_data' 
      }, { status: 400 });
    }

    // טען הגדרות Meta של החברה
    const { MetaSettings } = await import('npm:@base44/sdk@0.7.1');
    const metaSettings = await base44.asServiceRole.entities.MetaSettings.filter({ 
      company_id: company_id || user.company_id 
    });

    if (!metaSettings || metaSettings.length === 0) {
      return Response.json({ 
        error: 'Meta settings not found for company' 
      }, { status: 404 });
    }

    const settings = metaSettings[0];
    
    if (!settings.pixel_id || !settings.access_token) {
      return Response.json({ 
        error: 'Meta Pixel ID or Access Token not configured' 
      }, { status: 400 });
    }

    // בניית נתוני המשתמש (User Data)
    const userData = {
      // Hash email and phone for privacy
      em: lead_data.email ? hashData(lead_data.email.toLowerCase().trim()) : undefined,
      ph: lead_data.phone ? hashData(lead_data.phone.replace(/\D/g, '')) : undefined,
      fn: lead_data.first_name ? hashData(lead_data.first_name.toLowerCase().trim()) : undefined,
      ln: lead_data.last_name ? hashData(lead_data.last_name.toLowerCase().trim()) : undefined,
      // Gender: m (male), f (female)
      ge: lead_data.gender === 'זכר' ? hashData('m') : 
          lead_data.gender === 'נקבה' ? hashData('f') : undefined,
      // Birth date in YYYYMMDD format
      db: lead_data.birthday ? hashData(lead_data.birthday.replace(/-/g, '')) : undefined,
      client_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      client_user_agent: req.headers.get('user-agent'),
      fbc: extractFbcFromCookies(req.headers.get('cookie')),
      fbp: extractFbpFromCookies(req.headers.get('cookie'))
    };

    // הסר שדות undefined
    Object.keys(userData).forEach(key => 
      userData[key] === undefined && delete userData[key]
    );

    // בניית אובייקט האירוע
    const eventData = {
      event_name: event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: event_source_url,
      action_source: action_source,
      user_data: userData
    };

    // הוספת ערך אם קיים (למשל לרכישה)
    if (value !== undefined && value !== null) {
      eventData.custom_data = {
        value: parseFloat(value),
        currency: currency
      };
    }

    // הוספת מידע מותאם אישית
    if (lead_data.fb_campaign) {
      if (!eventData.custom_data) eventData.custom_data = {};
      eventData.custom_data.campaign = lead_data.fb_campaign;
    }

    if (lead_data.source) {
      if (!eventData.custom_data) eventData.custom_data = {};
      eventData.custom_data.source = lead_data.source;
    }

    // שליחת האירוע ל-Meta Conversions API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${settings.pixel_id}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [eventData],
          access_token: settings.access_token
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta Conversions API Error:', result);
      return Response.json({ 
        error: 'Failed to send event to Meta',
        details: result 
      }, { status: response.status });
    }

    console.log('✅ Meta Conversion Event sent successfully:', {
      event_name,
      lead_email: lead_data.email,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id
    });

    return Response.json({
      success: true,
      message: 'Event sent to Meta successfully',
      meta_response: result,
      event_data: {
        event_name,
        lead_id: lead_data.id,
        lead_email: lead_data.email
      }
    });

  } catch (error) {
    console.error('Error in send-meta-conversion:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Hash data using SHA-256 (required by Meta)
 */
function hashData(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Extract Facebook Click ID (fbc) from cookies
 */
function extractFbcFromCookies(cookieHeader) {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/_fbc=([^;]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract Facebook Browser ID (fbp) from cookies
 */
function extractFbpFromCookies(cookieHeader) {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/_fbp=([^;]+)/);
  return match ? match[1] : undefined;
}