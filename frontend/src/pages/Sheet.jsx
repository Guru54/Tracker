import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Sparkles, FileDown, Plus, Loader2,
  Filter, CheckCircle, Clock, AlertCircle, RefreshCw, Search, X
} from 'lucide-react';
import Accordion from '../components/Accordion';
import ProgressBar from '../components/ProgressBar';
import AIGenerateModal from '../components/AIGenerateModal';
import { useToast } from '../components/Toast';
import { 
  getSubject, getTopicsBySubject, getQuestionsByTopic,
  createTopic, createQuestion, updateQuestion, deleteQuestion, bulkCreateQuestions
} from '../utils/api';
import { generateTopicPDF, generateSubjectPDF } from '../utils/pdfGenerator';

const Sheet = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [openAccordion, setOpenAccordion] = useState(null);
  // FIX #4: tracks explicit user clicks on an accordion header so that an
  // active search doesn't silently override the user's manual open/close choice.
  const [manuallyToggled, setManuallyToggled] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // AI Generate Modal states
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiGenerateType, setAiGenerateType] = useState('topics');
  const [aiTargetTopic, setAiTargetTopic] = useState(null);

  // Filter states
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // Reset manual-toggle overrides once search is cleared, so accordion
  // behavior goes back to the default open/closed state.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setManuallyToggled({});
    }
  }, [searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [{ data: subjectData }, { data: topicsData }] = await Promise.all([
        getSubject(subjectId),
        getTopicsBySubject(subjectId)
      ]);
      setSubject(subjectData);
      setTopics(topicsData);

      const results = await Promise.all(
        topicsData.map(topic => getQuestionsByTopic(topic._id).then(r => [topic._id, r.data]))
      );
      setQuestionsMap(Object.fromEntries(results));

      // Keep the current topic open after a refresh, but leave all topics
      // collapsed on the initial load.
      setOpenAccordion(prev => {
        if (prev && topicsData.some(t => t._id === prev)) return prev;
        return null;
      });
    } catch (err) {
      console.error('Error loading subject sheet:', err);
      setLoadError('Subject data load nahi ho paya. Connection check karke retry karo.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionUpdate = async (updatedQuestion) => {
    if (updatedQuestion._deleted) {
      const prevList = questionsMap[updatedQuestion.topicId] || [];
      setQuestionsMap(prev => ({
        ...prev,
        [updatedQuestion.topicId]: prev[updatedQuestion.topicId].filter(
          q => q._id !== updatedQuestion._id
        )
      }));
      try {
        await deleteQuestion(updatedQuestion._id);
      } catch (e) {
        console.error('Error deleting question:', e);
        toast.error('Question delete nahi ho paya — connection check karo.');
        setQuestionsMap(prev => ({ ...prev, [updatedQuestion.topicId]: prevList }));
      }
    } else {
      const topicQs = questionsMap[updatedQuestion.topicId] || [];
      const exists = topicQs.find(q => q._id === updatedQuestion._id);

      if (!exists) {
        try {
          const { data } = await createQuestion({
            topicId: updatedQuestion.topicId,
            subjectId: updatedQuestion.subjectId,
            title: updatedQuestion.title,
            difficulty: updatedQuestion.difficulty,
            platform: updatedQuestion.platform || 'Manual',
            link: updatedQuestion.link || '',
            status: updatedQuestion.status || 'Not Started'
          });
          setQuestionsMap(prev => ({
            ...prev,
            [updatedQuestion.topicId]: [...(prev[updatedQuestion.topicId] || []), data]
          }));
        } catch (err) {
          console.error('Error creating question:', err);
          toast.error('Question add nahi ho paya — connection check karke dobara try karo.');
        }
      } else {
        const prevList = topicQs;
        setQuestionsMap(prev => ({
          ...prev,
          [updatedQuestion.topicId]: prev[updatedQuestion.topicId].map(q => 
            q._id === updatedQuestion._id ? updatedQuestion : q
          )
        }));
        try {
          // FIX #1 (backend side): also persist previousStatus so a refresh
          // doesn't lose the "what it was before Done" info the checkbox toggle relies on.
          await updateQuestion(updatedQuestion._id, {
            status: updatedQuestion.status,
            ...(updatedQuestion.previousStatus !== undefined && {
              previousStatus: updatedQuestion.previousStatus
            })
          });
        } catch (e) {
          console.error('Error updating question:', e);
          toast.error('Status update save nahi hua — connection check karo.');
          setQuestionsMap(prev => ({ ...prev, [updatedQuestion.topicId]: prevList }));
        }
      }
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      const { data } = await createTopic({
        subjectId,
        name: newTopicName,
        description: '',
        order: topics.length
      });
      setTopics([...topics, data]);
      setQuestionsMap({ ...questionsMap, [data._id]: [] });
      setNewTopicName('');
      setShowAddTopic(false);
    } catch (err) {
      console.error('Error creating topic:', err);
      toast.error('Topic add nahi ho paya — connection check karke dobara try karo.');
    }
  };

  const handleOpenAIGenerateTopics = () => {
    setAiGenerateType('topics');
    setAiTargetTopic(null);
    setShowAIGenerate(true);
  };

  const handleOpenAIGenerateQuestions = (topic) => {
    setAiGenerateType('questions');
    setAiTargetTopic(topic);
    setShowAIGenerate(true);
  };

  const handleAIGenerated = async (data) => {
    if (aiGenerateType === 'topics') {
      let failCount = 0;
      for (const topicName of data) {
        try {
          await createTopic({ subjectId, name: topicName, order: topics.length });
        } catch (e) {
          console.error('Error creating topic from AI list:', e);
          failCount++;
        }
      }
      if (failCount > 0) toast.error(`${failCount}/${data.length} topics save nahi ho paye.`);
      fetchData();
    } else {
      const questionsToAdd = data.map(q => ({
        topicId: aiTargetTopic._id,
        subjectId,
        title: q.title,
        difficulty: q.difficulty,
        platform: q.platform || 'Manual',
        link: q.link || '',
        status: 'Not Started'
      }));

      try {
        await bulkCreateQuestions({ questions: questionsToAdd });
      } catch (e) {
        console.error('Error bulk-creating questions:', e);
        toast.error('Questions save nahi ho paye.');
      }
      fetchData();
    }
  };

  const handleDownloadTopicPDF = async (topic, questions) => {
    await generateTopicPDF(topic, questions);
  };

  const handleDownloadSubjectPDF = async () => {
    const allQuestions = Object.values(questionsMap).flat();
    await generateSubjectPDF(subject, topics, allQuestions);
  };

  const getFilteredQuestions = (questions) => {
    if (!questions) return [];
    let result = questions;
    switch (activeFilter) {
      case 'pending':
        result = result.filter(q => q.status !== 'Done');
        break;
      case 'easy':
        result = result.filter(q => q.difficulty === 'Easy');
        break;
      case 'medium':
        result = result.filter(q => q.difficulty === 'Medium');
        break;
      case 'hard':
        result = result.filter(q => q.difficulty === 'Hard');
        break;
      case 'leetcode':
        result = result.filter(q => q.platform === 'LeetCode');
        break;
      default:
        break;
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(q => q.title?.toLowerCase().includes(query));
    }
    return result;
  };

  const hasActiveFilter = activeFilter !== 'all' || searchQuery.trim().length > 0;
  const allQuestions = Object.values(questionsMap).flat();
  const totalSolved = allQuestions.filter(q => q.status === 'Done').length;
  const percentage = allQuestions.length > 0 ? Math.round((totalSolved / allQuestions.length) * 100) : 0;

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'easy', label: 'Easy' },
    { key: 'medium', label: 'Medium' },
    { key: 'hard', label: 'Hard', icon: AlertCircle },
    { key: 'leetcode', label: 'LeetCode' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-rose-300">{loadError}</p>
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={fetchData} className="btn-primary">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => navigate('/')} className="btn-ghost">
            Back to Vault
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Sleek Compact Sticky Header */}
      <div className="sticky top-0 z-30 bg-dark-900/95 backdrop-blur-xl border-b border-dark-700/60 pb-4 pt-2 -mt-2">
        
        {/* Top Breadcrumb & Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-dark-400 hover:text-white text-xs mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Vault
            </button>

            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{subject?.name}</h1>
              <button
                onClick={handleDownloadSubjectPDF}
                className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5 text-dark-300" />
                <span>Master PDF</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleOpenAIGenerateTopics}
            className="btn-primary text-xs sm:text-sm py-2 px-3 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-primary-300" />
            <span>Generate Topics with AI</span>
          </button>
        </div>

        {/* FIX #5: now actually rendering ProgressBar instead of a duplicate
            hand-rolled progress div + a dead unused import. */}
        <div className="bg-dark-800/80 rounded-xl p-3 border border-dark-700/50">
          <ProgressBar current={totalSolved} total={allQuestions.length} size="lg" />
          <div className="text-xs text-dark-400 mt-1">
            across {topics.length} topics
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Filter Chips */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question title..."
              className="w-full pl-10 pr-9 py-2 bg-dark-800/80 border border-dark-700/70 rounded-xl 
                       text-white text-xs sm:text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {filterButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeFilter === key
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'bg-dark-800/80 text-dark-400 hover:text-white hover:bg-dark-700/80 border border-dark-700/50'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Topics Accordion Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Topics & Questions</span>
            <span className="text-xs font-normal text-dark-400">({topics.length})</span>
          </h2>
          <button
            onClick={() => setShowAddTopic(true)}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Topic
          </button>
        </div>

        {topics.map((topic) => {
          const filtered = getFilteredQuestions(questionsMap[topic._id] || []);

          // FIX #4: search only *suggests* an open/closed state as a default.
          // If the user has explicitly clicked this topic's header, that
          // choice wins regardless of search results.
          const searchSuggestsOpen = searchQuery.trim() ? filtered.length > 0 : null;
          const isOpen = manuallyToggled[topic._id] !== undefined
            ? manuallyToggled[topic._id]
            : (searchSuggestsOpen !== null ? searchSuggestsOpen : openAccordion === topic._id);

          return (
            <Accordion
              key={topic._id}
              topic={topic}
              questions={filtered}
              allQuestions={questionsMap[topic._id] || []}
              isOpen={isOpen}
              onToggle={() => {
                setManuallyToggled(prev => ({ ...prev, [topic._id]: !isOpen }));
                setOpenAccordion(!isOpen ? topic._id : null);
              }}
              onQuestionUpdate={handleQuestionUpdate}
              onGenerateQuestions={() => handleOpenAIGenerateQuestions(topic)}
              onDownloadTopicPDF={handleDownloadTopicPDF}
              hasActiveFilter={hasActiveFilter}
            />
          );
        })}

        {/* Add Topic Form */}
        {showAddTopic && (
          <form onSubmit={handleAddTopic} className="bg-dark-800/80 rounded-xl p-4 border border-dark-700/60 shadow-lg">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Topic name (e.g., Dynamic Programming)..."
                className="flex-1 px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg 
                         text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white 
                         rounded-lg text-sm font-semibold transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddTopic(false)}
                className="px-4 py-2 text-dark-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIGenerate}
        onClose={() => setShowAIGenerate(false)}
        type={aiGenerateType}
        subjectName={subject?.name}
        topicName={aiTargetTopic?.name}
        onGenerate={handleAIGenerated}
      />
    </div>
  );
};

export default Sheet;