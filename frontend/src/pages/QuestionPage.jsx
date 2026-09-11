import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit3, Save, X, Sparkles, FileDown, 
  CheckCircle, Clock, AlertCircle, Loader2, Brain, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import ParserModal from '../components/ParserModal';
import { getQuestion, updateQuestion, updateQuestionContent, getQuestionProgress, recallResult } from '../utils/api';
import { generateQuestionPDF } from '../utils/pdfGenerator';
import { emptyApproach } from '../utils/parser';

const QuestionPage = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showParser, setShowParser] = useState(false);
  const [editData, setEditData] = useState({
    problemStatement: '',
    approaches: [],
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Which content sections are expanded. All open by default; user folds
  // away whatever they're not focused on. While editing, a section stays
  // open regardless of this state so nothing gets hidden mid-edit. Each
  // approach card gets its own key ('approach-0', 'approach-1', ...) so
  // they can be folded independently.
  const [openSections, setOpenSections] = useState({
    problemStatement: true,
    notes: true
  });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  const isOpen = (key) => openSections[key] !== false; // approach cards default open even before their key exists

  // Test Recall state
  const [recallMode, setRecallMode] = useState(null); // null | 'testing' | 'revealed'
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
        problemStatement: data.problemStatement || '',
        approaches: (data.approaches && data.approaches.length) ? data.approaches : [],
        notes: data.notes || ''
      });
      // Progress fetch is best-effort and separate from the question fetch —
      // a question with no revision history yet is a normal state (returns null),
      // not an error, so it's handled on its own rather than failing the whole page.
      try {
        const { data: prog } = await getQuestionProgress(questionId);
        setProgress(prog);
      } catch {
        setProgress(null);
      }
    } catch (err) {
      console.error('Error fetching question:', err);
      setLoadError('Question load nahi ho paya. Backend down ho sakta hai ya connection issue — dobara try karo.');
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
      setSaveError('Save nahi ho paya — connection check karo aur dobara try karo. Tumhara content abhi bhi editor mein hai, khoya nahi hai.');
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
        // Marking Done kicks off the revision schedule server-side — refresh
        // so the Due/Level badge reflects it immediately.
        try {
          const { data: prog } = await getQuestionProgress(questionId);
          setProgress(prog);
        } catch { /* non-fatal — badge will just stay as-is until next load */ }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setSaveError('Status update save nahi hua — connection check karke dobara try karo.');
    }
  };

  function startRecall() {
    setScratch('');
    setRecallMode('testing');
  }

  async function submitRecall(passed) {
    setRecallSaving(true);
    try {
      const { data: updated } = await recallResult(questionId, passed);
      setProgress(updated);
      setSaveError('');
    } catch (err) {
      console.error('Error saving recall result:', err);
      setSaveError('Recall result save nahi hua — connection check karke dobara try karo.');
    } finally {
      setRecallSaving(false);
      setRecallMode(null);
      setScratch('');
    }
  }

  function revisionBadge() {
    if (!progress) return { text: 'Not in revision cycle', cls: 'text-dark-500' };
    const passCount = (progress.revisionDates || []).filter(r => r.grade === 'pass').length;
    const isDue = progress.nextRevision && new Date(progress.nextRevision) <= new Date();
    if (isDue) return { text: 'DUE for revision', cls: 'text-amber-400' };
    return {
      text: `Level ${Math.min(passCount, 4)}/4 · next: ${new Date(progress.nextRevision).toLocaleDateString()}`,
      cls: 'text-emerald-400'
    };
  }

  const handleParsedSave = async (data) => {
    const payload = {
      problemStatement: data.problemStatement || editData.problemStatement,
      // If the AI response had no approaches, keep whatever was already
      // there rather than wiping existing approaches out.
      approaches: (data.approaches && data.approaches.length) ? data.approaches : editData.approaches,
      // Key Points from the AI response become notes; don't clobber existing
      // manual notes if the AI response didn't include any.
      notes: data.notes || editData.notes
    };

    try {
      const { data: saved } = await updateQuestionContent(questionId, payload);
      setQuestion(saved);
      setSaveError('');
      setEditData({
        problemStatement: saved.problemStatement || '',
        approaches: saved.approaches || [],
        notes: saved.notes || ''
      });
    } catch (err) {
      console.error('Error saving generated content:', err);
      setSaveError('Generated content save nahi ho paya — connection check karke dobara try karo. (Content is uparwale editor mein hai, "Save" dabao dobara.)');
      // Still surface the parsed content in the editor so nothing is lost —
      // the user can hit Save manually once the connection issue is sorted.
      setEditData(payload);
      setIsEditing(true);
    }
  };

  // Add/remove/update helpers for the approaches list while editing.
  const addApproach = () => {
    setEditData(prev => ({ ...prev, approaches: [...prev.approaches, emptyApproach()] }));
  };
  const removeApproach = (index) => {
    setEditData(prev => ({ ...prev, approaches: prev.approaches.filter((_, i) => i !== index) }));
  };
  const updateApproach = (index, field, value) => {
    setEditData(prev => ({
      ...prev,
      approaches: prev.approaches.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

  const handleDownloadPDF = async () => {
    await generateQuestionPDF(question);
  };

  const getDifficultyClass = (diff) => {
    switch (diff) {
      case 'Easy': return 'difficulty-easy';
      case 'Medium': return 'difficulty-medium';
      case 'Hard': return 'difficulty-hard';
      default: return 'difficulty-medium';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Done': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-warning" />;
      case 'Revisit': return <AlertCircle className="w-4 h-4 text-danger" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-dark-500" />;
    }
  };

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
          <button onClick={fetchQuestion} className="btn-primary">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => navigate(-1)} className="btn-ghost">
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
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-dark-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sheet
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParser(true)}
            className="btn-ghost text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate Content
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn-ghost text-sm"
          >
            <FileDown className="w-4 h-4" />
            Download PDF
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-ghost text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-300">
          {saveError}
        </div>
      )}

      {/* Question Header */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700/50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{question.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={getDifficultyClass(question.difficulty)}>
                {question.difficulty}
              </span>
              <span className="text-sm text-dark-400">{question.platform}</span>
              {question.link && (
                <a
                  href={question.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-400 hover:text-primary-300 
                           flex items-center gap-1 transition-colors"
                >
                  Open Problem
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </a>
              )}
            </div>
          </div>

          {/* Status Selector */}
          <div className="flex items-center gap-2">
            {getStatusIcon(question.status)}
            <select
              value={question.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 
                       text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Revisit">Revisit</option>
            </select>
          </div>
        </div>

        {progress && (
          <div className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4 text-dark-400" />
            <span className={revisionBadge().cls}>{revisionBadge().text}</span>
          </div>
        )}
      </div>

      {/* Test Recall */}
      {question.status === 'Done' && (
        <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 overflow-hidden">
          {recallMode === null && (
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary-400" /> Test Recall
                </h3>
                <p className="text-sm text-dark-400 mt-1">
                  Approach/code dekhe bina, apne dimaag se yaad karke likho — phir check karo.
                </p>
              </div>
              <button onClick={startRecall} className="btn-primary text-sm">
                Start Recall
              </button>
            </div>
          )}

          {recallMode === 'testing' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-dark-300">Bina dekhe, approach/code apne words mein yaad karke likho:</p>
              <textarea
                value={scratch}
                onChange={(e) => setScratch(e.target.value)}
                rows={6}
                placeholder="Jo bhi yaad hai — approach, logic, gotchas..."
                className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl 
                         text-white text-sm focus:outline-none focus:border-primary-500 
                         resize-none font-mono"
              />
              <button onClick={() => setRecallMode('revealed')} className="btn-primary text-sm">
                Reveal Answer
              </button>
            </div>
          )}

          {recallMode === 'revealed' && (
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-dark-300 mb-2">Tumhara scratch:</h4>
                <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30 text-sm text-dark-300 whitespace-pre-wrap">
                  {scratch || '(khaali chhoda)'}
                </div>
              </div>
              {(question.approaches && question.approaches.length > 0) ? (
                question.approaches.map((a, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">
                      Asli Approach {i + 1}{a.title ? `: ${a.title}` : ''}
                    </h4>
                    <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30 text-sm text-dark-300 whitespace-pre-wrap">
                      {a.explanation || '(khaali hai)'}
                    </div>
                    {a.code && (
                      <pre className="code-block text-xs mt-2">{a.code}</pre>
                    )}
                  </div>
                ))
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Asli Approach:</h4>
                  <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30 text-sm text-dark-300 whitespace-pre-wrap">
                    (khaali hai)
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => submitRecall(false)}
                  disabled={recallSaving}
                  className="flex-1 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 
                           rounded-lg font-medium transition-colors"
                >
                  😵 Bhool gaya
                </button>
                <button
                  onClick={() => submitRecall(true)}
                  disabled={recallSaving}
                  className="flex-1 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 
                           rounded-lg font-medium transition-colors"
                >
                  ✅ Yaad tha
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Problem Statement */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection('problemStatement')}
            className="w-full text-lg font-semibold text-white mb-3 flex items-center gap-2 text-left"
          >
            <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <span className="text-primary-400 text-sm font-bold">•</span>
            </span>
            Problem Statement
            <span className="ml-auto text-dark-400">
              {isOpen('problemStatement') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </button>
          {(isEditing || isOpen('problemStatement')) && (isEditing ? (
            <textarea
              value={editData.problemStatement}
              onChange={(e) => setEditData({ ...editData, problemStatement: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl 
                       text-white text-sm focus:outline-none focus:border-primary-500 
                       resize-none font-mono leading-relaxed"
              placeholder="Restate the problem here..."
            />
          ) : (
            <div className="bg-dark-800/30 rounded-xl p-6 border border-dark-700/30">
              {question.problemStatement ? (
                <p className="whitespace-pre-wrap text-sm text-dark-200 leading-relaxed">
                  {question.problemStatement}
                </p>
              ) : (
                <div className="text-center py-8">
                  <p className="text-dark-500 text-sm">No problem statement written yet</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-primary-400 text-sm mt-2 hover:underline"
                  >
                    Start writing
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Approaches — a question can have several: brute force, better,
            optimal, each fully self-contained with its own intuition,
            explanation, code and complexity. */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span className="text-emerald-400 text-sm font-bold">1</span>
            </span>
            Approaches
          </h2>

          {(isEditing ? editData.approaches : (question.approaches || [])).length === 0 && !isEditing && (
            <div className="bg-dark-800/30 rounded-xl p-8 border border-dark-700/30 text-center">
              <p className="text-dark-500 text-sm">No approaches written yet</p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-primary-400 text-sm mt-2 hover:underline"
              >
                Add an approach
              </button>
            </div>
          )}

          {(isEditing ? editData.approaches : (question.approaches || [])).map((a, i) => {
            const key = `approach-${i}`;
            return (
              <div key={i} className="bg-dark-800/30 rounded-xl border border-dark-700/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center gap-2 px-6 py-4 text-left"
                >
                  <span className="font-semibold text-white">
                    Approach {i + 1}{!isEditing && a.title ? `: ${a.title}` : ''}
                  </span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeApproach(i); }}
                      className="ml-2 text-rose-400 hover:text-rose-300 text-xs"
                    >
                      Remove
                    </button>
                  )}
                  <span className="ml-auto text-dark-400">
                    {isOpen(key) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </span>
                </button>

                {(isEditing || isOpen(key)) && (
                  <div className="px-6 pb-6 space-y-4">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={a.title}
                          onChange={(e) => updateApproach(i, 'title', e.target.value)}
                          placeholder="Title (e.g. Brute Force, Optimal)"
                          className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg 
                                   text-white text-sm focus:outline-none focus:border-primary-500"
                        />
                        <textarea
                          value={a.intuition}
                          onChange={(e) => updateApproach(i, 'intuition', e.target.value)}
                          rows={2}
                          placeholder="Intuition — the key insight in a sentence or two"
                          className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl 
                                   text-white text-sm focus:outline-none focus:border-primary-500 
                                   resize-none"
                        />
                        <textarea
                          value={a.explanation}
                          onChange={(e) => updateApproach(i, 'explanation', e.target.value)}
                          rows={6}
                          placeholder="Step-by-step explanation"
                          className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl 
                                   text-white text-sm focus:outline-none focus:border-primary-500 
                                   resize-none font-mono leading-relaxed"
                        />
                        <textarea
                          value={a.code}
                          onChange={(e) => updateApproach(i, 'code', e.target.value)}
                          rows={10}
                          placeholder="Code"
                          className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl 
                                   text-white text-sm focus:outline-none focus:border-primary-500 
                                   resize-none font-mono leading-relaxed"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={a.timeComplexity}
                            onChange={(e) => updateApproach(i, 'timeComplexity', e.target.value)}
                            placeholder="Time — O(n)"
                            className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg 
                                     text-white text-sm font-mono focus:outline-none focus:border-primary-500"
                          />
                          <input
                            type="text"
                            value={a.spaceComplexity}
                            onChange={(e) => updateApproach(i, 'spaceComplexity', e.target.value)}
                            placeholder="Space — O(1)"
                            className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg 
                                     text-white text-sm font-mono focus:outline-none focus:border-primary-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {a.intuition && (
                          <p className="text-sm text-dark-300 italic whitespace-pre-wrap">{a.intuition}</p>
                        )}
                        {a.explanation && (
                          <p className="whitespace-pre-wrap text-sm text-dark-200 leading-relaxed">
                            {a.explanation}
                          </p>
                        )}
                        {a.code && (
                          <div className="bg-dark-900 rounded-xl border border-dark-700/50 overflow-hidden">
                            <pre className="p-6 text-sm font-mono text-dark-200 leading-relaxed overflow-x-auto">
                              <code>{a.code}</code>
                            </pre>
                          </div>
                        )}
                        {(a.timeComplexity || a.spaceComplexity) && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
                              <span className="text-sm text-dark-400">Time Complexity</span>
                              <p className="text-lg font-mono text-white mt-1">{a.timeComplexity || 'Not set'}</p>
                            </div>
                            <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
                              <span className="text-sm text-dark-400">Space Complexity</span>
                              <p className="text-lg font-mono text-white mt-1">{a.spaceComplexity || 'Not set'}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isEditing && (
            <button
              type="button"
              onClick={addApproach}
              className="w-full py-3 border-2 border-dashed border-dark-700 rounded-xl 
                       text-dark-400 hover:text-primary-400 hover:border-primary-500/50 
                       text-sm font-medium transition-colors"
            >
              + Add Another Approach
            </button>
          )}
        </section>

        {/* Notes */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection('notes')}
            className="w-full text-lg font-semibold text-white mb-3 flex items-center gap-2 text-left"
          >
            <span className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <span className="text-violet-400 text-sm font-bold">2</span>
            </span>
            My Notes
            <span className="ml-auto text-dark-400">
              {isOpen('notes') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </button>
          {(isEditing || isOpen('notes')) && (isEditing ? (
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl 
                       text-white text-sm focus:outline-none focus:border-primary-500 
                       resize-none"
              placeholder="Your personal notes, edge cases, tricks..."
            />
          ) : (
            <div className="bg-dark-800/30 rounded-xl p-6 border border-dark-700/30">
              {question.notes ? (
                <p className="text-sm text-dark-300 whitespace-pre-wrap">
                  {question.notes}
                </p>
              ) : (
                <div className="text-center py-4">
                  <p className="text-dark-500 text-sm">No notes yet</p>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>

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
