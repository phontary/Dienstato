"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { ShiftWithCalendar } from "@/lib/types";
import { de, enUS, it } from "date-fns/locale";

interface PrintDialogProps {
  currentDate: Date;
  shifts: ShiftWithCalendar[];
  locale?: string;
}

const localeMap = {
  de,
  en: enUS,
  it,
};

export function PrintDialog({ currentDate, shifts, locale = "en" }: PrintDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const monthStart = startOfMonth(currentDate);
    const firstDayOfWeek = getDay(monthStart);
    const dateLocale = localeMap[locale as keyof typeof localeMap] || enUS;

    const monthName = format(currentDate, "MMMM yyyy", { locale: dateLocale });

    // Group shifts by date
    const shiftsByDate: Record<string, ShiftWithCalendar[]> = {};
    shifts.forEach((shift) => {
      const dateKey = format(shift.date, "yyyy-MM-dd");
      if (!shiftsByDate[dateKey]) {
        shiftsByDate[dateKey] = [];
      }
      shiftsByDate[dateKey].push(shift);
    });

    // Build print HTML
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let tableRows = "";

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateKey = format(currentDay, "yyyy-MM-dd");
      const dayShifts = shiftsByDate[dateKey] || [];
      const dayName = format(currentDay, "EEEE", { locale: dateLocale });
      const isWeekend = getDay(currentDay) === 0 || getDay(currentDay) === 6;

      const shiftDetails = dayShifts.length > 0
        ? dayShifts.map(shift => {
            const time = shift.isAllDay
              ? t("shift.allDay")
              : `${shift.startTime} - ${shift.endTime}`;
            return `<div style="margin-bottom: 4px;"><strong>${shift.title}</strong> (${time})</div>`;
          }).join("")
        : '<div style="color: #999;">-</div>';

      tableRows += `
        <tr style="${isWeekend ? 'background-color: #f9fafb;' : ''}">
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 80px;">
            <div style="font-weight: bold; font-size: 18px;">${day}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${dayName}</div>
          </td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">
            ${shiftDetails}
          </td>
        </tr>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${monthName} - ${t("app.title")}</title>
          <style>
            @media print {
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              padding: 20px;
              max-width: 210mm;
              margin: 0 auto;
              color: #1f2937;
            }
            h1 {
              text-align: center;
              margin-bottom: 24px;
              font-size: 24px;
              color: #111827;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <h1>${monthName}</h1>
          <table>
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">
                  ${t("shift.date")}
                </th>
                <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">
                  ${t("common.shifts")}
                </th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            ${t("app.title")} - ${format(new Date(), "dd.MM.yyyy HH:mm")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full">
          <Printer className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("print.title")}</DialogTitle>
          <DialogDescription>{t("print.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>{t("print.monthLabel")}:</strong> {format(currentDate, "MMMM yyyy", { locale: localeMap[locale as keyof typeof localeMap] })}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>{t("print.shiftsCount")}:</strong> {shifts.filter(s =>
                s.date.getMonth() === currentDate.getMonth() &&
                s.date.getFullYear() === currentDate.getFullYear()
              ).length}
            </p>
          </div>
          <Button onClick={handlePrint} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            {t("print.print")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
