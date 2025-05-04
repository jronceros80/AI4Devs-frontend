import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import PositionKanban from './components/PositionKanban';
import RecruiterDashboard from './components/RecruiterDashboard';
import Positions from './components/Positions';
import AddCandidateForm from './components/AddCandidateForm';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<RecruiterDashboard />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/positions/:id" element={<PositionKanban />} />
          <Route path="/add-candidate" element={<AddCandidateForm />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
