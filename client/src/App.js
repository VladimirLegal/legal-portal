import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DocumentWizard from './components/DocumentWizard';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/generate" element={<DocumentWizard />} />
      </Routes>
    </Router>
  );
}

export default App;