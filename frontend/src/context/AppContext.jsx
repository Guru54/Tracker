import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [subjects, setSubjects] = useState([]);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await import('../utils/api.js').then(m => m.getSubjects());
      setSubjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    subjects,
    setSubjects,
    currentSubject,
    setCurrentSubject,
    currentTopic,
    setCurrentTopic,
    currentQuestion,
    setCurrentQuestion,
    loading,
    setLoading,
    error,
    setError,
    refreshSubjects
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
