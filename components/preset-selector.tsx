"use client";

import { useTranslations } from "next-intl";
import { ShiftPreset } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Check, Settings, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { motion } from "motion/react";
import { toast } from "sonner";

interface PresetSelectorProps {
  presets: ShiftPreset[];
  selectedPresetId?: string;
  onSelectPreset: (presetId: string | undefined) => void;
  onPresetsChange: () => void;
  onShiftsChange?: () => void;
  calendarId: string;
  onPasswordRequired: (action: () => Promise<void>) => void;
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
  onPasswordRequired,
}: PresetSelectorProps) {
  const t = useTranslations();
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ShiftPreset | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startTime: "09:00",
    endTime: "17:00",
    color: PRESET_COLORS[0].value,
    notes: "",
    isSecondary: false,
    isAllDay: false,
  });
  const [showSecondary, setShowSecondary] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      startTime: "09:00",
      endTime: "17:00",
      color: PRESET_COLORS[0].value,
      notes: "",
      isSecondary: false,
      isAllDay: false,
    });
  };

  const handleCreateNew = async () => {
    // Check password before opening dialog
    const password = localStorage.getItem(`calendar_password_${calendarId}`);

    const checkAndCreate = async () => {
      const pwd = localStorage.getItem(`calendar_password_${calendarId}`);
      // Verify password by trying to fetch presets with it
      const response = await fetch(
        `/api/calendars/${calendarId}/verify-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwd }),
        }
      );

      const data = await response.json();

      if (data.protected && !data.valid) {
        // Password required or invalid
        localStorage.removeItem(`calendar_password_${calendarId}`);
        await onPasswordRequired(checkAndCreate);
        return;
      }

      // Password valid or not required, open dialog
      resetForm();
      setIsCreatingNew(true);
      setEditingPreset(null);
    };

    await checkAndCreate();
  };

  const handleEditPreset = async (preset: ShiftPreset) => {
    // Check password before opening dialog
    const checkAndEdit = async () => {
      const password = localStorage.getItem(`calendar_password_${calendarId}`);
      // Verify password
      const response = await fetch(
        `/api/calendars/${calendarId}/verify-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await response.json();

      if (data.protected && !data.valid) {
        // Password required or invalid
        localStorage.removeItem(`calendar_password_${calendarId}`);
        await onPasswordRequired(checkAndEdit);
        return;
      }

      // Password valid or not required, open dialog
      setIsCreatingNew(false);
      setEditingPreset(preset);
      setFormData({
        title: preset.title,
        startTime: preset.startTime,
        endTime: preset.endTime,
        color: preset.color,
        notes: preset.notes || "",
        isSecondary: preset.isSecondary || false,
        isAllDay: preset.isAllDay || false,
      });
    };

    await checkAndEdit();
  };

  const handleSave = async () => {
    try {
      // Get stored password from localStorage (already verified)
      const password = localStorage.getItem(`calendar_password_${calendarId}`);

      if (isCreatingNew) {
        // Create new preset
        await fetch("/api/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId,
            ...formData,
            password,
          }),
        });
        toast.success(t("preset.created"));
      } else if (editingPreset) {
        // Update existing preset
        await fetch(`/api/presets/${editingPreset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, password }),
        });
        toast.success(t("preset.updated"));

        // Refresh shifts as they may have been updated
        if (onShiftsChange) onShiftsChange();
      }
      onPresetsChange();
      setEditingPreset(null);
      setIsCreatingNew(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save preset:", error);
      toast.error(t("preset.saveError"));
    }
  };

  const handleDeletePreset = async (id: string) => {
    // Check password first
    const checkAndDelete = async () => {
      const password = localStorage.getItem(`calendar_password_${calendarId}`);
      // Verify password
      const verifyResponse = await fetch(
        `/api/calendars/${calendarId}/verify-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await verifyResponse.json();

      if (data.protected && !data.valid) {
        // Password required or invalid
        localStorage.removeItem(`calendar_password_${calendarId}`);
        await onPasswordRequired(() => handleDeletePreset(id));
        return;
      }

      // Password valid, confirm deletion
      if (!confirm(t("preset.deleteConfirm"))) return;

      try {
        const url = password
          ? `/api/presets/${id}?password=${encodeURIComponent(password)}`
          : `/api/presets/${id}`;

        await fetch(url, { method: "DELETE" });

        if (selectedPresetId === id) {
          onSelectPreset(undefined);
        }
        onPresetsChange();
        // Refresh shifts as they may have been deleted
        if (onShiftsChange) onShiftsChange();
        toast.success(t("preset.deleted"));
      } catch (error) {
        console.error("Failed to delete preset:", error);
        toast.error(t("preset.deleteError"));
      }
    };

    await checkAndDelete();
  };

  return (
    <div>
      {presets.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Plus className="h-4 sm:h-5 w-4 sm:w-5" />
            <p className="text-xs sm:text-sm font-medium">
              {t("preset.noPresets")}
            </p>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground max-w-md mx-auto">
            {t("preset.createFirstDescription")}
          </p>
          <Button onClick={handleCreateNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">
              {t("preset.createYourFirst")}
            </span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Primary Presets */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {presets
              .filter((p) => !p.isSecondary)
              .map((preset) => (
                <motion.div
                  key={preset.id}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button
                    variant={
                      selectedPresetId === preset.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      onSelectPreset(
                        selectedPresetId === preset.id ? undefined : preset.id
                      )
                    }
                    className="relative text-[11px] sm:text-sm px-2 sm:px-4 h-8 sm:h-10 rounded-full font-semibold transition-all"
                    style={{
                      backgroundColor:
                        selectedPresetId === preset.id
                          ? preset.color
                          : undefined,
                      borderColor: preset.color,
                      borderWidth: "2px",
                    }}
                  >
                    {selectedPresetId === preset.id && (
                      <Check className="mr-1 sm:mr-1.5 h-3 sm:h-3.5 w-3 sm:w-3.5" />
                    )}
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {preset.title}
                    </span>
                    <span className="ml-1 sm:ml-1.5 text-[9px] sm:text-xs opacity-80">
                      {preset.isAllDay ? (
                        <span>{t("shift.allDay")}</span>
                      ) : (
                        <>
                          <span className="sm:hidden">
                            {preset.startTime.substring(0, 5)}
                          </span>
                          <span className="hidden sm:inline">
                            {preset.startTime} - {preset.endTime}
                          </span>
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNew}
              className="gap-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            >
              <Plus className="h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline sm:inline">
                {t("preset.create")}
              </span>
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

          {/* Secondary Presets - Collapsible */}
          {presets.some((p) => p.isSecondary) && (
            <div className="space-y-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecondary(!showSecondary)}
                className="gap-1 text-xs text-muted-foreground h-6 px-2"
              >
                {showSecondary ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>
                  {t("preset.secondaryPresets")} (
                  {presets.filter((p) => p.isSecondary).length})
                </span>
              </Button>
              {showSecondary && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {presets
                    .filter((p) => p.isSecondary)
                    .map((preset) => (
                      <Button
                        key={preset.id}
                        variant={
                          selectedPresetId === preset.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          onSelectPreset(
                            selectedPresetId === preset.id
                              ? undefined
                              : preset.id
                          )
                        }
                        className="relative text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                        style={{
                          backgroundColor:
                            selectedPresetId === preset.id
                              ? preset.color
                              : undefined,
                          borderColor: preset.color,
                        }}
                      >
                        {selectedPresetId === preset.id && (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        <span className="font-medium truncate max-w-[80px] sm:max-w-none">
                          {preset.title}
                        </span>
                        <span className="ml-1 text-[10px] sm:text-xs opacity-70">
                          {preset.isAllDay ? (
                            <span>{t("shift.allDay")}</span>
                          ) : (
                            <>
                              <span className="sm:hidden">
                                {preset.startTime}
                              </span>
                              <span className="hidden sm:inline">
                                {preset.startTime} - {preset.endTime}
                              </span>
                            </>
                          )}
                        </span>
                      </Button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manage Presets Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col p-0 gap-0 border border-border/50 bg-gradient-to-b from-background via-background to-muted/30 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-5 space-y-1.5">
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t("preset.manage")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("preset.manageDescription", {
                default: "Edit or delete your shift presets",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 p-6">
            <Button
              onClick={handleCreateNew}
              className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/25"
              variant="default"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("preset.createNew")}
            </Button>
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-all"
                style={{ borderLeftColor: preset.color, borderLeftWidth: 4 }}
              >
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    <div
                      className="w-1 h-4 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    ></div>
                    {preset.title}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {preset.isAllDay ? (
                      <span>{t("shift.allDay")}</span>
                    ) : (
                      <>
                        {preset.startTime} - {preset.endTime}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPreset(preset)}
                    className="h-9"
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-[95vw] max-w-[520px] p-0 gap-0 border border-border/50 bg-gradient-to-b from-background via-background to-muted/30 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-5 space-y-1.5">
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {isCreatingNew ? t("preset.createNew") : t("preset.edit")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isCreatingNew
                ? t("preset.createDescription", {
                    default: "Create a new preset for quick shift creation",
                  })
                : t("preset.editDescription", {
                    default: "Update preset details",
                  })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 p-6">
            <div className="space-y-2.5">
              <Label
                htmlFor="preset-title"
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                {t("shift.titleLabel")}
              </Label>
              <Input
                id="preset-title"
                placeholder={t("preset.namePlaceholder")}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
              />
            </div>
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border border-border/30">
              <Checkbox
                id="preset-allday"
                checked={formData.isAllDay}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAllDay: !!checked })
                }
              />
              <Label
                htmlFor="preset-allday"
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
                  <Label htmlFor="preset-start" className="text-sm font-medium">
                    {t("shift.startTime")}
                  </Label>
                  <Input
                    id="preset-start"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preset-end" className="text-sm font-medium">
                    {t("shift.endTime")}
                  </Label>
                  <Input
                    id="preset-end"
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
            <ColorPicker
              color={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
              label={t("shift.color")}
              presetColors={PRESET_COLORS}
            />
            <div className="space-y-2.5">
              <Label
                htmlFor="preset-notes"
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                {t("shift.notesOptional")}
              </Label>
              <Input
                id="preset-notes"
                placeholder={t("shift.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
              />
            </div>
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border border-border/30">
              <Checkbox
                id="preset-secondary"
                checked={formData.isSecondary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isSecondary: !!checked })
                }
              />
              <Label
                htmlFor="preset-secondary"
                className="text-sm font-medium cursor-pointer"
              >
                {t("preset.markAsSecondary")}
              </Label>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPreset(null);
                  setIsCreatingNew(false);
                  resetForm();
                }}
                className="flex-1 h-11 border-border/50 hover:bg-muted/50"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!formData.title.trim()}
                className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
              >
                {isCreatingNew ? t("common.create") : t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
