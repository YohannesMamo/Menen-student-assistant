import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import StudentRegistration from './components/StudentRegistration';

import Dashboard from './components/Dashboard';
import StudyPage from './components/StudyPage';
//import {StudyHub} from './components/StudyHub';
import QuizPage from './components/QuizPage';
import QuizGateway from './components/QuizGateway';

import ExamPage from './components/ExamPage';
import ExamSessionPage from './components/ExamSessionPage';
import PracticeExamPage from './components/PracticeExamPage';
import FormalExamPage from './components/FormalExamPage';
import ExamReviewPage from './components/ExamReviewPage';
import StudentStatusDashboard from "./components/StudentStatusDashboard";
import {ChatHub} from './components/ChatHub';
//import DevMenu from './components/DevMenu';
import CompleteProfile from "./components/CompleteProfile";

import { ChatProvider } from './contexts/ChatContext';
import axios from 'axios';

// 1. Fetch and clean up your live backend domain variable globally
let globalApiUrl = import.meta.env.VITE_API_URL || '';
if (globalApiUrl.endsWith('/')) {
  globalApiUrl = globalApiUrl.slice(0, -1);
}

// 2. Set the global base URL for every single standard axios call in the app
axios.defaults.baseURL = globalApiUrl;


//const StudyHubWrapper = () => {
//  return <StudyHub />;
//};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ChatProvider>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/student-registration" element={<StudentRegistration />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
      
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/study/:stbId/:chapterId?/:sectionId?" element={<StudyPage />} />
      
          <Route path="/quiz/:stbId" element={<QuizGateway />} />
          <Route path="/quiz/:stbId/:chapterId/:sectionId" element={<QuizPage />} />
          
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/exam/session" element={<ExamSessionPage />} />
          <Route path="/exam/practice" element={<PracticeExamPage />} />
          <Route path="/exam/formal" element={<FormalExamPage />} />
          <Route path="/student-status" element={<StudentStatusDashboard />} />
          <Route path="/exam-review" element={<ExamReviewPage />} />
          <Route path="/chat" element={<ChatHub />} />

          <Route path="/complete-profile" element={<CompleteProfile />} />
          
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
      
    </Routes>
    {/* Dev Menu - only in development */}
    {import.meta.env.DEV && <DevMenu />}
    </ChatProvider>
  );
  
}

export default App;