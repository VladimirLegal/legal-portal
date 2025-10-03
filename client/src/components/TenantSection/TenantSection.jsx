// client/src/components/TenantSection/TenantSection.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faPlus,
  faTimes,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import ErrorMessage from '../ErrorMessage';
import {
  formatPassport,
  formatDateToText,
  formatDepartmentCode,
  formatPhone,
  formatPassportText
} from '../../utils/formatters';

// Новое: универсальная модалка «Вставить паспортные данные текстом»
import FreeTextImportModal from '../common/FreeTextImportModal';
import { parseFreeTextPerson } from '../../utils/freeTextParser';
import petrovich from 'petrovich';


const TenantSection = ({
  tenants,
  currentTenantIndex,
  setTenants,
  setCurrentTenantIndex,
  errors,
  addTenant,
  removeTenant,
  handleRegistrationTypeChange
}) => {
  // ---------- ЕДИНАЯ точка доступа к текущему арендатору ----------
  const tenant = tenants?.[currentTenantIndex] || null;

  // Безопасная инициализация представителя (используем в апдейтерах)
  const ensureRep = (o) => {
    if (!o) return o;
    o.representative ||= {
      fullName: '', gender: '', birthDate: '', birthPlace: '',
      passport: '', passportIssued: '', issueDate: '', departmentCode: '',
      registration: '', registrationType: '',
      attorneyNumber: '', attorneyDate: '', attorneyIssuedBy: ''
    };
    return o;
  };

  // Ref для поля ФИО арендатора
  const fullNameInputRef = React.useRef(null);

  // Состояние для уведомления о родительном падеже
  const [genitiveCaseNotice, setGenitiveCaseNotice] = React.useState(false);

  // Новые состояния: модалка «Вставить текстом»
  const [freeTextOpen, setFreeTextOpen] = React.useState(false);
  const [freeTextTarget, setFreeTextTarget] = React.useState('tenant'); // 'tenant' | 'rep'
  // === COPY REPRESENTATIVE: state & helpers ===
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [selectedTargets, setSelectedTargets] = React.useState([]);

  // Список остальных арендаторов (кроме текущего)
  const otherTenants = React.useMemo(() => {
  return (tenants || [])
    .map((t, i) => ({
      index: i,
      label: (t?.fullName?.trim() || `Арендатор ${i + 1}`)
    }))
    .filter(item => item.index !== currentTenantIndex);
  }, [tenants, currentTenantIndex]);

  // Проверка: есть ли у представителя хоть какие-то данные
  const representativeHasData = (rep = {}) =>
    Object.values(rep).some(v => (v ?? '').toString().trim() !== '');

  const openCopyModal = () => {
    setSelectedTargets([]);
    setCopyOpen(true);
  };

  const toggleTarget = React.useCallback((idx) => {
    setSelectedTargets(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }, []);

  const applyCopyToTargets = () => {
    const source = tenants?.[currentTenantIndex];
    if (!source || !representativeHasData(source.representative)) return;

    setTenants(prev => {
      const next = (prev || []).map((t, i) => {
        if (selectedTargets.includes(i)) {
          // гарантируем объект представителя у цели
          ensureRep(t);
          // глубокая копия, чтобы не тащить ссылки
          const clone = JSON.parse(JSON.stringify(source.representative || {}));
          t.hasRepresentative = true;
          t.representative = { ...(t.representative || {}), ...clone };
        }
        return t;
      });
      return next;
    });

    setCopyOpen(false);
  };


  // Показывать подсказку о родительном падеже, если есть представитель
  React.useEffect(() => {
    if (tenant?.hasRepresentative) {
      setGenitiveCaseNotice(true);
      const timer = setTimeout(() => setGenitiveCaseNotice(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [tenant?.hasRepresentative, currentTenantIndex]);
  // --- FIO declension helpers ---
  const splitFio = (fullName = '') => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const [last = '', first = '', middle = ''] = parts;
    return { last, first, middle };
  };
  const joinFio = ({ last = '', first = '', middle = '' }) =>
    [last, first, middle].filter(Boolean).join(' ').trim();
  const declineGenitive = (fullName = '', gender = '') => {
    if (!fullName) return '';
    try {
      const person = splitFio(fullName);
      if (gender) person.gender = gender;
      const declined = petrovich(person, 'genitive');
      return joinFio(declined);
    } catch (e) {
      return fullName; // фолбэк
    }
  };

  // ---------- Хэндлеры форматирования дат ----------
  const handleBirthDateChange = (e) => {
    const value = e.target.value;
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 2) formatted = `${formatted.substring(0, 2)}.${formatted.substring(2)}`;
    if (formatted.length > 5) formatted = `${formatted.substring(0, 5)}.${formatted.substring(5, 9)}`;

    const updated = [...tenants];
    updated[currentTenantIndex].birthDate = formatted;
    setTenants(updated);
  };

  const handleIssueDateChange = (e) => {
    const value = e.target.value;
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 2) formatted = `${formatted.substring(0, 2)}.${formatted.substring(2)}`;
    if (formatted.length > 5) formatted = `${formatted.substring(0, 5)}.${formatted.substring(5, 9)}`;

    const updated = [...tenants];
    updated[currentTenantIndex].issueDate = formatted;
    setTenants(updated);
  };

  // Представитель: даты
  const handleRepresentativeBirthDateChange = (e) => {
    const value = e.target.value;
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 2) formatted = `${formatted.substring(0, 2)}.${formatted.substring(2)}`;
    if (formatted.length > 5) formatted = `${formatted.substring(0, 5)}.${formatted.substring(5, 9)}`;

    const updated = [...tenants];
    const current = updated[currentTenantIndex];
    ensureRep(current);
    current.representative.birthDate = formatted;
    setTenants(updated);
  };

  const handleRepresentativeIssueDateChange = (e) => {
    const value = e.target.value;
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 2) formatted = `${formatted.substring(0, 2)}.${formatted.substring(2)}`;
    if (formatted.length > 5) formatted = `${formatted.substring(0, 5)}.${formatted.substring(5, 9)}`;

    const updated = [...tenants];
    const current = updated[currentTenantIndex];
    ensureRep(current);
    current.representative.issueDate = formatted;
    setTenants(updated);
  };

  const handleAttorneyDateChange = (e) => {
    const value = e.target.value;
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 2) formatted = `${formatted.substring(0, 2)}.${formatted.substring(2)}`;
    if (formatted.length > 5) formatted = `${formatted.substring(0, 5)}.${formatted.substring(5, 9)}`;

    const updated = [...tenants];
    const current = updated[currentTenantIndex];
    ensureRep(current);
    current.representative.attorneyDate = formatted;
    setTenants(updated);
  };
  
  // --- поля верхнего уровня у арендатора (не представитель) ---
  const TENANT_TOP_FIELDS = [
    'fullName','gender','birthDate','birthPlace',
    'passport','passportIssued','issueDate','departmentCode',
    'registration','registrationType','phone','email','whoLive'
  ];

  // очистить только верхние поля арендатора (представителя не трогаем)
  const clearTenantTopFields = (obj) => {
    TENANT_TOP_FIELDS.forEach(k => { obj[k] = ''; });
  };
  // 👇 вставить здесь
  const [lastApplyDiff, setLastApplyDiff] = React.useState(null);

  const diffObject = (before, after, fields) => {
    const d = {};
    fields.forEach(k => {
      const b = before?.[k] ?? '';
      const a = after?.[k] ?? '';
      if (b !== a) d[k] = { before: b, after: a };
    });
    return d;
  };

  const logAppliedChanges = (label, before, after, fields) => {
    const d = diffObject(before, after, fields);
    if (Object.keys(d).length) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`🧩 ${label}: изменены поля`);
      // eslint-disable-next-line no-console
      console.table(d);
      // eslint-disable-next-line no-console
      console.groupEnd();
      setLastApplyDiff({ label, diff: d }); // для отображения в UI (см. п.3)
    } else {
      // eslint-disable-next-line no-console
      console.info(`🧩 ${label}: изменений нет`);
      setLastApplyDiff({ label, diff: {} });
    }
  };

  // применить распарсенный свободный текст к ТЕКУЩЕМУ арендатору
  // mode: 'replace-tenant-only' — очистить верхние поля и заполнить только распознанным
  //       'merge'               — ничего не чистить, только подставить то, что распознали
  const applyFreeTextToTenant = (rawText, { mode = 'replace-tenant-only' } = {}) => {
    const parsed = parseFreeTextPerson(rawText || '');

    setTenants(prev => {
      const arr = [...(prev || [])];
      const idx = Math.min(Math.max(currentTenantIndex, 0), Math.max(arr.length - 1, 0));
      const cur = { ...(arr[idx] || {}) };
      const before = JSON.parse(JSON.stringify(cur)); // глубокая копия до изменений
      // eslint-disable-next-line no-console
      console.debug('parseFreeTextPerson(tenant).parsed =', parsed);


      if (mode === 'replace-tenant-only') {
        clearTenantTopFields(cur);   // <<-- очищаем ТОЛЬКО верхние поля
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
      logAppliedChanges('Tenant', before, cur, [
	     'fullName','gender','birthDate','birthPlace',
  	   'passport','passportIssued','issueDate','departmentCode',
  	   'registration','phone','email'
      ]);

      // ВАЖНО: НЕ трогаем cur.hasRepresentative, cur.useSharedRepresentative и cur.representative
      arr[idx] = cur;
      return arr;
    });
  };
  
  const applyFreeTextToRepresentative = (rawText, { mode = 'replace-rep-only' } = {}) => {
    const parsed = parseFreeTextPerson(rawText || '');

    setTenants(prev => {
      const arr = [...(prev || [])];
      const idx = Math.min(Math.max(currentTenantIndex, 0), Math.max(arr.length - 1, 0));
      const cur = { ...(arr[idx] || {}) };

      // гарантируем наличие объекта представителя и включаем флаг
      if (!cur.representative) {
        cur.representative = {
          fullName:'', gender:'', birthDate:'', birthPlace:'',
          passport:'', passportIssued:'', issueDate:'', departmentCode:'',
          registration:'', registrationType:'',
          attorneyNumber:'', attorneyDate:'', attorneyIssuedBy:''
        };
      }
      const beforeRep = JSON.parse(JSON.stringify(cur.representative));
      // eslint-disable-next-line no-console
      console.debug('parseFreeTextPerson(representative).parsed =', parsed);

      cur.hasRepresentative = true;

      if (mode === 'replace-rep-only') {
        // очищаем ТОЛЬКО поля представителя
        cur.representative = {
          fullName:'', gender:'', birthDate:'', birthPlace:'',
          passport:'', passportIssued:'', issueDate:'', departmentCode:'',
          registration:'', registrationType:'',
          attorneyNumber:'', attorneyDate:'', attorneyIssuedBy:''
        };
      }

      // переносим только непустые распознанные значения
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
      logAppliedChanges('Representative', beforeRep, cur.representative, [
  	'fullName','gender','birthDate','birthPlace',
  	'passport','passportIssued','issueDate','departmentCode',
  	'registration'
      ]);

      arr[idx] = cur;
      return arr;
    });
  };
 
  // ---------- Общий return с тернарником по tenant ----------
  return (
    <>
      {/* МОДАЛКА «Вставить паспортные данные текстом» — всегда доступна */}
      <FreeTextImportModal
        open={freeTextOpen}
        onClose={() => setFreeTextOpen(false)}
        title={
          freeTextTarget === 'tenant'
            ? 'Вставьте текст с данными арендатора'
            : 'Вставьте текст с данными представителя'
        }
        onApply={(raw) => {
  	  try {
    	    if (freeTextTarget === 'tenant') {
              // очищаем ТОЛЬКО поля арендатора, представитель остаётся как был
	      applyFreeTextToTenant(raw, { mode: 'replace-tenant-only' });
	    } else {
	      // очищаем ТОЛЬКО поля представителя текущего арендатора
	      applyFreeTextToRepresentative(raw, { mode: 'replace-rep-only' });
	    }
	  } finally {
	    setFreeTextOpen(false);
	  }
	}}

      />

      {/* Контент: либо «пустой» безопасный UI, либо основной */}
      {!tenant ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-600" />
              Данные арендатора
            </h2>
            <button
              onClick={addTenant}
              className="px-3 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Добавить арендатора
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Пока нет активной карточки. Вы можете&nbsp;
            <button
              type="button"
              onClick={() => { setFreeTextTarget('tenant'); setFreeTextOpen(true); }}
              className="underline text-emerald-700 hover:text-emerald-800"
            >
              вставить паспортные данные текстом
            </button>
            &nbsp;или нажать «Добавить арендатора».
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Шапка и кнопка «Добавить арендатора» */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-600" />
              Данные арендатора
            </h2>

            <button
              onClick={addTenant}
              disabled={tenants.length >= 10}
              className={`px-3 py-1 rounded-lg flex items-center ${
                tenants.length >= 10
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Добавить арендатора
            </button>
          </div>

          {/* Переключатели карточек */}
          <div className="flex flex-wrap gap-2 mb-4">
            {tenants.map((_, index) => (
              <div
                key={index}
                className={`flex items-center rounded-lg overflow-hidden ${
                  currentTenantIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCurrentTenantIndex(index)}
                  className="px-4 py-2"
                >
                  Арендатор {index + 1}
                </button>
                {tenants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTenant(index)}
                    className="px-2 h-full hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Основная форма */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2">
                {tenant.hasRepresentative
                  ? 'ФИО арендатора (в родительном падеже)*'
                  : 'ФИО*'}
              </label>

              <input
                ref={fullNameInputRef}
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.fullName}
                onChange={(e) => {
                  const updated = [...tenants];
                  updated[currentTenantIndex].fullName = e.target.value;
                  setTenants(updated);
                }}
                placeholder={tenant.hasRepresentative
                  ? 'Фамилию Имя Отчество (в род. падеже)'
                  : 'Фамилия Имя Отчество'}
              />
              <ErrorMessage error={errors.tenantFullName} />
              {tenant.hasRepresentative && tenant.fullName && (
                <div className="text-sm text-red-500 mt-1">
                  В договоре это ФИО будет указано так:
                  <span className="ml-1 font-medium">
                    {declineGenitive(tenant.fullName, tenant.gender)}
                  </span>
                </div>
              )}

              {/* Кнопка: Вставить паспортные данные текстом */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => { setFreeTextTarget('tenant'); setFreeTextOpen(true); }}
                  className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
                >
                  Вставить паспортные данные текстом
                </button>
                <span className="ml-2 text-xs text-gray-500">
                  Локальная обработка, ничего не отправляем на сервер
                </span>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Пол*</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name={`gender-${currentTenantIndex}`}
                    value="male"
                    checked={tenant.gender === 'male'}
                    onChange={() => {
                      const updated = [...tenants];
                      updated[currentTenantIndex].gender = 'male';
                      setTenants(updated);
                    }}
                  />
                  <span className="ml-2">Мужской</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name={`gender-${currentTenantIndex}`}
                    value="female"
                    checked={tenant.gender === 'female'}
                    onChange={() => {
                      const updated = [...tenants];
                      updated[currentTenantIndex].gender = 'female';
                      setTenants(updated);
                    }}
                  />
                  <span className="ml-2">Женский</span>
                </label>
              </div>
              <ErrorMessage error={errors.tenantGender} />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Дата рождения*</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.birthDate}
                onChange={handleBirthDateChange}
                placeholder="дд.мм.гггг"
              />
              <div className="text-sm text-gray-500 mt-1">
                {tenant.birthDate && `${formatDateToText(tenant.birthDate)} рождения`}
              </div>
              <ErrorMessage error={errors.tenantBirthDate} />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Место рождения*</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.birthPlace}
                onChange={(e) => {
                  const updated = [...tenants];
                  updated[currentTenantIndex].birthPlace = e.target.value;
                  setTenants(updated);
                }}
                placeholder="Город, село и т.д."
              />
              <ErrorMessage error={errors.tenantBirthPlace} />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Паспорт*</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.passport}
                onChange={(e) => {
                  const formatted = formatPassport(e.target.value);
                  const updated = [...tenants];
                  updated[currentTenantIndex].passport = formatted;
                  setTenants(updated);
                }}
                placeholder="Серия и номер"
              />
              <div className="text-sm text-gray-500 mt-1">
                {tenant.passport && formatPassportText(tenant.passport)}
              </div>
              <ErrorMessage error={errors.tenantPassport} />
             
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Дата выдачи паспорта*</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.issueDate}
                onChange={handleIssueDateChange}
                placeholder="дд.мм.гггг"
              />
              <div className="text-sm text-gray-500 mt-1">
                {tenant.issueDate && formatDateToText(tenant.issueDate)}
              </div>
              <ErrorMessage error={errors.tenantIssueDate} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2">Кем выдан паспорт*</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.passportIssued}
                onChange={(e) => {
                  const updated = [...tenants];
                  updated[currentTenantIndex].passportIssued = e.target.value;
                  setTenants(updated);
                }}
                placeholder="Наименование органа"
              />
              <ErrorMessage error={errors.tenantPassportIssued} />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Код подразделения*</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.departmentCode}
                onChange={(e) => {
                  const formatted = formatDepartmentCode(e.target.value);
                  const updated = [...tenants];
                  updated[currentTenantIndex].departmentCode = formatted;
                  setTenants(updated);
                }}
                placeholder="000-000"
              />
              <ErrorMessage error={errors.tenantDepartmentCode} />
            </div>

            {tenant.registrationType !== 'none' && (
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Адрес регистрации*</label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg ${errors.tenantRegistration ? 'border-red-500' : 'border-gray-300'}`}
                  value={tenant.registration}
                  onChange={(e) => {
                    const updated = [...tenants];
                    updated[currentTenantIndex].registration = e.target.value;
                    setTenants(updated);
                  }}
                  placeholder="Полный адрес регистрации"
                />
                <ErrorMessage error={errors.tenantRegistration} />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2">Тип регистрации</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={tenant.registrationType === 'previous'}
                    onChange={() =>
                      handleRegistrationTypeChange(
                        tenant.registrationType === 'previous' ? '' : 'previous'
                      )
                    }
                  />
                  <span className="ml-2">Ранее</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={tenant.registrationType === 'temporary'}
                    onChange={() =>
                      handleRegistrationTypeChange(
                        tenant.registrationType === 'temporary' ? '' : 'temporary'
                      )
                    }
                  />
                  <span className="ml-2">Временная</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={tenant.registrationType === 'none'}
                    onChange={() =>
                      handleRegistrationTypeChange(
                        tenant.registrationType === 'none' ? '' : 'none'
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
                value={tenant.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  const updated = [...tenants];
                  updated[currentTenantIndex].phone = formatted;
                  setTenants(updated);
                }}
                placeholder="+7 (999) 999-99-99"
              />
              <ErrorMessage error={errors.tenantPhone} />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.email}
                onChange={(e) => {
                  const updated = [...tenants];
                  updated[currentTenantIndex].email = e.target.value;
                  setTenants(updated);
                }}
                placeholder="email@example.com"
              />
              <ErrorMessage error={errors.tenantEmail} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2">Кто совместно будет проживать с Арендатором</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={tenant.whoLive}
                onChange={(e) => {
                  const updated = [...tenants];
                  updated[currentTenantIndex].whoLive = e.target.value;
                  setTenants(updated);
                }}
                placeholder="Укажите ФИО проживающих лиц"
                rows="2"
              />
            </div>
          </div>

          {/* Блок представителя */}
          <div className="mt-8 border-t pt-8">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={!!tenant.hasRepresentative}
                onChange={(e) => {
                  const updated = [...tenants];
                  updated[currentTenantIndex].hasRepresentative = e.target.checked;
                  if (e.target.checked) {
                    ensureRep(updated[currentTenantIndex]);
                  }
                  setTenants(updated);
                }}
              />
              <span className="ml-2 text-lg font-medium">Действует через представителя</span>
            </div>

            {tenant.hasRepresentative && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Данные представителя</h3>

                {/* Уведомление о родительном падеже */}
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
                            При наличии представителя укажите ФИО арендатора в родительном падеже (кого? чего?)
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setGenitiveCaseNotice(false);
                                fullNameInputRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center'
                                });
                                fullNameInputRef.current?.focus();
                              }}
                              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                            >
                              Исправить сейчас
                            </button>
                            <button
                              type="button"
                              onClick={() => setGenitiveCaseNotice(false)}
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              Закрыть
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGenitiveCaseNotice(false)}
                        className="text-yellow-700 hover:text-yellow-900 ml-2"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  </div>
                )}
                {/* Кнопка одноразового копирования представителя */}
                <div className="mt-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded border text-sm"
                    onClick={openCopyModal}
                    disabled={!representativeHasData(tenant?.representative) || otherTenants.length === 0}
                    title={
                      otherTenants.length === 0
                      ? 'Нет других карточек'
                      : (!representativeHasData(tenant?.representative)
                        ? 'Сначала заполните представителя у текущего'
                        : '')
                    }
                  >
                    Скопировать этого представителя другим…
                  </button>
                </div>

                {/* Поля представителя */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2">ФИО представителя*</label>
                    <input
                      type="text"
                      className={`w-full p-3 border rounded-lg ${errors.attorneyFullName ? 'border-red-500' : 'border-gray-300'}`}
                      value={tenant.representative?.fullName || ''}
                      onChange={(e) => {
                        const updated = [...tenants];
                        const current = updated[currentTenantIndex];
                        ensureRep(current);
                        current.representative.fullName = e.target.value;
                        setTenants(updated);
                      }}
                      placeholder="Фамилия Имя Отчество"
                    />
                    <ErrorMessage error={errors.attorneyFullName} />

                    {/* Кнопка: Вставить паспортные данные текстом (для представителя) */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!tenant.hasRepresentative) {
                            const ok = window.confirm('Включить «Действует через представителя» и заполнить из текста?');
                            if (!ok) return;
                            const arr = [...tenants];
                            const cur = { ...(arr[currentTenantIndex] || {}) };
                            cur.hasRepresentative = true;
                            ensureRep(cur);
                            arr[currentTenantIndex] = cur;
                            setTenants(arr);
                          }
                          setFreeTextTarget('rep');
                          setFreeTextOpen(true);
                        }}
                        className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
                      >
                        Вставить паспортные данные текстом
                      </button>
                      <span className="ml-2 text-xs text-gray-500">
                        Локальная обработка, ничего не отправляем на сервер
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Пол*</label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio"
                          name={`attorney-gender-${currentTenantIndex}`}
                          value="male"
                          checked={tenant.representative?.gender === 'male'}
                          onChange={() => {
                            const updated = [...tenants];
                            const current = updated[currentTenantIndex];
                            ensureRep(current);
                            current.representative.gender = 'male';
                            setTenants(updated);
                          }}
                        />
                        <span className="ml-2">Мужской</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio"
                          name={`attorney-gender-${currentTenantIndex}`}
                          value="female"
                          checked={tenant.representative?.gender === 'female'}
                          onChange={() => {
                            const updated = [...tenants];
                            const current = updated[currentTenantIndex];
                            ensureRep(current);
                            current.representative.gender = 'female';
                            setTenants(updated);
                          }}
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
                      value={tenant.representative?.birthDate || ''}
                      onChange={handleRepresentativeBirthDateChange}
                      placeholder="дд.мм.гггг"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {tenant.representative?.birthDate && `${formatDateToText(tenant.representative.birthDate)} рождения`}
                    </div>
                    <ErrorMessage error={errors.attorneyBirthDate} />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Место рождения*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={tenant.representative?.birthPlace || ''}
                      onChange={(e) => {
                        const updated = [...tenants];
                        const current = updated[currentTenantIndex];
                        ensureRep(current);
                        current.representative.birthPlace = e.target.value;
                        setTenants(updated);
                      }}
                      placeholder="Город, село и т.д."
                    />
                    <ErrorMessage error={errors.attorneyBirthPlace} />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Паспорт*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={tenant.representative?.passport || ''}
                      onChange={(e) => {
                        const formatted = formatPassport(e.target.value);
                        const updated = [...tenants];
                        const current = updated[currentTenantIndex];
                        ensureRep(current);
                        current.representative.passport = formatted;
                        setTenants(updated);
                      }}
                      placeholder="Серия и номер"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {tenant.representative?.passport && formatPassportText(tenant.representative.passport)}
                    </div>
                    <ErrorMessage error={errors.attorneyPassport} />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Дата выдачи паспорта*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={tenant.representative?.issueDate || ''}
                      onChange={handleRepresentativeIssueDateChange}
                      placeholder="дд.мм.гггг"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {tenant.representative?.issueDate && formatDateToText(tenant.representative.issueDate)}
                    </div>
                    <ErrorMessage error={errors.attorneyIssueDate} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2">Кем выдан паспорт*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={tenant.representative?.passportIssued || ''}
                      onChange={(e) => {
                        const updated = [...tenants];
                        const current = updated[currentTenantIndex];
                        ensureRep(current);
                        current.representative.passportIssued = e.target.value;                  
                        setTenants(updated);
                      }}
                      placeholder="Наименование органа"
                    />
                    <ErrorMessage error={errors.attorneyPassportIssued} />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Код подразделения*</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      value={tenant.representative?.departmentCode || ''}
                      onChange={(e) => {
                        const formatted = formatDepartmentCode(e.target.value);
                        const updated = [...tenants];
                        const current = updated[currentTenantIndex];
                        ensureRep(current);
                        current.representative.departmentCode = formatted;
                        setTenants(updated);
                      }}
                      placeholder="000-000"
                    />
                    <ErrorMessage error={errors.attorneyDepartmentCode} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2">Адрес регистрации*</label>
                    <input
                      type="text"
                      className={`w-full p-3 border rounded-lg ${errors.attorneyRegistration ? 'border-red-500' : 'border-gray-300'}`}
                      value={tenant.representative?.registration || ''}
                      onChange={(e) => {
                        const updated = [...tenants];
                        const current = updated[currentTenantIndex];
                        ensureRep(current);
                        current.representative.registration = e.target.value;
                        setTenants(updated);
                      }}
                      placeholder="Полный адрес регистрации"
                    />
                    <ErrorMessage error={errors.attorneyRegistration} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2">Тип регистрации</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={tenant.representative?.registrationType === 'previous'}
                          onChange={() =>
                            handleRegistrationTypeChange(
                              tenant.representative?.registrationType === 'previous' ? '' : 'previous',
                              true
                            )
                          }
                        />
                        <span className="ml-2">Ранее</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={tenant.representative?.registrationType === 'temporary'}
                          onChange={() =>
                            handleRegistrationTypeChange(
                              tenant.representative?.registrationType === 'temporary' ? '' : 'temporary',
                              true
                            )
                          }
                        />
                        <span className="ml-2">Временная</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={tenant.representative?.registrationType === 'none'}
                          onChange={() =>
                            handleRegistrationTypeChange(
                              tenant.representative?.registrationType === 'none' ? '' : 'none',
                              true
                            )
                          }
                        />
                        <span className="ml-2">Без регистрации</span>
                      </label>
                    </div>
                  </div>

                  {/* Доверенность */}
                  <div className="md:col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-md font-semibold mb-4">Данные доверенности</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-2">Дата доверенности*</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          value={tenant.representative?.attorneyDate || ''}
                          onChange={handleAttorneyDateChange}
                          placeholder="дд.мм.гггг"
                        />
                        <div className="text-sm text-gray-500 mt-1">
                          {tenant.representative?.attorneyDate && formatDateToText(tenant.representative.attorneyDate)}
                        </div>
                        <ErrorMessage error={errors.attorneyDate} />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Реестровый номер*</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          value={tenant.representative?.attorneyNumber || ''}
                          onChange={(e) => {
                            const updated = [...tenants];
                            const current = updated[currentTenantIndex];
                            ensureRep(current);
                            current.representative.attorneyNumber = e.target.value.trim();
                            setTenants(updated);
                          }}
                          placeholder="Номер доверенности"
                        />
                        <ErrorMessage error={errors.attorneyNumber} />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Кем удостоверена*</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          value={tenant.representative?.attorneyIssuedBy || ''}
                          onChange={(e) => {
                            const updated = [...tenants];
                            const current = updated[currentTenantIndex];
                            ensureRep(current);
                            current.representative.attorneyIssuedBy = e.target.value;
                            setTenants(updated);
                          }}
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
      )}
      {/* === MODAL: Скопировать представителя другим === */}
      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 rounded shadow max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Скопировать этого представителя другим…</h3>

            {otherTenants.length === 0 ? (
              <p className="text-sm text-gray-600">Нет других карточек арендаторов.</p>
            ) : (
              <div className="max-h-64 overflow-auto border rounded p-2 space-y-2">
                {otherTenants.map(({ index, label }) => (
                  <label key={index} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTargets.includes(index)}
                      onChange={() => toggleTarget(index)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded border"
                onClick={() => setCopyOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded border"
                onClick={applyCopyToTargets}
                disabled={
                  !representativeHasData(tenant?.representative) ||
                  selectedTargets.length === 0
                }
                title={
                  !representativeHasData(tenant?.representative)
                    ? 'Сначала заполните представителя у текущего'
                  : (selectedTargets.length === 0 ? 'Выберите хотя бы одну карточку' : '')
                }
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TenantSection;
