"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Props = {
  activeBeds: number;
  userName: string;
  userRole: "owner" | "staff";
};

export default function ReceptionHeader({
  activeBeds,
  userName,
  userRole,
}: Props) {
  const router = useRouter();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/staff-login");
    router.refresh();
  }

  function openPasswordModal() {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    if (passwordSaving) return;

    setPasswordModalOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
  }

  async function changePassword() {
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("The passwords do not match.");
      return;
    }

    setPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordSaving(false);

    if (error) {
      setPasswordMessage(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password changed successfully.");
  }

  const roleLabel = userRole === "owner" ? "Owner" : "Reception Staff";

  return (
    <>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>☀️ Sun Temple Reception</h1>
          <p style={styles.subtitle}>
            Salon control, customers, minutes and live beds
          </p>
        </div>

        <div style={styles.right}>
          <div style={styles.userBox}>
            <p style={styles.userName}>👤 {userName}</p>
            <p style={styles.userRole}>{roleLabel}</p>
          </div>

          <div style={styles.badge}>
            🟢 {activeBeds} active bed{activeBeds === 1 ? "" : "s"}
          </div>

          <button
            type="button"
            onClick={openPasswordModal}
            style={styles.passwordButton}
          >
            Change Password
          </button>

          <button
            type="button"
            onClick={logout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      {passwordModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Change Password</h2>
                <p style={styles.modalSubtitle}>
                  Choose a new password for your account.
                </p>
              </div>

              <button
                type="button"
                onClick={closePasswordModal}
                style={styles.closeButton}
                disabled={passwordSaving}
                aria-label="Close change password window"
              >
                ×
              </button>
            </div>

            <label style={styles.label}>
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                style={styles.input}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={passwordSaving}
              />
            </label>

            <label style={styles.label}>
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={styles.input}
                placeholder="Enter the password again"
                autoComplete="new-password"
                disabled={passwordSaving}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void changePassword();
                  }
                }}
              />
            </label>

            {passwordMessage && (
              <div
                style={
                  passwordMessage === "Password changed successfully."
                    ? styles.successMessage
                    : styles.errorMessage
                }
              >
                {passwordMessage}
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={closePasswordModal}
                style={styles.cancelButton}
                disabled={passwordSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={changePassword}
                style={{
                  ...styles.saveButton,
                  opacity: passwordSaving ? 0.6 : 1,
                  cursor: passwordSaving ? "not-allowed" : "pointer",
                }}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  title: {
    margin: 0,
    fontSize: "36px",
    color: "#f5c542",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#bbb",
    fontSize: "16px",
  },

  userBox: {
    background: "#0f172a",
    border: "1px solid #334155",
    padding: "10px 16px",
    borderRadius: "16px",
    textAlign: "right",
  },

  userName: {
    margin: 0,
    color: "#fff",
    fontWeight: "bold",
    fontSize: "14px",
  },

  userRole: {
    margin: "4px 0 0",
    color: "#f5c542",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  badge: {
    background: "#1c1c1c",
    border: "1px solid #333",
    padding: "14px 18px",
    borderRadius: "999px",
    color: "#f5c542",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  passwordButton: {
    background: "#0f172a",
    color: "#f5c542",
    border: "1px solid #f5c542",
    borderRadius: "999px",
    padding: "14px 22px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  logoutButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "14px 22px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "rgba(0, 0, 0, 0.75)",
  },

  modal: {
    width: "100%",
    maxWidth: "480px",
    borderRadius: "24px",
    border: "1px solid #334155",
    background: "#111827",
    padding: "24px",
    boxShadow: "0 24px 70px rgba(0, 0, 0, 0.5)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "24px",
  },

  modalTitle: {
    margin: 0,
    color: "#f5c542",
    fontSize: "26px",
  },

  modalSubtitle: {
    margin: "6px 0 0",
    color: "#cbd5e1",
    fontSize: "14px",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: "30px",
    lineHeight: 1,
    cursor: "pointer",
  },

  label: {
    display: "block",
    marginBottom: "18px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "8px",
    borderRadius: "14px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#fff",
    padding: "13px 14px",
    fontSize: "16px",
    outline: "none",
  },

  errorMessage: {
    marginBottom: "18px",
    borderRadius: "12px",
    border: "1px solid #ef4444",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: "bold",
  },

  successMessage: {
    marginBottom: "18px",
    borderRadius: "12px",
    border: "1px solid #22c55e",
    background: "rgba(20, 83, 45, 0.35)",
    color: "#bbf7d0",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: "bold",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
  },

  cancelButton: {
    borderRadius: "999px",
    border: "1px solid #475569",
    background: "#1e293b",
    color: "#fff",
    padding: "12px 20px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  saveButton: {
    borderRadius: "999px",
    border: "none",
    background: "#f5c542",
    color: "#111",
    padding: "12px 20px",
    fontWeight: "bold",
  },
};