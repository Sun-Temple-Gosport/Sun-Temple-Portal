type Props = {
  activeBeds: number;
};

export default function ReceptionHeader({ activeBeds }: Props) {
  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>☀️ Sun Temple Reception</h1>
        <p style={styles.subtitle}>Salon control, customers, minutes and live beds</p>
      </div>

      <div style={styles.badge}>
        {activeBeds} active bed{activeBeds === 1 ? "" : "s"}
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
  badge: {
    background: "#1c1c1c",
    border: "1px solid #333",
    padding: "14px 18px",
    borderRadius: "999px",
    color: "#f5c542",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
};