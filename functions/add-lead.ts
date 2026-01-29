import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// נורמליזציה של מספר טלפון
function normalizePhone(phone) {
    if (!phone) return null;
    
    // הסר כל תו שאינו ספרה
    const cleaned = phone.replace(/[^0-9]/g, '');
    
    // אם מתחיל ב-05, החלף ל-9725
    if (cleaned.startsWith('05')) {
        return '972' + cleaned.substring(1);
    }
    
    // אם מתחיל ב-9725, השאר כמו שזה
    if (cleaned.startsWith('9725')) {
        return cleaned;
    }
    
    return cleaned;
}

// נורמליזציה של אימייל
function normalizeEmail(email) {
    if (!email) return null;
    return email.toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    // Extract API key from headers or query parameter
    let apiKey = req.headers.get('X-API-Key');
    
    // If not in header, check query parameter
    if (!apiKey) {
      const url = new URL(req.url);
      apiKey = url.searchParams.get('api_key');
    }
    
    if (!apiKey) {
      return Response.json(
        { status: 'error', message: 'API Key חסר - יש לשלוח בהידר X-API-Key או ב-query parameter api_key' },
        { status: 401 }
      );
    }

    // Initialize Base44 client
    const base44 = createClientFromRequest(req);

    // Verify API key and get company_id
    const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({
      key: apiKey,
      is_active: true
    });

    if (apiKeys.length === 0) {
      return Response.json(
        { status: 'error', message: 'API Key לא תקין או לא פעיל' },
        { status: 401 }
      );
    }

    const apiKeyRecord = apiKeys[0];
    const company_id = apiKeyRecord.company_id;

    if (!company_id) {
      return Response.json(
        { status: 'error', message: 'API Key לא משויך לחברה' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Support both drip_campaign_id and message_sequence_id (backward compatibility)
    const drip_campaign_id = body.drip_campaign_id || body.message_sequence_id;

    // Normalize input data
    const first_name = body.first_name?.trim();
    const last_name = body.last_name?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const phone = body.phone?.replace(/\s+/g, '').trim();
    const source = body.source?.trim() || 'Other';
    const campaign = body.campaign?.trim() || '';
    const form_responses_text = body.form_responses_text?.trim() || '';
    const proposal = body.proposal?.trim() || '';
    const tag = body.tag?.trim() || '';
    const wa_template = body.wa_template?.trim() || '';

    // Validate required fields
    if (!first_name || !phone) {
      return Response.json(
        { status: 'error', message: 'שדות חובה חסרים: first_name, phone' },
        { status: 400 }
      );
    }

    // Validate drip_campaign_id if provided
    if (drip_campaign_id) {
      const campaigns = await base44.asServiceRole.entities.WhatsAppDripCampaign.filter({
        id: drip_campaign_id,
        company_id: company_id
      });

      if (campaigns.length === 0) {
        return Response.json(
          { 
            status: 'error', 
            message: `Invalid drip_campaign_id: ${drip_campaign_id}` 
          },
          { status: 400 }
        );
      }

      const campaign_obj = campaigns[0];
      if (!campaign_obj.is_active) {
        return Response.json(
          { 
            status: 'error', 
            message: `סדרת מסרים ${drip_campaign_id} לא פעילה` 
          },
          { status: 400 }
        );
      }
    }

    // Prepare tags and proposals arrays
    const tags = tag ? [tag] : [];
    const proposals = proposal ? [proposal] : [];

    // Create lead data
    const leadData = {
      first_name,
      last_name,
      email,
      phone,
      company_id,
      source,
      status: 'חדש',
      tags,
      proposals,
      fb_campaign: campaign,
      form_responses: form_responses_text,
      drip_campaign_id: drip_campaign_id || null
    };

    // חפש לידים כפולים
    const normalizedPhone = normalizePhone(leadData.phone);
    const normalizedEmail = normalizeEmail(leadData.email);

    console.log('🔍 Checking for duplicates:', { normalizedPhone, normalizedEmail });

    let existingLead = null;

    // חפש לידים עם טלפון או מייל זהים
    const allLeads = await base44.asServiceRole.entities.Lead.filter({ 
        company_id: leadData.company_id 
    });

    for (const lead of allLeads) {
        const leadNormalizedPhone = normalizePhone(lead.phone);
        const leadNormalizedEmail = normalizeEmail(lead.email);

        // התאמה לפי טלפון (חובה) או מייל (אם קיים)
        const phoneMatch = normalizedPhone && leadNormalizedPhone === normalizedPhone;
        const emailMatch = normalizedEmail && leadNormalizedEmail && leadNormalizedEmail === normalizedEmail;

        if (phoneMatch || emailMatch) {
            existingLead = lead;
            console.log('✅ Found duplicate lead:', lead.id);
            break;
        }
    }

    let newLead;

    if (existingLead) {
        // עדכן את הליד הקיים
        console.log('🔄 Updating existing lead:', existingLead.id);

        // שמור את ההיסטוריה הישנה
        const oldCampaignHistory = existingLead.campaign_history || [];

        // הוסף רשומה חדשה להיסטוריה
        const newHistoryEntry = {
            campaign: leadData.fb_campaign || 'Unknown',
            source: leadData.source || 'Unknown',
            date: new Date().toISOString(),
            form_responses: leadData.form_responses || '',
            notes: 'ליד כפול - עודכן אוטומטית'
        };

        // מיזוג נתונים - שמירת כל המידע הקיים + עדכון עם נתונים חדשים
        const mergedTags = Array.from(new Set([
            ...(existingLead.tags || []),
            ...(leadData.tags || []),
            'ליד חוזר'
        ]));
        
        const mergedProposals = Array.from(new Set([
            ...(existingLead.proposals || []),
            ...(leadData.proposals || [])
        ]));

        const updatedData = {
            ...existingLead,  // התחל עם כל הנתונים הקיימים
            ...leadData,      // עדכן עם נתונים חדשים
            tags: mergedTags,
            proposals: mergedProposals,
            campaign_history: [...oldCampaignHistory, newHistoryEntry],
            // שמור drip_campaign_id קיים אם אין חדש
            drip_campaign_id: leadData.drip_campaign_id || existingLead.drip_campaign_id || null
        };

        newLead = await base44.asServiceRole.entities.Lead.update(existingLead.id, updatedData);
        console.log('✅ Duplicate lead updated with merged data and "ליד חוזר" tag');
    } else {
        // צור ליד חדש
        console.log('➕ Creating new lead');
        newLead = await base44.asServiceRole.entities.Lead.create(leadData);
    }

    // If drip_campaign_id is provided, subscribe the lead to the campaign
    if (drip_campaign_id) {
      // בדוק אם כבר קיים מנוי לקמפיין זה
      const existingSubscription = await base44.asServiceRole.entities.LeadDripSubscription.filter({
        lead_id: newLead.id,
        campaign_id: drip_campaign_id
      });

      if (existingSubscription.length === 0) {
        await base44.asServiceRole.entities.LeadDripSubscription.create({
          lead_id: newLead.id,
          campaign_id: drip_campaign_id,
          company_id: company_id,
          subscribed_date: new Date().toISOString(),
          last_message_sent: -1,
          is_active: true,
          completed: false
        });
        console.log('✅ Lead subscribed to drip campaign');
      } else {
        console.log('ℹ️ Lead already subscribed to this drip campaign');
      }
    }

    // Send WhatsApp template if provided
    if (wa_template && phone) {
      try {
        // Get WhatsApp settings for the company or parent company
        let whatsappSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
          company_id: company_id
        });

        // אם אין - בדוק חברת אם
        if (whatsappSettings.length === 0) {
          const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
          
          if (companies.length > 0 && companies[0].parent_company_id) {
            console.log('🔍 Checking parent company WhatsApp for lead creation');
            whatsappSettings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
              company_id: companies[0].parent_company_id
            });
            
            if (whatsappSettings.length > 0) {
              console.log('✅ Using parent company WhatsApp for lead creation');
            }
          }
        }

        if (whatsappSettings.length > 0 && whatsappSettings[0].phone_number_id && whatsappSettings[0].access_token) {
          const settings = whatsappSettings[0];
          
          // Normalize phone number
          const normalizedPhone = phone.replace(/\s+/g, '').replace(/^0/, '972').replace(/\-/g, '');
          
          console.log(`📱 Sending WhatsApp template "${wa_template}" to ${normalizedPhone}`);
          
          // Send template message via WhatsApp API
          const waResponse = await fetch(
            `https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${settings.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'template',
                template: {
                  name: wa_template,
                  language: { code: 'he' }
                }
              })
            }
          );

          const waData = await waResponse.json();
          
          if (waResponse.ok) {
            console.log('✅ WhatsApp message sent successfully:', waData);
            
            // Save message to database
            await base44.asServiceRole.entities.WhatsAppMessage.create({
              message_id: waData.messages?.[0]?.id || `temp_${Date.now()}`,
              company_id: company_id,
              lead_id: newLead.id,
              phone_number: normalizedPhone,
              phone_number_id: settings.phone_number_id,
              direction: 'יוצא',
              type: 'template',
              content: `Template: ${wa_template}`,
              template_name: wa_template,
              status: 'נשלח',
              timestamp: new Date().toISOString(),
              read: false
            });
          } else {
            console.error('❌ WhatsApp API error:', waData);
          }
        } else {
          console.log('⚠️ WhatsApp not configured for company');
        }
      } catch (waError) {
        console.error('❌ Error sending WhatsApp template:', waError);
        // Don't fail the entire request if WhatsApp sending fails
      }
    }

    // Update API key usage
    await base44.asServiceRole.entities.ApiKey.update(apiKeyRecord.id, {
      last_used: new Date().toISOString(),
      usage_count: (apiKeyRecord.usage_count || 0) + 1
    });

    // Return success response in Make format
    return Response.json({
      status: 'success',
      message: 'Lead created successfully',
      data: {
        id: newLead.id,
        first_name: newLead.first_name,
        last_name: newLead.last_name,
        email: newLead.email,
        phone: newLead.phone,
        source: newLead.source,
        campaign: campaign,
        form_responses_text: form_responses_text,
        proposal: proposal,
        tag: tag,
        wa_template: wa_template,
        drip_campaign_id: drip_campaign_id || ''
      }
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return Response.json(
      { 
        status: 'error', 
        message: 'שגיאה פנימית בשרת',
        details: error.message 
      },
      { status: 500 }
    );
  }
});