"use client";

import { AnimatePresence, motion } from "motion/react";

export function AnalysisProgressToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none fixed bottom-20 left-1/2 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[10px_13px_9px_12px] border border-[#ffbd64]/45 bg-[#10162a]/92 px-4 py-2 text-center text-[11px] font-bold tracking-wide text-white/85 shadow-[3px_4px_0_rgba(0,0,0,.35)] backdrop-blur-md sm:text-xs"
          role="status"
          aria-live="polite"
        >
          <span className="mr-2 text-[#7ee9dc]">&#10003;</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

