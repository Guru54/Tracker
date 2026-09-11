import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Sheet from './pages/Sheet';
import QuestionPage from './pages/QuestionPage';
import PlanBuilder from './pages/PlanBuilder';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-dark-900">
          <Navbar />
          <main className="w-full px-8 lg:px-12 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sheet/:subjectId" element={<Sheet />} />
              <Route path="/question/:questionId" element={<QuestionPage />} />
              <Route path="/plan-builder" element={<PlanBuilder />} />
            </Routes>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
