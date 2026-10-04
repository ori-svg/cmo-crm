import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  X,
  Trash2,
  Edit3,
  Globe,
  Loader2,
  Tag,
  ArrowLeftRight
} from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function BulkActionsToolbar({
  selectedCount,
  onStatusChange,
  onSourceChange,
  onTagsAdd,
  onDelete,
  onTransfer = null,
  onCancel,
  isProcessing = false,
  progress = { current: 0, total: 0 },
  currentCompanyId = null
}) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
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

    // טען טאגים לפי חברה
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
  }, [currentCompanyId]);

  const handleStatusChange = () => {
    if (selectedStatus && !isProcessing) {
      onStatusChange(selectedStatus);
      setSelectedStatus("");
    }
  };

  const handleSourceChange = () => {
    if (selectedSource && !isProcessing) {
      onSourceChange(selectedSource);
      setSelectedSource("");
    }
  };

  const handleTagsAdd = () => {
    if (selectedTags.length > 0 && !isProcessing && onTagsAdd) {
      onTagsAdd(selectedTags);
      setSelectedTags([]);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
        <div className="flex flex-col gap-4">
          {/* ✅ NEW: Progress Bar */}
          {isProcessing && (
            <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    מעבד... {progress.current} מתוך {progress.total}
                  </span>
                </div>
                <span className="text-sm text-blue-700">
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                className="h-2"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* מונה בחירה */}
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white px-3 py-1 text-base">
                <CheckCircle2 className="w-4 h-4 ml-2" />
                {selectedCount} נבחרו
              </Badge>
            </div>

            {/* שינוי סטטוס */}
            <div className="flex items-center gap-2 flex-1">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-[180px] brand-select bg-white">
                  <SelectValue placeholder="שנה סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="חדש">חדש</SelectItem>
                  <SelectItem value="נוצר קשר">נוצר קשר</SelectItem>
                  <SelectItem value="מוסמך">מוסמך</SelectItem>
                  <SelectItem value="לקוח">לקוח</SelectItem>
                  <SelectItem value="אבוד">אבוד</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleStatusChange}
                disabled={!selectedStatus || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "החל"
                )}
              </Button>
            </div>

            {/* שינוי מקור */}
            <div className="flex items-center gap-2 flex-1">
              <Globe className="w-4 h-4 text-green-600" />
              <Select
                value={selectedSource}
                onValueChange={setSelectedSource}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-[180px] brand-select bg-white">
                  <SelectValue placeholder="שנה מקור" />
                </SelectTrigger>
                <SelectContent>
                  {availableSources.map((source, idx) => (
                    <SelectItem key={idx} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleSourceChange}
                disabled={!selectedSource || isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "החל"
                )}
              </Button>
            </div>

            {/* הוספת טאגים - תמיד מוצג */}
            {onTagsAdd && (
              <div className="flex items-center gap-2 flex-1">
                <Tag className="w-4 h-4 text-purple-600" />
                <Select
                  value=""
                  onValueChange={toggleTag}
                  disabled={isProcessing || availableTags.length === 0}
                >
                  <SelectTrigger className="w-[180px] brand-select bg-white">
                    <SelectValue placeholder={
                      availableTags.length === 0 
                        ? "אין טאגים" 
                        : selectedTags.length > 0 
                          ? `${selectedTags.length} טאגים נבחרו` 
                          : "הוסף טאגים"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag, idx) => (
                      <SelectItem key={idx} value={tag}>
                        <div className="flex items-center gap-2">
                          {selectedTags.includes(tag) && <CheckCircle2 className="w-3 h-3 text-purple-600" />}
                          {tag}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleTagsAdd}
                  disabled={selectedTags.length === 0 || isProcessing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "הוסף"
                  )}
                </Button>
              </div>
            )}

            {/* כפתורי פעולה */}
            <div className="flex items-center gap-2">
              {onTransfer && (
                <Button
                  size="sm"
                  onClick={onTransfer}
                  className="gap-2 bg-orange-600 hover:bg-orange-700"
                  disabled={isProcessing}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  העבר לחברה
                </Button>
              )}

              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    מחק
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="gap-2"
                disabled={isProcessing}
              >
                <X className="w-4 h-4" />
                בטל
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}