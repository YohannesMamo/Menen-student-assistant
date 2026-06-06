
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PdfViewer from './PdfViewer';
import ButtonGroup from './ButtonGroup';

import {
  FileText, CheckCircle, ChevronLeft, Loader2,
  ChevronDown, ChevronRight, Search, Volume2, VolumeX,
  Clock, Target, Maximize2, Minimize2, AlertCircle, Play, Pause, StopCircle,
  Award, Lightbulb, ListChecks, Hash, MonitorPlay, UserCheck, X
} from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================
interface Textbook {
  stbId: string;
  title: string;
  subject: string;
  grade: string;
  pdfUrl: string;
}

interface Section {
  sectionId: string;
  title: string;
  chapterId: number;
  startPage?: number;
  endPage?: number;
}

interface ChapterGroup {
  chapterId: number;
  title: string;
  sections: Section[];
}

interface BasicNotes {
  notes: string;
  summary: string;
  keywords: string;
  solvedExamples?: string;
}

interface PresentationData {
  title: string;
  slides: string[];
  fileUrl?: string;
}

// ==================== CONSTANTS ====================
const API_BASE = "/api/study";

// ==================== MAIN COMPONENT ====================
const StudyPage: React.FC = () => {
  const { stbId } = useParams<{ stbId: string }>();
  const navigate = useNavigate();

  // ==================== REFS ====================
  const pdfViewerRef = useRef<any>(null);

  // ==================== PDF STATE ====================
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading] = useState(false);
  const [pdfError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(0);
  const [, setScale] = useState(1.2);

  // ==================== TTS STATE ====================
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const [isReadingTextbook, setIsReadingTextbook] = useState(false);

  // ==================== SECTION PAGE MAPPING ====================
  const [sectionPageMap, setSectionPageMap] = useState<Map<string, number>>(new Map());

  // ==================== QUIZ STATE ====================
  const [quizAvailable, setQuizAvailable] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [completingSection, setCompletingSection] = useState(false);

  // ==================== STUDY HELPERS STATE ====================
  const [basicNotes, setBasicNotes] = useState<BasicNotes | null>(null);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [loadingHelpers, setLoadingHelpers] = useState(false);
  const [showHelpersPanel, setShowHelpersPanel] = useState(false);
  const [activeHelperTab, setActiveHelperTab] = useState<'notes' | 'summary' | 'keywords' | 'solved' | 'presentation'>('notes');

  // ==================== STUDENT NOTES STATE ====================
  const [studentNoteText, setStudentNoteText] = useState("");
  const [savingStudentNote, setSavingStudentNote] = useState(false);
  const [showStudentNotes, setShowStudentNotes] = useState(false);
  const [lastSavedNote] = useState('');
  const [autosaveTimeout, setAutosaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isAutosaving] = useState(false);

  // ==================== PRESENTATION STATE ====================
  const [currentPresentationSlide, setCurrentPresentationSlide] = useState(0);

  // ==================== MAIN UI STATE ====================
  const [book, setBook] = useState<Textbook | null>(null);
  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [studyTime, setStudyTime] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ==================== BUTTON PANEL STATE ====================
 // const [activeButton, setActiveButton] = useState<'notes' | 'helpers' | 'tts' | null>(null);
 // const [isTtsPlaying, setIsTtsPlaying] = useState(false);
 // const [, setShowNotesPanel] = useState(false);

  // ==================== HELPER FUNCTIONS ====================
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600'
    };
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const calculateProgress = () => {
    const totalSections = chapters.reduce((acc, ch) => acc + ch.sections.length, 0);
    if (totalSections === 0) return 0;
    return Math.round((completedSections.size / totalSections) * 100);
  };

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getFilteredChapters = () => {
    if (!searchQuery.trim()) return chapters;
    return chapters
      .map(chapter => ({
        ...chapter,
        sections: chapter.sections.filter(section =>
          section.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(chapter => chapter.sections.length > 0);
  };

  // ==================== PDF NAVIGATION ====================
  const updatePageInfo = () => {
    if (pdfViewerRef.current) {
      setCurrentPage(pdfViewerRef.current.getCurrentPage?.() || 1);
      setTotalPages(pdfViewerRef.current.getTotalPages?.() || 0);
      setScale(pdfViewerRef.current.getScale?.() || 1.2);
    }
  };

  const goToPage = (targetPage: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.jumpToPage(targetPage - 1);
    }
  };

  // ==================== TTS FUNCTIONS ====================
  const stopTTS = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setTtsSpeaking(false);
    setTtsPaused(false);
  };

  const pauseTTS = () => {
    if (window.speechSynthesis.speaking && !ttsPaused) {
      window.speechSynthesis.pause();
      setTtsPaused(true);
    }
  };

  const resumeTTS = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setTtsPaused(false);
    }
  };

  const toggleTTS = () => {
    if (!ttsEnabled) {
      if ('speechSynthesis' in window) {
        setTtsEnabled(true);
        showNotification('TTS enabled', 'info');
      } else {
        showNotification('Text-to-speech not supported', 'error');
      }
    } else {
      setTtsEnabled(false);
      stopTTS();
      showNotification('TTS disabled', 'info');
    }
  };

  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    stopTTS();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate;
    utterance.onstart = () => setTtsSpeaking(true);
    utterance.onend = () => setTtsSpeaking(false);
    utterance.onerror = () => setTtsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const readCurrentPageText = async () => {
    if (!pdfViewerRef.current) return;
    try {
      setIsReadingTextbook(true);
      const text = await pdfViewerRef.current.getCurrentPageText();
      if (!text || text.trim().length === 0) {
        setIsReadingTextbook(false);
        return;
      }
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = ttsRate;
      utterance.onend = () => setIsReadingTextbook(false);
      utterance.onerror = () => setIsReadingTextbook(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to read page:', error);
      setIsReadingTextbook(false);
    }
  };

  const stopReadingTextbook = () => {
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    setIsReadingTextbook(false);
  };

  const readCurrentHelper = () => {
    let text = '';
    if (activeHelperTab === 'notes' && basicNotes?.notes) text = basicNotes.notes;
    else if (activeHelperTab === 'summary' && basicNotes?.summary) text = basicNotes.summary;
    else if (activeHelperTab === 'keywords' && basicNotes?.keywords) text = basicNotes.keywords;
    if (!text) {
      showNotification('No content to read', 'info');
      return;
    }
    speakText(text);
  };

  const readStudentNote = () => {
    if (studentNoteText?.trim()) speakText(studentNoteText);
    else showNotification('No student notes to read', 'info');
  };

  // ==================== COPY FUNCTIONS ====================
  const copyCurrentPageText = async () => {
    const pageText = pdfViewerRef.current?.getCurrentPageText?.();
    if (pageText) {
      await navigator.clipboard.writeText(pageText);
      showNotification('Page text copied!', 'success');
    }
  };

  const copySelectedText = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    if (selectedText?.trim()) {
      navigator.clipboard.writeText(selectedText);
      showNotification('Selected text copied!', 'success');
      if (ttsEnabled) speakText(selectedText);
    } else {
      showNotification('Select some text first', 'info');
    }
  };

  // ==================== BUTTON HANDLERS ====================
  //const handleTtsStart = () => {
    //setIsTtsPlaying(true);
 //   console.log('TTS started');
 // };

//  const handleTtsStop = () => {
//    setIsTtsPlaying(false);
//    console.log('TTS stopped');
//  };

  // ==================== DATA LOADING ====================
  const loadStudyHelpers = async (section: Section) => {
    setLoadingHelpers(true);
    try {
      const token = localStorage.getItem('token');
      const basicNotesRes = await fetch(`${API_BASE}/basic-notes/${stbId}/${section.chapterId}/${section.sectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (basicNotesRes.ok) {
        const data = await basicNotesRes.json();
        setBasicNotes({
          notes: data.stbnotes || 'No notes available for this section.',
          summary: data.stbsummary || 'No summary available.',
          keywords: data.stbkeywords || 'No keywords available.',
          solvedExamples: data.stbsolvEx
        });
      } else {
        setBasicNotes({
          notes: `Study notes for ${section.title}. This section covers important concepts related to the topic.`,
          summary: `This section introduces fundamental concepts and principles.`,
          keywords: 'concept, principle, application, example'
        });
      }
      const presentationRes = await fetch(`${API_BASE}/presentation/${stbId}/${section.chapterId}/${section.sectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (presentationRes.ok) {
        const data = await presentationRes.json();
        setPresentation({
          title: data.title || `${section.title} Presentation`,
          slides: data.slides || [],
          fileUrl: data.fileUrl
        });
      } else {
        setPresentation(null);
      }
    } catch (error) {
      console.error('Failed to load study helpers:', error);
      setBasicNotes({
        notes: `Study notes for ${section.title}. This section covers important concepts.`,
        summary: `Section summary for ${section.title}.`,
        keywords: 'key concepts, important terms'
      });
    } finally {
      setLoadingHelpers(false);
    }
  };

  const loadStudentNote = async (section: Section) => {
    if (!section?.chapterId || !section?.sectionId) return;
    try {
      const token = localStorage.getItem('token');
      const studentId = localStorage.getItem('studentId');
      const response = await fetch(`${API_BASE}/student-notes/${studentId}/${stbId}/${section.chapterId}/${section.sectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const note = await response.json();
        setStudentNoteText(note?.noteText || "");
      } else {
        const savedNote = localStorage.getItem(`student_note_${stbId}_${section.sectionId}`);
        setStudentNoteText(savedNote || "");
      }
    } catch (error) {
      console.error('Failed to load student note:', error);
      const savedNote = localStorage.getItem(`student_note_${stbId}_${section.sectionId}`);
      if (savedNote) setStudentNoteText(savedNote);
    }
  };

  const saveStudentNote = async () => {
    if (!activeSection || !studentNoteText.trim()) return;
    setSavingStudentNote(true);
    try {
      const token = localStorage.getItem('token');
      const studentId = localStorage.getItem('studentId');
      const response = await fetch(`${API_BASE}/student-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentId,
          stbid: stbId,
          chapterId: activeSection.chapterId,
          sectionId: activeSection.sectionId,
          noteText: studentNoteText,
          pageNumber: currentPage,
          timestamp: new Date().toISOString()
        })
      });
      if (response.ok) {
        showNotification('Note saved!', 'success');
      } else {
        localStorage.setItem(`student_note_${stbId}_${activeSection.sectionId}`, studentNoteText);
        showNotification('Note saved locally', 'info');
      }
    } catch (error) {
      console.error('Failed to save student note:', error);
      localStorage.setItem(`student_note_${stbId}_${activeSection.sectionId}`, studentNoteText);
      showNotification('Note saved locally', 'info');
    } finally {
      setSavingStudentNote(false);
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setStudentNoteText(newText);
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    const timeout = setTimeout(() => {
      if (newText !== lastSavedNote) saveStudentNote();
    }, 1500);
    setAutosaveTimeout(timeout);
  };

  const checkQuizAvailability = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/quiz/check/${stbId}/${activeSection?.chapterId}/${activeSection?.sectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.hasQuiz === true;
      }
      return false;
    } catch (error) {
      console.error('Failed to check quiz availability:', error);
      return false;
    }
  };

  const markAsComplete = async () => {
    if (!activeSection || completingSection) return;
    setCompletingSection(true);
    try {
      const token = localStorage.getItem('token');
      const timeSpent = Math.floor((Date.now() - (studyTime * 60000)) / 1000);
      const response = await fetch(`${API_BASE}/progress/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: localStorage.getItem('studentId'),
          textbookId: stbId,
          chapterId: activeSection.chapterId,
          sectionId: activeSection.sectionId,
          timeSpentSeconds: timeSpent,
          pageNumber: currentPage
        })
      });
      if (response.ok) {
        setCompletedSections(prev => new Set([...prev, activeSection.sectionId]));
        showNotification(`✓ "${activeSection.title}" completed!`, 'success');
        const hasQuiz = await checkQuizAvailability();
        if (hasQuiz) {
          setQuizAvailable(true);
          setShowQuizPrompt(true);
          showNotification('🎯 Quiz available! Test your knowledge.', 'info');
        } else {
          setQuizAvailable(true);
          setShowQuizPrompt(true);
          showNotification('🎯 Test Quiz available!', 'info');
        }
      } else {
        setCompletedSections(prev => new Set([...prev, activeSection.sectionId]));
        showNotification(`✓ "${activeSection.title}" completed! (Demo mode)`, 'success');
        setQuizAvailable(true);
        setShowQuizPrompt(true);
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
      setCompletedSections(prev => new Set([...prev, activeSection.sectionId]));
      showNotification(`✓ "${activeSection.title}" completed! (Demo mode)`, 'success');
      setQuizAvailable(true);
      setShowQuizPrompt(true);
    } finally {
      setCompletingSection(false);
    }
  };

  const takeQuiz = () => {
    if (!activeSection) return;
    navigate(`/quiz/${stbId}/${activeSection.chapterId}/${activeSection.sectionId}`, {
      state: {
        sectionTitle: activeSection.title,
        textbookTitle: book?.title,
        sectionId: activeSection.sectionId,
        chapterId: activeSection.chapterId
      }
    });
  };

  const continueStudying = () => setShowQuizPrompt(false);

  const handleSectionClick = async (section: Section) => {
    setActiveSection(section);
    const targetPage = sectionPageMap.get(section.sectionId) || section.startPage || 1;
    goToPage(targetPage);
    await loadStudyHelpers(section);
    await loadStudentNote(section);
    setShowQuizPrompt(false);
    setQuizAvailable(false);
  };

  // ==================== EFFECTS ====================
  // ==========================================================================
  // EFFECT: MAIN TEXTBOOK & DATA INGESTION ENGINE
  // ==========================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        // Secure token grab from Replit environment vault (Vite compiler specific)
        const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

// --------------------------------------------------------------------
// PHASE 1: TEXTBOOK METADATA & GOOGLE DRIVE SOURCE LOGIC (FIXED FOR REACT-PDF-VIEWER)
// --------------------------------------------------------------------
try {
  const bookRes = await fetch(`${API_BASE}/textbook/${stbId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (bookRes.ok) {
    const bookData = await bookRes.json();
    setBook(bookData);

    if (bookData.pdfUrl) {
      setPdfUrl(bookData.pdfUrl);
    } else if (bookData.googleDriveId) {
      // FIX: Use the clean byte export download link format for @react-pdf-viewer/core
      setPdfUrl(`https://google.com{bookData.googleDriveId}`);
    } else {
      setPdfUrl('');
    }
  } else {
    // Fallback logic if database query fails
    const fallbackDriveId = 'YOUR_DEFAULT_GOOGLE_DRIVE_FILE_ID';
    setBook({
      stbId: stbId || '',
      title: 'Biology Textbook',
      subject: 'Biology',
      grade: 'Grade 12',
      googleDriveId: fallbackDriveId
    });
    setPdfUrl(`https://google.com{fallbackDriveId}`);
  }
} catch (error) {
  console.error("Critical error in Phase 1:", error);
}

        // --------------------------------------------------------------------
        // PHASE 2: CHAPTER & SECTION METADATA INGESTION
        // --------------------------------------------------------------------
        const chaptersRes = await fetch(`${API_BASE}/chapters/${stbId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        let chapterGroups: ChapterGroup[] = [];

        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          chapterGroups = chaptersData.map((ch: any) => ({
            chapterId: ch.chapterId,
            title: ch.title || `Chapter ${ch.chapterId}`,
            sections: ch.sections.map((s: any) => ({
              sectionId: s.sectionId,
              title: s.title,
              chapterId: s.chapterId,
              startPage: s.startPage,
              endPage: s.endPage
            }))
          }));
        } else {
          // Hardcoded layout fallback for high school course mapping
          chapterGroups = [
            {
              chapterId: 1,
              title: 'Chapter 1: Introduction',
              sections: [
                { sectionId: '1', title: '1.1 Introduction', chapterId: 1, startPage: 1 },
                { sectionId: '2', title: '1.2 Basic Concepts', chapterId: 1, startPage: 10 },
                { sectionId: '3', title: '1.3 Advanced Topics', chapterId: 1, startPage: 20 }
              ]
            },
            {
              chapterId: 2,
              title: 'Chapter 2: Properties',
              sections: [
                { sectionId: '4', title: '2.1 Properties', chapterId: 2, startPage: 30 },
                { sectionId: '5', title: '2.2 Applications', chapterId: 2, startPage: 40 }
              ]
            }
          ];
        }

        // --------------------------------------------------------------------
        // PHASE 3: STATE REDUCTION & DATA DICTIONARY GENERATION
        // --------------------------------------------------------------------
        const pageMap = new Map<string, number>();
        chapterGroups.forEach(ch => {
          ch.sections.forEach(section => {
            pageMap.set(section.sectionId, section.startPage || 1);
          });
        });
        setSectionPageMap(pageMap);
        setChapters(chapterGroups);

        // --------------------------------------------------------------------
        // PHASE 4: FIRST-RUN UI VIEWER STATES INITIALIZATION
        // --------------------------------------------------------------------
        if (chapterGroups.length > 0) {
          setExpandedChapters(new Set([chapterGroups[0].chapterId]));
          if (chapterGroups[0].sections.length > 0) {
            setActiveSection(chapterGroups[0].sections[0]);
            await loadStudyHelpers(chapterGroups[0].sections[0]);
            await loadStudentNote(chapterGroups[0].sections[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);

        // Global Error Fallback - Mirroring identical configuration using Cloud links
        const errorApiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
        const errorFallbackDriveId = 'YOUR_DEFAULT_GOOGLE_DRIVE_FILE_ID';

        setBook({
          stbId: stbId || '',
          title: 'Science Textbook',
          subject: 'Science',
          grade: 'Grade 10',
          googleDriveId: errorFallbackDriveId
        });
        setPdfUrl(`https://google.com{errorFallbackDriveId}&key=${errorApiKey}`);

        const fallbackChapters: ChapterGroup[] = [
          {
            chapterId: 1,
            title: 'Chapter 1: Introduction',
            sections: [
              { sectionId: '1', title: '1.1 Introduction', chapterId: 1, startPage: 1 },
              { sectionId: '2', title: '1.2 Basic Concepts', chapterId: 1, startPage: 10 },
              { sectionId: '3', title: '1.3 Advanced Topics', chapterId: 1, startPage: 20 }
            ]
          },
          {
            chapterId: 2,
            title: 'Chapter 2: Properties',
            sections: [
              { sectionId: '4', title: '2.1 Properties', chapterId: 2, startPage: 30 },
              { sectionId: '5', title: '2.2 Applications', chapterId: 2, startPage: 40 }
            ]
          }
        ];

        const fallbackPageMap = new Map<string, number>();
        fallbackChapters.forEach(ch => {
          ch.sections.forEach(section => {
            fallbackPageMap.set(section.sectionId, section.startPage || 1);
          });
        });
        setSectionPageMap(fallbackPageMap);
        setChapters(fallbackChapters);

        if (fallbackChapters.length > 0) {
          setExpandedChapters(new Set([fallbackChapters[0].chapterId]));
          if (fallbackChapters[0].sections.length > 0) {
            setActiveSection(fallbackChapters[0].sections[0]);
            setBasicNotes({
              notes: `Study notes for ${fallbackChapters[0].sections[0].title}.`,
              summary: `Section summary.`,
              keywords: 'key concepts, important terms'
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (stbId) loadData();
  }, [stbId]);

  useEffect(() => {
    const timer = setInterval(() => setStudyTime(prev => prev + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedCompleted = localStorage.getItem(`completed_sections_${stbId}`);
    if (savedCompleted) setCompletedSections(new Set(JSON.parse(savedCompleted)));
  }, [stbId]);

  useEffect(() => {
    if (completedSections.size > 0) {
      localStorage.setItem(`completed_sections_${stbId}`, JSON.stringify(Array.from(completedSections)));
    }
  }, [completedSections, stbId]);

  useEffect(() => {
    if (activeSection && currentPage) loadStudentNote(activeSection);
  }, [activeSection, currentPage]);


  // Keyboard navigation for presentation slides
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (activeHelperTab === 'presentation' && presentation?.slides?.length && presentation.slides.length > 0) {
      if (e.key === 'ArrowLeft') {
        setCurrentPresentationSlide(prev => Math.max(0, (prev || 0) - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPresentationSlide(prev => Math.min(presentation.slides.length - 1, (prev || 0) + 1));
      }
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [activeHelperTab, presentation?.slides?.length]);

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your study materials...</p>
        </div>
      </div>
    );
  }

  const filteredChapters = getFilteredChapters();
  const isCurrentSectionCompleted = activeSection ? completedSections.has(activeSection.sectionId) : false;

  // ==================== RENDER (JSX) ====================
  return (
    <div className={`flex ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} bg-gradient-to-br from-slate-50 to-indigo-50/20 overflow-hidden`}>

      {/* ==================== LEFT SIDEBAR - Navigation ==================== */}
      <div className="w-72 border-r border-slate-200 flex flex-col bg-white shadow-xl overflow-hidden">

        {/* Sidebar Header */}
        <div className="p-4 border-b rounded-t-xl border-slate-200 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <button onClick={() => navigate('/dashboard')} className="flex items-center text-sm text-indigo-100 hover:text-white transition-colors mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </button>
          <h2 className="font-bold text-base leading-tight mb-1 line-clamp-2">{book?.title}</h2>
          <div className="flex items-center gap-2 text-xs text-indigo-100">
            <span className="px-2 py-0.5 bg-white/20 rounded">{book?.subject}</span>
            <span className="px-2 py-0.5 bg-white/20 rounded">Grade {book?.grade}</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1">
              <Clock className="h-3 w-3" />
              <span>{formatStudyTime(studyTime)}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1">
              <Target className="h-3 w-3" />
              <span>{calculateProgress()}%</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredChapters.map((chapter) => (
            <div key={chapter.chapterId} className="mb-1">
              <button
                onClick={() => toggleChapter(chapter.chapterId)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-sm group"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-bold text-indigo-700 text-xs uppercase tracking-wider">Chapter {chapter.chapterId}</span>
                  <span className="font-semibold text-slate-800 text-sm line-clamp-1">{chapter.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full font-semibold">{chapter.sections.length}</span>
                  {expandedChapters.has(chapter.chapterId) ? <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-600" />}
                </div>
              </button>
              {expandedChapters.has(chapter.chapterId) && (
                <div className="ml-3 mt-1 space-y-0.5">
                  {chapter.sections.map((section) => {
                    const isCompleted = completedSections.has(section.sectionId);
                    const foundPage = sectionPageMap.get(section.sectionId);
                    return (
                      <button
                        key={section.sectionId}
                        onClick={() => handleSectionClick(section)}
                        className={`w-full text-left p-2 rounded-lg transition-all text-sm ${
                          activeSection?.sectionId === section.sectionId ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'
                        } ${isCompleted ? 'border-l-3 border-green-500' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs opacity-70 flex items-center gap-1">
                              <span>📄 {foundPage || section.startPage || '?'}</span>
                              {isCompleted && <CheckCircle size={10} className="text-green-500" />}
                            </div>
                            <div className="text-xs font-medium truncate">{section.title}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Study Progress */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-xs text-slate-600 mb-1">Chapter Progress</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                    style={{ 
                      width: `${chapters.length > 0 ? Math.round((chapters.reduce((sum, ch) => sum + ch.sections.filter(s => completedSections.has(s.sectionId)).length, 0) / chapters.reduce((sum, ch) => sum + ch.sections.length, 0)) * 100) : 0}%` 
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-600">
                  {chapters.length > 0 ? Math.round((chapters.reduce((sum, ch) => sum + ch.sections.filter(s => completedSections.has(s.sectionId)).length, 0) / chapters.reduce((sum, ch) => sum + ch.sections.length, 0)) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0 rounded-t-md">

        {/* Reading Status Indicator */}
        {isReadingTextbook && (
          <div className="flex items-center gap-1 bg-indigo-100 rounded-lg px-2 py-1 m-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-700">Reading...</span>
            <button onClick={stopReadingTextbook} className="ml-1 p-0.5 hover:bg-indigo-200 rounded"><X size={12} /></button>
          </div>
        )}

        {/* ==================== TOP BAR ==================== */}
        <div className="h-12 rounded-t-xl bg-gradient-to-r from-purple-500 to-indigo-600 border-b border-slate-200 flex items-center justify-between px-4 bg-white shadow-sm">

          {/* Left Side - ButtonGroup */}
          <div className="flex items-center gap-2">
            <ButtonGroup
              onNotesClick={() => setShowStudentNotes(!showStudentNotes)}
              onHelpersClick={() => setShowHelpersPanel(!showHelpersPanel)}
              onTtsClick={toggleTTS}
              activeButton={showStudentNotes ? 'notes' : showHelpersPanel ? 'helpers' : ttsEnabled ? 'tts' : null}
              isTtsPlaying={ttsEnabled && ttsSpeaking}
            />
          </div>

          {/* Right Side - TTS Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
              <button onClick={toggleTTS} className={`p-1 rounded transition-colors ${ttsEnabled ? 'text-indigo-600 bg-indigo-100' : 'text-slate-500'}`}>
                {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              {ttsEnabled && (
                <>
                  <button onClick={readStudentNote} className="p-1 text-slate-600 hover:text-indigo-600" title="Read my notes"><UserCheck size={12} /></button>
                  <button onClick={readCurrentHelper} className="p-1 text-slate-600 hover:text-indigo-600" title="Read study notes"><Lightbulb size={12} /></button>
                  <button onClick={readCurrentPageText} className="p-1 rounded hover:bg-slate-100 transition-colors" title="Read page aloud"><Volume2 size={14} /></button>
                  {ttsSpeaking && !ttsPaused && <button onClick={pauseTTS} className="p-1 text-slate-600"><Pause size={12} /></button>}
                  {ttsPaused && <button onClick={resumeTTS} className="p-1 text-slate-600"><Play size={12} /></button>}
                  {(ttsSpeaking || ttsPaused) && <button onClick={stopTTS} className="p-1 text-slate-600"><StopCircle size={12} /></button>}
                  <select value={ttsRate} onChange={(e) => setTtsRate(parseFloat(e.target.value))} className="text-xs border rounded px-1 py-0.5">
                    <option value="0.5">0.5x</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                  </select>
                </>
              )}
            </div>

            {/* Copy Buttons */}
            <div className="flex items-center gap-1">
              <button onClick={copyCurrentPageText} className="p-1 rounded hover:bg-slate-100 transition-colors" title="Copy all page text"><FileText size={14} /></button>
              <button onClick={copySelectedText} className="p-1 rounded hover:bg-slate-100 transition-colors" title="Copy selected text"><span className="text-xs font-bold">📋</span></button>
            </div>

            {/* Mark Complete Button */}
            {activeSection && (
              <button 
                onClick={markAsComplete} 
                disabled={isCurrentSectionCompleted || completingSection} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-lg transform hover:scale-105 active:scale-95 ${
                  isCurrentSectionCompleted 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200 cursor-default' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-indigo-200'
                }`}
              >
                {completingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                <span>{isCurrentSectionCompleted ? '✓ Completed' : 'Mark Complete'}</span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-slate-100 rounded">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* ==================== QUIZ PROMPT BANNER ==================== */}
        {showQuizPrompt && quizAvailable && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 px-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span className="text-sm font-medium">Quiz available for "{activeSection?.title}"</span>
              </div>
              <div className="flex gap-2">
                <button onClick={takeQuiz} className="px-3 py-1 bg-white text-indigo-600 rounded text-sm font-semibold hover:bg-indigo-50 transition-colors">Take Quiz</button>
                <button onClick={continueStudying} className="px-3 py-1 bg-indigo-700 text-white rounded text-sm hover:bg-indigo-800 transition-colors">Later</button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PDF VIEWER ==================== */}
        <div className="flex-1 bg-slate-100 min-w-0 overflow-hidden rounded-t-x">
          <div className="h-full w-full">
            {pdfError ? (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm">{pdfError}</p>
                </div>
              </div>
            ) : pdfLoading ? (
              <div className="flex items-center justify-center h-full rounded-t-x">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 rounded-t-x" />
              </div>
            ) : (
              pdfUrl && (
                <PdfViewer ref={pdfViewerRef} fileUrl={pdfUrl} onLoad={updatePageInfo} />
              )
            )}
          </div>
        </div>
      </div>

      {/* ==================== FLOATING STUDY HELPERS PANEL ==================== */}
      {showHelpersPanel && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowHelpersPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Lightbulb size={16} className="text-indigo-600" /> Study Helpers</h3>
              <button onClick={() => setShowHelpersPanel(false)} className="p-1 hover:bg-slate-200 rounded"><X size={14} /></button>
            </div>
            <div className="border-b border-slate-200 px-3 pt-2">
              <div className="flex gap-1">
                <button onClick={() => setActiveHelperTab('notes')} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeHelperTab === 'notes' ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><Lightbulb className="h-3 w-3 inline mr-1" /> Notes</button>
                <button onClick={() => setActiveHelperTab('summary')} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeHelperTab === 'summary' ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><ListChecks className="h-3 w-3 inline mr-1" /> Summary</button>
                <button onClick={() => setActiveHelperTab('keywords')} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeHelperTab === 'keywords' ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><Hash className="h-3 w-3 inline mr-1" /> Keywords</button>
                <button onClick={() => setActiveHelperTab('solved')} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeHelperTab === 'solved' ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><CheckCircle className="h-3 w-3 inline mr-1" /> Examples</button>
                {presentation && <button onClick={() => setActiveHelperTab('presentation')} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeHelperTab === 'presentation' ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><MonitorPlay className="h-3 w-3 inline mr-1" /> Slides</button>}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingHelpers ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
              ) : (
                <>
                  {activeHelperTab === 'notes' && (
                    <div><h4 className="text-indigo-600 text-sm font-semibold mb-2">📖 Study Notes</h4><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-slate-700 text-sm whitespace-pre-wrap">{basicNotes?.notes || 'No notes available.'}</p></div></div>
                  )}
                  {activeHelperTab === 'summary' && (
                    <div><h4 className="text-indigo-600 text-sm font-semibold mb-2">📋 Section Summary</h4><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-slate-700 text-sm whitespace-pre-wrap">{basicNotes?.summary || 'No summary available.'}</p></div></div>
                  )}
                  {activeHelperTab === 'keywords' && (
                    <div><h4 className="text-indigo-600 text-sm font-semibold mb-3">🔑 Key Terms</h4><div className="flex flex-wrap gap-2">{basicNotes?.keywords?.split(',').map((kw, idx) => <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs border border-indigo-200">{kw.trim()}</span>) || <p className="text-slate-500 text-sm">No keywords available.</p>}</div></div>
                  )}
                  {activeHelperTab === 'solved' && (
                    <div>
                      <h4 className="text-indigo-600 text-sm font-semibold mb-3">✓ Solved Examples</h4>
                      <div className="space-y-3">
                        {basicNotes?.solvedExamples ? (
                          basicNotes.solvedExamples.split('\n\n').filter(Boolean).map((example, idx) => (
                            <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <div className="text-slate-700 text-sm whitespace-pre-wrap">{example}</div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-sm">No examples available for this section.</p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeHelperTab === 'presentation' && presentation && (
                    <div className="presentation-slideshow">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-indigo-600 text-sm font-semibold">📊 {presentation.title || 'Presentation'}</h4>
                        {presentation.slides && presentation.slides.length > 0 && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            Slide {(currentPresentationSlide || 0) + 1} of {presentation.slides.length}
                          </span>
                        )}
                      </div>

                      {presentation.slides && presentation.slides.length > 0 ? (
                        <div className="presentation-viewer">
                          {/* Slide Content */}
                          <div className="slide-area bg-slate-50 rounded-lg border border-slate-200 p-4 min-h-[300px] flex flex-col items-center justify-center">
                            <p className="text-slate-700 text-sm whitespace-pre-wrap">
                              {presentation.slides[currentPresentationSlide || 0]}
                            </p>
                          </div>

                          {/* Navigation */}
                          <div className="flex justify-center gap-2 mt-4">
                            <button
                              onClick={() => setCurrentPresentationSlide(prev => Math.max(0, (prev || 0) - 1))}
                              disabled={!currentPresentationSlide}
                              className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50 text-sm"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCurrentPresentationSlide(prev => Math.min(presentation.slides.length - 1, (prev || 0) + 1))}
                              disabled={currentPresentationSlide === presentation.slides.length - 1}
                              className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50 text-sm"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No slides available.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== STUDENT NOTES PANEL ==================== */}
      {showStudentNotes && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowStudentNotes(false)} />
          <div className="fixed bottom-0 left-0 right-0 h-80 bg-white z-50 rounded-t-2xl shadow-2xl border-t border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <UserCheck size={18} className="text-indigo-600" />
                </div>
                My Notes
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={readStudentNote} className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors" title="Read Aloud">
                  <Volume2 size={18} className="text-indigo-600" />
                </button>
                <button onClick={() => setShowStudentNotes(false)} className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={studentNoteText}
                onChange={handleNoteChange}
                placeholder="Take notes while studying..."
                className="w-full h-40 p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {isAutosaving && <span className="text-xs text-slate-500">Saving...</span>}
              {savingStudentNote && <Loader2 size={14} className="text-indigo-600 animate-spin" />}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default StudyPage;
