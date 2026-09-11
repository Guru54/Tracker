import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { 
  generateTopicsPrompt, 
  generateQuestionsPrompt,
  parseTopicsFromAI,
  parseQuestionsFromAI
} from '../utils/parser';

const AIGenerateModal = ({ 
  isOpen, 
  onClose, 
  type, // 'topics' or 'questions'
  subjectName,
  topicName,
  onGenerate 
}) => {
  const [step, setStep] = useState('prompt'); // prompt | paste | preview
  const [copied, setCopied] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const promptText = type === 'topics' 
    ? generateTopicsPrompt(subjectName)
    : generateQuestionsPrompt(topicName);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = () => {
    setLoading(true);

    let result = [];

    if (type === 'topics') {
      result = parseTopicsFromAI(pastedText);
    } else {
      result = parseQuestionsFromAI(pastedText);
    }

    setParsedData(result);
    setLoading(false);
    setStep('preview');
  };

  const handleSave = () => {
    if (parsedData && parsedData.length > 0) {
      onGenerate(parsedData);
      onClose();
      setStep('prompt');
      setPastedText('');
      setParsedData(null);
    }
  };

  const stepLabels = {
    prompt: 'Copy Prompt',
    paste: 'Paste Response',
    preview: 'Preview'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                AI Generate {type === 'topics' ? 'Topics' : 'Questions'}
              </h2>
              <p className="text-sm text-dark-400">
                {type === 'topics' ? subjectName : topicName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {['prompt', 'paste', 'preview'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                step === s 
                  ? 'bg-primary-500/20 text-primary-400' 
                  : 'text-dark-500'
              }`}>
                <span className="w-5 h-5 rounded-full bg-dark-700 flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                {stepLabels[s]}
              </div>
              {i < 2 && <div className="w-8 h-px bg-dark-700" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-dark-300">Pre-written Prompt</span>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/20 
                             hover:bg-primary-600/30 text-primary-400 rounded-lg 
                             text-sm transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="text-sm text-dark-300 font-mono whitespace-pre-wrap 
                              bg-dark-900 p-4 rounded-lg border border-dark-700/30
                              max-h-64 overflow-y-auto">
                  {promptText}
                </pre>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-300">
                  1. Copy this prompt and paste it in ChatGPT / Claude / Gemini
                </p>
                <p className="text-sm text-amber-300 mt-1">
                  2. Copy the AI response and come back here
                </p>
              </div>

              <button
                onClick={() => setStep('paste')}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white 
                         rounded-lg font-medium transition-colors"
              >
                I've got the AI response →
              </button>
            </div>
          )}

          {step === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Paste AI Response Here
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={type === 'topics' 
                    ? "e.g., Arrays, Linked List, Trees, Graphs, DP..."
                    : "Paste the markdown table or list here..."
                  }
                  rows={12}
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg 
                           text-white text-sm placeholder-dark-500 focus:outline-none 
                           focus:border-primary-500 font-mono resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('prompt')}
                  className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-white 
                           rounded-lg font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleParse}
                  disabled={!pastedText.trim() || loading}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50
                           disabled:cursor-not-allowed text-white rounded-lg font-medium 
                           transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Parse Content
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-dark-400">
                  Found <span className="text-white font-medium">{parsedData.length}</span> {type}
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 bg-dark-900/50 rounded-xl 
                            border border-dark-700/50 p-4">
                {parsedData.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 bg-dark-800/50 
                             rounded-lg border border-dark-700/30"
                  >
                    <span className="text-xs text-dark-500 w-6">{index + 1}</span>
                    {type === 'topics' ? (
                      <span className="text-sm text-white">{item}</span>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white truncate">{item.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            item.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.difficulty === 'Hard' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.difficulty}
                          </span>
                        </div>
                        {item.link && (
                          <span className="text-xs text-dark-500 truncate block">
                            {item.link}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('paste')}
                  className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-white 
                           rounded-lg font-medium transition-colors"
                >
                  ← Repaste
                </button>
                <button
                  onClick={handleSave}
                  disabled={parsedData.length === 0}
                  className="flex-1 py-3 bg-success hover:bg-success/90 text-white 
                           rounded-lg font-medium transition-colors"
                >
                  Add {parsedData.length} {type}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIGenerateModal;
