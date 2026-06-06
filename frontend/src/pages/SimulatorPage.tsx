import { useState, useEffect } from "react";
import { fetchQuestion, fetchFeedback, Feedback } from "../hooks/useInterview";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function SimulatorPage() {
  const { token } = useAuth();
  const { profile, isLoadingProfile } = useProfile();
  const navigate = useNavigate();

  const [selection, setSelection] = useState<string>("HR");
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [partialText, setPartialText] = useState<string>("");

  const { startListening, stopListening } = useSpeechToText(
    (text) => {
      setAnswer((prev) => (prev ? prev + " " + text : text));
      setPartialText("");
    },
    (partial) => setPartialText(partial)
  );

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      startListening();
    }
  };

  useEffect(() => {
    const loadFirstQuestion = async () => {
      if (isLoadingProfile) return;
      const activeToken = token || localStorage.getItem("access_token");
      if (!activeToken || !profile) return;
      const targetJob = profile?.target_job || "Software Engineer";
      const data = await fetchQuestion(selection, targetJob, true);
      setQuestion(data.question);
    };
    loadFirstQuestion();
  }, [isLoadingProfile, token, profile]);

  const handleGetQuestion = async (): Promise<void> => {
    setLoading(true);
    const targetJob = profile?.target_job ?? "Software Engineer";
    const data = await fetchQuestion(selection, targetJob);
    setQuestion(data.question);
    setFeedback(null);
    setAnswer("");
    setLoading(false);
  };

  const handleSubmitAnswer = async (): Promise<void> => {
    if (!answer.trim()) return;
    setLoading(true);
    const data = await fetchFeedback(question, answer);
    setFeedback(data.feedback);
    setLoading(false);
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "positive") return "hsl(var(--success))";
    if (sentiment === "negative") return "hsl(var(--destructive))";
    return "hsl(var(--warning))";
  };

  const getScorePercent = (score: number) => Math.round(((score + 1) / 2) * 100);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 24px",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>

      {/* Back nav */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", maxWidth: "768px", marginBottom: "32px" }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--neon))")}
          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
        >
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "16px", color: "hsl(var(--foreground))" }}>
          Dashboard
        </span>
      </motion.div>

      {/* Page header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "11px", letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "hsl(var(--neon))",
          margin: "0 0 14px",
        }}>Interview Simulator</p>

        <h1 className="neon-text" style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 48px)",
          fontWeight: 700,
          letterSpacing: "-1.5px",
          lineHeight: 1.08,
          margin: "0 0 12px",
        }}>
          Practice. Improve. Get hired.
        </h1>

        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>
          Answer questions and get AI-powered feedback tailored to your target role.
        </p>
      </div>

      {/* Main card */}
      <div style={{
  width: "100%",
  maxWidth: "768px",
  padding: "32px",
  background: "var(--glass-bg)",
  backdropFilter: "blur(var(--glass-blur))",
  WebkitBackdropFilter: "blur(var(--glass-blur))",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius)",
}}>

        {/* Interview type toggle */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "11px", letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "hsl(var(--muted-foreground))",
            margin: "0 0 12px",
          }}>Interview Type</p>
          <div style={{ display: "flex", gap: "12px" }}>
            {["HR", "Technical"].map((type) => (
              <button
                key={type}
                onClick={() => setSelection(type)}
                className={selection === type ? "glow-button" : ""}
                style={selection !== type ? {
                  flex: 1,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid hsl(var(--border) / 0.1)",
                  color: "hsl(var(--muted-foreground))",
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                } : { flex: 1 }}
              >
                {type === "HR" ? "HR / Behavioral" : "Technical"}
              </button>
            ))}
          </div>
        </div>

        {/* Get question */}
        <button
          onClick={handleGetQuestion}
          disabled={loading}
          className="glow-button"
          style={{ width: "100%", marginBottom: "24px", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Loading..." : "Get Question"}
        </button>

        {/* Question */}
        {question && (
          <div className="glass-card" style={{
            padding: "20px",
            marginBottom: "24px",
            borderColor: "hsl(var(--neon) / 0.15)",
          }}>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "11px", letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "hsl(var(--neon))",
              margin: "0 0 10px",
            }}>Question</p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, margin: 0 }}>{question}</p>
          </div>
        )}

        {/* Answer */}
        {question && (
          <div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "11px", letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 10px",
            }}>Your Answer</p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              className="glass-input"
              placeholder="Type your answer here..."
            />

            {isListening && partialText && (
              <p style={{ fontSize: "13px", color: "hsl(var(--neon))", fontStyle: "italic", marginTop: "8px" }}>
                {partialText}...
              </p>
            )}

            <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
              <button onClick={handleMicClick} className="glow-button">
                {isListening ? "Stop Recording" : "🎙 Speak Answer"}
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={loading || !answer.trim()}
                className="glow-button"
                style={{ opacity: !answer.trim() || loading ? 0.6 : 1, cursor: !answer.trim() || loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Analyzing..." : "Submit Answer"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="glass-card" style={{ width: "100%", maxWidth: "768px", padding: "32px", marginTop: "24px" }}>

          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "11px", letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "hsl(var(--neon))",
            margin: "0 0 24px",
          }}>Feedback</p>

          {/* Score bar */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "11px", letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "hsl(var(--muted-foreground))",
              }}>Confidence Score</span>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700, fontSize: "14px",
                color: getSentimentColor(feedback.sentiment),
              }}>
                {getScorePercent(feedback.score)}%
              </span>
            </div>
            <div style={{ height: "6px", borderRadius: "100px", background: "hsl(var(--muted))", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                borderRadius: "100px",
                width: `${getScorePercent(feedback.score)}%`,
                background: getSentimentColor(feedback.sentiment),
                transition: "width 0.7s ease",
              }} />
            </div>
          </div>

          {/* Strength + Improvement */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="glass-card" style={{
              padding: "16px",
              borderColor: "hsl(var(--success) / 0.2)",
              background: "hsl(var(--success) / 0.04)",
            }}>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "11px", letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "hsl(var(--success))",
                margin: "0 0 8px",
              }}>Strength</p>
              <p style={{ fontSize: "13px", lineHeight: 1.65, margin: 0 }}>{feedback.strengths}</p>
            </div>
            <div className="glass-card" style={{
              padding: "16px",
              borderColor: "hsl(var(--warning) / 0.2)",
              background: "hsl(var(--warning) / 0.04)",
            }}>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "11px", letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "hsl(var(--warning))",
                margin: "0 0 8px",
              }}>Improvement</p>
              <p style={{ fontSize: "13px", lineHeight: 1.65, margin: 0 }}>{feedback.improvements}</p>
            </div>
          </div>

          {/* Key skills */}
          <div className="glass-card" style={{
            padding: "16px",
            borderColor: "hsl(var(--neon) / 0.15)",
            background: "hsl(var(--neon) / 0.03)",
          }}>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "11px", letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "hsl(var(--neon))",
              margin: "0 0 8px",
            }}>Key Skills Mentioned</p>
            <p style={{ fontSize: "13px", lineHeight: 1.65, margin: 0 }}>{feedback.entities}</p>
          </div>

        </div>
      )}
    </div>
  );
}