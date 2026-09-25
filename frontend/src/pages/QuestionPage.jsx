import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit3, Save, X, Sparkles, FileDown, 
  CheckCircle, Clock, AlertCircle, Loader2, Brain, RefreshCw,
  Copy, Check, ExternalLink, Code2, BookOpen, Layers, Terminal, Send
} from 'lucide-react';
import ParserModal from '../components/ParserModal';
import { getQuestion, updateQuestion, updateQuestionContent, getQuestionProgress, recallResult } from '../utils/api';
import { generateQuestionPDF } from '../utils/pdfGenerator';

const QuestionPage = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showParser, setShowParser] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [editData, setEditData] = useState({
    approach: '',
    code: '',
    complexity: { time: '', space: '' },
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Test Recall Slide-Over State
  const [showRecallDrawer, setShowRecallDrawer] = useState(false);
  const [recallMode, setRecallMode] = useState('testing'); // 'testing' | 'revealed'
  const [scratch, setScratch] = useState('');
  const [recallSaving, setRecallSaving] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await getQuestion(questionId);
      setQuestion(data);
      setEditData({
        approach: data.approach || '',
        code: data.code || '',
        complexity: data.complexity || { time: '', space: '' },
        notes: data.notes || ''
      });
      try {
        const { data: prog } = await getQuestionProgress(questionId);
        setProgress(prog);
      } catch {
        setProgress(null);
      }
    } catch (err) {
      console.error('Error fetching question:', err);
      setLoadError('Question load nahi ho paya. Backend down ho sakta hai ya connection issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const { data: saved } = await updateQuestionContent(questionId, editData);
      setQuestion(saved);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving:', err);
      setSaveError('Save nahi ho paya — connection check karke dobara try karo.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { data: updated } = await updateQuestion(questionId, { status: newStatus });
      setQuestion(updated);
      setSaveError('');
      if (newStatus === 'Done') {
        try {
          const { data: prog } = await getQuestionProgress(questionId);
          setProgress(prog);
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setSaveError('Status update save nahi hua — connection check karke dobara try karo.');
    }
  };

  const handleCopyCode = () => {
    if (!question?.code) return;
    navigator.clipboard.writeText(question.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  function startRecall() {
    setScratch('');
    setRecallMode('testing');
    setShowRecallDrawer(true);
  }

  async function submitRecall(passed) {
    setRecallSaving(true);
    try {
      const { data: updated } = await recallResult(questionId, passed);
      setProgress(updated);
      setSaveError('');
      setShowRecallDrawer(false);
    } catch (err) {
      console.error('Error saving recall result:', err);
      setSaveError('Recall result save nahi hua — connection check karke dobara try karo.');
    } finally {
      setRecallSaving(false);
      setScratch('');
    }
  }

  function revisionBadge() {
    if (!progress) return { text: 'Not in revision cycle', cls: 'text-dark-500', passCount: 0 };
    const passCount = (progress.revisionDates || []).filter(r => r.grade === 'pass').length;
    const isDue = progress.nextRevision && new Date(progress.nextRevision) <= new Date();
    if (isDue) return { text: 'DUE for revision', cls: 'text-amber-400 font-bold', passCount };
    return {
      text: `Level ${Math.min(passCount, 4)}/4 · Next: ${new Date(progress.nextRevision).toLocaleDateString()}`,
      cls: 'text-emerald-400 font-medium',
      passCount
    };
  }

  const handleParsedSave = async (data) => {
    const payload = {
      approach: data.approach || editData.approach,
      code: data.code || editData.code,
      complexity: {
        time: data.complexity?.time || editData.complexity.time,
        space: data.complexity?.space || editData.complexity.space
      },
      notes: data.notes || editData.notes
    };

    try {
      const { data: saved } = await updateQuestionContent(questionId, payload);
      setQuestion(saved);
      setSaveError('');
      setEditData({
        approach: saved.approach || '',
        code: saved.code || '',
        complexity: saved.complexity || { time: '', space: '' },
        notes: saved.notes || ''
      });
    } catch (err) {
      console.error('Error saving generated content:', err);
      setSaveError('Generated content save nahi ho paya — connection check karke dobara try karo.');
      setEditData(payload);
      setIsEditing(true);
    }
  };

  const handleDownloadPDF = async () => {
    await generateQuestionPDF(question);
  };

  const getDifficultyClass = (diff) => {
    switch (diff) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold';
      case 'Hard': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold';
      default: return 'bg-dark-700/50 text-dark-400 px-3 py-1 rounded-full text-xs font-semibold';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Done': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'Revisit': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-dark-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-dark-400 text-sm">Question details load ho rahe hain...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-20 bg-dark-800/30 rounded-2xl border border-dark-700/50 max-w-xl mx-auto my-12 p-8">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-rose-300 text-sm">{loadError}</p>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={fetchQuestion} className="btn-primary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="text-center py-20">
        <p className="text-dark-400">Question not found</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4 text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const badgeInfo = revisionBadge();

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Action Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dark-700/50 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-dark-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sheet
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowParser(true)} className="btn-ghost text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span>AI Generate</span>
          </button>

          <button onClick={handleDownloadPDF} className="btn-ghost text-sm flex items-center gap-1.5">
            <FileDown className="w-4 h-4 text-dark-300" />
            <span>Download PDF</span>
          </button>

          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm flex items-center gap-1">
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Grid: Left Sidebar (Sticky Meta) + Right Content Area (Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ==================== LEFT SIDEBAR (STICKY METADATA) ==================== */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <div className="bg-dark-800/60 rounded-2xl p-6 border border-dark-700/60 shadow-xl space-y-6 backdrop-blur-md">
            
            {/* Title & Difficulty */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-3 leading-snug">{question.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={getDifficultyClass(question.difficulty)}>
                  {question.difficulty}
                </span>
                <span className="text-xs font-medium text-dark-400 bg-dark-900/60 px-2.5 py-1 rounded-full border border-dark-700/40">
                  {question.platform}
                </span>
                {question.link && (
                  <a
                    href={question.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors ml-auto"
                  >
                    <span>Problem Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <hr className="border-dark-700/50" />

            {/* Status Dropdown */}
            <div>
              <span className="text-xs font-bold text-dark-400 uppercase tracking-wider block mb-2">
                Status
              </span>
              <div className="flex items-center gap-2">
                {getStatusIcon(question.status)}
                <select
                  value={question.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full bg-dark-900/80 border border-dark-700 rounded-xl px-3 py-2.5 
                           text-sm font-medium text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Revisit">Revisit</option>
                </select>
              </div>
            </div>

            {/* Spaced Repetition Progress */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-primary-400" /> Spaced Repetition
              </span>

              <p className={`text-xs ${badgeInfo.cls}`}>
                {badgeInfo.text}
              </p>

              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      step <= badgeInfo.passCount
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-500/30'
                        : 'bg-dark-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Test Recall Prominent Button */}
            {question.status === 'Done' && (
              <div className="pt-2">
                <button
                  onClick={startRecall}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 
                           text-dark-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/10 
                           flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <Brain className="w-4 h-4 fill-dark-950" />
                  <span>Start Test Recall</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ==================== RIGHT CONTENT AREA (FULL WIDTH & NO ACCORDION) ==================== */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Approach */}
          <section className="bg-dark-800/40 rounded-2xl p-6 border border-dark-700/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center text-sm font-bold border border-primary-500/20">
                1
              </div>
              <h2 className="text-lg font-bold text-white">Approach & Intuition</h2>
            </div>

            {isEditing ? (
              <textarea
                value={editData.approach}
                onChange={(e) => setEditData({ ...editData, approach: e.target.value })}
                rows={8}
                className="w-full p-4 bg-dark-900 border border-dark-700 rounded-xl 
                         text-white text-sm focus:outline-none focus:border-primary-500 
                         resize-none font-mono leading-relaxed"
                placeholder="Write step-by-step approach..."
              />
            ) : (
              <div>
                {question.approach ? (
                  <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap bg-dark-900/30 p-5 rounded-xl border border-dark-700/30">
                    {question.approach}
                  </p>
                ) : (
                  <div className="text-center py-6 bg-dark-900/20 rounded-xl border border-dashed border-dark-700/40">
                    <BookOpen className="w-6 h-6 text-dark-500 mx-auto mb-2" />
                    <p className="text-dark-400 text-sm">No approach written yet.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 2: Code Block (Authentic IDE Look) */}
          <section className="bg-dark-800/40 rounded-2xl p-6 border border-dark-700/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center text-sm font-bold border border-emerald-500/20">
                  2
                </div>
                <h2 className="text-lg font-bold text-white">Code Solution</h2>
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editData.code}
                onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                rows={12}
                className="w-full p-4 bg-dark-950 border border-dark-700 rounded-xl 
                         text-emerald-300 text-sm focus:outline-none focus:border-emerald-500 
                         resize-none font-mono leading-relaxed"
                placeholder="Paste code solution..."
              />
            ) : (
              <div>
                {question.code ? (
                  /* IDE Window Container */
                  <div className="bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden shadow-2xl">
                    {/* IDE Top Bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                        <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                        <span className="ml-2 text-xs font-mono text-dark-400 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" /> solution.cpp
                        </span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white transition-colors px-2.5 py-1 rounded-lg bg-dark-800/50 border border-dark-700/50"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* IDE Code Area */}
                    <pre className="p-5 text-sm font-mono text-emerald-300/90 leading-relaxed overflow-x-auto">
                      <code>{question.code}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-dark-900/20 rounded-xl border border-dashed border-dark-700/40">
                    <Code2 className="w-6 h-6 text-dark-500 mx-auto mb-2" />
                    <p className="text-dark-400 text-sm">No code added yet.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 3: Complexity Analysis */}
          <section className="bg-dark-800/40 rounded-2xl p-6 border border-dark-700/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center text-sm font-bold border border-amber-500/20">
                3
              </div>
              <h2 className="text-lg font-bold text-white">Complexity Analysis</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-dark-900/40 p-4 rounded-xl border border-dark-700/40 space-y-1">
                <span className="text-xs font-bold text-dark-400 uppercase tracking-wider block">Time Complexity</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.complexity.time}
                    onChange={(e) => setEditData({
                      ...editData,
                      complexity: { ...editData.complexity, time: e.target.value }
                    })}
                    className="w-full mt-1 bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                    placeholder="O(N)"
                  />
                ) : (
                  <p className="text-lg font-mono font-bold text-amber-400">
                    {question.complexity?.time || 'Not Specified'}
                  </p>
                )}
              </div>

              <div className="bg-dark-900/40 p-4 rounded-xl border border-dark-700/40 space-y-1">
                <span className="text-xs font-bold text-dark-400 uppercase tracking-wider block">Space Complexity</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.complexity.space}
                    onChange={(e) => setEditData({
                      ...editData,
                      complexity: { ...editData.complexity, space: e.target.value }
                    })}
                    className="w-full mt-1 bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                    placeholder="O(1)"
                  />
                ) : (
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {question.complexity?.space || 'Not Specified'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: My Notes & Edge Cases */}
          <section className="bg-dark-800/40 rounded-2xl p-6 border border-dark-700/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-500/20 text-violet-400 rounded-xl flex items-center justify-center text-sm font-bold border border-violet-500/20">
                4
              </div>
              <h2 className="text-lg font-bold text-white">My Notes & Edge Cases</h2>
            </div>

            {isEditing ? (
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={4}
                className="w-full p-4 bg-dark-900 border border-dark-700 rounded-xl 
                         text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                placeholder="Personal notes, constraints, gotchas..."
              />
            ) : (
              <div>
                {question.notes ? (
                  <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap bg-dark-900/30 p-4 rounded-xl border border-dark-700/30">
                    {question.notes}
                  </p>
                ) : (
                  <div className="text-center py-6 bg-dark-900/20 rounded-xl border border-dashed border-dark-700/40">
                    <p className="text-dark-500 text-sm">No notes added.</p>
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* ==================== TEST RECALL SLIDE-OVER DRAWER ==================== */}
      {showRecallDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-dark-900 h-full border-l border-dark-700 p-6 space-y-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-dark-700/50 pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Test Recall Mode</h3>
                </div>
                <button
                  onClick={() => setShowRecallDrawer(false)}
                  className="p-1 text-dark-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Recall Workspace */}
              {recallMode === 'testing' && (
                <div className="space-y-4">
                  <p className="text-sm text-dark-300">
                    Approach aur code dekhe bina, jo bhi yaad hai dimaag se likho:
                  </p>
                  <textarea
                    value={scratch}
                    onChange={(e) => setScratch(e.target.value)}
                    rows={10}
                    placeholder="Approach, main logic, pseudo code, gotchas..."
                    className="w-full p-4 bg-dark-950 border border-dark-700 rounded-xl 
                             text-white text-sm focus:outline-none focus:border-amber-500 
                             resize-none font-mono"
                  />
                  <button
                    onClick={() => setRecallMode('revealed')}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-sm rounded-xl transition-colors"
                  >
                    Reveal Original Answer
                  </button>
                </div>
              )}

              {/* Recall Comparison View */}
              {recallMode === 'revealed' && (
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-xs font-bold text-dark-400 uppercase mb-2">Tumhara Scratchpad:</h4>
                    <div className="bg-dark-950 p-4 rounded-xl border border-dark-700/50 text-dark-200 font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {scratch || '(khaali chhoda)'}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-dark-400 uppercase mb-2">Original Approach:</h4>
                    <div className="bg-dark-950 p-4 rounded-xl border border-dark-700/50 text-dark-200 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {question.approach || '(khaali hai)'}
                    </div>
                  </div>

                  {question.code && (
                    <div>
                      <h4 className="text-xs font-bold text-dark-400 uppercase mb-2">Original Code:</h4>
                      <pre className="bg-dark-950 p-4 rounded-xl border border-dark-700/50 text-emerald-400 font-mono text-xs overflow-x-auto max-h-48">
                        <code>{question.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recall Actions Footer */}
            {recallMode === 'revealed' && (
              <div className="pt-4 border-t border-dark-700/50 flex gap-3">
                <button
                  onClick={() => submitRecall(false)}
                  disabled={recallSaving}
                  className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-xl transition-colors"
                >
                  😵 Bhool Gaya
                </button>
                <button
                  onClick={() => submitRecall(true)}
                  disabled={recallSaving}
                  className="flex-1 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-colors"
                >
                  ✅ Yaad Tha
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Parser Modal */}
      <ParserModal
        isOpen={showParser}
        onClose={() => setShowParser(false)}
        question={question}
        onSave={handleParsedSave}
      />
    </div>
  );
};

export default QuestionPage;