"use client";

import { CustomerBalance } from "../types";

type Props = {
  selectedBed: string | null;
  selectedCustomer: CustomerBalance | null;
  bedMinutes: string;
  setBedMinutes: (value: string) => void;
  onStartBed: () => void;
  onCancel: () => void;
};

const quickMinutes = [8, 10, 12, 16];

export default function StartBedPanel({
  selectedBed,
  selectedCustomer,
  bedMinutes,
  setBedMinutes,
  onStartBed,
  onCancel,
}: Props) {
  if (!selectedBed) return null;

  return (
    <section style={styles.panel}>
      <h2 style={styles.title}>Start {selectedBed}</h2>

      {selectedCustomer ? (
        <p style={styles.helpText}>
          Customer:{" "}
          <strong>{selectedCustomer.full_name || selectedCustomer.email}</strong>
        </p>
      ) : (
        <p style={styles.helpText}>Select a customer first.</p>
      )}

      <div style={styles.quickButtons}>
        {quickMinutes.map((mins) => (
          <button
            key={mins}
            style={styles.quickButton}
            onClick={() => setBedMinutes(String(mins))}
          >
            {mins}
          </button>
        ))}
      </div>

      <div style={styles.inlineRow}>
        <input
          style={styles.input}
          type="number"
          value={bedMinutes}
          onChange={(e) => setBedMinutes(e.target.value)}
          placeholder="Minutes"
        />

        <button style={styles.greenButton} onClick={onStartBed}>
          Start Bed
        </button>

        <button style={styles.greyButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: "#171717",
    border: "2px solid #f5c542",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "22px",
  },
  title: {
    margin: "0 0 16px",
    fontSize: "22px",
    color: "#f5c542",
  },
  helpText: {
    color: "#bbb",
    marginTop: 0,
  },
  quickButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  quickButton: {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "none",
    background: "#f5c542",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  inlineRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: "130px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #444",
    background: "#fff",
    color: "#111",
    fontSize: "16px",
  },
  greenButton: {
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#56d364",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  greyButton: {
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#aaa",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
};