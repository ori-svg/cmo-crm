
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    
    // Webhook Verification (GET request from Meta)
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        console.log('Webhook verification request:', { mode, token, challenge });

        const base44 = createClientFromRequest(req);
        
        try {
            const settings = await base44.asServiceRole.entities.WhatsAppSettings.list();
            
            if (settings.length === 0) {
                console.error('No WhatsApp settings found');
                return new Response('No settings configured', { status: 403 });
            }

            const verifyToken = settings[0].webhook_verify_token;

            if (mode === 'subscribe' && token === verifyToken) {
                console.log('Webhook verified successfully');
                return new Response(challenge, { 
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });
            } else {
                console.error('Verification failed:', { mode, token, verifyToken });
                return new Response('Forbidden', { status: 403 });
            }
        } catch (error) {
            console.error('Error during verification:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    // Handle incoming messages (POST request from Meta)
    if (req.method === 'POST') {
        try {
            const base44 = createClientFromRequest(req);
            const body = await req.json();
            
            console.log('Webhook received:', JSON.stringify(body, null, 2));

            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.field === 'messages') {
                            const value = change.value;
                            const phone_number_id = value.metadata?.phone_number_id;
                            
                            // מצא את ה-company_id לפי phone_number_id
                            const settings = await base44.asServiceRole.entities.WhatsAppSettings.filter({
                                phone_number_id: phone_number_id
                            });
                            
                            const company_id = settings.length > 0 ? settings[0].company_id : null;
                            
                            if (value.messages && value.messages.length > 0) {
                                for (const message of value.messages) {
                                    await processIncomingMessage(base44, message, value.metadata, company_id);
                                }
                            }

                            if (value.statuses && value.statuses.length > 0) {
                                for (const status of value.statuses) {
                                    await processMessageStatus(base44, status);
                                }
                            }
                        }
                    }
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error processing webhook:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Method not allowed', { status: 405 });
});

async function processIncomingMessage(base44, message, metadata, company_id) {
    try {
        const phoneNumber = message.from;
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

        let content = '';
        let type = 'text';
        let mediaUrl = null;

        // Extract message content based on type
        if (message.type === 'text') {
            content = message.text.body;
            type = 'text';
        } else if (message.type === 'image') {
            content = message.image.caption || 'תמונה';
            type = 'image';
            mediaUrl = message.image.id; // Will need to download later
        } else if (message.type === 'video') {
            content = message.video.caption || 'וידאו';
            type = 'video';
            mediaUrl = message.video.id;
        } else if (message.type === 'document') {
            content = message.document.filename || 'מסמך';
            type = 'document';
            mediaUrl = message.document.id;
        } else if (message.type === 'audio') {
            content = 'הודעת קול';
            type = 'audio';
            mediaUrl = message.audio.id;
        }

        // חפש ליד/לקוח קשור בתוך החברה
        let matchingLead = null;
        if (company_id) {
            const leads = await base44.asServiceRole.entities.Lead.filter({
                company_id: company_id
            });
            matchingLead = leads.find(l => 
                l.phone && l.phone.replace(/\D/g, '').includes(phoneNumber.replace(/\D/g, ''))
            );
        } else {
             // Fallback to searching all leads if no company_id is provided, though this case should be rare or handled differently.
             // For consistency with previous behavior when company_id was not a factor:
             const leads = await base44.asServiceRole.entities.Lead.list();
             matchingLead = leads.find(l => 
                l.phone && l.phone.replace(/\D/g, '').includes(phoneNumber.replace(/\D/g, ''))
            );
        }


        // שמור הודעה למאגר עם company_id
        await base44.asServiceRole.entities.WhatsAppMessage.create({
            message_id: messageId,
            company_id: company_id,
            lead_id: matchingLead?.id || null,
            phone_number: phoneNumber,
            phone_number_id: metadata?.phone_number_id,
            direction: 'נכנס',
            type: type,
            content: content,
            media_url: mediaUrl,
            status: 'נמסר',
            timestamp: timestamp,
            read: false
        });

        // אם אין ליד תואם, צור ליד חדש
        if (!matchingLead && company_id) {
            const newLead = await base44.asServiceRole.entities.Lead.create({
                first_name: phoneNumber,
                last_name: '',
                phone: phoneNumber,
                email: `${phoneNumber}@whatsapp.temp`,
                source: 'WhatsApp',
                status: 'חדש',
                company_id: company_id,
                notes: `ליד נוצר אוטומטית מהודעת וואטסאפ נכנסת`
            });

            // עדכן הודעה עם lead_id החדש
            const messages = await base44.asServiceRole.entities.WhatsAppMessage.filter({
                message_id: messageId
            });
            if (messages.length > 0) {
                await base44.asServiceRole.entities.WhatsAppMessage.update(messages[0].id, {
                    lead_id: newLead.id
                });
            }
        }

        console.log('Message processed successfully:', messageId);
    } catch (error) {
        console.error('Error processing incoming message:', error);
    }
}

async function processMessageStatus(base44, status) {
    try {
        const messageId = status.id;
        const statusValue = status.status; // sent, delivered, read, failed

        let statusInHebrew = 'נשלח';
        if (statusValue === 'delivered') statusInHebrew = 'נמסר';
        else if (statusValue === 'read') statusInHebrew = 'נקרא';
        else if (statusValue === 'failed') statusInHebrew = 'נכשל';

        // Find message and update status
        const messages = await base44.asServiceRole.entities.WhatsAppMessage.filter({
            message_id: messageId
        });

        if (messages.length > 0) {
            await base44.asServiceRole.entities.WhatsAppMessage.update(messages[0].id, {
                status: statusInHebrew,
                read: statusValue === 'read'
            });

            console.log('Message status updated:', messageId, statusInHebrew);
        }
    } catch (error) {
        console.error('Error processing message status:', error);
    }
}
