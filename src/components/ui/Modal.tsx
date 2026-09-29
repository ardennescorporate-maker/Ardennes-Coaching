"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Accessible dialog built on <dialog>. */
export function Modal({ open, onClose, title, children, hideClose }: { open: boolean; onClose: () => void; title: string; children: ReactNode; hideClose?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="card m-auto w-[min(92vw,460px)] p-0 text-ink backdrop:bg-[#0f1e3d]/50 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6">
        {!hideClose && (
          <button type="button" className="icon-btn absolute right-3 top-3" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </dialog>
  );
}
