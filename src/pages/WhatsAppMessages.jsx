import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Search, ArrowRight, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WhatsAppMessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.phone_number);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const { WhatsAppMessage } = await import("@/api/entities");
      const allMessages = await WhatsAppMessage.list("-timestamp");
      
      const conversationsMap = {};
      
      allMessages.forEach(msg => {
        if (!conversationsMap[msg.phone_number]) {
          conversationsMap[msg.phone_number] = {
            phone_number: msg.phone_number,
            lead_id: msg.lead_id,
            client_id: msg.client_id,
            last_message: msg.content,
            last_message_time: msg.timestamp,
            unread_count: msg.direction === 'נכנס' && !msg.read ? 1 : 0,
            contact_name: null
          };
        } else {
          if (msg.direction === 'נכנס' && !msg.read) {
            conversationsMap[msg.phone_number].unread_count++;
          }
        }
      });

      const { Lead } = await import("@/api/entities");
      const { Client } = await import("@/api/entities");
      const leads = await Lead.list();
      const clients = await Client.list();

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
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
    setIsLoading(false);
  };

  const loadMessages = async (phoneNumber) => {
    try {
      const { WhatsAppMessage } = await import("@/api/entities");
      const msgs = await WhatsAppMessage.filter({ phone_number: phoneNumber });
      
      setMessages(msgs.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      ));

      const unreadMessages = msgs.filter(m => m.direction === 'נכנס' && !m.read);
      if (unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
          await WhatsAppMessage.update(msg.id, { read: true });
        }
        await loadConversations();
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      
      const response = await base44.functions.invoke('send-whatsapp-message', {
        phone_number: selectedConversation.phone_number,
        message: newMessage.trim()
      });

      if (response.data.success) {
        setNewMessage("");
        await loadMessages(selectedConversation.phone_number);
        await loadConversations();
      } else {
        alert(`שגיאה בשליחה: ${response.data.error}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("שגיאה בשליחת ההודעה");
    }
    setIsSending(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone_number.includes(searchQuery)
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("WhatsAppMarketing"))}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          חזור
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
            הודעות WhatsApp
          </h1>
          <p className="text-gray-500 mt-1 text-sm">נהל שיחות עם לקוחות</p>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-4 min-h-0">
        <Card className="w-96 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              שיחות ({conversations.length})
            </CardTitle>
            <div className="relative mt-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש שיחות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
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
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.phone_number}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.phone_number === conv.phone_number ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="mt-1">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {conv.contact_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {conv.contact_name}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-green-600 text-white">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {conv.phone_number}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {conv.last_message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(conv.last_message_time), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {selectedConversation.contact_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedConversation.contact_name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedConversation.phone_number}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'יוצא' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === 'יוצא'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.direction === 'יוצא' ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          {format(new Date(msg.timestamp), 'HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="הקלד הודעה..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 ml-1" />
                    שלח
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ הודעות חופשיות ניתנות רק תוך 24 שעות מהודעה אחרונה של הלקוח
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold">בחר שיחה להתחלה</p>
                <p className="text-sm mt-2">בחר שיחה מהרשימה מצד שמאל</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}