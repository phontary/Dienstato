"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftWithCalendar } from "@/lib/types";
import { ShiftPreset } from "@/lib/db/schema";
import { formatDateToLocal } from "@/lib/date-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Red", value: "#ef4444" },
  { name: "Green", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Orange", value: "#f97316" },
];

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (shift: ShiftFormData) => void;
  selectedDate?: Date;
  shift?: ShiftWithCalendar;
  onPresetsChange?: () => void;
  calendarId?: string;
}

export interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color?: string;
  notes?: string;
  presetId?: string;
  isAllDay?: boolean;
}

export function ShiftDialog({
  open,
  onOpenChange,
  onSubmit,
  selectedDate,
  shift,
  onPresetsChange,
  calendarId,
}: ShiftDialogProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState<ShiftFormData>({
    date:
      shift?.date && shift.date instanceof Date
        ? formatDateToLocal(shift.date)
        : selectedDate
        ? formatDateToLocal(selectedDate)
        : formatDateToLocal(new Date()),
    startTime: shift?.startTime || "09:00",
    endTime: shift?.endTime || "17:00",
    title: shift?.title || "",
    notes: shift?.notes || "",
    color: shift?.color || "#3b82f6",
    isAllDay: false,
  });

  const [presets, setPresets] = useState<ShiftPreset[]>([]);
  const [saveAsPreset, setSaveAsPreset] = useState(false); // Auto-save disabled by default
  const [presetName, setPresetName] = useState("");

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
  }, []);

  // Update form data when selectedDate or shift changes
  useEffect(() => {
    if (open) {
      setFormData({
        date:
          shift?.date && shift.date instanceof Date
            ? formatDateToLocal(shift.date)
            : selectedDate
            ? formatDateToLocal(selectedDate)
            : formatDateToLocal(new Date()),
        startTime: shift?.startTime || "09:00",
        endTime: shift?.endTime || "17:00",
        title: shift?.title || "",
        notes: shift?.notes || "",
        color: shift?.color || "#3b82f6",
        isAllDay: shift?.isAllDay || false,
      });
      setSaveAsPreset(false); // Disabled by default
      setPresetName("");
    }
  }, [open, selectedDate, shift]);

  const fetchPresets = async () => {
    try {
      const response = await fetch("/api/presets");
      const data = await response.json();
      setPresets(data);
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    }
  };

  const handleSaveAsPreset = async (shiftData: ShiftFormData) => {
    if (!presetName.trim() || !calendarId) return;

    try {
      const response = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          title: presetName,
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          color: shiftData.color,
          notes: shiftData.notes,
          isAllDay: shiftData.isAllDay,
        }),
      });
      await response.json();
      await fetchPresets();
      // Notify parent to refresh presets
      if (onPresetsChange) {
        onPresetsChange();
      }
    } catch (error) {
      console.error("Failed to save preset:", error);
    }
  };

  const applyPreset = (preset: ShiftPreset) => {
    setFormData({
      ...formData,
      startTime: preset.startTime,
      endTime: preset.endTime,
      title: preset.title,
      notes: preset.notes || "",
      color: preset.color,
      isAllDay: preset.isAllDay || false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      // If all-day, set default times for backend
      const submitData = {
        ...formData,
        startTime: formData.isAllDay ? "00:00" : formData.startTime,
        endTime: formData.isAllDay ? "23:59" : formData.endTime,
      };

      onSubmit(submitData);

      // Save as preset if enabled and it's a new shift
      if (!shift && saveAsPreset && presetName.trim()) {
        handleSaveAsPreset(submitData);
      }

      if (!shift) {
        setFormData({
          date: selectedDate
            ? formatDateToLocal(selectedDate)
            : formatDateToLocal(new Date()),
          startTime: "09:00",
          endTime: "17:00",
          title: "",
          notes: "",
          color: "#3b82f6",
          isAllDay: false,
        });
        setPresetName("");
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 gap-0 border border-border/50 bg-gradient-to-b from-background via-background to-muted/30 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-5 space-y-1.5 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {shift ? t("shift.edit") : t("shift.create")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {shift
              ? t("shift.editDescription", {
                  default: "Update the shift details",
                })
              : t("shift.createDescription", {
                  default: "Add a new shift to your calendar",
                })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Preset Selection */}
            {!shift && presets.length > 0 && (
              <div className="space-y-2.5 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                  {t("shift.selectPreset")}
                </Label>
                <Select
                  onValueChange={(value) => {
                    const preset = presets.find((p) => p.id === value);
                    if (preset) applyPreset(preset);
                  }}
                >
                  <SelectTrigger className="h-11 border-primary/30 focus:border-primary/50 focus:ring-primary/20 bg-background/80">
                    <SelectValue placeholder={t("shift.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.title} ({preset.startTime} - {preset.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2.5">
              <Label
                htmlFor="date"
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                {t("shift.date")}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 backdrop-blur-sm"
              />
            </div>

            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border border-border/30">
              <Checkbox
                id="allDay"
                checked={formData.isAllDay}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAllDay: !!checked })
                }
              />
              <Label
                htmlFor="allDay"
                className="text-sm font-medium cursor-pointer"
              >
                {t("shift.allDayShift")}
              </Label>
            </div>

            {!formData.isAllDay && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-sm font-medium">
                    {t("shift.startTime")}
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-sm font-medium">
                    {t("shift.endTime")}
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
                  />
                </div>
              </motion.div>
            )}
            <div className="space-y-2.5">
              <Label
                htmlFor="title"
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                {t("shift.titleLabel")}
              </Label>
              <Input
                id="title"
                placeholder={t("shift.titlePlaceholder")}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 backdrop-blur-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2.5">
              <Label
                htmlFor="notes"
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                {t("shift.notesOptional")}
              </Label>
              <Textarea
                id="notes"
                placeholder={t("shift.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 resize-none"
              />
            </div>
            <ColorPicker
              color={formData.color || "#3b82f6"}
              onChange={(color) => setFormData({ ...formData, color })}
              label={t("shift.color")}
              presetColors={PRESET_COLORS}
            />

            {/* Auto-Save as Preset */}
            {!shift && (
              <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="savePreset"
                    checked={saveAsPreset}
                    onCheckedChange={(checked) =>
                      setSaveAsPreset(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="savePreset"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                    {t("preset.saveAsPreset")}
                  </Label>
                </div>
                {saveAsPreset && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 pt-1"
                  >
                    <Label htmlFor="presetName" className="text-sm">
                      {t("preset.presetName")}
                    </Label>
                    <Input
                      id="presetName"
                      placeholder={t("preset.presetNamePlaceholder")}
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="h-10 border-primary/30 focus:border-primary/50 focus:ring-primary/20 bg-background/80"
                    />
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-muted/20 p-4 flex gap-2.5 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 border-border/50 hover:bg-muted/50"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim()}
              className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
            >
              {shift ? t("shift.saveChanges") : t("shift.addShift")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
