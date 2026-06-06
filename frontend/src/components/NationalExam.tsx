// src/components/NationalExam.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Clock, Award, ChevronRight } from 'lucide-react';

interface Exam {
  id: string;
  subject: string;
  year: number;
  type: 'National' | 'Regional' | 'Model';
  duration: number;
  totalQuestions: number;
  difficulty: string;
}

const NationalExam: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    fetchExams();
  }, [selectedSubject, selectedYear]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = '/api/exams';
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedYear) params.append('year', selectedYear);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExams(data);
        // Extract unique subjects and years
        const uniqueSubjects = [...new Set(data.map((e: Exam) => e.subject))] as string[];
        const uniqueYears = [...new Set(data.map((e: Exam) => e.year))] as number[];
        setSubjects(uniqueSubjects);
        setYears(uniqueYears.sort((a, b) => b - a));
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const startExam = (examId: string) => {
    // Navigate to exam taking page
    window.location.href = `/take-exam/${examId}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">National Examinations</h1>
        <p className="text-gray-600">Practice with real past national exams</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="bg-indigo-50 p-4 border-b">
                <h3 className="font-semibold text-lg text-gray-800">{exam.subject}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{exam.year}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    exam.type === 'National' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {exam.type}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{exam.totalQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{exam.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{exam.difficulty}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => startExam(exam.id)}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  Start Exam
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {exams.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No exams found for the selected criteria.</p>
        </div>
      )}
    </div>
  );
};

export default NationalExam;                                                                                                                                                                                                        