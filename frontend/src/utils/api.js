import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  // Without this, a hung backend/DB connection means axios's promise never
  // resolves OR rejects — the calling page's `loading` state (set in try,
  // cleared in finally) just never gets cleared, and the spinner spins
  // forever. This guarantees every request settles within 15s either way.
  timeout: 15000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out — backend/DB slow ya down ho sakta hai.';
    }
    return Promise.reject(error);
  }
);

// Subjects
export const getSubjects = () => api.get('/subjects');
export const getSubject = (id) => api.get(`/subjects/${id}`);
export const createSubject = (data) => api.post('/subjects', data);
export const updateSubject = (id, data) => api.put(`/subjects/${id}`, data);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

// Topics
export const getTopicsBySubject = (subjectId) => api.get(`/topics/subject/${subjectId}`);
export const getTopic = (id) => api.get(`/topics/${id}`);
export const createTopic = (data) => api.post('/topics', data);
export const updateTopic = (id, data) => api.put(`/topics/${id}`, data);
export const deleteTopic = (id) => api.delete(`/topics/${id}`);

// Questions
export const getQuestionsByTopic = (topicId) => api.get(`/questions/topic/${topicId}`);
export const getQuestion = (id) => api.get(`/questions/${id}`);
export const createQuestion = (data) => api.post('/questions', data);
export const updateQuestion = (id, data) => api.put(`/questions/${id}`, data);
export const updateQuestionContent = (id, data) => api.put(`/questions/${id}/content`, data);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);
export const bulkCreateQuestions = (data) => api.post('/questions/bulk', data);

// Plans
export const getPlans = () => api.get('/plans');
export const getActivePlan = () => api.get('/plans/active');
export const getPlan = (id) => api.get(`/plans/${id}`);
export const createPlan = (data) => api.post('/plans', data);
export const updatePlan = (id, data) => api.put(`/plans/${id}`, data);
export const deletePlan = (id) => api.delete(`/plans/${id}`);
export const previewPlan = (data) => api.post('/plans/preview', data);

// Progress / spaced repetition (independent of the manual status checkbox —
// this is the actual Due Today / Test Recall engine)
export const getDueToday = () => api.get('/progress/due');
export const getQuestionProgress = (questionId) => api.get(`/progress/${questionId}`);
export const recallResult = (questionId, passed) => api.post(`/progress/${questionId}/recall`, { passed });

export default api;
