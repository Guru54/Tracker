import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Target, Zap, Check, AlertTriangle,
  Loader2, Plus, AlertCircle, RefreshCw, ChevronDown, ChevronRight,
  Power, CheckCircle, Clock, BookOpen, Layers, ArrowRight
} from 'lucide-react';
import { getSubjects, getTopicsBySubject, createPlan, previewPlan, getActivePlan, updatePlan } from '../utils/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const PlanBuilder = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  // Active Plan state
  const [activePlan, setActivePlan] = useState(null);
  const [todayTargets, setTodayTargets] = useState([]);
  const [activePlanLoading, setActivePlanLoading] = useState(true);
  const [activePlanError, setActivePlanError] = useState('');
  const [isBuildingNew, setIsBuildingNew] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Subject / Topic selection state
  const [subjects, setSubjects] = useState([]);
  const [subjectsError, setSubjectsError] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState({});      // subjectId -> bool
  const [topicsBySubject, setTopicsBySubject] = useState({});        // subjectId -> topics[]
  const [topicsLoading, setTopicsLoading] = useState({});            // subjectId -> bool
  const [topicsErrorBySubject, setTopicsErrorBySubject] = useState({}); // subjectId -> string

  // selection keyed by topicId -> { subjectId, topicId, topicName }
  const [selected, setSelected] = useState({});

  const [mode, setMode] = useState('pace'); // 'pace' or 'deadline'
  const [dailyQuota, setDailyQuota] = useState(5);
  const [targetDate, setTargetDate] = useState('');
  const [studyDays, setStudyDays] = useState('daily');
  const [planName, setPlanName] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchActivePlan();
    fetchSubjects();
  }, []);

  const fetchActivePlan = async () => {
    try {
      setActivePlanLoading(true);
      setActivePlanError('');
      const { data } = await getActivePlan();
      setActivePlan(data.plan || null);
      setTodayTargets(data.targets || []);
    } catch (err) {
      console.error('Error fetching active plan:', err);
      setActivePlanError('Active plan status load nahi ho paya.');
    } finally {
      setActivePlanLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      setSubjectsError('');
      const { data } = await getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setSubjectsError('Subjects load nahi ho paye — connection check karke retry karo.');
    }
  };

  const toggleSubjectExpand = async (subjectId) => {
    const willExpand = !expandedSubjects[subjectId];
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: willExpand }));

    if (willExpand && !topicsBySubject[subjectId]) {
      setTopicsLoading(prev => ({ ...prev, [subjectId]: true }));
      setTopicsErrorBySubject(prev => ({ ...prev, [subjectId]: '' }));
      try { 
        const { data } = await getTopicsBySubject(subjectId);
        setTopicsBySubject(prev => ({ ...prev, [subjectId]: data }));
      } catch (err) {
        console.error('Error fetching topics:', err);
        setTopicsErrorBySubject(prev => ({ ...prev, [subjectId]: 'Topics load nahi ho paye.' }));
      } finally {
        setTopicsLoading(prev => ({ ...prev, [subjectId]: false }));
      }
    }
  };

  const toggleTopic = (subjectId, topic) => {
    setPreview(null);
    setSelected(prev => {
      const next = { ...prev };
      if (next[topic._id]) delete next[topic._id];
      else next[topic._id] = { subjectId, topicId: topic._id, topicName: topic.name };
      return next;
    });
  };

  const toggleAllInSubject = (subjectId) => {
    const topics = topicsBySubject[subjectId] || [];
    const allSelected = topics.length > 0 && topics.every(t => selected[t._id]);
    setPreview(null);
    setSelected(prev => {
      const next = { ...prev };
      topics.forEach(t => {
        if (allSelected) delete next[t._id];
        else next[t._id] = { subjectId, topicId: t._id, topicName: t.name };
      });
      return next;
    });
  };

  const selectedList = Object.values(selected);
  const selectedCount = selectedList.length;

  const handlePreview = async () => {
    if (selectedCount === 0) return;

    setLoading(true);
    setPreviewError('');
    setPreview(null);
    try {
      const { data } = await previewPlan({
        selectedTopics: selectedList,
        mode,
        dailyQuota: parseInt(dailyQuota),
        targetDate,
        studyDays
      });
      setPreview(data);
    } catch (err) {
      console.error('Error generating preview:', err);
      setPreviewError('Preview calculate nahi ho paya — connection check karke dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!planName || selectedCount === 0) return;

    setSaving(true);
    setSaveError('');
    try {
      await createPlan({
        name: planName,
        selectedTopics: selectedList,
        mode,
        dailyQuota: parseInt(dailyQuota),
        targetDate: mode === 'deadline' ? targetDate : null,
        studyDays
      });
      navigate('/');
    } catch (err) {
      console.error('Error creating plan:', err);
      setSaveError('Plan save nahi ho paya — connection check karke dobara try karo. (Kuch bhi save nahi hua, dobara "Create Plan" dabao.)');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivatePlan = async () => {
    if (!activePlan) return;
    const ok = await confirm(`Stop/deactivate "${activePlan.name}"?`, { title: 'Deactivate plan?' });
    if (!ok) return;

    setDeactivating(true);
    try {
      await updatePlan(activePlan._id, { isActive: false });
      setActivePlan(null);
      setTodayTargets([]);
      setIsBuildingNew(true);
    } catch (err) {
      console.error('Error deactivating plan:', err);
      toast.error('Plan deactivate nahi ho paya — connection check karke retry karo.');
    } finally {
      setDeactivating(false);
    }
  };

  const getDifficultyClass = (diff) => {
    switch (diff) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Hard': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-dark-700/50 text-dark-400';
    }
  };

  const getStudyDaysLabel = (days) => {
    switch (days) {
      case '6day': return '6 days / week (Sun off)';
      case '5day': return '5 days / week (Weekdays only)';
      default: return 'Daily (7 days / week)';
    }
  };

  // Loading state while checking active plan
  if (activePlanLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-dark-400 text-sm">Plan status load ho raha hai...</p>
        </div>
      </div>
    );
  }

  // ACTIVE PLAN VIEW (when activePlan exists and user is not building a new one)
  if (activePlan && !isBuildingNew) {
    const progressPct = activePlan.totalQuestions > 0
      ? Math.min(100, Math.round((activePlan.assignedSoFar / activePlan.totalQuestions) * 100))
      : 0;

    return (
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{activePlan.name}</h1>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                Active Plan
              </span>
            </div>
            <p className="text-dark-400 mt-1">Aapka current active learning plan details aur progress</p>
          </div>

          <button
            onClick={() => setIsBuildingNew(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create New Plan
          </button>
        </div>

        {/* Progress & Plan Overview Card */}
        <div className="bg-gradient-to-br from-dark-800/80 to-dark-800/40 rounded-2xl p-6 border border-dark-700/60 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs text-dark-400 font-medium uppercase tracking-wider">Overall Plan Completion</span>
              <p className="text-2xl font-bold text-white mt-1">
                {activePlan.assignedSoFar} / {activePlan.totalQuestions} questions scheduled ({progressPct}%)
              </p>
            </div>
            <button
              onClick={handleDeactivatePlan}
              disabled={deactivating}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-medium transition-colors flex items-center gap-2"
            >
              {deactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
              Stop / Deactivate Plan
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-dark-900 rounded-full h-3 overflow-hidden p-0.5 border border-dark-700/50">
            <div
              className="bg-gradient-to-r from-primary-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Key Plan Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
              <span className="text-xs text-dark-400">Daily Target</span>
              <p className="text-xl font-bold text-amber-400 mt-1">{activePlan.dailyQuota} Qs/day</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
              <span className="text-xs text-dark-400">Study Schedule</span>
              <p className="text-sm font-semibold text-white mt-1">{getStudyDaysLabel(activePlan.studyDays)}</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
              <span className="text-xs text-dark-400">Start Date</span>
              <p className="text-sm font-semibold text-white mt-1">{activePlan.startDate}</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
              <span className="text-xs text-dark-400">Projected Finish</span>
              <p className="text-sm font-semibold text-emerald-400 mt-1">{activePlan.projectedFinishDate || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Today's Targets in this Plan */}
        <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Today's Targets</h2>
              <p className="text-xs text-dark-400">Questions assigned for today in this plan</p>
            </div>
          </div>

          {todayTargets.length > 0 ? (
            <div className="space-y-2">
              {todayTargets.map((q, idx) => (
                <div
                  key={q._id}
                  onClick={() => navigate(`/question/${q._id}`)}
                  className="flex items-center gap-4 p-3.5 bg-dark-900/60 hover:bg-dark-900 
                           rounded-xl border border-dark-700/40 cursor-pointer transition-all group"
                >
                  <span className="text-dark-500 text-sm font-mono w-5 text-center">{idx + 1}</span>
                  {q.status === 'Done' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : q.status === 'In Progress' ? (
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-dark-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium flex-1 truncate ${q.status === 'Done' ? 'text-dark-500 line-through' : 'text-white'}`}>
                    {q.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyClass(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                  <span className="text-xs text-dark-500 hidden sm:inline">{q.platform}</span>
                  <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-amber-400 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-dark-400 text-sm">
              Aaj ke liye naye questions scheduled nahi hain ya sab ho gaye!
            </div>
          )}
        </div>

        {/* Selected Topics in this Plan */}
        {activePlan.selectedTopics && activePlan.selectedTopics.length > 0 && (
          <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Selected Topics ({activePlan.selectedTopics.length})</h2>
                <p className="text-xs text-dark-400">Topics covered in this active plan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activePlan.selectedTopics.map((t, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-dark-900/40 rounded-xl border border-dark-700/30 text-sm text-dark-200">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{t.topicName || 'Topic'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // BUILD NEW PLAN FORM
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => {
            if (activePlan && isBuildingNew) {
              setIsBuildingNew(false);
            } else {
              navigate('/');
            }
          }}
          className="flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {activePlan && isBuildingNew ? 'Back to Active Plan' : 'Back to Dashboard'}
        </button>
        <h1 className="text-3xl font-bold text-white">Plan Builder</h1>
        <p className="text-dark-400 mt-2">Koi bhi subjects/topics mix karo, ek hi day-wise plan mein</p>
      </div>

      {activePlan && isBuildingNew && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Note: Naya plan banane se aapka pehle se active plan (<strong>{activePlan.name}</strong>) replace ho jayega.</span>
          </div>
          <button
            onClick={() => setIsBuildingNew(false)}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
          >
            View Active Plan
          </button>
        </div>
      )}

      {/* Step 1: Select Topics (any subject, any mix) */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <span className="text-primary-400 text-sm font-bold">1</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Select Topics</h2>
          <span className="text-sm text-dark-400">({selectedCount} topics selected)</span>
        </div>

        {subjectsError && (
          <div className="mb-4 flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-300">
            <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {subjectsError}</span>
            <button onClick={fetchSubjects} className="flex items-center gap-1 text-rose-200 hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        <div className="space-y-2">
          {subjects.map(subject => {
            const topics = topicsBySubject[subject._id];
            const expanded = !!expandedSubjects[subject._id];
            const allSelected = topics && topics.length > 0 && topics.every(t => selected[t._id]);
            const selectedInSubject = topics ? topics.filter(t => selected[t._id]).length : 0;

            return (
              <div key={subject._id} className="border border-dark-700 rounded-xl overflow-hidden">
                <div
                  onClick={() => toggleSubjectExpand(subject._id)}
                  className="flex items-center gap-3 p-3 bg-dark-800/40 hover:bg-dark-800/60 cursor-pointer transition-colors"
                >
                  {expanded ? <ChevronDown className="w-4 h-4 text-dark-400" /> : <ChevronRight className="w-4 h-4 text-dark-400" />}
                  {topics && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => { e.stopPropagation(); toggleAllInSubject(subject._id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-primary-500"
                    />
                  )}
                  <span className="text-white font-medium flex-1">{subject.name}</span>
                  {selectedInSubject > 0 && (
                    <span className="text-xs text-primary-400 font-mono">{selectedInSubject} selected</span>
                  )}
                </div>

                {expanded && (
                  <div className="p-3 pl-10 bg-dark-900/30 space-y-1">
                    {topicsLoading[subject._id] && (
                      <div className="flex items-center gap-2 text-sm text-dark-400 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading topics...
                      </div>
                    )}
                    {topicsErrorBySubject[subject._id] && (
                      <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-xs text-rose-300">
                        <span>{topicsErrorBySubject[subject._id]}</span>
                        <button onClick={() => toggleSubjectExpand(subject._id)} className="text-rose-200 hover:text-white">Retry</button>
                      </div>
                    )}
                    {topics && topics.map(topic => (
                      <label key={topic._id} className="flex items-center gap-3 py-1.5 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={!!selected[topic._id]}
                          onChange={() => toggleTopic(subject._id, topic)}
                          className="accent-primary-500"
                        />
                        <span className={selected[topic._id] ? 'text-primary-400' : 'text-dark-300'}>{topic.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Set Pace */}
      {selectedCount > 0 && (
        <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <span className="text-primary-400 text-sm font-bold">2</span>
            </div>
            <h2 className="text-lg font-semibold text-white">Set Your Pace</h2>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('pace'); setPreview(null); }}
              className={`flex-1 py-3 rounded-xl border text-center transition-all ${
                mode === 'pace'
                  ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                  : 'border-dark-700 text-dark-400 hover:border-dark-600'
              }`}
            >
              <Zap className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Daily Pace</span>
              <p className="text-xs text-dark-500 mt-1">I want to do X questions/day</p>
            </button>
            <button
              onClick={() => { setMode('deadline'); setPreview(null); }}
              className={`flex-1 py-3 rounded-xl border text-center transition-all ${
                mode === 'deadline'
                  ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                  : 'border-dark-700 text-dark-400 hover:border-dark-600'
              }`}
            >
              <Calendar className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Deadline</span>
              <p className="text-xs text-dark-500 mt-1">I want to finish by Y date</p>
            </button>
          </div>

          {/* Pace Input */}
          {mode === 'pace' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Questions per day</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={dailyQuota}
                    onChange={(e) => { setDailyQuota(e.target.value); setPreview(null); }}
                    className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <span className="text-2xl font-bold text-primary-400 w-12 text-center">{dailyQuota}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-dark-300 mb-2">Target completion date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => { setTargetDate(e.target.value); setPreview(null); }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg 
                         text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          {/* Study Days */}
          <div className="mt-6">
            <label className="block text-sm text-dark-300 mb-2">Study days</label>
            <select
              value={studyDays}
              onChange={(e) => { setStudyDays(e.target.value); setPreview(null); }}
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg 
                       text-white focus:outline-none focus:border-primary-500"
            >
              <option value="daily">Daily (7 din/week)</option>
              <option value="6day">6 din/week (Sunday off)</option>
              <option value="5day">5 din/week (weekdays only)</option>
            </select>
          </div>

          {/* Preview Button */}
          <button
            onClick={handlePreview}
            disabled={loading}
            className="w-full mt-6 py-3 bg-dark-700 hover:bg-dark-600 text-white 
                     rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {loading ? 'Calculating...' : 'Generate Preview'}
          </button>

          {previewError && (
            <div className="mt-4 flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-300">
              <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {previewError}</span>
              <button onClick={handlePreview} className="flex items-center gap-1 text-rose-200 hover:text-white">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview Results — combined load (new + estimated due revisions), not just new-question pace */}
      {preview && (
        <div className="rounded-2xl p-6 border bg-dark-800/50 border-dark-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Check className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Plan Preview</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400">Total Questions</p>
              <p className="text-2xl font-bold text-white">{preview.totalQuestions}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400">Q/day</p>
              <p className="text-2xl font-bold text-primary-400">{preview.dailyQuota}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400">Active Days</p>
              <p className="text-2xl font-bold text-white">{preview.totalActiveDays}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-xs text-dark-400">Finish Date</p>
              <p className="text-lg font-bold text-emerald-400">{preview.finishDate}</p>
            </div>
          </div>

          <p className="text-xs text-dark-400 mb-3">
            "Combined Load" = us din ke naye Q + estimated due-revisions dono. Row red hai matlab us din ka actual load quota se kaafi zyada hai.
          </p>

          <div className="border border-dark-700 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-dark-900 text-xs text-dark-400 font-mono uppercase">
              <span>Date</span><span>New</span><span>Due (est.)</span><span>Combined</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {preview.days.map(d => (
                <div
                  key={d.date}
                  className={`grid grid-cols-4 gap-2 px-3 py-2 text-sm font-mono border-t border-dark-800 ${!d.isStudyDay ? 'opacity-40' : ''}`}
                >
                  <span className="text-dark-300">{d.date}{!d.isStudyDay && <span className="text-dark-500 text-xs"> (rest)</span>}</span>
                  <span className="text-dark-300">{d.newCount}</span>
                  <span className="text-dark-300">{d.estimatedDueCount}</span>
                  <span className={d.estimatedCombinedLoad > preview.dailyQuota * 2 ? 'text-rose-400 font-bold' : 'text-dark-300'}>
                    {d.estimatedCombinedLoad}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Name & Create */}
      {preview && (
        <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <span className="text-primary-400 text-sm font-bold">3</span>
            </div>
            <h2 className="text-lg font-semibold text-white">Name Your Plan</h2>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g., Interview Prep Sprint"
              className="flex-1 px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg 
                       text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={handleCreatePlan}
              disabled={!planName || saving}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50
                       text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Plan'}
            </button>
          </div>

          {saveError && (
            <div className="mt-4 flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-300">
              <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {saveError}</span>
              <button onClick={handleCreatePlan} className="flex items-center gap-1 text-rose-200 hover:text-white">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanBuilder;
