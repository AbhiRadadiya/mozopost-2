import React, { ReactNode } from "react";
import MuiModal from "@mui/material/Modal";
import Backdrop from "@mui/material/Backdrop";
import Fade from "@mui/material/Fade";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerTheme?: "default" | "danger";
  customHeader?: ReactNode;
  width?: string;
  footer?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerTheme = "default",
  customHeader,
  width = "460px",
  footer,
  children,
  bodyClassName = "p-[24px]",
}: ModalProps) {
  return (
    <MuiModal
      open={isOpen}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: {
            backgroundColor: "rgba(28, 33, 16, 0.5)",
            backdropFilter: "blur(2px)",
          },
        },
      }}
      className="flex items-center justify-center p-4 sm:p-6"
    >
      <Fade in={isOpen}>
        <div
          className="bg-white border border-[#E2D4B8] rounded-[16px] overflow-hidden shadow-[0_24px_70px_rgba(40,45,20,0.4)] relative flex flex-col w-full outline-none"
          style={{ maxWidth: width, maxHeight: "calc(100vh - 4rem)" }}
        >
          {/* Header */}
          {customHeader ? (
            customHeader
          ) : (
            <div
              className={`shrink-0 px-[24px] py-[18px] border-b border-[#EADFC8] flex items-center justify-between ${
                headerTheme === "danger" ? "bg-[#FEE2E2]/30" : "bg-[#FAF4E6]"
              }`}
            >
              <div>
                <div
                  className={`text-[16px] font-bold ${
                    headerTheme === "danger" ? "text-[#991B1B]" : "text-[#2F3A22]"
                  }`}
                >
                  {title}
                </div>
                {subtitle && (
                  <div
                    className={`text-[12px] mt-[2px] font-medium ${
                      headerTheme === "danger"
                        ? "text-[#B4623F]"
                        : "text-[#8A9270]"
                    }`}
                  >
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`cursor-pointer bg-inherit ${
                  headerTheme === "danger"
                    ? "text-[#B4623F] hover:text-[#991B1B]"
                    : "text-[#8A9270] hover:text-[#2F3A22]"
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}

          {/* Body */}
          <div className={`flex-1 overflow-y-auto min-h-0 ${bodyClassName}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 px-[24px] py-[18px] border-t border-[#F0E8D6] bg-white flex items-center justify-end gap-[10px]">
              {footer}
            </div>
          )}
        </div>
      </Fade>
    </MuiModal>
  );
}
