"use client";

// Primitive shell/header/connector components shared by all node cards

import type React from "react";
import { X } from "lucide-react";

export function NodeShell({
  children,
  color,
  glow,
  dragMode,
}: {
  children: React.ReactNode;
  color: string;
  glow?: boolean;
  dragMode?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: `1.5px solid var(--border)`,
        borderRadius: 16,
        width: 288,
        boxShadow: glow
          ? `0 0 0 1px ${color}22, 0 0 28px ${color}22, 0 6px 28px rgba(0,0,0,0.12)`
          : "var(--shadow-card)",
        overflow: "hidden",
        cursor: dragMode ? "grab" : "default",
        userSelect: "none",
        transition: "box-shadow 0.2s",
      }}
    >
      {children}
    </div>
  );
}

export function NodeHeader({
  icon,
  title,
  subtitle,
  color,
  onDelete,
  canDelete,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  color: string;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  return (
    <div
      style={{
        padding: "11px 12px 9px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: `${color}1c`,
          border: `1px solid ${color}3a`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10.5, color: "var(--text-subtle)", marginTop: 1.5 }}>{subtitle}</div>
        )}
      </div>
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-subtle)",
            padding: 3,
            display: "flex",
            borderRadius: 6,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export function VConnector() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: 48,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 2,
          height: 32,
          background:
            "repeating-linear-gradient(to bottom, #7c3aed 0, #7c3aed 5px, transparent 5px, transparent 10px)",
        }}
      />
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#7c3aed",
          boxShadow: "0 0 7px #7c3aedaa",
          marginTop: 2,
        }}
      />
    </div>
  );
}

export function HConnector() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: 56,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          height: 2,
          width: 36,
          background:
            "repeating-linear-gradient(to right, #7c3aed 0, #7c3aed 5px, transparent 5px, transparent 10px)",
        }}
      />
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#7c3aed",
          boxShadow: "0 0 7px #7c3aedaa",
          marginLeft: 2,
        }}
      />
    </div>
  );
}
