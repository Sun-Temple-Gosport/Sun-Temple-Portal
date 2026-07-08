type Props = {
  activeBeds: number;
};

export default function Header({ activeBeds }: Props) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        marginBottom: "24px",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "36px",
            color: "#f5c542",
          }}
        >
          ☀️ Sun Temple Reception
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#bbb",
            fontSize: "16px",
          }}
        >
          Salon control, minutes and live beds
        </p>
      </div>

      <div
        style={{
          background: "#1c1c1c",
          border: "1px solid #333",
          padding: "14px 18px",
          borderRadius: "999px",
          color: "#f5c542",
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }}
      >
        {activeBeds} active bed{activeBeds === 1 ? "" : "s"}
      </div>
    </header>
  );
}