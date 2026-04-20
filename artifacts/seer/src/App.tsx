import { useState, useCallback } from "react";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.crystalBall}>🔮</div>
        <h1 style={styles.title}>Seer</h1>
        <p style={styles.subtitle}>
          Upload your design. Get a real critique.
        </p>
      </div>

      <div
        style={{
          ...styles.uploadZone,
          borderColor: isDragging ? "#7b2ff7" : "#3d1f6e",
          background: isDragging ? "#2a0f4e" : "#160824",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        {image ? (
          <img src={image} alt="Uploaded design" style={styles.preview} />
        ) : (
          <div style={styles.uploadPrompt}>
            <div style={styles.uploadIcon}>↑</div>
            <p style={styles.uploadText}>Drop your screenshot here</p>
            <p style={styles.uploadSubtext}>
              PNG or JPG · or paste a Figma link below
            </p>
          </div>
        )}
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />
      </div>

      <div style={styles.figmaRow}>
        <input
          type="text"
          placeholder="Or paste a Figma link (coming soon)"
          style={styles.figmaInput}
          disabled
        />
      </div>

      {image && (
        <button
          style={styles.button}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.boxShadow = "0 0 24px #7b2ff7";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.boxShadow = "0 0 12px #7b2ff7aa";
          }}
        >
          Get the Reading
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#1a0a2e",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    fontFamily: "sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
  },
  crystalBall: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "56px",
    fontWeight: "300",
    color: "#ffffff",
    margin: "0 0 12px 0",
    letterSpacing: "8px",
  },
  subtitle: {
    color: "#8a7aaa",
    fontSize: "16px",
    margin: 0,
    letterSpacing: "0.5px",
  },
  uploadZone: {
    width: "100%",
    maxWidth: "600px",
    minHeight: "180px",
    border: "2px dashed #3d1f6e",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    overflow: "hidden",
    position: "relative",
  },
  uploadPrompt: {
    textAlign: "center",
    padding: "40px",
  },
  uploadIcon: {
    fontSize: "32px",
    color: "#7b2ff7",
    marginBottom: "16px",
  },
  uploadText: {
    color: "#ffffff",
    fontSize: "18px",
    margin: "0 0 8px 0",
  },
  uploadSubtext: {
    color: "#5a4a7a",
    fontSize: "13px",
    margin: 0,
  },
  preview: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    borderRadius: "14px",
  },
  figmaRow: {
    width: "100%",
    maxWidth: "600px",
    marginTop: "4px",
  },
  figmaInput: {
    width: "100%",
    padding: "12px 16px",
    background: "#160824",
    border: "1px solid #3d1f6e",
    borderRadius: "8px",
    color: "#5a4a7a",
    fontSize: "14px",
    cursor: "not-allowed",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "24px",
    padding: "16px 48px",
    background: "#7b2ff7",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontFamily: "Georgia, serif",
    letterSpacing: "1px",
    cursor: "pointer",
    boxShadow: "0 0 12px #7b2ff7aa",
    transition: "box-shadow 0.2s ease",
  },
};
