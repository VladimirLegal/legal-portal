import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const HomePage = () => {
  const location = useLocation();
  const successMessage = location.state?.successMessage;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800">
          Юридический портал по недвижимости
        </h1>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-8">
            {successMessage}
          </div>
        )}
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Создайте юридический документ за 4 шага
            </h2>
            <p className="text-gray-600">
              Профессиональные шаблоны для сделок с недвижимостью
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-lg mb-2">Договоры</h3>
              <p className="text-gray-600 text-sm">
                Аренда, купля-продажа, дарение и другие
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-lg mb-2">Автозаполнение</h3>
              <p className="text-gray-600 text-sm">
                Быстрое заполнение данных из документов
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-lg mb-2">Юридически верно</h3>
              <p className="text-gray-600 text-sm">
                Актуальные шаблоны по законодательству РФ
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              to="/generate" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition duration-300"
            >
              Начать создание документа
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;