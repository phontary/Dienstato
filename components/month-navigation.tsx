import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, Locale } from "date-fns";
import { PrintDialog } from "@/components/print-dialog";
import { ShiftWithCalendar } from "@/lib/types";

interface MonthNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  locale?: Locale;
  shifts?: ShiftWithCalendar[];
  localeString?: string;
}

export function MonthNavigation({
  currentDate,
  onDateChange,
  locale,
  shifts = [],
  localeString = "en",
}: MonthNavigationProps) {
  return (
    <motion.div
      className="flex items-center justify-between mb-4 sm:mb-5 px-2 sm:px-0"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full active:scale-95 transition-transform"
        onClick={() => onDateChange(subMonths(currentDate, 1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <motion.h2
        className="text-lg sm:text-xl font-bold"
        key={format(currentDate, "MMMM yyyy")}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {format(currentDate, "MMMM yyyy", { locale })}
      </motion.h2>
      <div className="flex gap-2">
        <PrintDialog
          currentDate={currentDate}
          shifts={shifts}
          locale={localeString}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full active:scale-95 transition-transform"
          onClick={() => onDateChange(addMonths(currentDate, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
