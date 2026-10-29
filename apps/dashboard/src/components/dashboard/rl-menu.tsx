"use client";

/**
 * RLMenu — right-click context menu ("Report actions" style): sections,
 * keyboard shortcuts, hover submenus and a destructive action.
 * Attach with onContextMenu on any row; closes on outside click / Esc / scroll.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RLMenuItem {
  label: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  submenu?: RLMenuItem[];
}
export type RLMenuSection = { label?: string; items: RLMenuItem[] };

export function RLMenu({
  sections,
  position,
  onClose,
}: {
  sections: RLMenuSection[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [position, onClose]);

  // Keyboard shortcuts while the menu is open (⌘R rename, ⌘D duplicate, ⌘C copy link…)
  useEffect(() => {
    if (!position) return;
    const flat = sections.flatMap((s) => s.items);
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const item = flat.find(
        (i) => i.shortcut && i.shortcut.replace("⌘", "").toLowerCase() === e.key.toLowerCase()
      );
      if (item && !item.disabled) {
        e.preventDefault();
        item.onSelect?.();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position, sections, onClose]);

  const renderItem = (item: RLMenuItem) => (
    <div key={item.label} className="relative" onMouseEnter={() => setOpenSub(item.submenu ? item.label : null)}>
      <button
        disabled={item.disabled}
        onClick={() => {
          if (item.submenu) return;
          item.onSelect?.();
          onClose();
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-colors disabled:opacity-40",
          item.danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent",
          openSub === item.label && item.submenu && "bg-accent"
        )}
      >
        {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-70" />}
        <span className="flex-1">{item.label}</span>
        {item.shortcut && <kbd className="text-[11px] text-muted-foreground">{item.shortcut}</kbd>}
        {item.submenu && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {item.submenu && openSub === item.label && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 z-50 ml-1 w-44 rounded-xl border bg-popover p-1 shadow-xl"
          >
            {item.submenu.map(renderItem)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <AnimatePresence>
      {position && (
        <motion.div
          ref={ref}
          role="menu"
          aria-label="File actions"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-[80] w-60 rounded-xl border bg-popover p-1 shadow-2xl"
          style={{
            left: Math.min(position.x, window.innerWidth - 260),
            top: Math.min(position.y, window.innerHeight - 340),
          }}
        >
          {sections.map((section, i) => (
            <div key={i} className={cn(i > 0 && "mt-1 border-t pt-1")}>
              {section.label && (
                <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </p>
              )}
              {section.items.map(renderItem)}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook: returns context-menu state + an onContextMenu handler for a row. */
export function useRLMenu() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
  };
  return { position, open, close: () => setPosition(null) };
}
