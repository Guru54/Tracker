import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, FileDown, Plus } from 'lucide-react';
import QuestionRow from './QuestionRow';

const Accordion = ({ 
  topic, 
  questions, 
  allQuestions,
  isOpen, 
  onToggle, 
  onQuestionUpdate,
  onGenerateQuestions,
  onDownloadTopicPDF,
  hasActiveFilter
}) => {
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState('Medium');
  const [newQuestionLink, setNewQuestionLink] = useState('');
  const [newQuestionPlatform, setNewQuestionPlatform] = useState('LeetCode');

  const solvedCount = allQuestions.filter(q => q.status === 'Done').length;
  const progress = allQuestions.length > 0 ? Math.round((solvedCount / allQuestions.length) * 100) : 0;

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionTitle.trim()) return;

    const newQ = {
      _id: Date.now().toString(),
      title: newQuestionTitle.trim(),
      difficulty: newQuestionDifficulty,
      status: 'Not Started',
      // FIX #7: if no link was provided, don't mislabel it as LeetCode —
      // that made link-less manual questions incorrectly match the LeetCode filter chip.
      platform: newQuestionLink.trim() ? newQuestionPlatform : 'Manual',
      link: newQuestionLink.trim(),
      topicId: topic._id,
      subjectId: topic.subjectId,
      approach: '',
      code: '',
      complexity: { time: '', space: '' },
      notes: ''
    };

    onQuestionUpdate(newQ);
    setNewQuestionTitle('');
    setNewQuestionLink('');
    setShowAddQuestion(false);
  };

  const detectPlatform = (url) => {
    if (!url) return 'LeetCode';
    if (url.includes('leetcode')) return 'LeetCode';
    if (url.includes('geeksforgeeks') || url.includes('gfg')) return 'GFG';
    if (url.includes('codeforces')) return 'Codeforces';
    if (url.includes('hackerrank')) return 'HackerRank';
    return 'LeetCode';
  };

  const handleLinkChange = (e) => {
    const url = e.target.value;
    setNewQuestionLink(url);
    setNewQuestionPlatform(detectPlatform(url));
  };

  return (
    <div className="border border-dark-700/60 rounded-2xl overflow-hidden mb-4 bg-dark-800/40 shadow-md transition-all">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 
                   bg-dark-800/80 hover:bg-dark-800 transition-colors select-none"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-dark-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dark-400 flex-shrink-0" />
          )}

          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-base truncate">{topic.name}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-dark-900 border border-dark-700/60 text-dark-300">
                {solvedCount} / {allQuestions.length}
              </span>
            </div>
            {hasActiveFilter && (
              <span className="text-xs text-primary-400 font-medium">
                ({questions.length} questions match filter)
              </span>
            )}
          </div>

          {/* Mini Progress Bar */}
          <div className="hidden sm:flex items-center gap-3 mr-2">
            <div className="w-24 h-1.5 bg-dark-950 rounded-full overflow-hidden border border-dark-700/40">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-dark-400 w-8">{progress}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onGenerateQuestions(topic._id)}
            className="p-2 text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
            title="AI Generate Questions"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDownloadTopicPDF(topic, allQuestions)}
            className="p-2 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="Download Topic PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="bg-dark-900/40 border-t border-dark-700/50">

          {/* FIX #2: Header grid now matches QuestionRow's grid exactly —
              checkbox + index columns added so title/difficulty/platform/status/actions line up. */}
          {questions.length > 0 && (
            <div className="hidden md:grid grid-cols-[28px_24px_1fr_80px_96px_96px_110px] gap-3 px-4 py-2 bg-dark-950/40 border-b border-dark-700/40 text-[11px] font-bold text-dark-400 uppercase tracking-wider items-center">
              <span></span>
              <span></span>
              <span>Question Title</span>
              <span className="text-center">Difficulty</span>
              <span className="text-center">Platform</span>
              <span className="text-center">Status</span>
              <span className="text-right">Actions</span>
            </div>
          )}

          {/* Question Rows */}
          {questions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-dark-400 text-sm">
                {hasActiveFilter 
                  ? 'No questions match the current filter' 
                  : 'No questions yet'}
              </p>
              {!showAddQuestion && !hasActiveFilter && (
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    onClick={() => setShowAddQuestion(true)}
                    className="text-primary-400 text-xs font-semibold hover:underline"
                  >
                    Add manually
                  </button>
                  <span className="text-dark-600 text-xs">or</span>
                  <button
                    onClick={() => onGenerateQuestions(topic._id)}
                    className="text-primary-400 text-xs font-semibold hover:underline"
                  >
                    Generate with AI
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-dark-700/30">
              {questions.map((question, index) => (
                <QuestionRow
                  key={question._id}
                  question={question}
                  index={index + 1}
                  // FIX #1: pass through the previousStatus arg from QuestionRow so
                  // In Progress / Revisit states survive a Done -> unchecked toggle.
                  onStatusChange={(status, previousStatus) =>
                    onQuestionUpdate({
                      ...question,
                      status,
                      ...(previousStatus !== undefined ? { previousStatus } : {})
                    })
                  }
                  onDelete={() => onQuestionUpdate({ ...question, _deleted: true })}
                />
              ))}
            </div>
          )}

          {/* Add Question Form */}
          {showAddQuestion ? (
            <form onSubmit={handleAddQuestion} className="p-4 border-t border-dark-700/40 bg-dark-950/40 space-y-3">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  placeholder="Question title..."
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  autoFocus
                />
                <div className="flex flex-wrap gap-3">
                  <input
                    type="url"
                    value={newQuestionLink}
                    onChange={handleLinkChange}
                    placeholder="LeetCode/GFG URL (optional)..."
                    className="flex-1 min-w-[200px] px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  />
                  <select
                    value={newQuestionDifficulty}
                    onChange={(e) => setNewQuestionDifficulty(e.target.value)}
                    className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <select
                    value={newQuestionPlatform}
                    onChange={(e) => setNewQuestionPlatform(e.target.value)}
                    className="px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="LeetCode">LeetCode</option>
                    <option value="GFG">GFG</option>
                    <option value="Codeforces">Codeforces</option>
                    <option value="HackerRank">HackerRank</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Add Question
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddQuestion(false)}
                  className="px-3 py-1.5 text-dark-400 hover:text-white text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex border-t border-dark-700/40 divide-x divide-dark-700/30">
              <button
                onClick={() => setShowAddQuestion(true)}
                className="flex-1 px-4 py-2.5 text-left text-xs font-medium text-dark-400 hover:text-primary-400 hover:bg-dark-800/30 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question Manually
              </button>
              <button
                onClick={() => onGenerateQuestions(topic._id)}
                className="flex-1 px-4 py-2.5 text-left text-xs font-medium text-dark-400 hover:text-primary-400 hover:bg-dark-800/30 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate with AI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Accordion;