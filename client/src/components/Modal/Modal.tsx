
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  heading?: string | React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  styleClass?: string;
  draggable?: boolean;
}

const Modal = React.memo(
  ({
    heading,
    children,
    onClose,
    styleClass,
    draggable = false
  }: ModalProps) => {

    const modalRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

    // -----------------------------------
    // FOCUS TRAP LOGIC
    // -----------------------------------
    useEffect(() => {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableSelectors =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

      const focusables = modal.querySelectorAll<HTMLElement>(focusableSelectors);

      if (focusables.length > 0) {
        focusables[0].focus(); // Auto-focus first focusable element
      }

      function trapFocus(e: KeyboardEvent) {
        if (e.key !== "Tab") return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      document.addEventListener("keydown", trapFocus);

      return () => {
        document.removeEventListener("keydown", trapFocus);
      };
    }, []);

    // -----------------------------------
    // Prevent ESC from closing modal
    // -----------------------------------
    useEffect(() => {
      const escBlocker = (e: KeyboardEvent) => {
        if (e.key === "Escape") e.preventDefault();
      };
      document.addEventListener("keydown", escBlocker);
      return () => document.removeEventListener("keydown", escBlocker);
    }, []);

    // -----------------------------------
    // Drag logic
    // -----------------------------------
    const handleMouseDown = (e: React.MouseEvent) => {
      if (!draggable || !headerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      setIsDragging(true);

      const rect = modalRef.current!.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
      if (draggable) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      }
      return () => {
        if (draggable) {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        }
      };
    }, [isDragging, offset, draggable]);


   const modalContent = (
      <div
      className="z-[100] customModel_wrapper w-full h-[100vh] fixed top-0 left-0
            flex items-center justify-center
            bg-black/40 backdrop-blur-sm"

        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          className={`modal_body rounded-xl border border-gray-300 bg-violet-50 p-4 shadow-2xl
            sm:p-4 lg:px-5 lg:py-2 min-w-[85%] max-w-[98%] lg:min-w-[80%] lg:max-w-[90%] ${styleClass || ''}`}
          style={
            draggable && position
              ? {
                  position: 'absolute',
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  transition: isDragging ? 'none' : 'opacity 0.1s ease',
                }
              : {
                  cursor: draggable ? 'grab' : 'default',
                  transition: 'opacity 0.3s ease',
                }
          }

          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={headerRef}
            onMouseDown={handleMouseDown}
            className={`flex items-center justify-between gap-4 ${draggable ? 'cursor-move' : ''}`}
          >
            <p className="font-medium sm:text-lg">{heading}</p>

            <button
              onClick={onClose}
              type="button"
              aria-label="Close dialog"
              className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <hr className="mt-2" />

          <div
            className="modal-content-container overflow-y-auto max-h-[500px] sm:p-5 lg:px-1 lg:py-3"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
  }
);





interface ExitConfirmProps {
  onCancel: () => void;   // Keep main modal open
  onConfirm: () => void;  // Close main modal
}

export const ExitConfirm = ({ onCancel, onConfirm }: ExitConfirmProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Autofocus Cancel button when popup opens
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Escape from closing any parent modal
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
      }

      // Focus trapping
      if (e.key === "Tab") {
        const focusable = wrapperRef.current?.querySelectorAll<HTMLElement>(
          "button"
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // SHIFT + TAB → cycle back
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // TAB → cycle forward
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () =>
      document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const content = (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999]">
      <div
        ref={wrapperRef}
        className="bg-white p-5 rounded-xl shadow-xl w-[350px]"
      >
        <p className="text-lg font-semibold">Exit without saving?</p>
        <p className="text-sm text-gray-600 mt-1">
          Your changes will be lost. Are you sure?
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};



export default Modal;

