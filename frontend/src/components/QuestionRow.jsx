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

  const handleStatusToggle = () => {
    const newStatus = question.status === 'Done' ? 'Not Started' : 'Done';
    onStatusChange(newStatus);
  };

  const handlePDF = async (e) => {
    e.stopPropagation();
    await generateQuestionPDF(question);
  };

  return (
    <div 
      className="question-row group"
      onClick={() => navigate(`/question/${question._id}`)}
    >
      {/* Checkbox */}
      <div onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={question.status === 'Done'}
          onChange={handleStatusToggle}
          className="checkbox-custom"
        />
      </div>

      {/* Index */}
      <span className="text-dark-500 text-sm w-6 text-center font-mono">
        {index}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate ${
          question.status === 'Done' ? 'text-dark-500 line-through' : 'text-white'
        }`}>
          {question.title}
        </h4>
      </div>

      {/* Difficulty - Glassmorphism Pill */}
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium hidden sm:inline ${getDifficultyClass(question.difficulty)}`}>
        {question.difficulty}
      </span>

      {/* Platform */}
      <span className="text-xs text-dark-500 hidden md:inline">
        {question.platform}
      </span>

      {/* Status Badge */}
      <span className={`text-xs px-2.5 py-1 rounded-full border hidden lg:inline ${getStatusColor(question.status)}`}>
        {question.status}
      </span>

      {/* Content indicator */}
      {(question.approaches && question.approaches.length > 0) && (
        <span className="w-2 h-2 bg-primary-500 rounded-full shadow-lg shadow-primary-500/50" title="Has content" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {question.link && (
          <a
            href={question.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 
                     rounded-lg transition-all"
            title="Open Link"
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
