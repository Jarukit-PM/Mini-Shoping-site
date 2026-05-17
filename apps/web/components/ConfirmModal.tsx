"use client";

import React from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ margin: 0 }} className="heading-3">
            {title}
          </h3>
        </div>
        <div className="modal-body">{body}</div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "" : "accent"}`}
            style={danger ? { background: "var(--bad)", borderColor: "var(--bad)" } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
