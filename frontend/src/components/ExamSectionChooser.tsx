import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Section {
  chapterId: number;
  sectionId: string;
  questionCount: number;
}

const ExamSectionChooser: React.FC<{ onSectionSelect: (section: Section) => void }> = ({ onSectionSelect }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get('/api/exams?textbookId=GR12-BIO', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSections(res.data.availableSections || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchSections();
  }, []);

  if (loading) return <div className="text-center py-12">Loading available sections...</div>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-10">Choose a Section to Practice</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((sec) => (
          <div
            key={`${sec.chapterId}-${sec.sectionId}`}
            onClick={() => onSectionSelect(sec)}
            className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border border-gray-100 hover:border-indigo-200 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-sm text-gray-500">Chapter {sec.chapterId}</div>
                <div className="text-2xl font-semibold text-gray-800">Section {sec.sectionId}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600">{sec.questionCount}</div>
                <div className="text-xs text-gray-500">questions</div>
              </div>
            </div>
            <button className="w-full py-3 bg-indigo-600 text-white rounded-2xl group-hover:bg-indigo-700 transition">
              Start This Section
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamSectionChooser;