"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type SiliconShellProps = {
  children: ReactNode;
  isStage?: boolean;
  fullscreen?: boolean;
  onLogoClick?: () => void;
  backControl?: ReactNode;
};

export function SiliconShell({ children, isStage = false, fullscreen = false, onLogoClick, backControl }: SiliconShellProps) {
  return (
    <main className={`relative w-full overflow-hidden bg-[#152038] ${fullscreen ? "h-dvh p-0" : "min-h-dvh p-3 sm:p-6 lg:p-8"}`}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(7,15,32,.78),rgba(8,18,38,.68)_45%,rgba(13,20,31,.82))]" aria-hidden="true" />
      <div className={`relative mx-auto flex w-full items-center justify-center ${fullscreen ? "h-dvh max-w-none" : `min-h-[calc(100dvh-1.5rem)] sm:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-4rem)] ${isStage ? "max-w-[1500px]" : "max-w-6xl"}`}`}>
        <section className={`sketch-frame paper-noise flex w-full flex-col overflow-hidden px-5 py-7 sm:px-10 sm:py-9 ${fullscreen ? "h-dvh min-h-0 max-h-dvh" : "max-h-[calc(100dvh-1.5rem)] min-h-[580px] sm:max-h-[calc(100dvh-3rem)] sm:min-h-[650px] lg:max-h-[calc(100dvh-4rem)]"} ${isStage ? "lg:px-7" : "lg:px-14"}`}>
          <header className="relative z-10 flex items-start justify-between gap-5 border-b-2 border-dashed border-[#3769e8]/45 pb-4">
            {onLogoClick ? (
              <button type="button" onClick={onLogoClick} className="group text-left" aria-label="Return to the start">
                <span className="block -rotate-1 text-3xl leading-none font-bold tracking-[-0.08em] text-[#3769e8] sm:text-5xl">Silicon Valid</span>
                <span className="mt-2 block rotate-[.3deg] text-[10px] font-bold tracking-[0.25em] text-[#566078] uppercase sm:text-xs">repository field notes / parts 01 + 02</span>
              </button>
            ) : (
              <Link href="/" className="group text-left" aria-label="Return to the start">
                <span className="block -rotate-1 text-3xl leading-none font-bold tracking-[-0.08em] text-[#3769e8] sm:text-5xl">Silicon Valid</span>
                <span className="mt-2 block rotate-[.3deg] text-[10px] font-bold tracking-[0.25em] text-[#566078] uppercase sm:text-xs">repository field notes / parts 01 + 02</span>
              </Link>
            )}
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              {backControl}
              <span className="rotate-2 rounded-full border-2 border-[#3769e8] px-3 py-1 text-[10px] font-bold tracking-wider text-[#2349ac] uppercase sm:text-xs">
                {isStage ? "panel in session" : "repo roast theatre"}
              </span>
            </div>
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-5 sm:py-8">
            {children}
          </div>

          <footer className="relative z-10 flex items-center justify-between border-t-2 border-dashed border-[#3769e8]/35 pt-3 text-[10px] font-bold tracking-[0.14em] text-[#667087] uppercase sm:text-xs">
            <span>public GitHub data + structured OpenAI output</span>
            <span className="rotate-1 text-[#3769e8]">Audio generation ready text</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

