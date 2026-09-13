export default function BackendSetup({ details }: { details?: string }) {
  return (
    <div className="case-muted" style={{ margin: "12px 0 20px" }}>
      <p>
        Private case saving is not connected yet. An administrator needs to
        finish setup. You can keep using the standalone legal tools.
      </p>
      {details && (
        <details style={{ marginTop: 12 }}>
          <summary className="case-text-button" style={{ cursor: "pointer" }}>
            Administrator setup details
          </summary>
          <p style={{ marginTop: 10, overflowWrap: "anywhere" }}>{details}</p>
        </details>
      )}
    </div>
  );
}
