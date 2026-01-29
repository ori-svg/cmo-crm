import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Search, Phone, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateTime, formatTime } from "../components/utils/dateUtils";

const SUPER_ADMIN_EMAIL = "ori@omerdaffan.com";

export default function WhatsAppConversationsPage({ currentCompanyId, currentUser: propsUser }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(propsUser);
  const [whatsappSettings, setWhatsappSettings] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!propsUser) {
      loadUser();
    }
  }, [propsUser]);

  useEffect(() => {
    if (currentUser && currentCompanyId) {
      loadWhatsAppSettings();
    }
  }, [currentUser, currentCompanyId]);

  useEffect(() => {
    if (whatsappSettings && currentCompanyId) {
      loadConversations();
      
      const interval = setInterval(() => {
        loadConversations(true);
        if (selectedConversation) {
          loadMessages(selectedConversation.phone_number, true);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [whatsappSettings, currentCompanyId, selectedConversation]);

  useEffect(() => {
    if (selectedConversation && whatsappSettings && currentCompanyId) {
      loadMessages(selectedConversation.phone_number);
    }
  }, [selectedConversation, whatsappSettings, currentCompanyId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadUser = async () => {
    const { base44 } = await import("@/api/base44Client");
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadWhatsAppSettings = async () => {
    if (!currentUser || !currentCompanyId) return;

    try {
      const { base44 } = await import("@/api/base44Client");
      const settings = await base44.entities.WhatsAppSettings.filter({ 
        company_id: currentCompanyId 
      });
      
      if (settings.length > 0) {
        setWhatsappSettings(settings[0]);
        console.log('✅ WhatsApp settings loaded for company:', currentCompanyId);
      } else {
        setWhatsappSettings(null);
        console.log('⚠️ No WhatsApp settings found for company:', currentCompanyId);
      }
    } catch (error) {
      console.error("Error loading WhatsApp settings:", error);
      setWhatsappSettings(null);
    }
  };

  const loadConversations = async (silent = false) => {
    if (!currentUser || !whatsappSettings || !currentCompanyId) { 
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    
    try {
      const { base44 } = await import("@/api/base44Client");
      
      const allMessages = await base44.entities.WhatsAppMessage.filter({ 
        company_id: currentCompanyId 
      }, "-timestamp");
      
      console.log('📩 Loaded messages for company:', currentCompanyId, allMessages.length);
      
      // Debug: בדוק אם יש הודעות בכלל במערכת
      const allMessagesInSystem = await base44.entities.WhatsAppMessage.list();
      console.log('🔍 Total messages in system:', allMessagesInSystem.length);
      if (allMessagesInSystem.length > 0) {
        console.log('🔍 Sample message company_id:', allMessagesInSystem[0].company_id);
        console.log('🔍 Current company_id:', currentCompanyId);
        console.log('🔍 Match?', allMessagesInSystem[0].company_id === currentCompanyId);
        
        // הצג את כל ה-company_ids השונים
        const uniqueCompanyIds = [...new Set(allMessagesInSystem.map(m => m.company_id))];
        console.log('🔍 Unique company_ids in messages:', uniqueCompanyIds);
      }
      
      const conversationsMap = {};
      
      allMessages.forEach(msg => {
        if (!conversationsMap[msg.phone_number]) {
          conversationsMap[msg.phone_number] = {
            phone_number: msg.phone_number,
            lead_id: msg.lead_id,
            client_id: msg.client_id,
            last_message: msg.template_name ? `📋 תבנית: ${msg.template_name}` : msg.content,
            last_message_time: msg.timestamp,
            unread_count: msg.direction === 'נכנס' && !msg.read ? 1 : 0,
            contact_name: null
          };
        } else {
          if (new Date(msg.timestamp) > new Date(conversationsMap[msg.phone_number].last_message_time)) {
            conversationsMap[msg.phone_number].last_message = msg.template_name ? `📋 תבנית: ${msg.template_name}` : msg.content;
            conversationsMap[msg.phone_number].last_message_time = msg.timestamp;
          }
          
          if (msg.direction === 'נכנס' && !msg.read) {
            conversationsMap[msg.phone_number].unread_count++;
          }
        }
      });

      const leads = await base44.entities.Lead.filter({ company_id: currentCompanyId });
      const clients = await base44.entities.Client.filter({ company_id: currentCompanyId });

      const conversationsList = Object.values(conversationsMap);
      
      conversationsList.forEach(conv => {
        if (conv.lead_id) {
          const lead = leads.find(l => l.id === conv.lead_id);
          if (lead) {
            conv.contact_name = `${lead.first_name} ${lead.last_name}`;
          }
        } else if (conv.client_id) {
          const client = clients.find(c => c.id === conv.client_id);
          if (client) {
            conv.contact_name = client.name;
          }
        }
        
        if (!conv.contact_name) {
          conv.contact_name = conv.phone_number;
        }
      });

      setConversations(conversationsList.sort((a, b) => 
        new Date(b.last_message_time) - new Date(a.last_message_time)
      ));
      
      console.log('✅ Conversations loaded:', conversationsList.length);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
    if (!silent) setIsLoading(false);
  };

  const loadMessages = async (phoneNumber, silent = false) => {
    if (!currentUser || !whatsappSettings || !currentCompanyId) return;

    try {
      const { base44 } = await import("@/api/base44Client");
      
      const msgs = await base44.entities.WhatsAppMessage.filter({ 
        phone_number: phoneNumber,
        company_id: currentCompanyId
      });
      
      console.log('💬 Loaded messages for', phoneNumber, ':', msgs.length);
      
      setMessages(msgs.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      ));

      if (!silent) {
        const unreadMessages = msgs.filter(m => m.direction === 'נכנס' && !m.read);
        if (unreadMessages.length > 0) {
          for (const msg of unreadMessages) {
            await base44.entities.WhatsAppMessage.update(msg.id, { read: true });
          }
          await loadConversations(true);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser || !whatsappSettings || !currentCompanyId) return;

    setIsSending(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      
      const response = await base44.functions.invoke('send-whatsapp-message', {
        phone_number: selectedConversation.phone_number,
        message: newMessage.trim(),
        phone_number_id: whatsappSettings.phone_number_id,
        company_id: currentCompanyId
      });

      if (response.data.success) {
        setNewMessage("");
        
        const newMsg = {
          id: `temp_${Date.now()}`,
          phone_number: selectedConversation.phone_number,
          phone_number_id: whatsappSettings.phone_number_id,
          company_id: currentCompanyId,
          direction: 'יוצא',
          type: 'text',
          content: newMessage.trim(),
          status: 'נשלח',
          timestamp: new Date().toISOString(),
          read: false
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        setTimeout(() => {
          loadMessages(selectedConversation.phone_number, true);
          loadConversations(true);
        }, 1000);
      } else {
        alert(`שגיאה בשליחה: ${response.data.error}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("שגיאה בשליחת ההודעה");
    }
    setIsSending(false);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    if (selectedConversation) {
      await loadMessages(selectedConversation.phone_number);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone_number.includes(searchQuery)
  );

  if (!currentUser || !currentCompanyId) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8">
        <p className="text-lg text-gray-500">טוען...</p>
      </div>
    );
  }

  if (!whatsappSettings) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8">
        <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">WhatsApp לא מחובר</h2>
        <p className="text-gray-500 mb-4 text-center">אנא התחבר ל-WhatsApp בעמוד ההגדרות כדי להתחיל לשלוח ולקבל הודעות.</p>
        <Button onClick={() => window.location.href = '/settings'}>
          עבור להגדרות
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-green-600" />
            אינבוקס WhatsApp
          </h1>
          <p className="text-gray-500 mt-1 text-sm flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            שיחות דו-כיווניות - קבל ושלח הודעות
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </motion.div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversations List */}
        <Card className="w-96 flex flex-col border-2 border-gray-200 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-gray-900">שיחות ({conversations.length})</span>
            </CardTitle>
            <div className="relative mt-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש שיחות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 border-gray-300"
                disabled={isLoading}
              />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">טוען...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                אין שיחות
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conv) => (
                  <motion.div
                    key={conv.phone_number}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      selectedConversation?.phone_number === conv.phone_number 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-r-4 border-green-600' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="mt-1 ring-2 ring-green-200">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold">
                          {conv.contact_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-gray-900 truncate text-base">
                            {conv.contact_name}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-green-600 text-white font-bold shadow-lg">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {conv.phone_number}
                        </p>
                        <p className="text-sm text-gray-700 truncate font-medium">
                          {conv.last_message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(conv.last_message_time)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col border-2 border-gray-200 shadow-xl">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 shadow-md">
                <div className="flex items-center gap-3">
                  <Avatar className="ring-4 ring-green-200">
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold text-lg">
                      {selectedConversation.contact_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {selectedConversation.contact_name}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedConversation.phone_number}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <AnimatePresence>
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          duration: 0.3,
                          delay: index * 0.05
                        }}
                        className={`flex ${msg.direction === 'יוצא' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-lg ${
                            msg.direction === 'יוצא'
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 border-2 border-gray-200 rounded-bl-sm'
                          }`}
                        >
                          {msg.template_name && (
                            <div className={`text-xs mb-2 flex items-center gap-1 pb-2 border-b ${
                              msg.direction === 'יוצא' ? 'text-green-100 border-green-400' : 'text-gray-500 border-gray-200'
                            }`}>
                              <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
                              <strong>תבנית:</strong> {msg.template_name}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-right" dir="rtl">
                            {msg.content}
                          </p>
                          <div className={`flex items-center justify-end gap-2 mt-2 pt-1 border-t ${
                            msg.direction === 'יוצא' ? 'text-green-100 border-green-400' : 'text-gray-500 border-gray-200'
                          }`}>
                            <p className="text-xs font-medium">
                              {formatTime(msg.timestamp)}
                            </p>
                            {msg.direction === 'יוצא' && (
                              <span className="text-sm">
                                {msg.status === 'נקרא' ? '✓✓' : msg.status === 'נמסר' ? '✓' : '⏱'}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </AnimatePresence>
              </ScrollArea>

              <div className="border-t-2 p-4 bg-white shadow-inner">
                <div className="flex gap-3">
                  <Input
                    placeholder="הקלד הודעה..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    disabled={isSending || !selectedConversation}
                    className="flex-1 border-2 border-gray-300 focus:border-green-500 text-base"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim() || !selectedConversation}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 shadow-lg"
                  >
                    <Send className="w-5 h-5 ml-2" />
                    <span className="font-bold">שלח</span>
                  </Button>
                </div>
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="text-lg">⚠️</span>
                  <span>הודעות חופשיות ניתנות רק תוך 24 שעות מהודעה אחרונה של הלקוח</span>
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center">
                <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-bold text-gray-700">בחר שיחה להתחלה</p>
                <p className="text-sm mt-2 text-gray-500">בחר שיחה מהרשימה מצד שמאל</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}