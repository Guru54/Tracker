import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Plus, BookOpen, TrendingUp, Target, ArrowRight, CheckCircle, Clock, Brain, AlertCircle, RefreshCw } from 'lucide-react';
import SubjectCard from '../components/SubjectCard';
import AddSubjectModal from '../components/AddSubjectModal';
import { getSubjects, createSubject, deleteSubject, getActivePlan, getDueToday } from '../utils/api';

// Dynamic greeting: picks a random tagline based on the current hour,
// so the dashboard feels alive instead of a static "Welcome back".
const GREETINGS = {
  lateNight: ['Nightowl session jam 🦉', 'Debugging at 2 AM hits different 🌙', 'Silent grind, loud results 🔥'],
  earlyMorning: ['Guru returns to the grind 🌅', 'Early bird catches the logic ☕', 'Fresh mind, fresh commits 🌤️'],
  afternoonEvening: ['Deep work in progress ⚡', 'Welcome back, Master Architect 🚀', 'Consistency compounds 📈']
};

function getGreeting() {
  const hour = new Date().getHours();
  let bucket;
  if (hour >= 0 && hour < 4) bucket = GREETINGS.lateNight;
  else if (hour >= 4 && hour < 9) bucket = GREETINGS.earlyMorning;
  else bucket = GREETINGS.afternoonEvening;
  return bucket[Math.floor(Math.random() * bucket.length)];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const [greeting] = useState(getGreeting);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [totalStats, setTotalStats] = useState({ total: 0, solved: 0 });

  // Today's Targets (from the active Plan — new questions)
  const [todayTargets, setTodayTargets] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState('');

  // Due Today (spaced-repetition revisions — independent of the Plan)
  const [dueToday, setDueToday] = useState([]);
  const [dueLoading, setDueLoading] = useState(true);
  const [dueError, setDueError] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchTodayTargets();
    fetchDueToday();
  }, []);

  useEffect(() => {
    if (location.state?.openAddSubject) {
      setShowModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setSubjectsError('');
      const { data } = await getSubjects();
      setSubjects(data);
      const total = data.reduce((acc, s) => acc + (s.totalQuestions || 0), 0);
      const solved = data.reduce((acc, s) => acc + (s.solvedQuestions || 0), 0);
      setTotalStats({ total, solved });
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setSubjectsError('Subjects load nahi ho paye. Backend/DB connection check karo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayTargets = async () => {
    try {
      setTargetsLoading(true);
      setTargetsError('');
      const { data } = await getActivePlan();
      setActivePlan(data.plan || null);
      setTodayTargets(data.targets || []);
    } catch (err) {
      console.error('Error fetching plan targets:', err);
      setTargetsError('Plan status load nahi ho paya.');
    } finally {
      setTargetsLoading(false);
    }
  };

  const fetchDueToday = async () => {
    try {
      setDueLoading(true);
      setDueError('');
      const { data } = await getDueToday();
      setDueToday(data || []);
    } catch (err) {
      console.error('Error fetching due-today:', err);
      setDueError('Due Today list load nahi ho payi.');
    } finally {
      setDueLoading(false);
    }
  };

  const handleAddSubject = async (data) => {
    try {
      await createSubject(data);
      fetchSubjects();
    } catch (err) {
      console.error('Error creating subject:', err);
      toast.error('Subject create nahi ho paya — connection check karke dobara try karo.');
    }
  };

  const handleDeleteSubject = async (id) => {
    const ok = await confirm('Delete this subject and all its content?', { title: 'Delete subject?' });
    if (!ok) return;
    try {
      await deleteSubject(id);
      fetchSubjects();
    } catch (err) {
      console.error('Error deleting subject:', err);
      toast.error('Subject delete nahi ho paya — connection check karke dobara try karo.');
    }
  };

  const overallProgress = totalStats.total > 0 
    ? Math.round((totalStats.solved / totalStats.total) * 100) 
    : 0;

  const getDifficultyClass = (diff) => {
    switch (diff) {
      case 'Easy': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Hard': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-dark-700/50 text-dark-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}</h1>
        <p className="text-dark-400 mt-1">Let's see where you left off.</p>
      </div>

      {subjectsError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-300 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {subjectsError}</span>
          <button onClick={fetchSubjects} className="flex items-center gap-1 text-rose-200 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-600/20 to-primary-800/10 
                      rounded-2xl p-6 border border-primary-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-dark-400 text-sm font-medium">Total Subjects</span>
          </div>
          <p className="text-3xl font-bold text-white">{subjects.length}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 
                      rounded-2xl p-6 border border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-dark-400 text-sm font-medium">Overall Progress</span>
          </div>
          <p className="text-3xl font-bold text-white">{overallProgress}%</p>
          <p className="text-sm text-dark-400 mt-1">
            {totalStats.solved} / {totalStats.total} solved
          </p>
        </div>

        <div className="bg-gradient-to-br from-violet-600/20 to-violet-800/10 
                      rounded-2xl p-6 border border-violet-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-dark-400 text-sm font-medium">Total Questions</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalStats.total}</p>
        </div>
      </div>

      {/* Today's Targets Widget */}
      <div className="bg-gradient-to-br from-amber-600/10 to-orange-800/5 
                    rounded-2xl border border-amber-500/20 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Today's Targets</h2>
                {activePlan && (
                  <p className="text-sm text-dark-400">
                    {activePlan.name} • {activePlan.dailyQuota} questions/day
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/plan-builder')}
              className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              {activePlan ? 'View Plan' : 'Create Plan'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {targetsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : targetsError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <p className="text-rose-300 text-sm">{targetsError}</p>
              <button onClick={fetchTodayTargets} className="mt-3 text-sm text-amber-400 hover:text-amber-300 inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : todayTargets.length > 0 ? (
            <div className="space-y-2">
              {todayTargets.map((question, index) => (
                <div
                  key={question._id}
                  onClick={() => navigate(`/question/${question._id}`)}
                  className="flex items-center gap-4 p-3 bg-dark-800/40 hover:bg-dark-800/60 
                           rounded-xl border border-dark-700/30 cursor-pointer transition-all
                           group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-dark-500 text-sm w-6 text-center font-mono">
                      {index + 1}
                    </span>

                    {question.status === 'Done' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : question.status === 'In Progress' ? (
                      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-dark-500 flex-shrink-0" />
                    )}

                    <span className={`text-sm font-medium truncate ${
                      question.status === 'Done' ? 'text-dark-500 line-through' : 'text-white'
                    }`}>
                      {question.title}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyClass(question.difficulty)}`}>
                    {question.difficulty}
                  </span>

                  <span className="text-xs text-dark-500 hidden sm:inline">
                    {question.platform}
                  </span>

                  <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-amber-400 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-dark-400 text-sm">No active plan or targets for today</p>
              <button
                onClick={() => navigate('/plan-builder')}
                className="mt-3 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 
                         text-amber-400 rounded-lg text-sm font-medium transition-colors
                         inline-flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Create a Study Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Due Today Widget — spaced-repetition revisions, independent of the Plan */}
      <div className="bg-gradient-to-br from-rose-600/10 to-pink-800/5 
                    rounded-2xl border border-rose-500/20 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Due Today</h2>
                <p className="text-sm text-dark-400">Spaced-repetition revisions — Test Recall karna hai</p>
              </div>
            </div>
          </div>

          {dueLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : dueError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <p className="text-rose-300 text-sm">{dueError}</p>
              <button onClick={fetchDueToday} className="mt-3 text-sm text-rose-400 hover:text-rose-300 inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : dueToday.length > 0 ? (
            <div className="space-y-2">
              {dueToday.map((entry) => (
                <div
                  key={entry.progressId}
                  onClick={() => navigate(`/question/${entry.question._id}`)}
                  className="flex items-center gap-4 p-3 bg-dark-800/40 hover:bg-dark-800/60 
                           rounded-xl border border-dark-700/30 cursor-pointer transition-all group"
                >
                  <Brain className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white truncate block">{entry.question.title}</span>
                    <span className="text-xs text-dark-500">{entry.subjectName} → {entry.topicName}</span>
                  </div>
                  <span className="text-xs text-dark-500">{entry.revisionCount} revisions so far</span>
                  <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-rose-400 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-dark-400 text-sm">Aaj kuch bhi due nahi hai. Nice.</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Vault</h1>
          <p className="text-dark-400 mt-1">Manage all your learning subjects</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bento-card animate-pulse">
              <div className="w-12 h-12 bg-dark-700 rounded-xl mb-4" />
              <div className="h-5 bg-dark-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-dark-700 rounded w-1/2 mb-4" />
              <div className="h-2 bg-dark-700 rounded w-full" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-dark-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No subjects yet</h3>
          <p className="text-dark-400 mb-6">Create your first subject to start tracking</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <SubjectCard 
              key={subject._id} 
              subject={subject} 
              onDelete={handleDeleteSubject}
            />
          ))}

          <button
            onClick={() => setShowModal(true)}
            className="bento-card flex flex-col items-center justify-center 
                     min-h-[200px] border-dashed border-2 border-dark-600
                     hover:border-primary-500/50 hover:bg-dark-800/50"
          >
            <div className="w-14 h-14 bg-dark-700/50 rounded-2xl flex items-center justify-center mb-4">
              <Plus className="w-7 h-7 text-dark-400" />
            </div>
            <span className="text-dark-400 font-medium">Add New Subject</span>
          </button>
        </div>
      )}

      {/* Modal */}
      <AddSubjectModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onAdd={handleAddSubject}
      />
    </div>
  );
};

export default Dashboard;
