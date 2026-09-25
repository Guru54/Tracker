import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Trash2, FileDown } from 'lucide-react';
import { generateQuestionPDF } from '../utils/pdfGenerator';
import { useConfirm } from './ConfirmDialog';

const QuestionRow = ({ question, index, onStatusChange, onDelete }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();

  // Glassmorphism difficulty pills
  const getDifficultyClass = (diff) => {
    switch (diff) {
      case 'Easy': 
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm';
      case 'Medium': 
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 backdrop-blur-sm';
      case 'Hard': 
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20 backdrop-blur-sm';
      default: 
        return 'bg-dark-700/50 text-dark-400 border border-dark-600/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400';
      case 'In Progress': return 'bg-amber-500/20 border-amber-500/40 text-amber-400';
      case 'Revisit': return 'bg-rose-500/20 border-rose-500/40 text-rose-400';
      default: return 'bg-dark-700/50 border-dark-600 text-dark-400';
    }
  };

  // FIX #1: previously this collapsed straight to 'Not Started' on uncheck,
  // silently wiping out 'In Progress' / 'Revisit' state. Now it remembers
  // what the status was before marking Done, and restores it on uncheck.
  const handleStatusToggle = () => {
    if (question.status === 'Done') {
      onStatusChange(question.previousStatus || 'Not Started');
    } else {
      onStatusChange('Done', question.status); // pass current status so caller can remember it
    }
  };

  const handlePDF = async (e) => {
    e.stopPropagation();
    await generateQuestionPDF(question);
  };

  return (
    // FIX #2: switched from flex to the same grid template as the Accordion's
    // table header (checkbox, index, title, difficulty, platform, status, actions)
    // so columns actually line up instead of only approximately matching via flex widths.
    <div 
      className="question-row group grid grid-cols-[28px_24px_1fr_80px_96px_96px_110px] gap-3 items-center px-4 py-3 hover:bg-dark-800/50 cursor-pointer transition-all border-b border-dark-700/30"
      onClick={() => navigate(`/question/${question._id}`)}
    >
      {/* Checkbox */}
      <div onClick={e => e.stopPropagation()} className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={question.status === 'Done'}
          onChange={handleStatusToggle}
          className="checkbox-custom cursor-pointer"
        />
      </div>

      {/* Index */}
      <span className="text-dark-500 text-xs text-center font-mono flex-shrink-0">
        {index}
      </span>

      {/* Title */}
      <div className="min-w-0 pr-2">
        <h4 className={`text-sm font-medium truncate ${
          question.status === 'Done' ? 'text-dark-400 line-through' : 'text-white'
        }`} title={question.title}>
          {question.title}
        </h4>
      </div>

      {/* Difficulty */}
      <span className={`py-1 rounded-full text-xs font-semibold text-center items-center justify-center flex-shrink-0 hidden sm:flex ${getDifficultyClass(question.difficulty)}`}>
        {question.difficulty}
      </span>

      {/* Platform / LeetCode Tag - Clickable Link */}
      {question.link ? (
        <a
          href={question.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="py-1 rounded-full text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-primary-400 border border-dark-700/60 hover:border-primary-500/50 text-center items-center justify-center gap-1 flex-shrink-0 hidden md:flex transition-all cursor-pointer shadow-sm"
          title={`Open problem on ${question.platform || 'LeetCode'}`}
        >
          <span className="truncate">{question.platform || 'LeetCode'}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
        </a>
      ) : (
        <span className="py-1 rounded-full text-xs font-semibold bg-dark-800/80 text-dark-400 border border-dark-700/40 text-center items-center justify-center flex-shrink-0 hidden md:flex">
          <span className="truncate">{question.platform || 'Manual'}</span>
        </span>
      )}

      {/* Status Badge */}
      <span className={`py-1 rounded-full text-xs font-semibold border text-center items-center justify-center flex-shrink-0 hidden lg:flex ${getStatusColor(question.status)}`}>
        {question.status}
      </span>

      {/* Actions column: content-indicator dot + action icons */}
      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {(question.approach || question.code) && (
          <span className="w-2 h-2 bg-primary-500 rounded-full shadow-lg shadow-primary-500/50 flex-shrink-0" title="Has written approach or code" />
        )}
        {question.link && (
          <a
            href={question.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 
                     rounded-lg transition-all"
            title="Open External Link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={handlePDF}
          className="p-1.5 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 
                   rounded-lg transition-all"
          title="Download PDF"
        >
          <FileDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const ok = await confirm(
              `Delete "${question.title}"? Approach/code/notes bhi saath mein delete ho jayenge.`,
              { title: 'Delete question?' }
            );
            if (ok) onDelete();
          }}
          className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 
                   rounded-lg transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default QuestionRow;