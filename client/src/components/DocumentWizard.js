import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DocumentWizard = () => {
  const [step, setStep] = useState(1);
  const [documentType, setDocumentType] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
  setIsLoading(true);
  
  try {
    const response = await axios.post(
      'http://localhost:5000/api/documents/generate', 
      {
        documentType,
        propertyType,
        ownerName: ownerName || "Иванов Иван Иванович"
      }
    );

    // Проверяем успешность ответа
    if (response.data.success) {
      // Создаем скрытую ссылку для скачивания
      const link = document.createElement('a');
      link.href = `http://localhost:5000${response.data.downloadUrl}`;
      link.setAttribute('download', `${documentType}_${propertyType}.pdf`);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      
      // Удаляем ссылку после скачивания
      setTimeout(() => {
        document.body.removeChild(link);
        navigate('/', { state: { successMessage: 'Документ успешно сгенерирован!' } });
      }, 1000);
    } else {
      // Добавляем обработку серверных ошибок
      const errorMessage = response.data.error || response.data.details || 'Неизвестная ошибка сервера';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Полная ошибка:', error.response || error);
    alert(`Произошла ошибка: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-8">
        <h2 className="text-xl font-semibold">
          Шаг {step}: {step === 1 ? 'Выберите тип документа' : 
                        step === 2 ? 'Тип недвижимости' : 
                        'Заполните данные'}
        </h2>
        <div className="w-full bg-gray-200 h-2 mt-2 rounded-full">
          <div 
            className={`h-full bg-blue-600 transition-all duration-300 rounded-full ${
              step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
            }`}
          ></div>
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {['Аренда', 'Купля-продажа', 'Соглашение о долях', 'Доверенность'].map((type) => (
            <button
              key={type}
              className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
              onClick={() => {
                setDocumentType(type);
                setStep(2);
              }}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-4">
          {['Квартира', 'Комната', 'Дом с участком', 'Апартаменты', 'Коммерческая'].map((type) => (
            <button
              key={type}
              className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
              onClick={() => {
                setPropertyType(type);
                setStep(3);
              }}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-lg mb-4">Данные для {documentType} ({propertyType})</h3>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="ФИО Собственника" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            
            <button 
              onClick={handleGenerate}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition duration-200 ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Генерация документа...
                </div>
              ) : 'Сгенерировать документ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentWizard;