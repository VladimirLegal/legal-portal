import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserTie,
  faPlus,
  faTimes,
  faTrash,
  faExclamationCircle,
  faUserFriends,
} from '@fortawesome/free-solid-svg-icons';

import ErrorMessage from '../ErrorMessage';
import {
  formatPassport,
  formatPassportText,
  formatDepartmentCode,
  formatPhone,
  formatDateToText,
} from '../../utils/formatters';
// ↓ компонент модалки (default export)
import FreeTextImportModal from '../common/FreeTextImportModal';
// ↓ парсер (named export)
import { parseFreeTextPerson } from '../../utils/freeTextParser';

/**
 * Полезные мелкие форматтеры для локального ввода
 */
const formatDateInput = (v) => {
  // превращаем любые цифры в ДД.ММ.ГГГГ
  const digits = (v || '').replace(/\D/g, '').slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  return [dd, mm, yyyy].filter(Boolean).join('.');
};

const LandlordSection = ({
  landlords,
  setLandlords,
  currentLandlordIndex,
  setCurrentLandlordIndex,
  errors = {},
  addLandlord,
  removeLandlord,
  handleLandlordRegistrationTypeChange,
  handleLandlordAttorneyRegistrationTypeChange,
  sharesMismatch, // мягкое предупреждение "Проверьте сумму долей"
}) => {
  // Текущий арендодатель (может быть undefined при удалении)
  const landlord = Array.isArray(landlords)
    ? landlords[currentLandlordIndex] || landlords[0]
    : undefined;

  // refs / state — ВСЕ ХУКИ СТРОГО ВВЕРХУ
  const fullNameInputRef = React.useRef(null);
  const [genitiveCaseNotice, setGenitiveCaseNotice] = React.useState(false);

  // Держим индекс в допустимых границах при удалениях/добавлениях
  React.useEffect(() => {
    const len = Array.isArray(landlords) ? landlords.length : 0;
    if (len === 0) return;
    if (currentLandlordIndex > len - 1) {
      setCurrentLandlordIndex(len - 1);
    } else if (currentLandlordIndex < 0) {
      setCurrentLandlordIndex(0);
    }
  }, [landlords?.length, currentLandlordIndex, setCurrentLandlordIndex]);
  
  const [freeTextOpen, setFreeTextOpen] = React.useState(false);
  const [freeTextTarget, setFreeTextTarget] = React.useState('landlord'); // 'landlord' | 'representative'

  // При включении представителя — показать подсказку про родительный падеж ФИО
  React.useEffect(() => {
    if (landlord?.hasRepresentative) setGenitiveCaseNotice(true);
  }, [landlord?.hasRepresentative]);

  // ====== безопасные сеттеры ======
  const updateCurrentLandlord = (updater) => {
    const arr = Array.isArray(landlords) ? [...landlords] : [];
    const idx =
      currentLandlordIndex >= 0 && currentLandlordIndex < arr.length
        ? currentLandlordIndex
        : 0;
    const cur = { ...(arr[idx] || {}) };
    updater(cur, idx, arr);
    arr[idx] = cur;
    setLandlords(arr);
  };

  const ensureRepresentativeObject = (obj) => {
    if (!obj.representative) {
      obj.representative = {
        fullName: '',
        gender: '',
        birthDate: '',
        birthPlace: '',
        passport: '',
        passportIssued: '',
        issueDate: '',
        departmentCode: '',
        registration: '',
        registrationType: '',
        attorneyNumber: '',
        attorneyDate: '',
        attorneyIssuedBy: '',
      };
    }
  };

  // ====== handlers: арендодатель ======
  const handleLandlordFieldChange = (field, value) => {
    updateCurrentLandlord((cur) => {
      cur[field] = value;
    });
  };

  // ====== handlers: представитель ======
  const handleRepresentativeFieldChange = (field, value) => {
    updateCurrentLandlord((cur, idx, arr) => {
      ensureRepresentativeObject(cur);
      cur.representative[field] = value;

      // Если включён общий представитель — проталкиваем значения всем в копии arr
      if (cur.useSharedRepresentative) {
        for (let i = 0; i < arr.length; i++) {
          if (i === idx) continue;
          const copy = { ...(arr[i] || {}) };
          ensureRepresentativeObject(copy);
          copy.representative[field] = value;
          arr[i] = copy;
        }
      }
    });
  };


  const handleAttorneyDateChange = (e, field) => {
    handleRepresentativeFieldChange(field, formatDateInput(e.target.value));
  };

  // ====== handlers: документы-основания ======
  const addDocument = () => {
    updateCurrentLandlord((cur) => {
      if (!Array.isArray(cur.documents)) cur.documents = [];
      cur.documents.push({
        // группа — для гос. регистрации + список «оснований»
        basisDocuments: [
          {
            title: '',
            docDate: '',
          },
        ],
        regNumber: '',
        regDate: '',
      });
    });
  };

  const removeLastDocument = () => {
    updateCurrentLandlord((cur) => {
      if (Array.isArray(cur.documents) && cur.documents.length > 0) {
        cur.documents = cur.documents.slice(0, cur.documents.length - 1);
      }
    });
  };

  const handleChangeLandlordDocField = (docIndex, field, value) => {
    updateCurrentLandlord((cur) => {
      if (!Array.isArray(cur.documents)) cur.documents = [];
      if (!cur.documents[docIndex]) {
        cur.documents[docIndex] = { basisDocuments: [], regNumber: '', regDate: '' };
      }
      cur.documents[docIndex][field] = value;
    });
  };

  const handleChangeLandlordBasisDocField = (docGroupIndex, basisIndex, field, value) => {
    updateCurrentLandlord((cur) => {
      if (!Array.isArray(cur.documents)) cur.documents = [];
      if (!cur.documents[docGroupIndex]) {
        cur.documents[docGroupIndex] = { basisDocuments: [], regNumber: '', regDate: '' };
      }
      const group = cur.documents[docGroupIndex];
      if (!Array.isArray(group.basisDocuments)) group.basisDocuments = [];
      if (!group.basisDocuments[basisIndex]) {
        group.basisDocuments[basisIndex] = { title: '', docDate: '' };
      }
      group.basisDocuments[basisIndex][field] = value;
    });
  };

  const handleAddBasisDocument = (docGroupIndex) => {
    updateCurrentLandlord((cur) => {
      if (!Array.isArray(cur.documents)) cur.documents = [];
      if (!cur.documents[docGroupIndex]) {
        cur.documents[docGroupIndex] = { basisDocuments: [], regNumber: '', regDate: '' };
      }
      const group = cur.documents[docGroupIndex];
      if (!Array.isArray(group.basisDocuments)) group.basisDocuments = [];
      group.basisDocuments.push({ title: '', docDate: '' });
    });
  };

  const handleRemoveBasisDocument = (groupIndex, basisIndex) => {
    updateCurrentLandlord((cur) => {
      if (!Array.isArray(cur.documents)) return;
      const group = cur.documents[groupIndex];
      if (!group || !Array.isArray(group.basisDocuments)) return;
      group.basisDocuments.splice(basisIndex, 1);
    });
  };

  // Кнопка «Исправить сейчас» — фокус на поле ФИО и скрыть подсказку
  const handleFixNow = () => {
    if (fullNameInputRef.current) fullNameInputRef.current.focus();
    setGenitiveCaseNotice(false);
  };
  
  // ---- Верхние поля арендодателя (представителя не трогаем) ----
  const LANDLORD_TOP_FIELDS = [
    'fullName','gender','birthDate','birthPlace',
    'passport','passportIssued','issueDate','departmentCode',
    'registration','registrationType','phone','email'
  ];

  const clearLandlordTopFields = (obj) => {
    LANDLORD_TOP_FIELDS.forEach(k => { obj[k] = ''; });
  };

  // на всякий случай гарантируем объект представителя
  const ensureLandlordRepresentativeObject = (o) => {
    o.representative ||= {
      fullName:'', gender:'', birthDate:'', birthPlace:'',
      passport:'', passportIssued:'', issueDate:'', departmentCode:'',
      registration:'', registrationType:'',
      attorneyNumber:'', attorneyDate:'', attorneyIssuedBy:''
    };
  };

  // 👉 Применить текст к ТЕКУЩЕМУ АРЕНДОДАТЕЛЮ (представителя не трогаем)
  const applyFreeTextToLandlord = (rawText, { mode = 'replace-landlord-only' } = {}) => {
    const parsed = parseFreeTextPerson(rawText || '');

    setLandlords(prev => {
      const arr = [...(prev || [])];
      const idx = Math.min(Math.max(currentLandlordIndex, 0), Math.max(arr.length - 1, 0));
      const cur = { ...(arr[idx] || {}) };

      if (mode === 'replace-landlord-only') {
        clearLandlordTopFields(cur); // ← очищаем ТОЛЬКО верхние поля арендодателя
      }

      // переносим только непустые значения
      const map = {
        fullName: 'fullName',
        gender: 'gender',
        birthDate: 'birthDate',
        birthPlace: 'birthPlace',
        passport: 'passport',
        passportIssued: 'passportIssued',
        issueDate: 'issueDate',
        departmentCode: 'departmentCode',
        registration: 'registration',
        phone: 'phone',
        email: 'email'
      };
      Object.entries(map).forEach(([from, to]) => {
        if (parsed[from]) cur[to] = parsed[from];
      });

      // ВАЖНО: НЕ трогаем cur.hasRepresentative / cur.representative
      arr[idx] = cur;

      // (опционально) лог изменений в консоль — удобно при отладке
      // eslint-disable-next-line no-console
      console.table({ scope: 'Landlord', ...map }, ['scope']);

      return arr;
    });
  };

  // 👉 Применить текст к ПРЕДСТАВИТЕЛЮ текущего арендодателя (верхние поля не трогаем)
  const applyFreeTextToLandlordRepresentative = (rawText, { mode = 'replace-rep-only' } = {}) => {
    const parsed = parseFreeTextPerson(rawText || '');

    setLandlords(prev => {
      const arr = [...(prev || [])];
      const idx = Math.min(Math.max(currentLandlordIndex, 0), Math.max(arr.length - 1, 0));
      const cur = { ...(arr[idx] || {}) };

      ensureLandlordRepresentativeObject(cur);
      cur.hasRepresentative = true; // UX: включим флаг

      if (mode === 'replace-rep-only') {
        cur.representative = {
          fullName:'', gender:'', birthDate:'', birthPlace:'',
          passport:'', passportIssued:'', issueDate:'', departmentCode:'',
          registration:'', registrationType:'',
          attorneyNumber:'', attorneyDate:'', attorneyIssuedBy:''
        };
      }

      const mapRep = {
        fullName: 'fullName',
        gender: 'gender',
        birthDate: 'birthDate',
        birthPlace: 'birthPlace',
        passport: 'passport',
        passportIssued: 'passportIssued',
        issueDate: 'issueDate',
        departmentCode: 'departmentCode',
        registration: 'registration'
      };
      Object.entries(mapRep).forEach(([from, to]) => {
        if (parsed[from]) cur.representative[to] = parsed[from];
      });

      arr[idx] = cur;

      // (опционально) лог изменений
      // eslint-disable-next-line no-console
      console.debug('Applied to landlord.representative:', cur.representative);

      return arr;
    });
  };

  // ====== РЕНДЕР, если арендодателей нет вообще ======
  if (!landlord) {
    return (
      <div className="space-y-6">
      {/* МОДАЛКА «Вставить данные текстом» — доступна всегда */}
      <FreeTextImportModal
  	open={freeTextOpen}
  	onClose={() => setFreeTextOpen(false)}
  	title={freeTextTarget === 'landlord'
    	  ? 'Вставьте текст с данными арендодателя'
    	  : 'Вставьте текст с данными представителя арендодателя'}
  	onApply={(raw) => {
    	  try {
      	    if (freeTextTarget === 'landlord') {
	      applyFreeTextToLandlord(raw, { mode: 'replace-landlord-only' });
	    } else {
	      applyFreeTextToLandlordRepresentative(raw, { mode: 'replace-rep-only' });
	    }
	  } finally {
	    setFreeTextOpen(false);
	  }
	}}
      />
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            <FontAwesomeIcon icon={faUserTie} className="mr-2 text-blue-600" />
            Данные арендодателя
          </h2>
          <button
            onClick={addLandlord}
            className="px-3 py-1 rounded-lg flex items-center bg-green-500 text-white hover:bg-green-600"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1" />
            Добавить арендодателя
          </button>
        </div>
        <p className="text-gray-600">Добавьте первого арендодателя.</p>
      </div>
    );
  }

  // ====== ОСНОВНОЙ РЕНДЕР ======
  return (
    <div className="space-y-6">
    {/* МОДАЛКА «Вставить данные текстом» — доступна всегда */}
    <FreeTextImportModal
      open={freeTextOpen}
      onClose={() => setFreeTextOpen(false)}
      title={freeTextTarget === 'landlord'
        ? 'Вставьте текст с данными арендодателя'
        : 'Вставьте текст с данными представителя арендодателя'}
      onApply={(raw) => {
        try {
          if (freeTextTarget === 'landlord') {
            applyFreeTextToLandlord(raw, { mode: 'replace-landlord-only' });
          } else {
            applyFreeTextToLandlordRepresentative(raw, { mode: 'replace-rep-only' });
          }
        } finally {
          setFreeTextOpen(false);
        }
      }}
    />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          <FontAwesomeIcon icon={faUserTie} className="mr-2 text-blue-600" />
          Данные арендодателя
        </h2>

        {sharesMismatch && (
          <div className="ml-3 px-2 py-1 rounded bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm inline-flex items-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />
            Проверьте сумму долей
          </div>
        )}

        <button
          onClick={addLandlord}
          disabled={landlords.length >= 10}
          className={`px-3 py-1 rounded-lg flex items-center ${
            landlords.length >= 10
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Добавить арендодателя
        </button>
      </div>

      {/* Табы арендодателей */}
      <div className="flex flex-wrap gap-2 mb-4">
        {landlords.map((_, index) => (
          <div
            key={index}
            className={`flex items-center rounded-lg overflow-hidden ${
              currentLandlordIndex === index
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setCurrentLandlordIndex(index)}
              className="px-4 py-2"
            >
              Арендодатель {index + 1}
            </button>
            {landlords.length > 1 && (
              <button
                type="button"
                onClick={() => removeLandlord(index)}
                className="px-2 h-full hover:bg-red-500 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Блок «Общий представитель» — если арендодателей больше одного */}
      {landlords.length > 1 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faUserFriends} className="mr-2 text-blue-600" />
            <h3 className="font-medium text-gray-700">Общий представитель для всех арендодателей</h3>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue-600"
              checked={!!landlord.useSharedRepresentative}
              onChange={(e) => {
                const isOn = e.target.checked;
                const arr = [...landlords];
                const curIdx = currentLandlordIndex;
                const cur = { ...arr[curIdx] };
                cur.useSharedRepresentative = isOn;
                ensureRepresentativeObject(cur);

                // Если включаем — разливаем текущие данные представителя на всех
                if (isOn) {
                  for (let i = 0; i < arr.length; i++) {
                    const copy = { ...(arr[i] || {}) };
                    ensureRepresentativeObject(copy);
                    copy.representative = { ...cur.representative };
                    arr[i] = copy;
                  }
                } else {
                  // Выключаем общий флаг только у текущего; остальные остаются как есть
                  // (при необходимости логика может быть расширена)
                }

                arr[curIdx] = cur;
                setLandlords(arr);
              }}
            />
            <span className="ml-2 text-gray-700">Использовать одного представителя для всех арендодателей</span>
          </div>

          {landlord.useSharedRepresentative && (
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
              <FontAwesomeIcon icon={faExclamationCircle} className="mr-2 text-yellow-500" />
              <span className="text-yellow-700">
                Внимание! Изменения данных представителя будут применены ко всем арендодателям
              </span>
            </div>
          )}
        </div>
      )}

      {/* Анкета арендодателя */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">
            {landlord.hasRepresentative ? 'ФИО арендодателя (в родительном падеже)*' : 'ФИО*'}
          </label>
          <input
            ref={fullNameInputRef}
            type="text"
            className={`w-full p-3 border rounded-lg ${
              errors.landlordFullName ? 'border-red-500' : 'border-gray-300'
            }`}
            value={landlord.fullName}
            onChange={(e) => handleLandlordFieldChange('fullName', e.target.value)}
            placeholder={landlord.hasRepresentative ? 'Фамилию Имя Отчество (в род. падеже)' : 'Фамилия Имя Отчество'}
          />
          <ErrorMessage error={errors.landlordFullName} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Пол*</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name={`gender-${currentLandlordIndex}`}
                value="male"
                checked={landlord.gender === 'male'}
                onChange={() => handleLandlordFieldChange('gender', 'male')}
              />
              <span className="ml-2">Мужской</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name={`gender-${currentLandlordIndex}`}
                value="female"
                checked={landlord.gender === 'female'}
                onChange={() => handleLandlordFieldChange('gender', 'female')}
              />
              <span className="ml-2">Женский</span>
            </label>
          </div>
          <ErrorMessage error={errors.landlordGender} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Дата рождения*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.birthDate}
            onChange={(e) => handleLandlordFieldChange('birthDate', formatDateInput(e.target.value))}
            placeholder="дд.мм.гггг"
          />
          <div className="text-sm text-gray-500 mt-1">
            {landlord.birthDate && `${formatDateToText(landlord.birthDate)} рождения`}
          </div>
          <ErrorMessage error={errors.landlordBirthDate} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Место рождения*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.birthPlace || ''}
            onChange={(e) => handleLandlordFieldChange('birthPlace', e.target.value)}
            placeholder="Город, село и т.д."
          />
          <ErrorMessage error={errors.landlordBirthPlace} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Паспорт*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.passport || ''}
            onChange={(e) => handleLandlordFieldChange('passport', formatPassport(e.target.value))}
            placeholder="Серия и номер"
          />
          <div className="text-sm text-gray-500 mt-1">
            {landlord.passport && formatPassportText(landlord.passport)}
          </div>
          <ErrorMessage error={errors.landlordPassport} />

          {/* КНОПКА для АРЕНДОДАТЕЛЯ */}
	  <button
	    type="button"
	    className="btn btn-secondary" // подставь свой класс
	    onClick={() => { setFreeTextTarget('landlord'); setFreeTextOpen(true); }}
            className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
	  >
	    Вставить данные текстом
	  </button>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Кем выдан*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.passportIssued || ''}
            onChange={(e) => handleLandlordFieldChange('passportIssued', e.target.value)}
            placeholder="Кем выдан паспорт"
          />
          <ErrorMessage error={errors.landlordPassportIssued} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Дата выдачи*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.issueDate || ''}
            onChange={(e) => handleLandlordFieldChange('issueDate', formatDateInput(e.target.value))}
            placeholder="дд.мм.гггг"
          />
          <div className="text-sm text-gray-500 mt-1">
            {landlord.issueDate && formatDateToText(landlord.issueDate)}
          </div>
          <ErrorMessage error={errors.landlordIssueDate} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Код подразделения*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.departmentCode || ''}
            onChange={(e) => handleLandlordFieldChange('departmentCode', formatDepartmentCode(e.target.value))}
            placeholder="000-000"
          />
          <ErrorMessage error={errors.landlordDepartmentCode} />
        </div>

        {/* Адрес регистрации — скрываем при 'none' */}
        {landlord.registrationType !== 'none' && (
          <div className="md:col-span-2">
            <label className="block text-gray-700 mb-2">Адрес регистрации*</label>
            <input
              type="text"
              className={`w-full p-3 border rounded-lg ${
                errors.landlordRegistration ? 'border-red-500' : 'border-gray-300'
              }`}
              value={landlord.registration || ''}
              onChange={(e) => handleLandlordFieldChange('registration', e.target.value)}
              placeholder="Полный адрес регистрации"
            />
            <ErrorMessage error={errors.landlordRegistration} />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Тип регистрации</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={landlord.registrationType === 'previous'}
                onChange={() =>
                  handleLandlordRegistrationTypeChange(
                    landlord.registrationType === 'previous' ? '' : 'previous'
                  )
                }
              />
              <span className="ml-2">Ранее</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={landlord.registrationType === 'temporary'}
                onChange={() =>
                  handleLandlordRegistrationTypeChange(
                    landlord.registrationType === 'temporary' ? '' : 'temporary'
                  )
                }
              />
              <span className="ml-2">Временная</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={landlord.registrationType === 'none'}
                onChange={() =>
                  handleLandlordRegistrationTypeChange(
                    landlord.registrationType === 'none' ? '' : 'none'
                  )
                }
              />
              <span className="ml-2">Без регистрации</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Телефон*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.phone || ''}
            onChange={(e) => handleLandlordFieldChange('phone', formatPhone(e.target.value))}
            placeholder="+7 (999) 999-99-99"
          />
          <ErrorMessage error={errors.landlordPhone} />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={landlord.email || ''}
            onChange={(e) => handleLandlordFieldChange('email', e.target.value)}
            placeholder="email@example.com"
          />
          <ErrorMessage error={errors.landlordEmail} />
        </div>
      </div>

      {/* Основание права собственности */}
      <div className="mt-8 border-t pt-8">
        <h3 className="text-lg font-semibold mb-4">Основание права собственности</h3>

        {Array.isArray(landlord.documents) &&
          landlord.documents.map((docGroup, groupIndex) => (
            <div key={groupIndex} className="border p-3 mb-3 rounded shadow-sm">
              <h4 className="font-bold mb-2">Основания права собственности</h4>

              {Array.isArray(docGroup.basisDocuments) &&
                docGroup.basisDocuments.map((basis, basisIndex) => (
                  <div key={basisIndex} className="pl-4 mb-2">
                    <label className="block text-sm font-medium">Название документа</label>
                    <input
                      type="text"
                      className="border p-1 w-full"
                      value={basis.title}
                      onChange={(e) =>
                        handleChangeLandlordBasisDocField(groupIndex, basisIndex, 'title', e.target.value)
                      }
                    />
                    <label className="block text-sm font-medium mt-2">Дата документа</label>
                    <input
                      type="text"
                      className="border p-1 w-full"
                      value={basis.docDate}
                      onChange={(e) =>
                        handleChangeLandlordBasisDocField(
                          groupIndex,
                          basisIndex,
                          'docDate',
                          formatDateInput(e.target.value)
                        )
                      }
                    />
                    <button
                      type="button"
                      className="text-red-500 text-xs mt-1"
                      onClick={() => handleRemoveBasisDocument(groupIndex, basisIndex)}
                    >
                      🗑 Удалить документы основания
                    </button>
                  </div>
                ))}

              <button
                type="button"
                className="text-blue-600 text-sm mb-3"
                onClick={() => handleAddBasisDocument(groupIndex)}
              >
                ➕ Добавить документы основания
              </button>

              <h5 className="font-semibold mt-4">Государственная регистрация</h5>

              <label className="block text-sm font-medium">Номер регистрации</label>
              <input
                type="text"
                className="border p-1 w-full"
                value={docGroup.regNumber}
                onChange={(e) =>
                  handleChangeLandlordDocField(groupIndex, 'regNumber', e.target.value)
                }
              />

              <label className="block text-sm font-medium mt-2">Дата регистрации</label>
              <input
                type="text"
                className="border p-1 w-full"
                value={docGroup.regDate}
                onChange={(e) =>
                  handleChangeLandlordDocField(
                    groupIndex,
                    'regDate',
                    formatDateInput(e.target.value)
                  )
                }
              />
            </div>
          ))}

        <div className="flex justify-start gap-4 mt-4">
          <button
            type="button"
            onClick={addDocument}
            disabled={(landlord.documents || []).length >= 5}
            className={`px-4 py-2 flex items-center ${
              (landlord.documents || []).length >= 5
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } rounded-lg whitespace-nowrap`}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Добавить документ о собственности
          </button>

          <button
            type="button"
            onClick={removeLastDocument}
            disabled={!(landlord.documents || []).length}
            className={`px-4 py-2 flex items-center ${
              !(landlord.documents || []).length
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            } rounded-lg whitespace-nowrap`}
          >
            <FontAwesomeIcon icon={faTrash} className="mr-2" />
            Удалить документ о собственности
          </button>
        </div>
      </div>

      {/* Представитель */}
      <div className="mt-8 border-t pt-8">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600"
            checked={!!landlord.hasRepresentative}
            onChange={(e) => {
              const isOn = e.target.checked;
              updateCurrentLandlord((cur) => {
                cur.hasRepresentative = isOn;
                if (isOn) ensureRepresentativeObject(cur);
              });
            }}
          />
          <span className="ml-2 text-lg font-medium">Действует через представителя</span>
        </div>

        {landlord.hasRepresentative && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Данные представителя</h3>

            {genitiveCaseNotice && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <FontAwesomeIcon
                      icon={faExclamationCircle}
                      className="mr-2 text-yellow-500 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-yellow-700">
                        При наличии представителя укажите ФИО арендодателя в родительном падеже (кого? чего?)
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handleFixNow}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                        >
                          Исправить сейчас
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenitiveCaseNotice(false)}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          Скрыть
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">ФИО представителя*</label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg ${
                    errors.attorneyFullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={landlord.representative.fullName}
                  onChange={(e) => handleRepresentativeFieldChange('fullName', e.target.value)}
                  placeholder="Фамилия Имя Отчество"
                />
                <ErrorMessage error={errors.attorneyFullName} />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Пол*</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name={`attorney-gender-${currentLandlordIndex}`}
                      value="male"
                      checked={landlord.representative.gender === 'male'}
                      onChange={() => handleRepresentativeFieldChange('gender', 'male')}
                    />
                    <span className="ml-2">Мужской</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name={`attorney-gender-${currentLandlordIndex}`}
                      value="female"
                      checked={landlord.representative.gender === 'female'}
                      onChange={() => handleRepresentativeFieldChange('gender', 'female')}
                    />
                    <span className="ml-2">Женский</span>
                  </label>
                </div>
                <ErrorMessage error={errors.attorneyGender} />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Дата рождения*</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={landlord.representative.birthDate}
                  onChange={(e) =>
                    handleRepresentativeFieldChange('birthDate', formatDateInput(e.target.value))
                  }
                  placeholder="дд.мм.гггг"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {landlord.representative.birthDate &&
                    `${formatDateToText(landlord.representative.birthDate)}`}
                </div>
                <ErrorMessage error={errors.attorneyDate} />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Место рождения*</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={landlord.representative.birthPlace}
                  onChange={(e) => handleRepresentativeFieldChange('birthPlace', e.target.value)}
                  placeholder="Город, село и т.д."
                />
                <ErrorMessage error={errors.attorneyBirthPlace} />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Паспорт*</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={landlord.representative.passport}
                  onChange={(e) =>
                    handleRepresentativeFieldChange('passport', formatPassport(e.target.value))
                  }
                  placeholder="Серия и номер"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {landlord.representative.passport &&
                    formatPassportText(landlord.representative.passport)}
                </div>
                <ErrorMessage error={errors.attorneyPassport} />
		{/* ...ниже, в секции ПРЕДСТАВИТЕЛЯ арендодателя: */}
		<button
		  type="button"
		  className="btn btn-secondary" // подставь свой класс
		  onClick={() => { setFreeTextTarget('representative'); setFreeTextOpen(true); }}
                  className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
		>
		  Вставить данные текстом (представитель)
		</button>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Кем выдан*</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={landlord.representative.passportIssued}
                  onChange={(e) => handleRepresentativeFieldChange('passportIssued', e.target.value)}
                  placeholder="Кем выдан паспорт"
                />
                <ErrorMessage error={errors.attorneyPassportIssued} />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Дата выдачи*</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={landlord.representative.issueDate}
                  onChange={(e) => handleRepresentativeFieldChange('issueDate', formatDateInput(e.target.value))}
                  placeholder="дд.мм.гггг"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {landlord.representative.issueDate &&
                    formatDateToText(landlord.representative.issueDate)}
                </div>
                <ErrorMessage error={errors.attorneyIssueDate} />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Код подразделения*</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={landlord.representative.departmentCode}
                  onChange={(e) =>
                    handleRepresentativeFieldChange(
                      'departmentCode',
                      formatDepartmentCode(e.target.value)
                    )
                  }
                  placeholder="000-000"
                />
                <ErrorMessage error={errors.attorneyDepartmentCode} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Адрес регистрации*</label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg ${
                    errors.attorneyRegistration ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={landlord.representative.registration}
                  onChange={(e) => handleRepresentativeFieldChange('registration', e.target.value)}
                  placeholder="Полный адрес регистрации"
                />
                <ErrorMessage error={errors.attorneyRegistration} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Тип регистрации представителя</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={landlord.representative.registrationType === 'previous'}
                      onChange={() =>
                        handleLandlordAttorneyRegistrationTypeChange(
                          landlord.representative.registrationType === 'previous' ? '' : 'previous'
                        )
                      }
                    />
                    <span className="ml-2">Ранее</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={landlord.representative.registrationType === 'temporary'}
                      onChange={() =>
                        handleLandlordAttorneyRegistrationTypeChange(
                          landlord.representative.registrationType === 'temporary' ? '' : 'temporary'
                        )
                      }
                    />
                    <span className="ml-2">Временная</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={landlord.representative.registrationType === 'none'}
                      onChange={() =>
                        handleLandlordAttorneyRegistrationTypeChange(
                          landlord.representative.registrationType === 'none' ? '' : 'none'
                        )
                      }
                    />
                    <span className="ml-2">Без регистрации</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-4">
                <h4 className="text-md font-semibold mb-4">Данные доверенности</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-gray-700 mb-2">Дата доверенности*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={landlord.representative.attorneyDate}
                      onChange={(e) => handleAttorneyDateChange(e, 'attorneyDate')}
                      placeholder="дд.мм.гггг"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {landlord.representative.attorneyDate &&
                        formatDateToText(landlord.representative.attorneyDate)}
                    </div>
                    <ErrorMessage error={errors.attorneyDate} />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Реестровый номер*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={landlord.representative.attorneyNumber}
                      onChange={(e) => handleRepresentativeFieldChange('attorneyNumber', e.target.value)}
                      placeholder="Номер доверенности"
                    />
                    <ErrorMessage error={errors.attorneyNumber} />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Кем удостоверена*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={landlord.representative.attorneyIssuedBy}
                      onChange={(e) => handleRepresentativeFieldChange('attorneyIssuedBy', e.target.value)}
                      placeholder="Орган, выдавший доверенность"
                    />
                    <ErrorMessage error={errors.attorneyIssuedBy} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandlordSection;
