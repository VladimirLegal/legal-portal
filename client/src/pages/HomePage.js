import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faHouse, faFileContract, faHandshake } from '@fortawesome/free-solid-svg-icons';

const HomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка с бургер-меню */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-blue-600">LegalPortal</div>
          
          {/* Бургер-меню */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-600 hover:text-blue-600 focus:outline-none"
          >
            <FontAwesomeIcon icon={faBars} size="lg" />
          </button>
        </div>
        
        {/* Выпадающее меню */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
            <Link to="/register" className="block px-4 py-2 text-gray-800 hover:bg-blue-50">
              Зарегистрироваться
            </Link>
            <Link to="/login" className="block px-4 py-2 text-gray-800 hover:bg-blue-50">
              Войти
            </Link>
            <Link to="/agreement" className="block px-4 py-2 text-gray-800 hover:bg-blue-50">
              Соглашение об обработке ПД
            </Link>
            <Link to="/about" className="block px-4 py-2 text-gray-800 hover:bg-blue-50">
              О нас
            </Link>
          </div>
        )}
      </header>

      {/* Основной контент */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          Юридические документы для сделок с недвижимостью
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Кнопка: Сдать/снять */}
          <Link 
            to="/property-type/rent" 
            className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faHouse} className="text-blue-600 text-2xl" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Сдать/снять</h2>
            <p className="text-gray-600">Договоры аренды жилой и коммерческой недвижимости</p>
          </Link>
          
          {/* Кнопка: Купить/продать */}
          <Link 
            to="/property-type/sale" 
            className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faHandshake} className="text-green-600 text-2xl" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Купить/продать</h2>
            <p className="text-gray-600">Договоры купли-продажи недвижимости</p>
          </Link>
          
          {/* Кнопка: Прочие документы */}
          <div 
            className="bg-white p-8 rounded-xl shadow-md flex flex-col items-center opacity-75 cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faFileContract} className="text-gray-500 text-2xl" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Прочие документы</h2>
            <p className="text-gray-600">Доверенности, соглашения и другие документы</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;