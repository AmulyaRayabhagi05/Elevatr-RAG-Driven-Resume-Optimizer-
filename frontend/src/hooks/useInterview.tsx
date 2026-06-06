const API = "http://localhost:8000/interview";

export interface Feedback {
  sentiment: string;
  entities: string;
  strengths: string;
  improvements: string;
  score: number;
}

export interface FeedbackResponse {
  question: string;
  answer: string;
  feedback: Feedback;
}

export async function fetchQuestion(selection: string, targetJob: string, firstQuestion: boolean = false): Promise<{ question: string }> {
  const token = localStorage.getItem("access_token");
  
  const res = await fetch(`${API}/question`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,  // ✅ add this
    },
    body: JSON.stringify({ selection, target_job: targetJob, first_question: firstQuestion }),
  });
  return res.json();
}

export async function fetchFeedback(question: string, answer: string): Promise<FeedbackResponse> {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${API}/feedback`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,  // ✅ add this
    },
    body: JSON.stringify({ question, answer }),
  });
  return res.json();
}