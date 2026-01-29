/**
 * Helper לשליחת אירועי המרה למטא
 * משמש לדיווחים אוטומטיים (ללא אוטומציות)
 */

export const MetaConversionHelper = {
  /**
   * שליחת אירוע ליד חדש
   */
  async sendLeadEvent(lead) {
    try {
      const { base44 } = await import("@/api/base44Client");
      
      console.log('📤 Sending Lead event to Meta for:', lead.email);
      
      await base44.functions.invoke('send-meta-conversion', {
        event_name: 'Lead',
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
        company_id: lead.company_id
      });
      
      console.log('✅ Lead event sent to Meta');
    } catch (error) {
      console.error('❌ Error sending Lead event to Meta:', error);
    }
  },

  /**
   * שליחת אירוע פגישה נקבעה
   */
  async sendScheduleEvent(lead, eventData) {
    try {
      const { base44 } = await import("@/api/base44Client");
      
      console.log('📤 Sending Schedule event to Meta for:', lead.email);
      
      await base44.functions.invoke('send-meta-conversion', {
        event_name: 'Schedule',
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
        company_id: lead.company_id
      });
      
      console.log('✅ Schedule event sent to Meta');
    } catch (error) {
      console.error('❌ Error sending Schedule event to Meta:', error);
    }
  },

  /**
   * שליחת אירוע השלמת פגישה / הופיע
   */
  async sendMeetingCompletedEvent(lead) {
    try {
      const { base44 } = await import("@/api/base44Client");
      
      console.log('📤 Sending MeetingCompleted event to Meta for:', lead.email);
      
      await base44.functions.invoke('send-meta-conversion', {
        event_name: 'Contact', // או 'SubmitApplication' תלוי בהעדפה
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
        company_id: lead.company_id
      });
      
      console.log('✅ MeetingCompleted event sent to Meta');
    } catch (error) {
      console.error('❌ Error sending MeetingCompleted event to Meta:', error);
    }
  },

  /**
   * שליחת אירוע המרה (ליד הפך ללקוח)
   */
  async sendPurchaseEvent(lead, value) {
    try {
      const { base44 } = await import("@/api/base44Client");
      
      console.log('📤 Sending Purchase event to Meta for:', lead.email, 'value:', value);
      
      await base44.functions.invoke('send-meta-conversion', {
        event_name: 'Purchase',
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
        currency: 'ILS',
        company_id: lead.company_id
      });
      
      console.log('✅ Purchase event sent to Meta');
    } catch (error) {
      console.error('❌ Error sending Purchase event to Meta:', error);
    }
  }
};