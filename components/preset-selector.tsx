"use client";

import { ShiftPreset } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Check, Settings, Plus } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface PresetSelectorProps {
  presets: ShiftPreset[];
  selectedPresetId?: string;
  onSelectPreset: (presetId: string | undefined) => void;
  onPresetsChange: () => void;
  onShiftsChange?: () => void;
  calendarId: string;
}

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

export function PresetSelector({
  presets,
  selectedPresetId,
  onSelectPreset,
  onPresetsChange,
  onShiftsChange,
  calendarId,
}: PresetSelectorProps) {
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ShiftPreset | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startTime: "09:00",
    endTime: "17:00",
    color: PRESET_COLORS[0].value,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      startTime: "09:00",
      endTime: "17:00",
      color: PRESET_COLORS[0].value,
      notes: "",
    });
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreatingNew(true);
    setEditingPreset(null);
  };

  const handleEditPreset = (preset: ShiftPreset) => {
    setIsCreatingNew(false);
    setEditingPreset(preset);
    setFormData({
      title: preset.title,
      startTime: preset.startTime,
      endTime: preset.endTime,
      color: preset.color,
      notes: preset.notes || "",
    });
  };

  const handleSave = async () => {
    try {
      if (isCreatingNew) {
        // Create new preset
        await fetch("/api/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId,
            ...formData,
          }),
        });
      } else if (editingPreset) {
        // Update existing preset
        await fetch(`/api/presets/${editingPreset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        // Refresh shifts as they may have been updated
        if (onShiftsChange) onShiftsChange();
      }
      onPresetsChange();
      setEditingPreset(null);
      setIsCreatingNew(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save preset:", error);
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (
      !confirm(
        "Delete this preset? This will also delete all shifts created from this preset."
      )
    )
      return;

    try {
      await fetch(`/api/presets/${id}`, { method: "DELETE" });
      if (selectedPresetId === id) {
        onSelectPreset(undefined);
      }
      onPresetsChange();
      // Refresh shifts as they may have been deleted
      if (onShiftsChange) onShiftsChange();
    } catch (error) {
      console.error("Failed to delete preset:", error);
    }
  };

  return (
    <div>
      {presets.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Plus className="h-4 sm:h-5 w-4 sm:w-5" />
            <p className="text-xs sm:text-sm font-medium">
              No shift presets yet
            </p>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground max-w-md mx-auto">
            Create your first preset to quickly add shifts to your calendar.
            Presets save your frequently used shift times and details.
          </p>
          <Button onClick={handleCreateNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Create Your First Preset</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant={selectedPresetId === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onSelectPreset(
                  selectedPresetId === preset.id ? undefined : preset.id
                )
              }
              className="relative text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
              style={{
                backgroundColor:
                  selectedPresetId === preset.id ? preset.color : undefined,
                borderColor: preset.color,
              }}
            >
              {selectedPresetId === preset.id && (
                <Check className="mr-1 h-3 w-3" />
              )}
              <span className="font-medium truncate max-w-[80px] sm:max-w-none">
                {preset.title}
              </span>
              <span className="ml-1 text-[10px] sm:text-xs opacity-70 hidden sm:inline">
                {preset.startTime} - {preset.endTime}
              </span>
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNew}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
          >
            <Plus className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden xs:inline sm:inline">New Preset</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManageDialog(true)}
            className="h-8 sm:h-9 w-8 sm:w-9 p-0"
          >
            <Settings className="h-3 sm:h-4 w-3 sm:w-4" />
          </Button>
        </div>
      )}

      {/* Manage Presets Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Presets</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={handleCreateNew}
              className="w-full"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Preset
            </Button>
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderLeftColor: preset.color, borderLeftWidth: 4 }}
              >
                <div className="flex-1">
                  <div className="font-medium">{preset.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {preset.startTime} - {preset.endTime}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPreset(preset)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePreset(preset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Preset Dialog */}
      <Dialog
        open={!!editingPreset || isCreatingNew}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPreset(null);
            setIsCreatingNew(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isCreatingNew ? "Create New Preset" : "Edit Preset"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-title">Title</Label>
              <Input
                id="preset-title"
                placeholder="e.g., Morning Shift, Evening Shift"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preset-start">Start Time</Label>
                <Input
                  id="preset-start"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preset-end">End Time</Label>
                <Input
                  id="preset-end"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-color">Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, color: colorOption.value })
                    }
                    className={`h-10 w-10 rounded-md transition-all hover:scale-110 ${
                      formData.color === colorOption.value
                        ? "ring-2 ring-offset-2 ring-foreground"
                        : ""
                    }`}
                    style={{
                      backgroundColor: colorOption.value,
                    }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-notes">Notes (optional)</Label>
              <Input
                id="preset-notes"
                placeholder="Additional information..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreatingNew(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!formData.title.trim()}
              >
                {isCreatingNew ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
