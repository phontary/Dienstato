"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (shift: ShiftFormData) => void;
  selectedDate?: Date;
  shift?: ShiftWithCalendar;
  onPresetsChange?: () => void;
}

export interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color?: string;
  notes?: string;
  presetId?: string;
}

export function ShiftDialog({
  open,
  onOpenChange,
  onSubmit,
  selectedDate,
  shift,
  onPresetsChange,
}: ShiftDialogProps) {
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
  });

  const [presets, setPresets] = useState<ShiftPreset[]>([]);
  const [saveAsPreset, setSaveAsPreset] = useState(true); // Auto-save enabled by default
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
      });
      setSaveAsPreset(!shift); // Enable auto-save for new shifts
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
    if (!presetName.trim()) return;

    try {
      const response = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName,
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          title: shiftData.title,
          notes: shiftData.notes,
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
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onSubmit(formData);

      // Save as preset if enabled and it's a new shift
      if (!shift && saveAsPreset && presetName.trim()) {
        handleSaveAsPreset(formData);
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
        });
        setPresetName("");
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{shift ? "Edit Shift" : "New Shift"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preset Selection */}
          {!shift && presets.length > 0 && (
            <div className="space-y-2">
              <Label>Select Preset</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(value) => {
                    const preset = presets.find((p) => p.id === value);
                    if (preset) applyPreset(preset);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Morning Shift"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional information..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Auto-Save as Preset */}
          {!shift && (
            <div className="space-y-3 pt-2 border-t">
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
                  className="text-sm font-normal cursor-pointer"
                >
                  Save as Preset
                </Label>
              </div>
              {saveAsPreset && (
                <div className="space-y-2">
                  <Label htmlFor="presetName">Preset Name</Label>
                  <Input
                    id="presetName"
                    placeholder="e.g., Morning Shift, Evening Shift..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim()}>
              {shift ? "Save Changes" : "Add Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
