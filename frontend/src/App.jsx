import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

const BACKEND = "http://localhost:8000"

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm HippraMD, your clinical trials assistant. I can help you find relevant clinical trials for conditions like cancer, diabetes, Alzheimer's, cystic fibrosis, hemophilia, sickle cell disease, and Duchenne muscular dystrophy.\n\nWhat would you like to know?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || loading) return

    const userMsg = { role: "user", content: question }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)
    setSources([])

    try {
      const history = updatedMessages
        .slice(1)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      })

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ])
      setSources(data.sources || [])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the server. Please make sure the backend is running.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>🩺 HippraMD</div>
            <div style={styles.headerSub}>Clinical Trials Assistant</div>
          </div>
          <div style={styles.onlineBadge}>● Online</div>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? styles.userRow : styles.botRow}>
              <div style={msg.role === "user" ? styles.userBubble : styles.botBubble}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.botRow}>
              <div style={styles.botBubble}>
                <span style={styles.typing}>Searching clinical trials...</span>
              </div>
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div style={styles.sourcesBox}>
              <div style={styles.sourcesTitle}>Sources from database:</div>
              {sources.map((s, i) => (
                <div key={i} style={styles.sourceItem}>
                  <span style={styles.nctId}>{s.nct_id}</span>
                  <span style={styles.sourceTitle}>{s.title}</span>
                  <span style={getStatusStyle(s.status)}>{s.status}</span>
                </div>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Disclaimer */}
        <div style={styles.disclaimer}>
          ⚠ These are suggestions based on clinical trial data. Always consult a healthcare provider for personalized medical advice.
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <textarea
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about clinical trials..."
            rows={1}
            disabled={loading}
          />
          <button
            style={loading ? styles.sendDisabled : styles.send}
            onClick={sendMessage}
            disabled={loading}
          >
            ➤
          </button>
        </div>

      </div>
    </div>
  )
}

function getStatusStyle(status) {
  const base = {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 99,
    fontWeight: 500,
    marginLeft: 8,
    whiteSpace: "nowrap",
  }
  const colors = {
    RECRUITING: { background: "#d1fae5", color: "#065f46" },
    COMPLETED: { background: "#dbeafe", color: "#1e40af" },
    ACTIVE_NOT_RECRUITING: { background: "#fef3c7", color: "#92400e" },
    WITHDRAWN: { background: "#fee2e2", color: "#991b1b" },
    NOT_YET_RECRUITING: { background: "#ede9fe", color: "#5b21b6" },
  }
  return { ...base, ...(colors[status] || { background: "#f3f4f6", color: "#374151" }) }
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, sans-serif",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 700,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: "90vh",
  },
  header: {
    background: "linear-gradient(135deg, #6d28d9, #7c3aed)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: 700 },
  headerSub: { color: "#ddd6fe", fontSize: 13 },
  onlineBadge: { color: "#86efac", fontSize: 13, fontWeight: 500 },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  userRow: { display: "flex", justifyContent: "flex-end" },
  botRow: { display: "flex", justifyContent: "flex-start" },
  userBubble: {
    background: "#7c3aed",
    color: "#fff",
    borderRadius: "16px 16px 4px 16px",
    padding: "10px 14px",
    maxWidth: "75%",
    fontSize: 14,
    lineHeight: 1.5,
  },
  botBubble: {
    background: "#f9fafb",
    color: "#111",
    borderRadius: "16px 16px 16px 4px",
    padding: "10px 14px",
    maxWidth: "85%",
    fontSize: 14,
    lineHeight: 1.5,
    border: "1px solid #e5e7eb",
  },
  typing: { color: "#6b7280", fontStyle: "italic" },
  sourcesBox: {
    background: "#faf5ff",
    border: "1px solid #e9d5ff",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12,
  },
  sourcesTitle: { fontWeight: 600, color: "#6d28d9", marginBottom: 6 },
  sourceItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 0",
    borderBottom: "1px solid #f3e8ff",
    flexWrap: "wrap",
  },
  nctId: { fontWeight: 700, color: "#5b21b6", fontSize: 11 },
  sourceTitle: { color: "#374151", flex: 1, fontSize: 12 },
  disclaimer: {
    background: "#fffbeb",
    borderTop: "1px solid #fde68a",
    padding: "8px 16px",
    fontSize: 12,
    color: "#92400e",
  },
  inputRow: {
    display: "flex",
    padding: "12px 16px",
    gap: 8,
    borderTop: "1px solid #e5e7eb",
    background: "#fff",
  },
  input: {
    flex: 1,
    border: "1px solid #d1d5db",
    borderRadius: 24,
    padding: "10px 16px",
    fontSize: 14,
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
  },
  send: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 42,
    height: 42,
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    background: "#d1d5db",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 42,
    height: 42,
    fontSize: 16,
    cursor: "not-allowed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}