import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClipboardList,
  faPlus,
  faMinus,
  faHome,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

// Компонент для авторесайзинга текстовых полей
const AutoResizeTextarea = ({ value, onChange, placeholder, className = '' }) => {
  const textareaRef = useRef(null);
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Сброс высоты для корректного расчета
      textarea.style.height = 'auto';
      // Установка новой высоты
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full p-1 border border-gray-300 rounded-md resize-none overflow-hidden ${className}`}
      style={{ minHeight: '40px' }}
      rows={1}
    />
  );
};

const InventorySection = ({ inventory, setInventory, roomCount }) => {
  // Базовые типы помещений
  const baseRoomTypes = [
    'Жилая комната', 
    'Коридор', 
    'Кухня', 
    'Санузел', 
    'Балкон/лоджия'
  ];
  
  // Состояния
  const [propertyData, setPropertyData] = useState([]);
  const [apartmentData, setApartmentData] = useState([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomType, setNewRoomType] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  const tableRef = useRef(null);

  // Проверка мобильного устройства
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);
  
  // Инициализация данных при изменении количества комнат
  useEffect(() => {
    if (!roomCount || roomCount < 1) return;
    
    // Формируем данные для описи имущества
    const newPropertyRooms = [];
    for (let i = 0; i < roomCount; i++) {
      newPropertyRooms.push({ 
        id: `room-${i+1}`, 
        name: roomCount === 1 ? 'Жилая комната' : `Жилая комната ${i+1}`,
        base: true,
        items: [] 
      });
    }
    
    const basePropertyRooms = baseRoomTypes
      .filter(type => type !== 'Жилая комната')
      .map(type => ({
        id: type,
        name: type,
        base: true,
        items: []
      }));
    
    // Формируем данные для описания квартиры
    const newApartmentRooms = [];
    for (let i = 0; i < roomCount; i++) {
      newApartmentRooms.push({
        id: `room-${i+1}`,
        name: roomCount === 1 ? 'Жилая комната' : `Жилая комната ${i+1}`,
        floor: '',
        walls: '',
        ceiling: '',
        doors: '',
        windows: '',
        condition: ''
      });
    }
    
    const baseApartmentRooms = baseRoomTypes
      .filter(type => type !== 'Жилая комната')
      .map(type => ({
        id: type,
        name: type,
        floor: '',
        walls: '',
        ceiling: '',
        doors: '',
        windows: '',
        condition: ''
      }));
    
    // Обновляем состояния
    const updatedPropertyData = [...newPropertyRooms, ...basePropertyRooms];
    const updatedApartmentData = [...newApartmentRooms, ...baseApartmentRooms];
    
    setPropertyData(updatedPropertyData);
    setApartmentData(updatedApartmentData);
    setInventory(updatedPropertyData);
  }, [roomCount, setInventory]);

  // Автоматический расчет ширины столбцов
  useEffect(() => {
    if (tableRef.current) {
      const table = tableRef.current;
      const widths = {};
      
      // Проходим по всем заголовкам таблицы
      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        const headers = headerRow.querySelectorAll('th');
        headers.forEach((header, index) => {
          // Определяем максимальную ширину содержимого
          let maxWidth = header.scrollWidth;
          
          // Проверяем содержимое ячеек в столбце
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells[index]) {
              const cellWidth = cells[index].scrollWidth;
              if (cellWidth > maxWidth) {
                maxWidth = cellWidth;
              }
            }
          });
          
          widths[index] = `${Math.min(maxWidth, 200)}px`;
        });
      }
      
      setColumnWidths(widths);
    }
  }, [propertyData, apartmentData]);

  // Добавление предмета в помещение
  const addItemToRoom = (roomId) => {
    const newData = propertyData.map(room => {
      if (room.id === roomId) {
        const newItem = {
          id: `item-${Date.now()}`,
          name: '',
          condition: 'Хорошее',
          estimatedCost: '',
          notes: ''
        };
        return { ...room, items: [...room.items, newItem] };
      }
      return room;
    });
    
    setPropertyData(newData);
    setInventory(newData);
  };

  // Удаление предмета из помещения
  const removeItemFromRoom = (roomId, itemId) => {
    const newData = propertyData.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.filter(item => item.id !== itemId)
        };
      }
      return room;
    });
    
    setPropertyData(newData);
    setInventory(newData);
  };

  // Обновление данных предмета
  const handleItemChange = (roomId, itemId, field, value) => {
    const newData = propertyData.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.map(item => 
            item.id === itemId ? { ...item, [field]: value } : item
          )
        };
      }
      return room;
    });
    
    setPropertyData(newData);
    setInventory(newData);
  };

  // Добавление нового помещения
  const addNewRoom = () => {
    if (!newRoomType) return;
    
    let roomName = newRoomType;
    
    // Если выбрано "Другое", используем кастомное имя
    if (newRoomType === 'other') {
      if (!customRoomName.trim()) return;
      roomName = customRoomName.trim();
    } else {
      // Подсчет существующих комнат этого типа
      const count = propertyData.filter(room => 
        room.name.startsWith(newRoomType)
      ).length;
      
      roomName = count > 0 ? `${newRoomType} ${count + 1}` : newRoomType;
    }
    
    const newRoom = {
      id: `custom-${Date.now()}`,
      name: roomName,
      base: false,
      items: []
    };
    
    // Добавляем в опись имущества
    const newPropertyData = [...propertyData, newRoom];
    setPropertyData(newPropertyData);
    setInventory(newPropertyData);
    
    // Добавляем в описание квартиры
    const newApartmentRoom = {
      id: newRoom.id,
      name: roomName,
      floor: '',
      walls: '',
      ceiling: '',
      doors: '',
      windows: '',
      condition: ''
    };
    
    setApartmentData(prev => [...prev, newApartmentRoom]);
    
    // Закрываем модальное окно и сбрасываем значения
    setShowAddRoomModal(false);
    setNewRoomType('');
    setCustomRoomName('');
  };

  // Удаление пользовательского помещения
  const removeRoom = (roomId) => {
    const room = propertyData.find(r => r.id === roomId);
    if (!room || room.base) return;
    
    // Удаляем из описи имущества
    const newPropertyData = propertyData.filter(room => room.id !== roomId);
    setPropertyData(newPropertyData);
    setInventory(newPropertyData);
    
    // Удаляем из описания квартиры
    setApartmentData(prev => prev.filter(room => room.id !== roomId));
  };

  // Обновление данных описания квартиры
  const handleApartmentChange = (roomId, field, value) => {
    const newData = apartmentData.map(room => 
      room.id === roomId ? { ...room, [field]: value } : room
    );
    setApartmentData(newData);
  };

  // Стили для таблиц
  const tableStyle = {
    maxWidth: '16cm',
    width: '100%',
    tableLayout: 'fixed'
  };
  
  const cellStyle = {
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    padding: '8px 4px',
    verticalAlign: 'top'
  };

  return (
    <div className="space-y-8">
      {/* Модальное окно добавления комнаты */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Добавить помещение</h3>
              <button 
                onClick={() => setShowAddRoomModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Выберите тип помещения
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите из списка</option>
                  {baseRoomTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="other">Другое</option>
                </select>
              </div>
              
              {newRoomType === 'other' && (
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Введите название помещения
                  </label>
                  <input
                    type="text"
                    value={customRoomName}
                    onChange={(e) => setCustomRoomName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Название помещения"
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Отмена
                </button>
                <button
                  onClick={addNewRoom}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Секция описи имущества */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          <FontAwesomeIcon icon={faClipboardList} className="mr-2 text-blue-600" />
          Опись имущества (Приложение №1)
        </h2>
        
        <div className={`overflow-x-auto ${isMobile ? 'bg-gray-50 p-2 rounded-lg' : ''}`}>
          {isMobile && (
            <p className="text-sm text-gray-500 mb-2 italic">
              На мобильных устройствах прокручивайте таблицу горизонтально
            </p>
          )}
          
          <table 
            ref={tableRef}
            className="w-full border-collapse border border-gray-200"
            style={tableStyle}
          >
            <thead className="bg-gray-50">
              <tr>
                <th style={{ ...cellStyle, width: '8%', textAlign: 'center' }}>
                  Действия
                </th>
                <th style={{ ...cellStyle, width: '15%' }}>
                  Наименование помещения
                </th>
                <th style={{ ...cellStyle, width: '20%' }}>
                  Наименование имущества
                </th>
                <th style={{ ...cellStyle, width: '15%' }}>
                  Состояние
                </th>
                <th style={{ ...cellStyle, width: '15%' }}>
                  Оценочная стоимость
                </th>
                <th style={{ ...cellStyle, width: '27%' }}>
                  Примечание
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {propertyData.map((room) => (
                <React.Fragment key={room.id}>
                  {/* Строка помещения */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => addItemToRoom(room.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Добавить предмет"
                        >
                          <FontAwesomeIcon icon={faPlus} size="sm" />
                        </button>
                        {!room.base && (
                          <button
                            onClick={() => removeRoom(room.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Удалить помещение"
                          >
                            <FontAwesomeIcon icon={faMinus} size="sm" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <div className="font-medium min-h-[40px] flex items-center">
                        {room.name}
                      </div>
                    </td>
                    <td colSpan={4} style={cellStyle}></td>
                  </tr>
                  
                  {/* Строки с предметами */}
                  {room.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td style={cellStyle}></td>
                      <td style={cellStyle}></td>
                      <td style={cellStyle}>
                        <AutoResizeTextarea
                          value={item.name}
                          onChange={(e) => handleItemChange(room.id, item.id, 'name', e.target.value)}
                          placeholder="Название предмета"
                        />
                      </td>
                      <td style={cellStyle}>
                        <select
                          value={item.condition}
                          onChange={(e) => handleItemChange(room.id, item.id, 'condition', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded-md"
                        >
                          <option value="Отличное">Отличное</option>
                          <option value="Хорошее">Хорошее</option>
                          <option value="Удовлетворительное">Удовлетворительное</option>
                          <option value="Плохое">Плохое</option>
                          <option value="Требует ремонта">Требует ремонта</option>
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <AutoResizeTextarea
                          value={item.estimatedCost}
                          onChange={(e) => handleItemChange(room.id, item.id, 'estimatedCost', e.target.value)}
                          placeholder="Стоимость"
                        />
                      </td>
                      <td style={cellStyle}>
                        <AutoResizeTextarea
                          value={item.notes}
                          onChange={(e) => handleItemChange(room.id, item.id, 'notes', e.target.value)}
                          placeholder="Описание, дефекты"
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => setShowAddRoomModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Добавить комнату
          </button>
        </div>
      </div>

      {/* Секция описания квартиры */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          <FontAwesomeIcon icon={faHome} className="mr-2 text-blue-600" />
          Описание квартиры (Приложение №2)
        </h2>
        
        <div className={`overflow-x-auto ${isMobile ? 'bg-gray-50 p-2 rounded-lg' : ''}`}>
          {isMobile && (
            <p className="text-sm text-gray-500 mb-2 italic">
              На мобильных устройствах прокручивайте таблицу горизонтально
            </p>
          )}
          
          <table 
            className="w-full border-collapse border border-gray-200"
            style={tableStyle}
          >
            <thead className="bg-gray-50">
              <tr>
                <th style={{ ...cellStyle, width: '15%' }}>
                  Наименование помещения
                </th>
                <th style={{ ...cellStyle, width: '12%' }}>
                  Пол
                </th>
                <th style={{ ...cellStyle, width: '12%' }}>
                  Стены
                </th>
                <th style={{ ...cellStyle, width: '12%' }}>
                  Потолок
                </th>
                <th style={{ ...cellStyle, width: '12%' }}>
                  Двери
                </th>
                <th style={{ ...cellStyle, width: '12%' }}>
                  Окна
                </th>
                <th style={{ ...cellStyle, width: '25%' }}>
                  Состояние
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {apartmentData.map((room) => (
                <tr key={room.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td style={cellStyle}>
                    <div className="font-medium min-h-[40px] flex items-center">
                      {room.name}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <AutoResizeTextarea
                      value={room.floor}
                      onChange={(e) => handleApartmentChange(room.id, 'floor', e.target.value)}
                      placeholder="Описание пола"
                    />
                  </td>
                  <td style={cellStyle}>
                    <AutoResizeTextarea
                      value={room.walls}
                      onChange={(e) => handleApartmentChange(room.id, 'walls', e.target.value)}
                      placeholder="Описание стен"
                    />
                  </td>
                  <td style={cellStyle}>
                    <AutoResizeTextarea
                      value={room.ceiling}
                      onChange={(e) => handleApartmentChange(room.id, 'ceiling', e.target.value)}
                      placeholder="Описание потолка"
                    />
                  </td>
                  <td style={cellStyle}>
                    <AutoResizeTextarea
                      value={room.doors}
                      onChange={(e) => handleApartmentChange(room.id, 'doors', e.target.value)}
                      placeholder="Описание дверей"
                    />
                  </td>
                  <td style={cellStyle}>
                    <AutoResizeTextarea
                      value={room.windows}
                      onChange={(e) => handleApartmentChange(room.id, 'windows', e.target.value)}
                      placeholder="Описание окон"
                    />
                  </td>
                  <td style={cellStyle}>
                    <AutoResizeTextarea
                      value={room.condition}
                      onChange={(e) => handleApartmentChange(room.id, 'condition', e.target.value)}
                      placeholder="Общее состояние"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <style jsx>{`
        @media print {
          table {
            width: 100% !important;
            table-layout: fixed !important;
            max-width: 16cm !important;
          }
          th, td {
            word-wrap: break-word !important;
            white-space: normal !important;
            page-break-inside: avoid !important;
          }
          th {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InventorySection;