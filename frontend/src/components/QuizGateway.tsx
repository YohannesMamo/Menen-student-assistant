import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

type Chapter = {
  id: number;
  title: string;
};

type Section = {
  id: string;
  title: string;
};

const QuizGateway = () => {
  const { stbId } = useParams();
  const navigate = useNavigate();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [step, setStep] = useState<"chapters" | "sections">("chapters");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  // LOAD CHAPTERS
  useEffect(() => {
    const loadChapters = async () => {
      const res = await axios.get(`/api/study/chapters/${stbId}`);
      setChapters(res.data || []);
    };

    loadChapters();
  }, [stbId]);

  // LOAD SECTIONS
  const loadSections = async (chapterId: number) => {
    const res = await axios.get(
      `/api/study/sections/${stbId}/${chapterId}`
    );

    setSections(res.data || []);
  };

  // START QUIZ
  const startQuiz = async (chapterId: number, sectionId: string) => {
    console.log("[QuizGateway] startQuiz called with chapterId:", chapterId, "sectionId:", sectionId);
    try {
      const res = await axios.get(
        `/api/study/quiz/check/${stbId}/${chapterId}/${sectionId}`
      );
      console.log("[QuizGateway] Quiz check response:", res.data);

      if (!res.data.hasQuiz) {
        alert("No quiz available for this section");
        return;
      }

      const route = `/quiz/${stbId}/${chapterId}/${sectionId}`;
      console.log("[QuizGateway] Navigating to:", route);
      navigate(route);
    } catch (error) {
      console.error("[QuizGateway] Error starting quiz:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">Select Quiz Path</h1>

      {/* BACK BUTTON */}
      {step === "sections" && (
        <button
          className="text-blue-600 underline"
          onClick={() => {
            setStep("chapters");
            setSelectedChapter(null);
            setSections([]);
          }}
        >
          ← Back to Chapters
        </button>
      )}

      {/* CHAPTERS VIEW */}
      {step === "chapters" && Array.isArray(chapters) &&
        chapters.map((c) => (
          <div
            key={c.id}
            className="p-4 border rounded flex justify-between items-center"
          >
            <span>{c.title}</span>

            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded"
              onClick={async () => {
                setSelectedChapter(c.id);
                await loadSections(c.id);
                setStep("sections");
              }}
            >
              Open
            </button>
          </div>
        ))}

      {/* SECTIONS VIEW */}
      {step === "sections" && Array.isArray(sections) &&
        sections.map((s) => (
          <div
            key={s.id}
            className="p-4 border rounded flex justify-between items-center"
          >
            <span>{s.title}</span>

            <button
              className="bg-green-600 text-white px-3 py-1 rounded"
              onClick={() =>
                startQuiz(selectedChapter!, s.id)
              }
            >
              Start Quiz
            </button>
          </div>
        ))}

    </div>
  );
};

export default QuizGateway;