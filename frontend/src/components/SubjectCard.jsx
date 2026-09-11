import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Trash2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

const SubjectCard = ({ subject, onDelete }) => {
  const navigate = useNavigate();

  // Every Mongo _id is 24 chars, so hashing on .length always gave the same
  // number (and thus the same color) for every subject. Summing char codes
  // actually varies per id.
  const hashId = (id) => {
    if (!id) return 0;
    let sum = 0;
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
    return sum;
  };

  const getIconColor = (hash) => {
    const colors = [
      'from-emerald-500 to-teal-600',
      'from-blue-500 to-indigo-600',
      'from-violet-500 to-purple-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-cyan-500 to-sky-600'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div 
      className="bento-card group relative"
      onClick={() => navigate(`/sheet/${subject._id}`)}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(subject._id);
        }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 
                   text-dark-500 hover:text-danger transition-all p-1.5 
                   hover:bg-danger/10 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getIconColor(hashId(subject._id))} 
                      flex items-center justify-center mb-4 shadow-lg`}>
        <BookOpen className="w-6 h-6 text-white" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-1 pr-8">
        {subject.name}
      </h3>

      {subject.description && (
        <p className="text-sm text-dark-400 mb-4 line-clamp-2">
          {subject.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-dark-400">
          <span className="text-white font-medium">{subject.totalQuestions || 0}</span> questions
        </span>
        <span className="text-dark-400">
          <span className="text-success font-medium">{subject.solvedQuestions || 0}</span> solved
        </span>
      </div>

      {/* Progress */}
      <ProgressBar 
        current={subject.solvedQuestions || 0} 
        total={subject.totalQuestions || 0}
        size="sm"
      />

      {/* Arrow */}
      <div className="mt-4 flex items-center text-primary-400 text-sm font-medium 
                      opacity-0 group-hover:opacity-100 transition-opacity">
        Open Sheet
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
};

export default SubjectCard;
