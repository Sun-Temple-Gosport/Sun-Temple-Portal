"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type Props = {
  activeBeds: number;
  userName: string;
  userRole: "owner" | "staff";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReceptionHeader({
  activeBeds,
  userName,
  userRole,
}: Props) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/staff-login");
    router.refresh();
  }

  const roleLabel = userRole === "owner" ? "Owner" : "Reception Staff";

  return (
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

        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
    </header>
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

  logoutButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "14px 22px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};