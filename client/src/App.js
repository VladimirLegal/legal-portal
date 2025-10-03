import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PropertyTypePage from './pages/PropertyTypePage';
import RentApartmentWizard from './components/RentApartmentWizard';
import Header from './components/Header';
import DocumentEditorPage from './pages/DocumentEditorPage';

// Заглушки для других страниц
const RegisterPage = () => <div className="max-w-4xl mx-auto px-4 py-8">Страница регистрации</div>;
const LoginPage = () => <div className="max-w-4xl mx-auto px-4 py-8">Страница входа</div>;
const AgreementPage = () => <div className="max-w-4xl mx-auto px-4 py-8">Соглашение об обработке ПД</div>;
const AboutPage = () => <div className="max-w-4xl mx-auto px-4 py-8">О нас</div>;

function App() {
  return (
    <Router>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/property-type/:transactionType" element={<PropertyTypePage />} />
          <Route path="/rent/apartment" element={<RentApartmentWizard />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/agreement" element={<AgreementPage />} />
          <Route path="/about" element={<AboutPage />} /> {/* Добавлено */}
          <Route path="/document-editor" element={<DocumentEditorPage />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;