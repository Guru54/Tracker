import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, Wand2 } from 'lucide-react';
import { generateQuestionContentPrompt, parseQuestionContentResponse } from '../utils/parser';

const ParserModal = ({ isOpen, onClose, question, onSave }) => {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'paste' | 'preview'
  const [copied, setCopied] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !question) return null;

  const promptTemplate = generateQuestionContentPrompt(question.title);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = () => {
    setLoading(true);
    const result = parseQuestionContentResponse(pastedText);
    setParsedData(result);
    setLoading(false);
    setStep('preview');
  };

  const handleSave = () => {
    if (parsedData) {
      onSave(parsedData);
      onClose();
      setStep('prompt');
      setPastedText('');
      setParsedData(null);
    }
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
              <h2 className="text-lg font-bold text-white">AI Content Generator</h2>
              <p className="text-sm text-dark-400">{question.title}</p>
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
                {s === 'prompt' ? 'Copy Prompt' : s === 'paste' ? 'Paste Response' : 'Preview'}
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
                  {promptTemplate}
                </pre>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-300">
                  1. Copy this prompt and paste it in ChatGPT/Claude
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
                  placeholder="Paste the complete AI response here..."
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
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Approach Preview */}
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Approach</h4>
                  <div className="bg-dark-900 p-4 rounded-lg border border-dark-700/50">
                    <p className="text-sm text-dark-300 whitespace-pre-wrap">
                      {parsedData.approach}
                    </p>
                  </div>
                </div>

                {/* Code Preview */}
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Code</h4>
                  <pre className="code-block text-xs">
                    {parsedData.code}
                  </pre>
                </div>

                {/* Complexity Preview */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-dark-900 p-3 rounded-lg border border-dark-700/50">
                    <span className="text-xs text-dark-500">Time</span>
                    <p className="text-sm text-white font-mono">{parsedData.complexity.time || 'Not detected'}</p>
                  </div>
                  <div className="flex-1 bg-dark-900 p-3 rounded-lg border border-dark-700/50">
                    <span className="text-xs text-dark-500">Space</span>
                    <p className="text-sm text-white font-mono">{parsedData.complexity.space || 'Not detected'}</p>
                  </div>
                </div>

                {/* Key Points / Notes Preview */}
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Key Points (saved as Notes)</h4>
                  <div className="bg-dark-900 p-4 rounded-lg border border-dark-700/50">
                    <p className="text-sm text-dark-300 whitespace-pre-wrap">
                      {parsedData.notes || 'Not detected — you can add notes manually after saving.'}
                    </p>
                  </div>
                </div>
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
                  className="flex-1 py-3 bg-success hover:bg-success/90 text-white 
                           rounded-lg font-medium transition-colors"
                >
                  Save Content
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParserModal;
