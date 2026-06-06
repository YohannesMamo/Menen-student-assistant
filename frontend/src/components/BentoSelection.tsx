import React, { useState, useEffect } from 'react';
import { Book, Layers, List, ChevronRight, Loader2, X } from 'lucide-react';

interface Textbook {
  STBID: string;
  STBTitle: string;
  STBGradeID: string;
  STBSubjectID: string;
  STBUrl?: string;
}

interface Chapter {
  chapterId: number;
  title: string;
  stbId: string;
}

interface Section {
  sectionId: string;
  title: string;
  chapterId: number;
  startPage?: number;
  endPage?: number;
}

interface BentoSelectionProps {
  onSelect?: (textbook: Textbook, chapter: Chapter, section: Section) => void;
  onClose?: () => void;
}

const BentoSelection: React.FC<BentoSelectionProps> = ({ onSelect, onClose }) => {
  const [studentGrade, setStudentGrade] = useState<string>('HIG11A');
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const [loadingTextbooks, setLoadingTextbooks] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  const token = localStorage.getItem('token');

  // Fetch textbooks when grade changes
  useEffect(() => {
    if (!token || !studentGrade) return;

    const fetchTextbooks = async () => {
      setLoadingTextbooks(true);
      try {
        const res = await fetch(`/api/study/textbooks?grade=${studentGrade}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTextbooks(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch textbooks:', err);
      } finally {
        setLoadingTextbooks(false);
      }
    };

    fetchTextbooks();
  }, [studentGrade, token]);

  // Fetch chapters when textbook changes
  useEffect(() => {
    if (!token || !selectedTextbook) return;

    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const res = await fetch(`/api/study/chapters/${selectedTextbook.STBID}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChapters(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
    setSelectedChapter(null);
    setSections([]);
    setSelectedSection(null);
  }, [selectedTextbook, token]);

  // Fetch sections when chapter changes
  useEffect(() => {
    if (!token || !selectedChapter) return;

    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const res = await fetch(`/api/study/sections/${selectedChapter.stbId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSections(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch sections:', err);
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
    setSelectedSection(null);
  }, [selectedChapter, token]);

  const handleConfirm = () => {
    if (selectedTextbook && selectedChapter && selectedSection && onSelect) {
      onSelect(selectedTextbook, selectedChapter, selectedSection);
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Bento Selection</h2>
              <p className="text-indigo-100 mt-1">Select Textbook → Chapter → Section</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            )}
          </div>
        </div>

        {/* Selection Info Bar */}
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-4 py-2 rounded-full font-semibold ${
              selectedTextbook ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
            }`}>
              📖 {selectedTextbook?.STBTitle || 'Textbook'}
            </span>
            <ChevronRight size={20} className="text-gray-400" />
            <span className={`px-4 py-2 rounded-full font-semibold ${
              selectedChapter ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
            }`}>
              📚 {selectedChapter?.title || 'Chapter'}
            </span>
            <ChevronRight size={20} className="text-gray-400" />
            <span className={`px-4 py-2 rounded-full font-semibold ${
              selectedSection ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
            }`}>
              📄 {selectedSection?.title || 'Section'}
            </span>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: Textbooks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Book className="text-indigo-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Textbooks</h3>
              </div>

              <input
                type="text"
                placeholder="Filter by grade..."
                value={studentGrade}
                onChange={(e) => setStudentGrade(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loadingTextbooks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : textbooks.length > 0 ? (
                  textbooks.map((book) => (
                    <button
                      key={book.STBID}
                      onClick={() => setSelectedTextbook(book)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedTextbook?.STBID === book.STBID
                          ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold text-gray-800">{book.STBTitle}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {book.STBSubjectID} • {book.STBGradeID}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No textbooks found for {studentGrade}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Chapters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Chapters</h3>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center text-blue-600">
                {selectedTextbook ? (
                  <span className="font-semibold">From: {selectedTextbook.STBTitle}</span>
                ) : (
                  <span>Select a textbook first</span>
                )}
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loadingChapters ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                ) : chapters.length > 0 ? (
                  chapters.map((chapter) => (
                    <button
                      key={chapter.chapterId}
                      onClick={() => setSelectedChapter(chapter)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedChapter?.chapterId === chapter.chapterId
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                          {chapter.chapterId}
                        </span>
                        <div className="font-semibold text-gray-800">{chapter.title}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    {selectedTextbook ? 'No chapters available' : 'Select textbook to see chapters'}
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Sections */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <List className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Sections</h3>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-center text-purple-600">
                {selectedChapter ? (
                  <span className="font-semibold">From: Chapter {selectedChapter.chapterId}</span>
                ) : (
                  <span>Select a chapter first</span>
                )}
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loadingSections ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                  </div>
                ) : sections.length > 0 ? (
                  sections.map((section) => (
                    <button
                      key={section.sectionId}
                      onClick={() => setSelectedSection(section)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedSection?.sectionId === section.sectionId
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800">{section.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        ID: {section.sectionId}
                        {section.startPage && ` • Pages ${section.startPage}-${section.endPage || '?'}`}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    {selectedChapter ? 'No sections available' : 'Select chapter to see sections'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Selected: <span className="font-bold">
              {selectedTextbook ? `${selectedTextbook.STBTitle}` : '---'}
              {selectedChapter ? ` → Ch.${selectedChapter.chapterId}` : ''}
              {selectedSection ? ` → ${selectedSection.title}` : ''}
            </span>
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={!selectedTextbook || !selectedChapter || !selectedSection}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoSelection;