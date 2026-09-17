import "./Wordmark.css";

// The two-tone "WhoFights" brand mark. Sizing comes from the parent heading.
export default function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-who">Who</span>
      <span className="wordmark-fights">Fights</span>
    </span>
  );
}
