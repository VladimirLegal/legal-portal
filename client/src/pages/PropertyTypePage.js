import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBuilding, 
  faDoorOpen, 
  faHome, 
  faTree, 
  faHotel, 
  faStore,
  faWarehouse
} from '@fortawesome/free-solid-svg-icons';

const PropertyTypePage = () => {
  const navigate = useNavigate();
  const { transactionType } = useParams();
  
  const propertyTypes = [
    { id: 'apartment', name: 'Квартиру', icon: faBuilding },
    { id: 'room', name: 'Комнату', icon: faDoorOpen },
    { id: 'house', name: 'Жилой дом с участком', icon: faHome },
    { id: 'garden-house', name: 'Садовый дом с участком', icon: faTree },
    { id: 'apartments', name: 'Апартаменты', icon: faHotel },
    { id: 'commercial-space', name: 'Коммерческое помещение', icon: faStore },
    { id: 'commercial-building', name: 'Здание коммерческого назначения с участком', icon: faWarehouse }
  ];

  const handleSelect = (propertyId) => {
    // Для аренды квартиры - переход к форме
    if (transactionType === 'rent' && propertyId === 'apartment') {
      navigate('/rent/apartment');
    } 
    // Для остальных вариантов - заглушка
    else {
      alert('Этот функционал находится в разработке. Спасибо за понимание!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">
        {transactionType === 'rent' ? 'Аренда' : 'Покупка/продажа'}
      </h1>
      
      <p className="text-lg text-gray-700 mb-8 text-center">
        Выберите тип недвижимости:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {propertyTypes.map((property) => (
          <button
            key={property.id}
            onClick={() => handleSelect(property.id)}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-start"
          >
            <FontAwesomeIcon 
              icon={property.icon} 
              className="text-blue-600 text-2xl mt-1 mr-4" 
            />
            <div className="text-left">
              <h3 className="text-lg font-semibold">{property.name}</h3>
              {transactionType === 'rent' && property.id === 'apartment' && (
                <p className="text-sm text-green-600 mt-1">Доступно для оформления</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PropertyTypePage;