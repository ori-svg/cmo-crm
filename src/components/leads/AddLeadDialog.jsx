import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Tag } from "lucide-react";

export default function AddLeadDialog({ open, onClose, onSave, currentCompanyId }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birthday: "",
    gender: "",
    source: "Other",
    status: "חדש",
    fb_campaign: "",
    proposals: [],
    tags: [],
    form_responses: "",
    notes: ""
  });

  const [proposals, setProposals] = useState([
    "חבילה בסיסית",
    "חבילה מתקדמת",
    "חבילה פרימיום",
    "הצעה מותאמת אישית"
  ]);

  const [availableTags, setAvailableTags] = useState([
    "דחוף",
    "VIP",
    "עדיפות גבוהה",
    "לתזכורת",
    "לא מעוניין כרגע"
  ]);

  const [availableSources, setAvailableSources] = useState([]); // ✅ NEW

  const [newProposal, setNewProposal] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    // טען הצעות לפי חברה
    const proposalsKey = currentCompanyId ? `lead_proposals_${currentCompanyId}` : "lead_proposals";
    const savedProposals = localStorage.getItem(proposalsKey);
    if (savedProposals) {
      try {
        setProposals(JSON.parse(savedProposals));
      } catch (e) {
        setProposals(["חבילה בסיסית", "חבילה מתקדמת", "חבילה פרימיום", "הצעה מותאמת אישית"]);
      }
    }

    // טען טאגים לפי חברה
    const tagsKey = currentCompanyId ? `lead_tags_${currentCompanyId}` : "lead_tags";
    const savedTags = localStorage.getItem(tagsKey);
    if (savedTags) {
      try {
        setAvailableTags(JSON.parse(savedTags));
      } catch (e) {
        setAvailableTags(["דחוף", "VIP", "עדיפות גבוהה", "לתזכורת", "לא מעוניין כרגע"]);
      }
    }

    // טען מקורות לפי חברה
    const sourcesKey = currentCompanyId ? `lead_sources_${currentCompanyId}` : "lead_sources";
    const savedSources = localStorage.getItem(sourcesKey);
    if (savedSources) {
      try {
        setAvailableSources(JSON.parse(savedSources));
      } catch (e) {
        setAvailableSources(["פייסבוק", "גוגל", "אתר", "Organic", "Referral", "Other"]);
      }
    } else {
      setAvailableSources(["פייסבוק", "גוגל", "אתר", "Organic", "Referral", "Other"]);
    }
  }, [open, currentCompanyId]);

  const handleAddProposal = () => {
    if (newProposal.trim() && !formData.proposals.includes(newProposal.trim())) {
      setFormData({
        ...formData,
        proposals: [...formData.proposals, newProposal.trim()]
      });
      setNewProposal("");
    }
  };

  const handleRemoveProposal = (proposalToRemove) => {
    setFormData({
      ...formData,
      proposals: formData.proposals.filter(p => p !== proposalToRemove)
    });
  };

  const handleQuickAddProposal = (proposal) => {
    if (!formData.proposals.includes(proposal)) {
      setFormData({
        ...formData,
        proposals: [...formData.proposals, proposal]
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const handleQuickAddTag = (tag) => {
    if (!formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    
    // יצירת ליד חדש ב-Lead Center של מטא (אוטומטית)
    try {
      const { base44 } = await import("@/api/base44Client");
      const response = await base44.functions.invoke('create-meta-lead', {
        leadData: formData
      });
      
      if (response.data.success) {
        console.log('✅ Lead created in Meta Lead Center:', response.data.meta_lead_id);
      } else {
        console.warn('⚠️ Could not create lead in Meta:', response.data.error);
      }
    } catch (error) {
      console.error('Error creating lead in Meta:', error);
    }
    
    // הרצת אוטומציות
    const { AutomationEngine } = await import("../utils/AutomationEngine");
    await AutomationEngine.runAutomations("יצירת ליד", {
      lead: formData
    });
    
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      birthday: "",
      gender: "",
      source: "Other",
      status: "חדש",
      fb_campaign: "",
      proposals: [],
      tags: [],
      form_responses: "",
      notes: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-900">
            הוספת ליד חדש
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* שם */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">שם פרטי *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                required
                placeholder="הזן שם פרטי"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">שם משפחה</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                placeholder="הזן שם משפחה"
              />
            </div>
          </div>

          {/* אימייל וטלפון */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="example@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
                placeholder="050-1234567"
              />
            </div>
          </div>

          {/* יום הולדת ומין */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">יום הולדת</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({...formData, birthday: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">מין</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({...formData, gender: value})}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue placeholder="בחר..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="זכר">זכר</SelectItem>
                  <SelectItem value="נקבה">נקבה</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                  <SelectItem value="לא מעוניין לציין">לא מעוניין לציין</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">מקור</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({...formData, source: value})}
              >
                <SelectTrigger className="brand-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* ✅ NEW: מקורות דינמיים */}
                  {availableSources.map((source, idx) => (
                    <SelectItem key={idx} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fb_campaign">קמפיין</Label>
              <Input
                id="fb_campaign"
                value={formData.fb_campaign}
                onChange={(e) => setFormData({...formData, fb_campaign: e.target.value})}
                placeholder="שם הקמפיין"
              />
            </div>
          </div>

          {/* טאגים */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              טאגים
            </Label>
            
            {/* טאגים נבחרים */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
                  >
                    <Tag className="w-3 h-3" />
                    <span className="font-semibold text-sm">{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-white/20 rounded-full p-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* טאגים מהירים */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">הוספה מהירה:</p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAddTag(tag)}
                    disabled={formData.tags.includes(tag)}
                    className="border-purple-300 hover:bg-purple-50"
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* הוספת טאג חדש */}
            <div className="flex gap-2">
              <Input
                placeholder="טאג מותאם אישית..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                className="whitespace-nowrap"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>הצעות שנשלחו</Label>
            
            {/* הצעות נבחרות */}
            {formData.proposals.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.proposals.map((proposal, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm"
                  >
                    <span className="font-semibold text-purple-900">{proposal}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProposal(proposal)}
                      className="hover:bg-purple-200 rounded-full p-1 transition-colors"
                    >
                      <X className="w-3 h-3 text-purple-700" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* הצעות מהירות */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">הוספה מהירה:</p>
              <div className="flex flex-wrap gap-2">
                {proposals.map((proposal, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAddProposal(proposal)}
                    disabled={formData.proposals.includes(proposal)}
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    {proposal}
                  </Button>
                ))}
              </div>
            </div>

            {/* הוספת הצעה חדשה */}
            <div className="flex gap-2">
              <Input
                placeholder="הצעה מותאמת אישית..."
                value={newProposal}
                onChange={(e) => setNewProposal(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProposal())}
              />
              <Button
                type="button"
                onClick={handleAddProposal}
                variant="outline"
                className="whitespace-nowrap"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form_responses">תשובות מהטופס</Label>
            <Textarea
              id="form_responses"
              value={formData.form_responses}
              onChange={(e) => setFormData({...formData, form_responses: e.target.value})}
              placeholder="תשובות שהליד ענה בטופס הלידים..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="הוסף הערות..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-700">
              שמור ליד
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}