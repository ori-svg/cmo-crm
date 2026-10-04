import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Tag as TagIcon } from "lucide-react";

export default function LeadFilters({ filters, setFilters, currentCompanyId, availableCampaigns = [] }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);

  useEffect(() => {
    loadTags();
    loadSources();
    loadStatuses();
  }, [currentCompanyId]);

  const loadTags = () => {
    const tagsKey = currentCompanyId ? `lead_tags_${currentCompanyId}` : "lead_tags";
    const savedTags = localStorage.getItem(tagsKey);
    if (savedTags) {
      try {
        setAvailableTags(JSON.parse(savedTags));
      } catch (e) {
        setAvailableTags([]);
      }
    } else {
      setAvailableTags([]);
    }
  };

  const loadSources = () => {
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
  };

  const loadStatuses = () => {
    const statusesKey = currentCompanyId ? `lead_statuses_${currentCompanyId}` : "lead_statuses";
    const savedStatuses = localStorage.getItem(statusesKey);
    if (savedStatuses) {
      try {
        setAvailableStatuses(JSON.parse(savedStatuses));
      } catch (e) {
        setAvailableStatuses(["חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"]);
      }
    } else {
      setAvailableStatuses(["חדש", "נוצר קשר", "מוסמך", "לקוח", "אבוד"]);
    }
  };

  const handleTagToggle = (tag) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    setFilters({...filters, tags: newTags});
  };

  const clearTags = () => {
    setFilters({...filters, tags: []});
  };

  return (
    <Card className="p-6 shadow-lg">
      <div className="space-y-4">
        {/* שורה ראשונה: חיפוש, סטטוס, מקור */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>חיפוש</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חפש לפי שם, אימייל או טלפון..."
                value={filters.search || ""}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select
              value={filters.status || "הכל"}
              onValueChange={(value) => setFilters({...filters, status: value})}
            >
              <SelectTrigger className="brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="הכל">הכל</SelectItem>
                {availableStatuses.map((status, idx) => (
                  <SelectItem key={idx} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>מקור</Label>
            <Select
              value={filters.source || "הכל"}
              onValueChange={(value) => setFilters({...filters, source: value})}
            >
              <SelectTrigger className="brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="הכל">הכל</SelectItem>
                {/* ✅ NEW: מקורות דינמיים מ-localStorage */}
                {availableSources.map((source, idx) => (
                  <SelectItem key={idx} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* שורה שנייה: קמפיין וטווח תאריכי יצירה */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>קמפיין</Label>
            <Select
              value={filters.campaign || "הכל"}
              onValueChange={(value) => setFilters({...filters, campaign: value})}
            >
              <SelectTrigger className="brand-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="הכל">הכל</SelectItem>
                {availableCampaigns.map((campaign, idx) => (
                  <SelectItem key={idx} value={campaign}>
                    {campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>נוצר מתאריך</Label>
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>נוצר עד תאריך</Label>
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            />
          </div>
        </div>

        {/* שורה שלישית: סינון לפי טאגים */}
        {availableTags.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-purple-600" />
                סינון לפי טאגים
              </Label>
              {filters.tags && filters.tags.length > 0 && (
                <button
                  onClick={clearTags}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  נקה הכל
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag, idx) => {
                const isSelected = filters.tags && filters.tags.includes(tag);
                return (
                  <button
                    key={idx}
                    onClick={() => handleTagToggle(tag)}
                    className={`rounded-full px-4 py-2 flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                        : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <TagIcon className="w-3 h-3" />
                    <span className="font-semibold text-sm">{tag}</span>
                    {isSelected && <X className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {filters.tags && filters.tags.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="text-xs text-purple-700 mb-2">
                  מציג לידים עם {filters.tags.length === 1 ? 'טאג' : 'אחד או יותר מהטאגים'}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}