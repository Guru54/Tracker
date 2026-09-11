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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // AI Generate Modal states
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiGenerateType, setAiGenerateType] = useState('topics');
  const [aiTargetTopic, setAiTargetTopic] = useState(null);

  // Filter states
  const [activeFilter, setActiveFilter] = useState('all'); // all | pending | easy | medium | hard | leetcode
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [subjectId]);

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

      // Fetch every topic's questions in parallel instead of one-at-a-time.
      const results = await Promise.all(
        topicsData.map(topic => getQuestionsByTopic(topic._id).then(r => [topic._id, r.data]))
      );
      setQuestionsMap(Object.fromEntries(results));

      if (topicsData.length > 0) setOpenAccordion(topicsData[0]._id);
    } catch (err) {
      console.error('Error loading subject sheet:', err);
      setLoadError('Subject data load nahi ho paya. Backend/DB connection check karke retry karo.');
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
        setQuestionsMap(prev => ({ ...prev, [updatedQuestion.topicId]: prevList })); // revert
      }
    } else {
      // Check if new question
      const topicQs = questionsMap[updatedQuestion.topicId] || [];
      const exists = topicQs.find(q => q._id === updatedQuestion._id);

      if (!exists) {
        // New question - must go to the DB first, since a locally-faked _id
        // would never resolve to a real record on refresh.
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
        // Update existing — optimistic UI update, reverted if the save fails.
        const prevList = topicQs;
        setQuestionsMap(prev => ({
          ...prev,
          [updatedQuestion.topicId]: prev[updatedQuestion.topicId].map(q => 
            q._id === updatedQuestion._id ? updatedQuestion : q
          )
        }));
        try {
          await updateQuestion(updatedQuestion._id, { status: updatedQuestion.status });
        } catch (e) {
          console.error('Error updating question:', e);
          toast.error('Status update save nahi hua — connection check karo.');
          setQuestionsMap(prev => ({ ...prev, [updatedQuestion.topicId]: prevList })); // revert
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

  // AI Generate handlers
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
      if (failCount > 0) toast.error(`${failCount}/${data.length} topics save nahi ho paye — connection check karo.`);
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
        toast.error('Questions save nahi ho paye — connection check karke dobara try karo.');
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

  // Filter logic
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

  const filterButtons = [
    { key: 'all', label: 'All', icon: null },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'easy', label: 'Easy', icon: CheckCircle },
    { key: 'medium', label: 'Medium', icon: null },
    { key: 'hard', label: 'Hard', icon: AlertCircle },
    { key: 'leetcode', label: 'LeetCode', icon: null },
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
    <div className="space-y-6">
      {/* Sticky Header with Progress */}
      <div className="sticky top-16 z-40 -mx-4 px-4 py-4 bg-dark-900/95 backdrop-blur-md 
                    border-b border-dark-700/50">
        <div className="w-full">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vault
          </button>

          {/* Title Row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{subject?.name}</h1>
                <button
                  onClick={handleDownloadSubjectPDF}
                  className="btn-ghost text-xs py-1.5 px-2.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Master PDF
                </button>
              </div>
              {subject?.description && (
                <p className="text-sm text-dark-400 mt-1">{subject.description}</p>
              )}
            </div>

            {/* AI Generate Topics Button */}
            <button
              onClick={handleOpenAIGenerateTopics}
              className="btn-primary text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Generate Topics with AI
            </button>
          </div>

          {/* Progress Bar */}
          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark-400">
                {totalSolved} / {allQuestions.length} solved across {topics.length} topics
              </span>
              <span className="text-lg font-bold text-primary-400">
                {allQuestions.length > 0 ? Math.round((totalSolved / allQuestions.length) * 100) : 0}%
              </span>
            </div>
            <ProgressBar current={totalSolved} total={allQuestions.length} size="md" showText={false} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-dark-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Question title se search karo..."
          className="w-full pl-10 pr-9 py-2.5 bg-dark-800 border border-dark-700 rounded-lg 
                   text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-dark-500 mr-1" />
        {filterButtons.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeFilter === key
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 inline mr-1.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* Topics Accordion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Topics</h2>
          <button
            onClick={() => setShowAddTopic(true)}
            className="btn-ghost text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Topic
          </button>
        </div>

        {topics.map((topic) => {
          const filtered = getFilteredQuestions(questionsMap[topic._id] || []);
          const isOpen = searchQuery.trim()
            ? filtered.length > 0
            : openAccordion === topic._id;
          return (
            <Accordion
              key={topic._id}
              topic={topic}
              questions={filtered}
              allQuestions={questionsMap[topic._id] || []}
              isOpen={isOpen}
              onToggle={() => setOpenAccordion(
                openAccordion === topic._id ? null : topic._id
              )}
              onQuestionUpdate={handleQuestionUpdate}
              onGenerateQuestions={() => handleOpenAIGenerateQuestions(topic)}
              onDownloadTopicPDF={handleDownloadTopicPDF}
              hasActiveFilter={hasActiveFilter}
            />
          );
        })}

        {/* Add Topic Form */}
        {showAddTopic && (
          <form onSubmit={handleAddTopic} className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Topic name..."
                className="flex-1 px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg 
                         text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white 
                         rounded-lg font-medium transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddTopic(false)}
                className="px-4 py-2.5 text-dark-400 hover:text-white transition-colors"
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
