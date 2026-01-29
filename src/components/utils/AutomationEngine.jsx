import { Automation } from "@/api/entities";
import { Lead } from "@/api/entities";
import { Client } from "@/api/entities";
import { CalendarEvent } from "@/api/entities";
import { MetaSettings } from "@/api/entities";

export const AutomationEngine = {
  async runAutomations(triggerType, eventData) {
    try {
      const allAutomations = await Automation.list();
      const activeAutomations = allAutomations.filter(
        a => a.is_active && a.trigger_type === triggerType
      );

      for (const automation of activeAutomations) {
        if (automation.trigger_condition) {
          if (!AutomationEngine.checkCondition(automation.trigger_condition, eventData)) {
            continue;
          }
        }

        const actionResult = await AutomationEngine.executeAction(automation, eventData);

        if (actionResult && actionResult.needsUserInput) {
          return actionResult;
        }

        await Automation.update(automation.id, {
          last_run: new Date().toISOString(),
          run_count: (automation.run_count || 0) + 1
        });
      }
    } catch (error) {
      console.error("Error running automations:", error);
    }
  },

  checkCondition(condition, eventData) {
    if (eventData.newStatus) {
      return eventData.newStatus === condition;
    }
    return true;
  },

  async executeAction(automation, eventData) {
    const { action_type, action_config } = automation;

    console.log(`Executing action: ${action_type}`);

    switch (action_type) {
      case "העברה ללקוחות":
        if (eventData.lead) {
          return await AutomationEngine.convertLeadToClient(eventData.lead, action_config);
        }
        break;

      case "שליחת אימייל":
        return await AutomationEngine.sendEmail(action_config, eventData);

      case "Webhook":
        return await AutomationEngine.sendWebhook(action_config, eventData);

      case "יצירת משימה":
        return await AutomationEngine.createTask(action_config, eventData);

      case "שינוי סטטוס":
        if (eventData.leadId) {
          return await AutomationEngine.changeLeadStatus(eventData.leadId, action_config);
        }
        break;

      case "הוספת הערה":
        if (eventData.leadId) {
          return await AutomationEngine.addNoteToLead(eventData.leadId, action_config);
        }
        break;

      case "שליחה ל-Meta API":
        return await AutomationEngine.sendToMetaAPI(action_config, eventData);

      case "שליחת אירוע המרה למטא":
        return await AutomationEngine.sendMetaConversionEvent(action_config, eventData);

      case "רענון נתוני Meta":
        return await AutomationEngine.refreshMetaData(action_config);

      default:
        console.log(`Action type ${action_type} not implemented yet`);
    }
  },

  async convertLeadToClient(lead, actionConfig) {
    try {
      if (!lead) return;

      return {
        needsUserInput: true,
        lead: lead
      };
    } catch (error) {
      console.error("Error moving to clients:", error);
    }
  },

  async completeClientConversion(lead, revenueAmount, revenueType, monthlyRecurring = null) {
    try {
      const paymentDate = new Date().toISOString().split('T')[0];

      // העבר את כל הנתונים מהליד ללקוח
      const clientData = {
        name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
        email: lead.email,
        phone: lead.phone,
        company_id: lead.company_id,
        origin_lead_id: lead.id,
        status: "פעיל",
        revenue_type: revenueType,
        payment_date: paymentDate,
        // העתק את כל השדות מהליד
        source: lead.source || null,
        fb_campaign: lead.fb_campaign || null,
        birthday: lead.birthday || null,
        gender: lead.gender || null,
        tags: lead.tags || [],
        proposals: lead.proposals || [],
        form_responses: lead.form_responses || null,
        campaign_history: lead.campaign_history || [],
        notes: lead.notes || "",
        files: lead.files || []
      };

      if (revenueType === "הקמה + מתמשך") {
        clientData.setup_fee = revenueAmount;
        clientData.monthly_recurring = monthlyRecurring;
        clientData.revenue_amount = monthlyRecurring;
        clientData.revenue_total = revenueAmount + monthlyRecurring;
      } else {
        clientData.revenue_amount = revenueAmount;
        clientData.revenue_total = revenueAmount;
      }

      await Client.create(clientData);
      await Lead.delete(lead.id);
      return true;
    } catch (error) {
      console.error("Error completing client conversion:", error);
      return false;
    }
  },

  async sendEmail(config, eventData) {
    try {
      const { SendEmail } = await import("@/api/integrations");

      const lead = eventData.lead;
      if (!lead || !lead.email) return;

      await SendEmail({
        to: lead.email,
        subject: config.subject || "הודעה אוטומטית",
        body: AutomationEngine.replacePlaceholders(config.body || "שלום!", lead)
      });
    } catch (error) {
      console.error("Error sending email:", error);
    }
  },

  async sendWebhook(config, eventData) {
    try {
      if (!config.webhook_url) return;

      let body = config.webhook_body || "{}";
      body = AutomationEngine.replacePlaceholders(body, eventData.lead || eventData);

      await fetch(config.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: body
      });
    } catch (error) {
      console.error("Error sending webhook:", error);
    }
  },

  async createTask(config, eventData) {
    try {
      const lead = eventData.lead;
      if (!lead) return;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      await CalendarEvent.create({
        title: `פולואפ: ${lead.first_name} ${lead.last_name}`,
        description: config.description || "משימת מעקב אוטומטית",
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 3600000).toISOString(),
        related_lead_id: lead.id,
        status: "מתוכנן"
      });
    } catch (error) {
      console.error("Error creating task:", error);
    }
  },

  async changeLeadStatus(leadId, config) {
    try {
      if (leadId && config.new_status) {
        await Lead.update(leadId, {
          status: config.new_status
        });
      }
    } catch (error) {
      console.error("Error changing status:", error);
    }
  },

  async addNoteToLead(leadId, config) {
    try {
      if (leadId) {
        const leads = await Lead.list();
        const lead = leads.find(l => l.id === leadId);

        if (lead) {
          const currentNotes = lead.notes || "";
          const newNote = `\n[${new Date().toLocaleString('he-IL')}] ${config.note || "הערה אוטומטית"}`;

          await Lead.update(leadId, {
            notes: currentNotes + newNote
          });
        }
      }
    } catch (error) {
      console.error("Error adding note:", error);
    }
  },

  async sendToMetaAPI(config, eventData) {
    try {
      const settings = await MetaSettings.list();
      if (settings.length === 0 || !settings[0].access_token || !settings[0].pixel_id) {
        console.log("Meta API not configured");
        return;
      }

      const metaSettings = settings[0];
      const lead = eventData.lead;
      if (!lead) return;

      await fetch(
        `https://graph.facebook.com/v21.0/${metaSettings.pixel_id}/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data: [{
              event_name: "Lead",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "website",
              user_data: {
                em: lead.email ? AutomationEngine.hashEmail(lead.email) : undefined,
                ph: lead.phone ? AutomationEngine.hashPhone(lead.phone) : undefined
              }
            }],
            access_token: metaSettings.access_token
          })
        }
      );
    } catch (error) {
      console.error("Error sending to Meta API:", error);
    }
  },

  async sendMetaConversionEvent(config, eventData) {
    try {
      console.log('🎯 Sending Meta Conversion Event...');

      const lead = eventData.lead || eventData.leadData;
      if (!lead) {
        console.error('No lead data available for Meta conversion event');
        return false;
      }

      const { base44 } = await import("@/api/base44Client");

      const eventName = config.event_name || 'Lead';
      const value = config.value || eventData.value;

      console.log(`📤 Sending "${eventName}" event to Meta for lead:`, lead.email);

      const response = await base44.functions.invoke('send-meta-conversion', {
        event_name: eventName,
        lead_data: {
          id: lead.id,
          email: lead.email,
          phone: lead.phone,
          first_name: lead.first_name,
          last_name: lead.last_name,
          gender: lead.gender,
          birthday: lead.birthday,
          fb_campaign: lead.fb_campaign,
          source: lead.source
        },
        value: value,
        currency: config.currency || 'ILS',
        company_id: lead.company_id
      });

      if (response.data && response.data.success) {
        console.log('✅ Meta Conversion Event sent successfully:', response.data);
        return true;
      } else {
        console.error('❌ Failed to send Meta conversion event:', response.data);
        return false;
      }

    } catch (error) {
      console.error('Error sending Meta conversion event:', error);
      return false;
    }
  },

  async refreshMetaData(config) {
    console.log("Refreshing Meta data...");
  },

  replacePlaceholders(text, data) {
    if (!text || !data) return text;

    return text.replace(/\{\{(\w+\.\w+)\}\}/g, (match, path) => {
      const parts = path.split('.');
      let value = data;
      for (const part of parts) {
        value = value?.[part];
      }
      return value || match;
    });
  },

  hashEmail(email) {
    return email.toLowerCase().trim();
  },

  hashPhone(phone) {
    return phone.replace(/[^0-9]/g, '');
  }
};