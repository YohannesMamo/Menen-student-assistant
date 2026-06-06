import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, Star, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Menen</h1>
          </div>

          <div className="flex items-center gap-4">
         <button
          onClick={() => {
            console.log("Login button clicked! Navigating to /login");
            navigate('/Login');
          }}
          className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium"
        >
          Login
        </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl transition"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Study Smarter.<br />
            Ace Your Exams.
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Free interactive textbooks, quizzes, and evaluations for Ethiopian high school students.
            <span className="block mt-2 text-indigo-600 font-medium">
              Premium unlocks full ESLCE exam preparation.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-3xl flex items-center justify-center gap-3 transition shadow-lg"
            >
              Start Studying Free
              <ArrowRight className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate('/register')}
              className="px-10 py-4 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-3xl transition flex items-center gap-2"
            >
              <Star className="w-5 h-5" />
              See Premium Features
            </button>
          </div>
        </div>
      </section>

      {/* Free vs Premium */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Choose Your Plan</h2>

          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="border border-gray-200 rounded-3xl p-8 bg-white">
              <div className="text-emerald-600 font-semibold mb-2">FREE</div>
              <h3 className="text-3xl font-bold mb-6">Basic Study</h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
                  Interactive Textbooks
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
                  Section Quizzes + Evaluation
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
                  Progress Tracking
                </li>
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="mt-10 w-full py-4 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700"
              >
                Start Free Now
              </button>
            </div>

            {/* Premium Plan */}
            <div className="border-2 border-indigo-600 rounded-3xl p-8 bg-white relative">
              <div className="absolute -top-4 right-8 bg-indigo-600 text-white text-sm font-bold px-5 py-1 rounded-full">
                RECOMMENDED
              </div>
              <div className="text-indigo-600 font-semibold mb-2">PREMIUM</div>
              <h3 className="text-3xl font-bold mb-2">ESLCE Master</h3>
              <p className="text-indigo-600 mb-6">Full Exam Preparation</p>

              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-indigo-500 mt-0.5" />
                  Everything in Free
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-indigo-500 mt-0.5" />
                  Past ESLCE Exams with Answers
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-indigo-500 mt-0.5" />
                  AI Projected Exam Questions
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-indigo-500 mt-0.5" />
                  Advanced Performance Analytics
                </li>
              </ul>

              <button 
                onClick={() => navigate('/register')}
                className="mt-10 w-full py-4 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <p>© 2026 Menen Student Assistant • Made for Ethiopian High School Students</p>
      </footer>
    </div>
  );
};

export default LandingPage;