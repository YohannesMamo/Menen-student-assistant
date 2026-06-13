// src/components/PracticeExamPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Home } from 'lucide-react';

interface Option {
  optionLabel: string;
  optionText: string;
  opExplanation: string;
  iCorrect: boolean;
  dOrder: number;
}

interface Question {
  questionID: string;
  qText: string;
  qPoints: number;
  options: Option[];
  correctOption: string;
  qExplanation: string;
}

const PracticeExamPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, sectionInfo } = location.state || {};

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [examCompleted, setExamCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }
    loadNextQuestion();
  }, [sessionId]);

  const loadNextQuestion = async () => {
    setLoading(true);
    setSelectedOption(null);
    setIsSubmitted(false);

    try {
      console.log(`[Practice Exam] Loading next question for session: ${sessionId}`);
      const response = await fetch(`/api/exams/next/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[Practice Exam] API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        await finishExam();
        return;
      }
      
      const data = await response.json();
      console.log(`[Practice Exam] Received data:`, data);
      
      if (!data.questionID) {
        console.log(`[Practice Exam] No questionID found. Message: ${data.message || 'No message'}`);
        if (data.message === 'No questions available for this exam') {
          alert('No questions found for this exam. Please select a different textbook or section.');
          navigate('/dashboard');
          return;
        }
        await finishExam();
        return;
      }
      
      const correctOptionObj = data.options.find((o: any) => o.iCorrect === true);
      data.correctOption = correctOptionObj?.optionLabel || null;
      setCurrentQuestion(data);
      console.log(`[Practice Exam] Loaded question: ${data.questionID}`);
    } catch (err) {
      console.error('Error loading question:', err);
      alert('Failed to load question. Please try again.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedOption || !currentQuestion) return;

    setLoading(true);
    try {
      const response = await fetch('/api/exams/submitAnswer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.questionID,
          selectedOption,
          responseTimeSeconds: 45,
        }),
      });

      const result = await response.json();
      setTotalScore(result.totalScoreSoFar);
      setIsSubmitted(true);
      setShowFeedbackModal(true);

      if (result.isLastQuestion === true || result.isCompleted === true) {
        setIsLastQuestion(true);
      } else {
        setQuestionNumber((prev) => prev + 1);
      }
    } catch (err) {
      alert('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const finishExam = async () => {
    try {
      const response = await fetch('/api/exams/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();
      setFinalResult(result);
      setExamCompleted(true);
    } catch (err) {
      console.error('Error finishing exam:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextQuestion = () => {
    setShowFeedbackModal(false);
    loadNextQuestion();
  };

  if (examCompleted && finalResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Practice Complete!</h1>
          <p className="text-gray-500 mb-8">You've completed the practice session</p>

          <div className="bg-indigo-50 rounded-2xl p-6 mb-8">
            <div className="text-5xl font-bold text-indigo-600 mb-2">{finalResult.percentage}%</div>
            <p className="text-gray-600">
              Score: {finalResult.totalScore} / {finalResult.totalPossiblePoints || finalResult.totalQuestions * 10} points
            </p>
            <p className="text-gray-600">
              Correct: {finalResult.correctAnswers || 0} / {finalResult.totalQuestions} questions
            </p>
            <p className="text-gray-500 text-sm mt-2">Time spent: {formatTime(timeSpent)}</p>
          </div>

          <p className="text-gray-700 mb-8">{finalResult.message}</p>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" /> Dashboard
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openExamSelector'));
              }}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
            >
              Practice Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !currentQuestion) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Practice Mode</h1>
            <p className="text-gray-500 text-sm">
              {sectionInfo?.textbookName} • Chapter {sectionInfo?.chapterId} • Section {sectionInfo?.sectionId}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{totalScore}</div>
            <div className="text-xs text-gray-500">Total Points</div>
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">Question {questionNumber}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="h-4 w-4" /> {formatTime(timeSpent)}
          </div>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-indigo-600 rounded-full transition-all"
            style={{ width: `${(questionNumber / 20) * 100}%` }}
          />
        </div>
      </div>

      {currentQuestion && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-xl font-medium text-gray-800 mb-6">{currentQuestion.qText}</p>

          <div className="space-y-3 mb-4">
            {currentQuestion.options.map((opt) => {
              const isCorrect = opt.optionLabel === currentQuestion.correctOption;
              const isSelected = opt.optionLabel === selectedOption;

              let borderClass = 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50';
              let bgClass = '';

              if (isSubmitted) {
                if (isCorrect) borderClass = 'border-green-500';
                if (isCorrect) bgClass = 'bg-green-50';
                else if (isSelected && !isCorrect) {
                  borderClass = 'border-red-500';
                  bgClass = 'bg-red-50';
                }
              } else if (isSelected) {
                borderClass = 'border-indigo-600 shadow-md';
                bgClass = 'bg-indigo-50';
              }

              return (
                <button
                  key={opt.optionLabel}
                  onClick={() => !isSubmitted && setSelectedOption(opt.optionLabel)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${borderClass} ${bgClass}`}
                >
                  <span className="font-bold text-indigo-600 mr-3">{opt.optionLabel}.</span>
                  <span className="text-gray-700">{opt.optionText}</span>
                </button>
              );
            })}
          </div>

          {!isSubmitted ? (
            <button
              onClick={submitAnswer}
              disabled={!selectedOption || loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-xl text-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>Submit Answer <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-lg transition flex items-center justify-center gap-2"
            >
              View Feedback <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {showFeedbackModal && currentQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-xl font-bold">
                {selectedOption === currentQuestion.correctOption ? (
                  <span className="flex items-center gap-2">
                    <span>🎉</span> Correct!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>💡</span> Feedback
                  </span>
                )}
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <span className="font-semibold text-gray-700">Your Answer:</span>{' '}
                <span className={selectedOption === currentQuestion.correctOption ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {selectedOption}. {currentQuestion.options.find(o => o.optionLabel === selectedOption)?.optionText}
                </span>
              </div>

              {selectedOption === currentQuestion.correctOption ? (
                <div className="bg-green-50 rounded-xl p-4 mb-6">
                  <div className="text-green-700 leading-relaxed">
                    <strong>Well done!</strong>{' '}
                    {currentQuestion.options.find(o => o.optionLabel === selectedOption)?.opExplanation}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="text-red-700">
                      <strong>Why this is incorrect:</strong>{' '}
                      {currentQuestion.options.find(o => o.optionLabel === selectedOption)?.opExplanation}
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <div>
                      <span className="font-semibold text-green-700">Correct Answer:</span>{' '}
                      <span className="text-green-600 font-medium">
                        {currentQuestion.correctOption}.{' '}
                        {currentQuestion.options.find(o => o.optionLabel === currentQuestion.correctOption)?.optionText}
                      </span>
                    </div>
                    <div className="text-green-700 mt-2">
                      <strong>Explanation:</strong>{' '}
                      {currentQuestion.options.find(o => o.optionLabel === currentQuestion.correctOption)?.opExplanation}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Score</span>
                  <span className="text-2xl font-bold text-indigo-600">{totalScore} pts</span>
                </div>
              </div>

              <button
                onClick={isLastQuestion ? finishExam : handleNextQuestion}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                {isLastQuestion ? (
                  <>Finish Exam <ArrowRight className="h-5 w-5" /></>
                ) : (
                  <>Next Question <ArrowRight className="h-5 w-5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeExamPage;