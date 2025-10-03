import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faBars } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center text-xl font-bold text-blue-600">
          <FontAwesomeIcon icon={faFileContract} className="mr-2" />
          LegalPortal
        </Link>
        
        {/* Навигация для больших экранов */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            <li>
              <Link 
                to="/" 
                className={`hover:text-blue-600 transition ${location.pathname === '/' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                Главная
              </Link>
            </li>
            <li>
              <Link 
                to="/agreement" 
                className={`hover:text-blue-600 transition ${location.pathname === '/agreement' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                Соглашение
              </Link>
            </li>
            <li>
              <Link 
                to="/about" 
                className={`hover:text-blue-600 transition ${location.pathname === '/about' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                О нас
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="flex items-center space-x-4">
          <Link 
            to="/login" 
            className="hidden md:block text-gray-600 hover:text-blue-600"
          >
            Войти
          </Link>
          <Link 
            to="/register" 
            className="hidden md:block bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
          >
            Зарегистрироваться
          </Link>
          
          {/* Бургер-меню для мобильных */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-600 hover:text-blue-600 focus:outline-none"
          >
            <FontAwesomeIcon icon={faBars} size="lg" />
          </button>
        </div>
      </div>
      
      {/* Мобильное меню */}
      {menuOpen && (
        <div className="md:hidden bg-white py-2 px-4 border-t">
          <Link 
            to="/" 
            className="block py-2 text-gray-800 hover:bg-blue-50"
            onClick={() => setMenuOpen(false)}
          >
            Главная
          </Link>
          <Link 
            to="/agreement" 
            className="block py-2 text-gray-800 hover:bg-blue-50"
            onClick={() => setMenuOpen(false)}
          >
            Соглашение об обработке ПД
          </Link>
          <Link 
            to="/about" 
            className="block py-2 text-gray-800 hover:bg-blue-50"
            onClick={() => setMenuOpen(false)}
          >
            О нас
          </Link>
          <Link 
            to="/login" 
            className="block py-2 text-gray-800 hover:bg-blue-50"
            onClick={() => setMenuOpen(false)}
          >
            Войти
          </Link>
          <Link 
            to="/register" 
            className="block py-2 text-gray-800 hover:bg-blue-50"
            onClick={() => setMenuOpen(false)}
          >
            Зарегистрироваться
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;