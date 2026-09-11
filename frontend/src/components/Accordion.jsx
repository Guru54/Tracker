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
      title: newQuestionTitle,
      difficulty: newQuestionDifficulty,
      status: 'Not Started',
      platform: newQuestionPlatform,
      link: newQuestionLink,
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

  // Detect platform from URL
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
    <div className="border border-dark-700/50 rounded-xl overflow-hidden mb-3">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 
                   bg-dark-800/80 hover:bg-dark-800 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-dark-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dark-400" />
          )}

          <div className="flex-1 text-left">
            <h3 className="text-white font-medium">{topic.name}</h3>
            <p className="text-sm text-dark-400 mt-0.5">
              {solvedCount} / {allQuestions.length} solved
              {hasActiveFilter && (
                <span className="text-primary-400 ml-2">
                  ({questions.length} filtered)
                </span>
              )}
            </p>
          </div>

          {/* Progress mini */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-24 h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-dark-400 w-8">{progress}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateQuestions(topic._id);
            }}
            className="p-2 text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 
                     rounded-lg transition-all"
            title="AI Generate Questions"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownloadTopicPDF(topic, allQuestions);
            }}
            className="p-2 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 
                     rounded-lg transition-all"
            title="Download Topic PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="bg-dark-900/50">
          {/* Question Rows */}
          {questions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-dark-500 text-sm">
                {hasActiveFilter 
                  ? 'No questions match the current filter' 
                  : 'No questions yet'}
              </p>
              {!showAddQuestion && !hasActiveFilter && (
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    onClick={() => setShowAddQuestion(true)}
                    className="text-primary-400 text-sm hover:underline"
                  >
                    Add manually
                  </button>
                  <span className="text-dark-600">or</span>
                  <button
                    onClick={() => onGenerateQuestions(topic._id)}
                    className="text-primary-400 text-sm hover:underline"
                  >
                    Generate with AI
                  </button>
                </div>
              )}
            </div>
          ) : (
            questions.map((question, index) => (
              <QuestionRow
                key={question._id}
                question={question}
                index={index + 1}
                onStatusChange={(status) => onQuestionUpdate({ ...question, status })}
                onDelete={() => onQuestionUpdate({ ...question, _deleted: true })}
              />
            ))
          )}

          {/* Add Question Form */}
          {showAddQuestion ? (
            <form onSubmit={handleAddQuestion} className="px-6 py-4 border-t border-dark-700/30 space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={newQuestionTitle}
                    onChange={(e) => setNewQuestionTitle(e.target.value)}
                    placeholder="Question title..."
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg 
                             text-white text-sm placeholder-dark-500 focus:outline-none 
                             focus:border-primary-500"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={newQuestionLink}
                      onChange={handleLinkChange}
                      placeholder="LeetCode/GFG URL (optional)..."
                      className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg 
                               text-white text-sm placeholder-dark-500 focus:outline-none 
                               focus:border-primary-500"
                    />
                    <select
                      value={newQuestionDifficulty}
                      onChange={(e) => setNewQuestionDifficulty(e.target.value)}
                      className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg 
                               text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <select
                      value={newQuestionPlatform}
                      onChange={(e) => setNewQuestionPlatform(e.target.value)}
                      className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg 
                               text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="LeetCode">LeetCode</option>
                      <option value="GFG">GFG</option>
                      <option value="Codeforces">Codeforces</option>
                      <option value="HackerRank">HackerRank</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white 
                           text-sm rounded-lg transition-colors"
                >
                  Add Question
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddQuestion(false)}
                  className="px-3 py-2 text-dark-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex border-t border-dark-700/30">
              <button
                onClick={() => setShowAddQuestion(true)}
                className="flex-1 px-6 py-3 text-left text-sm text-dark-500 
                         hover:text-primary-400 hover:bg-dark-800/30 
                         transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Question Manually
              </button>
              <button
                onClick={() => onGenerateQuestions(topic._id)}
                className="flex-1 px-6 py-3 text-left text-sm text-dark-500 
                         hover:text-primary-400 hover:bg-dark-800/30 
                         transition-colors flex items-center gap-2 border-l border-dark-700/30"
              >
                <Sparkles className="w-4 h-4" />
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
