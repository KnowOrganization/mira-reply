// Shared section header primitive — eyebrow + title.
// Themed via --sf-accent CSS var. Each template overrides styles as needed.

export function Section({
  eyebrow,
  title,
  style,
  titleStyle,
  eyebrowStyle,
}: {
  eyebrow?: string;
  title: string;
  style?: React.CSSProperties;
  titleStyle?: React.CSSProperties;
  eyebrowStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      {eyebrow && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--sf-accent)",
            marginBottom: 4,
            ...eyebrowStyle,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h2
        style={{
          fontSize: "clamp(20px, 3vw, 28px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: 0,
          ...titleStyle,
        }}
      >
        {title}
      </h2>
    </div>
  );
}
