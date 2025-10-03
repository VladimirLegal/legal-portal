import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronLeft, 
  faChevronRight,
  faCheck,
  faUser,
  faUserTie,
  faFileAlt,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';

import TenantSection from './TenantSection';
import LandlordSection from './LandlordSection';
import LeaseTermsSection from './LeaseTermsSection';
import InventorySection from './InventorySection';
import { parseDate } from '../utils/formatters';
import petrovich from 'petrovich';



// === LocalStorage helpers (RentApartmentWizard.js) ===
const LS_KEY = 'lease:formData';

function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveToLS(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {}
}

// === Шаблоны сущностей (без общего представителя) ===
const getInitialRepresentative = () => ({
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
  attorneyIssuedBy: ''
});

const getInitialLandlord = () => ({
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
  phone: '',
  email: '',
  hasRepresentative: false,
  representative: getInitialRepresentative(),
  documents: [] // важное поведение: по умолчанию пусто
});

const getInitialTenant = () => ({
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
  phone: '',
  email: '',
  hasRepresentative: false,
  representative: getInitialRepresentative()
});

// Нормализация старых записей и миграция без useSharedRepresentative
const normalizeParty = (raw, getInitial) => {
  const base = getInitial();
  const representative = { ...base.representative, ...(raw?.representative || {}) };
  const repHasData = Object.values(representative).some(v => (v ?? '').toString().trim() !== '');
  const { useSharedRepresentative, ...rest } = raw || {};

  // ВАЖНО: не превращаем строку "false" в true
  const flagRaw = rest?.hasRepresentative;
  const hasRepNormalized =
    flagRaw === true ||
    flagRaw === 'true' ||
    flagRaw === 1 ||
    flagRaw === '1' ||
    repHasData;

  return {
    ...base,
    ...rest,
    representative,
    hasRepresentative: hasRepNormalized
  };
};


// Начальные условия аренды с обновленными полями
const initialTerms = {
  agreementDate: '',
  agreementPlace: '',
  address: '',
  cadastralNumber: '',
  floor: '',
  rooms: '',
  area: '',
  leaseTermMonths: '',
  startDate: '',
  endDate: '',
  paymentMethod: '',
  paymentDeadline: '',
  keysCount: '',
  utilitiesPayer: '',
  utilitiesPaymentType: '',
  utilitiesServices: [],
  petsAllowed: 'no',
  petsDescription: '',
  rentAmount: '',
  securityDeposit: {
    amount: '',
    paymentMethod: 'lump_sum',
    installmentsCount: 1
  },
  lastMonthRentPrepayment: {
    amount: '',
    paymentMethod: 'lump_sum',
    installmentsCount: 1
  },
  meterReadings: []
};

const RentApartmentWizard = () => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  
  const [tenants, setTenants] = useState([getInitialTenant()]);
  const [currentTenantIndex, setCurrentTenantIndex] = useState(0);
  const [landlords, setLandlords] = useState([getInitialLandlord()]);
  const [currentLandlordIndex, setCurrentLandlordIndex] = useState(0);
  const [terms, setTerms] = useState(initialTerms);
  const [inventory, setInventory] = useState([]);
  const [apartmentDescription, setApartmentDescription] = useState([]);
  // предупреждение "проверьте сумму долей" (для шапки раздела Арендодатель)
  const [sharesMismatch, setSharesMismatch] = useState(false);
  // сверху, рядом с остальными useState
  const [hydrated, setHydrated] = useState(false)
  // Гард: чтобы не инициализировать форму многократно (должен быть ВНУТРИ компонента)
  const hydratedOnceRef = React.useRef(false);

  
  useEffect(() => {
    if (hydratedOnceRef.current) return;

    try {
      // Пытаемся прочитать сохранённые данные из редактора/мастера
      const s = sessionStorage.getItem('leaseFormData') || localStorage.getItem('leaseFormData');
      if (s) {
        const parsed = JSON.parse(s);
        // здесь аккуратно разложи parsed по своим setState:
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.apartmentDescription) setApartmentDescription(parsed.apartmentDescription);
        if (parsed.terms) setTerms(parsed.terms);
        if (parsed.landlords) setLandlords(parsed.landlords);
        if (parsed.tenants) setTenants(parsed.tenants);
        // ...и т.д. по твоей структуре
      }
    } catch (e) {
      console.warn('hydrate from storage failed', e);
    } finally {
      hydratedOnceRef.current = true;
    }
  }, []);
  // Если страница загружена после «вайпа» — глушим любые следы и снимаем флажок
  useEffect(() => {
    const wiped = sessionStorage.getItem('LEASE_WIPED') === '1';
    if (!wiped) return;

    try {
      // подстраховка: подчистим и здесь на всякий
      ['lease:formData','leaseFormData','formData','leaseDocumentHtml','doc:1','editorContent']
        .forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });

      Object.keys(localStorage)
        .filter(k => k.toLowerCase().startsWith('lease'))
        .forEach(k => localStorage.removeItem(k));
      Object.keys(sessionStorage)
        .filter(k => k.toLowerCase().startsWith('lease'))
        .forEach(k => sessionStorage.removeItem(k));
    } catch {}

    // снимаем флажок — он одноразовый
    sessionStorage.removeItem('LEASE_WIPED');

    // Важно: на этом «чистом» заходе не включаем автосейв,
    // он включится только после реального ввода данных пользователем.
    setHydrated(false);
  }, []);



  // 1) Загружаем из LS один раз при монтировании
  useEffect(() => {
    const fromNew = loadFromLS();
    let fromOld = null;
    try {
      const raw = localStorage.getItem('formData'); // обратная совместимость
      fromOld = raw ? JSON.parse(raw) : null;
    } catch {}

    const parsed = fromNew || fromOld;

    try {
      if (parsed?.landlords) {
        setLandlords(parsed.landlords.map(l => normalizeParty(l, getInitialLandlord)));
      }
      if (parsed?.tenants) {
        setTenants(parsed.tenants.map(t => normalizeParty(t, getInitialTenant)));
      }
      if (parsed?.terms) setTerms(parsed.terms);
      if (Array.isArray(parsed?.inventory)) setInventory(parsed.inventory);
      if (Array.isArray(parsed?.apartmentDescription)) setApartmentDescription(parsed.apartmentDescription);
    } catch (e) {
      console.error('Ошибка при восстановлении данных из LS:', e);
    } finally {
      // Если был выполнен «вайп», пропускаем гидратацию/автосейв на этот заход
      const wiped = sessionStorage.getItem('LEASE_WIPED') === '1';

      const foundSomething =
        !wiped && (
          (parsed && Object.keys(parsed).length > 0) ||
          !!sessionStorage.getItem('leaseFormData') ||
          !!localStorage.getItem('leaseFormData') ||
          !!localStorage.getItem('lease:formData')
        );

      setHydrated(!!foundSomething);
    }

  }, []);

  // 2) Автосохранение при любых изменениях, но только после гидратации
  useEffect(() => {
    if (!hydrated) return; // не трогаем LS на самом первом рендере
    saveToLS({
      landlords,
      tenants,
      terms,
      inventory,
      apartmentDescription,
    });
  }, [hydrated, landlords, tenants, terms, inventory, apartmentDescription]);



  const addTenant = () => {
    setTenants(prev => {
      if (prev.length >= 10) return prev; // если хочешь такой же лимит
      const next = [...prev, getInitialTenant()];
      setCurrentTenantIndex(next.length - 1);
      return next;
    });
  };

  
  const removeTenant = (index) => {
    if (tenants.length <= 1) return;
    
    const newTenants = [...tenants];
    newTenants.splice(index, 1);
    setTenants(newTenants);
    
    if (currentTenantIndex >= newTenants.length) {
      setCurrentTenantIndex(Math.max(0, newTenants.length - 1));
    } else if (currentTenantIndex >= index) {
      setCurrentTenantIndex(Math.max(0, currentTenantIndex - 1));
    }
  };

  const addLandlord = () => {
    setLandlords(prev => {
      if (prev.length >= 10) return prev; // лимит сохраняем
      const next = [...prev, getInitialLandlord()];
      // сразу перескакиваем на последний индекс (новая карточка)
      setCurrentLandlordIndex(next.length - 1);
      return next;
    });
  };

  
  const removeLandlord = (index) => {
    if (landlords.length <= 1) return;
    
    const newLandlords = [...landlords];
    newLandlords.splice(index, 1);
    setLandlords(newLandlords);
    
    // стало (с клампом до 0):
    if (currentLandlordIndex >= newLandlords.length) {
      setCurrentLandlordIndex(Math.max(0, newLandlords.length - 1));
    } else if (currentLandlordIndex >= index) {
      setCurrentLandlordIndex(Math.max(0, currentLandlordIndex - 1));
    }
  };

  // Обработчик изменения типа регистрации
  const handleRegistrationTypeChange = (type, isAttorney = false, isShared = false) => {
    const updatedTenants = [...tenants];

    if (isShared) {
      updatedTenants.forEach((tenant) => {
        if (isAttorney) {
          tenant.representative.registrationType =
            tenant.representative.registrationType === type ? '' : type;
        } else {
          tenant.registrationType =
            tenant.registrationType === type ? '' : type;
        }
      });
    } else if (isAttorney) {
      const current = updatedTenants[currentTenantIndex].representative;
      current.registrationType = current.registrationType === type ? '' : type;
    } else {
      const current = updatedTenants[currentTenantIndex];
      current.registrationType = current.registrationType === type ? '' : type;
    }

    setTenants(updatedTenants);
  };

  
  const handleLandlordRegistrationTypeChange = (type) => {
    const updatedLandlords = [...landlords];
    const current = updatedLandlords[currentLandlordIndex];
    current.registrationType = current.registrationType === type ? '' : type;
    setLandlords(updatedLandlords);
  };


  const handleLandlordAttorneyRegistrationTypeChange = (type) => {
    const updatedLandlords = [...landlords];
    updatedLandlords[currentLandlordIndex].representative.registrationType = type;
    setLandlords(updatedLandlords);
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      const tenant = tenants[currentTenantIndex];
      
      // Валидация данных арендатора
      if (!tenant.fullName) newErrors.tenantFullName = 'Введите ФИО';
      if (!tenant.gender) newErrors.tenantGender = 'Укажите пол';
      
      const birthDate = parseDate(tenant.birthDate);
      if (!birthDate) {
        newErrors.tenantBirthDate = 'Неверная дата рождения';
      } else {
        const today = new Date();
        if (birthDate > today) {
          newErrors.tenantBirthDate = 'Дата рождения не может быть в будущем';
        }
      }
      
      if (!tenant.birthPlace) newErrors.tenantBirthPlace = 'Укажите место рождения';
      if (!tenant.passport) newErrors.tenantPassport = 'Введите паспортные данные';
      if (!tenant.issueDate) newErrors.tenantIssueDate = 'Укажите дату выдачи паспорта';
      if (!tenant.passportIssued) newErrors.tenantPassportIssued = 'Укажите кем выдан паспорт';
      if (!tenant.departmentCode) newErrors.tenantDepartmentCode = 'Введите код подразделения';
      if (tenant.registrationType !== 'none' && !tenant.registration) {
	newErrors.tenantRegistration = 'Укажите адрес регистрации';
      }
      if (!tenant.phone) newErrors.tenantPhone = 'Введите номер телефона';
      
      // Валидация представителя (если есть)
      if (tenant.hasRepresentative) {
        if (!tenant.representative.fullName) 
          newErrors.attorneyFullName = 'Введите ФИО представителя';
        if (!tenant.representative.gender) 
          newErrors.attorneyGender = 'Укажите пол представителя';
        
        const attorneyBirthDate = parseDate(tenant.representative.birthDate);
        if (!attorneyBirthDate) {
          newErrors.attorneyBirthDate = 'Неверная дата рождения представителя';
        }
        
        if (!tenant.representative.birthPlace) 
          newErrors.attorneyBirthPlace = 'Укажите место рождения представителя';
        if (!tenant.representative.passport) 
          newErrors.attorneyPassport = 'Введите паспортные данные представителя';
        if (!tenant.representative.issueDate) 
          newErrors.attorneyIssueDate = 'Укажите дату выдачи паспорта представителя';
        if (!tenant.representative.passportIssued) 
          newErrors.attorneyPassportIssued = 'Укажите кем выдан паспорт представителя';
        if (!tenant.representative.departmentCode) 
          newErrors.attorneyDepartmentCode = 'Введите код подразделения представителя';
        if (!tenant.representative.registration) 
          newErrors.attorneyRegistration = 'Укажите адрес регистрации представителя';
        if (!tenant.representative.attorneyNumber) 
          newErrors.attorneyNumber = 'Введите номер доверенности';
        if (!tenant.representative.attorneyDate) 
          newErrors.attorneyDate = 'Укажите дату доверенности';
        if (!tenant.representative.attorneyIssuedBy) 
          newErrors.attorneyIssuedBy = 'Укажите кем выдана доверенность';
      }
      
    } else if (step === 2) {
      const landlord = landlords[currentLandlordIndex];
      
      // Валидация данных арендодателя
      if (!landlord.fullName) newErrors.landlordFullName = 'Введите ФИО';
      if (!landlord.gender) newErrors.landlordGender = 'Укажите пол';
      
      const birthDate = parseDate(landlord.birthDate);
      if (!birthDate) {
        newErrors.landlordBirthDate = 'Неверная дата рождения';
      } else {
        const today = new Date();
        if (birthDate > today) {
          newErrors.landlordBirthDate = 'Дата рождения не может быть в будущем';
        }
      }
      
      if (!landlord.birthPlace) newErrors.landlordBirthPlace = 'Укажите место рождения';
      if (!landlord.passport) newErrors.landlordPassport = 'Введите паспортные данные';
      if (!landlord.issueDate) newErrors.landlordIssueDate = 'Укажите дату выдачи паспорта';
      if (!landlord.passportIssued) newErrors.landlordPassportIssued = 'Укажите кем выдан паспорт';
      if (!landlord.departmentCode) newErrors.landlordDepartmentCode = 'Введите код подразделения';
      if (landlord.registrationType !== 'none' && !landlord.registration) {
	      newErrors.landlordRegistration = 'Укажите адрес регистрации';
      }
      if (!landlord.phone) newErrors.landlordPhone = 'Введите номер телефона';
      
      // Валидация документов
      landlord.documents.forEach((doc, index) => {
        if (!doc.doc) newErrors[`doc_${index}`] = 'Укажите тип документа';
        if (!doc.docDate) newErrors[`docDate_${index}`] = 'Укажите дату документа';
      });
      
      // Валидация представителя (если есть)
      if (landlord.hasRepresentative) {
        if (!landlord.representative.fullName) 
          newErrors.landlordAttorneyFullName = 'Введите ФИО представителя';
        if (!landlord.representative.gender) 
          newErrors.landlordAttorneyGender = 'Укажите пол представителя';
        
        const attorneyBirthDate = parseDate(landlord.representative.birthDate);
        if (!attorneyBirthDate) {
          newErrors.landlordAttorneyBirthDate = 'Неверная дата рождения представителя';
        }
        
        if (!landlord.representative.birthPlace) 
          newErrors.landlordAttorneyBirthPlace = 'Укажите место рождения представителя';
        if (!landlord.representative.passport) 
          newErrors.landlordAttorneyPassport = 'Введите паспортные данные представителя';
        if (!landlord.representative.issueDate) 
          newErrors.landlordAttorneyIssueDate = 'Укажите дату выдачи паспорта представителя';
        if (!landlord.representative.passportIssued) 
          newErrors.landlordAttorneyPassportIssued = 'Укажите кем выдан паспорт представителя';
        if (!landlord.representative.departmentCode) 
          newErrors.landlordAttorneyDepartmentCode = 'Введите код подразделения представителя';
        if (!landlord.representative.registration) 
          newErrors.landlordAttorneyRegistration = 'Укажите адрес регистрации представителя';
        if (!landlord.representative.attorneyNumber) 
          newErrors.landlordAttorneyNumber = 'Введите номер доверенности';
        if (!landlord.representative.attorneyDate) 
          newErrors.landlordAttorneyDate = 'Укажите дату доверенности';
        if (!landlord.representative.attorneyIssuedBy) 
          newErrors.landlordAttorneyIssuedBy = 'Укажите кем выдана доверенность';
      }
    } else if (step === 3) {
      // Валидация условий аренды
      if (!terms.agreementDate) newErrors.agreementDate = 'Укажите дату договора';
      if (!terms.agreementPlace) newErrors.agreementPlace = 'Укажите место заключения';
      if (!terms.address) newErrors.address = 'Введите адрес объекта';
      if (!terms.cadastralNumber) newErrors.cadastralNumber = 'Введите кадастровый номер';
      if (!terms.floor) newErrors.floor = 'Укажите этаж';
      if (!terms.rooms) newErrors.rooms = 'Укажите количество комнат';
      if (!terms.area) newErrors.area = 'Укажите площадь квартиры';
      if (!terms.rentAmount) newErrors.rentAmount = 'Введите стоимость аренды';
      
      // Валидация срока аренды
      if (terms.leaseTermMonths === '' && (!terms.startDate || !terms.endDate)) {
        newErrors.leaseTerm = 'Укажите срок аренды';
      }
      
      if (!terms.paymentMethod) newErrors.paymentMethod = 'Выберите способ оплаты';
      if (!terms.paymentDeadline) newErrors.paymentDeadline = 'Укажите срок оплаты';
      if (!terms.keysCount) newErrors.keysCount = 'Укажите количество ключей';
      if (!terms.utilitiesPayer) newErrors.utilitiesPayer = 'Укажите плательщика коммунальных услуг';
      
      // Валидация платежей
      if (!terms.securityDeposit.amount) 
        newErrors.securityDepositAmount = 'Укажите сумму обеспечительного платежа';
      
      if (!terms.lastMonthRentPrepayment.amount) 
        newErrors.lastMonthRentPrepaymentAmount = 'Укажите сумму предоплаты';
      
      // Валидация животных
      if (terms.petsAllowed === 'yes' && !terms.petsDescription) {
        newErrors.petsDescription = 'Укажите животное';
      }
      
      // Валидация приборов учета
      terms.meterReadings.forEach((reading, index) => {
        if (!reading.utilityType) 
          newErrors[`meterType_${index}`] = 'Укажите тип прибора';
        
        if (!reading.meterNumber) 
          newErrors[`meterNumber_${index}`] = 'Введите номер прибора';
      });
    } else if (step === 4) {
      // Валидация описи имущества
      if (inventory.length === 0) {
        newErrors.inventory = 'Добавьте помещения в опись имущества';
      } else {
        inventory.forEach((room, roomIndex) => {
          if (!room.name) newErrors[`roomName_${roomIndex}`] = 'Укажите название помещения';
          
          room.items.forEach((item, itemIndex) => {
            if (!item.name) newErrors[`itemName_${roomIndex}_${itemIndex}`] = 'Введите наименование имущества';
            if (!item.condition) newErrors[`itemCondition_${roomIndex}_${itemIndex}`] = 'Укажите состояние';
          });
        });
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep() && step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };
  // === Очистка сохранённых данных (кэш формы) ===
  // ВСТАВИТЬ ПОСЛЕ блока с обработчиками (например, сразу после removeLandlord)
  function clearStorageAndReload() {
    try {
      // 0) ставим флажок вайпа на следующий заход
      sessionStorage.setItem('LEASE_WIPED', '1');

      // 1) целевой список ключей нашего приложения
      const KEYS = [
        'lease:formData',        // автосейв мастера (именно отсюда тянулось у тебя)
        'leaseFormData',         // общий formData (и в LS, и в SS)
        'formData',              // очень старый ключ совместимости
        'leaseDocumentHtml',     // автосейв редактора
        'doc:1',
        'editorContent',
      ];

      // 2) удаляем точные ключи из обоих стораджей
      for (const k of KEYS) {
        try { localStorage.removeItem(k); } catch {}
        try { sessionStorage.removeItem(k); } catch {}
      }

      // 3) дополнительно вычищаем ВСЕ ключи, которые начинаются на "lease"
      try {
        Object.keys(localStorage)
          .filter(k => k.toLowerCase().startsWith('lease'))
          .forEach(k => localStorage.removeItem(k));
        Object.keys(sessionStorage)
          .filter(k => k.toLowerCase().startsWith('lease'))
          .forEach(k => sessionStorage.removeItem(k));
      } catch {}

      // 4) диагностический лог: пусть видно, что было удалено
      try {
        console.log('[wipe] after:', {
          'lease:formData': localStorage.getItem('lease:formData'),
          leaseFormData_ls: localStorage.getItem('leaseFormData'),
          leaseFormData_ss: sessionStorage.getItem('leaseFormData'),
        });
      } catch {}
    } catch (e) {
      console.warn('clearStorage error', e);
    }

    // 5) мягкий reload (достаточно) — флажок в SS уже стоит
    setTimeout(() => window.location.reload(), 0);
  }
  // ===== Число -> русские слова (до 9999) + склонения =====
  function ruPlural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }
  function numToRuWords(n) {
    n = Number(n) || 0;
    const ones = ['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять'];
    const teens = ['десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать'];
    const tens = ['','десять','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
    const hundreds = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'];
    if (n === 0) return 'ноль';
    if (n < 0 || n > 9999) return String(n);

    const parts = [];
    const th = Math.floor(n / 1000);
    const h  = Math.floor((n % 1000) / 100);
    const t  = Math.floor((n % 100) / 10);
    const o  = n % 10;

    if (th) parts.push(th === 1 ? 'одна' : th === 2 ? 'две' : numToRuWords(th), ruPlural(th, 'тысяча','тысячи','тысяч'));
    if (h) parts.push(hundreds[h]);
    if (t > 1) { parts.push(tens[t]); if (o) parts.push(ones[o]); }
    else if (t === 1) parts.push(teens[o]);
    else if (o) parts.push(ones[o]);

    return parts.join(' ').replace(/\s+/g,' ').trim();
  }
  // родительный падеж для «в количестве трёх/двух/одного»
  function numToGenitive(n) {
    // для 1/2/3/4 дигнём спец-формы, остальное оставим как есть
    const map = {1:'одного',2:'двух',3:'трёх',4:'четырёх'};
    return map[n] || numToRuWords(n);
  }



  // === 🔹 helpers for display fields (dates/grammar/naming) ===
  // === дата: принимаем и "ГГГГ-ММ-ДД", и "ДД.ММ.ГГГГ" ===
  function parseAnyDateToISO(input) {
    if (!input) return '';
    const s = String(input).trim();
    // уже ISO?
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // русская "ДД.ММ.ГГГГ"
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const dd = m[1], MM = m[2], yyyy = m[3];
      return `${yyyy}-${MM}-${dd}`;
    }
    // fallback: пусть вернёт пусто, чтобы не подставлять мусор
    return '';
  }
  function formatDateLongRu(anyDate) {
    const iso = parseAnyDateToISO(anyDate);
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(x => parseInt(x, 10));
    if (!y || !m || !d) return '';
    const months = [
      'января','февраля','марта','апреля','мая','июня',
      'июля','августа','сентября','октября','ноября','декабря'
    ];
    return `${d} ${months[m-1]} ${y} года`;
  }

  function genderWord(g) {
    return g === 'female' ? 'женский' : 'мужской';
  }
  function genderVerbRegistered(g) {
    return g === 'female' ? 'зарегистрирована' : 'зарегистрирован';
  }
  function namedLater(g) {
    return g === 'female' ? 'именуемая в дальнейшем' : 'именуемый в дальнейшем';
  }
  
  // === паспорт: поддерживаем и "серия: XXXX номер: YYYYYY", и просто "XXXX YYYYYY" ===
  function splitPassport(passportStr) {
    const out = { series: '', number: '' };
    if (!passportStr) return out;
    const s = String(passportStr).replace(/\s+/g, ' ').trim();

    // 1) "серия: XXXX номер: YYYYYY"
    let m = s.match(/серия[:\s]*([0-9]{2}\s?[0-9]{2}|[0-9]{4}).*?номер[:\s]*([0-9]{6})/i);
    if (m) return { series: m[1].replace(/\s+/g, ''), number: m[2] };

    // 2) просто "XXXX YYYYYY" (4 + 6 цифр) или "XXXXYYYYYY"
    m = s.match(/(^|[^0-9])([0-9]{2}\s?[0-9]{2}|[0-9]{4})\s*([0-9]{6})([^0-9]|$)/);
    if (m) return { series: m[2].replace(/\s+/g, ''), number: m[3] };

    return out;
  }
  // --- FIO declension helpers (Petrovich) ---
function splitFio(fullName = '') {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  // допущение: [Фамилия Имя Отчество] — если порядок иной, всё равно отработает, просто склонение будет мягче
  const [last = '', first = '', middle = ''] = parts;
  return { last, first, middle };
}
function joinFio({ last = '', first = '', middle = '' }) {
  return [last, first, middle].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
function declineFioGenitive(fullName = '', gender = '') {
  const nom = (fullName || '').trim();
  if (!nom) return nom;
  try {
    const { last, first, middle } = splitFio(nom);
    const person = { last, first, middle };

    // попробуем подсказать пол из входного объекта (female|male) или по отчеству
    if (gender === 'female' || gender === 'male') {
      person.gender = gender;
    } else if (middle) {
      const g = petrovich.detect_gender ? petrovich.detect_gender(middle) : 'androgynous';
      if (g === 'female' || g === 'male') person.gender = g;
    }

    const g = petrovich(person, 'genitive'); // { first, middle, last, gender? }
    return joinFio(g);
  } catch (e) {
    console.warn('[FIO decline warn] genitive fallback to original for:', fullName, e);
    return nom; // безопасный фолбэк
  }
}
function buildFioCases(fullName = '', gender = '') {
  const nom = (fullName || '').trim();
  if (!nom) return { nom: '', gen: '', dat: '', acc: '', ins: '', pre: '' };

  try {
    // то же разбиение и подсказка пола, что и в declineFioGenitive
    const { last, first, middle } = splitFio(nom);
    const base = { last, first, middle };

    if (gender === 'female' || gender === 'male') {
      base.gender = gender;
    } else if (middle) {
      const g = petrovich.detect_gender ? petrovich.detect_gender(middle) : 'androgynous';
      if (g === 'female' || g === 'male') base.gender = g;
    }

    // считаем все нужные падежи
    const gen = joinFio(petrovich({ ...base }, 'genitive'));
    const dat = joinFio(petrovich({ ...base }, 'dative'));
    const acc = joinFio(petrovich({ ...base }, 'accusative'));
    const ins = joinFio(petrovich({ ...base }, 'instrumental'));
    const pre = joinFio(petrovich({ ...base }, 'prepositional'));

    return { nom, gen, dat, acc, ins, pre };
  } catch (e) {
    // безопасный фолбэк — возвращаем исходник во все формы
    return { nom, gen: nom, dat: nom, acc: nom, ins: nom, pre: nom };
  }
}


  // Проставить display-поля одной персоне (человеку)
  function enrichPersonDisplay(p, roleBaseName, idx, total) {
    const gender = p.gender === 'female' ? 'female' : 'male';

    // даты: принимаем и dd.mm.yyyy и yyyy-mm-dd
    const birthISO = parseAnyDateToISO(p.birthDate);
    const issueISO = parseAnyDateToISO(p.issueDate);

    // паспорт: вытаскиваем 4+6, даже если просто "4004 202033"
    const { series, number } = splitPassport(p.passport || '');

    const display = {
      genderWord: gender === 'female' ? 'женский' : 'мужской',
      genderVerbRegistered: gender === 'female' ? 'зарегистрирована' : 'зарегистрирован',
      namedLater: gender === 'female' ? 'именуемая в дальнейшем' : 'именуемый в дальнейшем',
      birthDateText: formatDateLongRu(birthISO),
      issueDateText: formatDateLongRu(issueISO),
      passportSeries: p.passportSeries || series,
      passportNumber: p.passportNumber || number,
      namedAs: total > 1 ? `${roleBaseName} ${idx + 1}` : roleBaseName,
      // true = есть следующий → ставим запятую после роли ( ",")
      lastInGroup: idx < total - 1
    };
    display.fio = buildFioCases(p.fullName, p.gender);
    return { ...p, display };
  }

  // Если у стороны общий представитель: строим объект для шаблона
  function buildGroupRepresentative(sideArray) {
    const first = sideArray?.[0];
    if (!first || !first.useSharedRepresentative || !first.representative) return null;
    const rep = { ...first.representative };

    // общий представитель «существует» только если есть хоть что-то осмысленное
    const repHasData = !!(rep.fullName || rep.passport || rep.birthDate || rep.registration);
    if (!repHasData) return null;

    const gender = rep.gender === 'female' ? 'female' : 'male';
    rep.display = {
      genderWord: gender === 'female' ? 'женский' : 'мужской',
      genderVerbRegistered: gender === 'female' ? 'зарегистрирована' : 'зарегистрирован',
      birthDateText: formatDateLongRu(parseAnyDateToISO(rep.birthDate)),
      issueDateText: formatDateLongRu(parseAnyDateToISO(rep.issueDate)),
      attorneyDateText: formatDateLongRu(parseAnyDateToISO(rep.attorneyDate))
    };
    rep.display.fio = buildFioCases(rep.fullName, rep.gender);

    return rep;
  }

  // Главная функция обогащения formData
  function enrichFormDataForParties(fd) {
    const out = { ...fd };
    const landlords = Array.isArray(fd.landlords) ? fd.landlords : [];
    const tenants = Array.isArray(fd.tenants) ? fd.tenants : [];

    // 1) Персоны: добавляем display у каждого
    const landlordsEnriched = landlords.map((p, i) => enrichPersonDisplay(p, 'Наймодатель', i, landlords.length));
    const tenantsEnriched   = tenants.map((p, i) => enrichPersonDisplay(p, 'Наниматель',  i, tenants.length));

    // 2) Групповые ярлыки и флаги
    const calc = {
      landlordsCount: landlordsEnriched.length,
      tenantsCount: tenantsEnriched.length,
      landlordsCountIsOne: landlordsEnriched.length === 1,
      tenantsCountIsOne: tenantsEnriched.length === 1,
      landlordsGroupLabel: landlordsEnriched.length === 1 ? 'Наймодатель' : 'Наймодатели',
      tenantsGroupLabel: tenantsEnriched.length === 1 ? 'Наниматель'  : 'Наниматели'
    };

    // 3) Общий представитель у группы (если есть)
    const landlordsRepresentative = buildGroupRepresentative(landlordsEnriched);
    const tenantsRepresentative   = buildGroupRepresentative(tenantsEnriched);

    // 4) Если общий представитель есть — прикрепим список представляемых
    if (landlordsRepresentative) {
      landlordsRepresentative.represented = landlordsEnriched;
    }
    if (tenantsRepresentative) {
      tenantsRepresentative.represented = tenantsEnriched;
    }

    // 5) Обогатим представителей у КАЖДОЙ персоны (если не общий)
    function enrichPersonalReps(list) {
      return list.map(p => {
        // "общий представитель" не трогаем
        if (p.useSharedRepresentative) return p;

        const r = p.representative;
        // если пустой объект представителя — НЕ считаем, что он есть
        const hasRep = !!(r && (r.fullName || r.passport || r.birthDate || r.registration));
        if (!hasRep) return { ...p, hasRepresentative: false, representative: null };

        const rep = { ...r };
        const gender = rep.gender === 'female' ? 'female' : 'male';
        rep.display = {
          genderWord: gender === 'female' ? 'женский' : 'мужской',
          genderVerbRegistered: gender === 'female' ? 'зарегистрирована' : 'зарегистрирован',
          birthDateText: formatDateLongRu(parseAnyDateToISO(rep.birthDate)),
          issueDateText: formatDateLongRu(parseAnyDateToISO(rep.issueDate)),
          attorneyDateText: formatDateLongRu(parseAnyDateToISO(rep.attorneyDate))
        };
        rep.display.fio = buildFioCases(rep.fullName, rep.gender);

        return { ...p, representative: rep, hasRepresentative: true };
      });
    }

    const landlordsFinal = enrichPersonalReps(landlordsEnriched);
    const tenantsFinal   = enrichPersonalReps(tenantsEnriched);

    out.landlords = landlordsFinal;
    out.tenants   = tenantsFinal;
    out.calc = calc;
    out.landlordsRepresentative = landlordsRepresentative || null;
    out.tenantsRepresentative   = tenantsRepresentative   || null;

    return out;
  }

  
  const prevLensRef = React.useRef({ inv: -1, apt: -1 });

  useEffect(() => {
    const inv = (inventory || []).length;
    const apt = (apartmentDescription || []).length;
    const { inv: prevInv, apt: prevApt } = prevLensRef.current;
    if (inv !== prevInv || apt !== prevApt) {
      console.log('[INV len]', inv, '[APT len]', apt);
      prevLensRef.current = { inv, apt };
    }
  }, [inventory, apartmentDescription]);
  // Если чекбокс hasRepresentative выключен — очищаем объект представителя (и у арендодателей, и у арендаторов)
  useEffect(() => {
    setLandlords(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (p?.hasRepresentative) return p; // включен — оставляем как есть
        const rep = p?.representative || {};
        const hasData = Object.values(rep).some(v => String(v || '').trim() !== '');
        if (hasData) {
          changed = true;
          return { ...p, representative: { ...getInitialRepresentative() } };
        }
        return p;
      });
      return changed ? next : prev;
    });
  }, [landlords.map(p => p.hasRepresentative).join('|')]); // реагируем именно на переключение чекбоксов

  useEffect(() => {
    setTenants(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (p?.hasRepresentative) return p;
        const rep = p?.representative || {};
        const hasData = Object.values(rep).some(v => String(v || '').trim() !== '');
        if (hasData) {
          changed = true;
          return { ...p, representative: { ...getInitialRepresentative() } };
        }
        return p;
      });
      return changed ? next : prev;
    });
  }, [tenants.map(p => p.hasRepresentative).join('|')]);


  
  
  const handleSubmit = () => {
    if (validateStep()) {
      const rentAmount = Number(terms.rentAmount || 0);
      const latePenaltyPerDay = Math.round((rentAmount / 30) * 1.5);
      terms.latePenaltyPerDay = latePenaltyPerDay;
      terms.penaltyClause44 = Math.round((Number(terms.rentAmount || 0)) / 2);
      
      // --- Расчёт количества экземпляров договора
      const landlordCount = landlords.length;
      const tenantCount = tenants.length;

      const landlordReps = landlords.filter(l => l.hasRepresentative).map(l => l.representative.fullName);
      const tenantReps = tenants.filter(t => t.hasRepresentative).map(t => t.representative.fullName);

      const uniqueReps = new Set([...landlordReps, ...tenantReps]);
      const representativeCount = uniqueReps.size;

      const totalCopies = landlordCount + tenantCount + representativeCount;

      terms.copiesCount = totalCopies;
     


      if (terms.securityDepositSplit && terms.securityDepositParts > 1) {
	const parts = terms.securityDepositParts;
  	const total = terms.securityDepositAmount;
  	const first = Math.round(total / parts);
  	const remainder = total - first;
  	const monthly = Math.round(remainder / (parts - 1));

  	terms.securityDepositFirst = first;
  	terms.securityDepositRemainder = remainder;
  	terms.securityDepositMonthly = monthly;

  	terms.securityDepositSchedule =
	  `${first} при подписании договора, оставшиеся ${remainder} равными платежами по ${monthly} рублей в течение ${parts - 1} последующих месяцев одновременно с оплатой очередного арендного платежа`;
      }
      // --- Расчёт графика предоплаты за последний месяц
      if (terms.lastMonthPrepaySplit && terms.lastMonthPrepayParts > 1) {
  	const parts = terms.lastMonthPrepayParts;
  	const total = terms.lastMonthPrepayAmount;
  	const first = Math.round(total / parts);
  	const remainder = total - first;
  	const monthly = Math.round(remainder / (parts - 1));

  	terms.lastMonthPrepayFirst = first;
  	terms.lastMonthPrepayRemainder = remainder;
  	terms.lastMonthPrepayMonthly = monthly;

  	terms.lastMonthPrepaySchedule =
	  `${first} при подписании договора, оставшиеся ${remainder} равными платежами по ${monthly} рублей в течение ${parts - 1} последующих месяцев одновременно с оплатой очередного арендного платежа`;
      }

      function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (m) {
          return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          })[m];
        });
      }

      // --- HTML для Приложения 1
      // Хелпер: "1 000 руб." из любого ввода (число/строка)
      function formatRubShort(val) {
        const s = String(val ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
        const n = Number(s);
        if (!isFinite(n) || n <= 0) return '—';
        return `${Math.round(n).toLocaleString('ru-RU')} руб.`;
      }
      // Хелпер: строим блок подписей с ФИО
      function buildSignaturesHtml(landlords, tenants) {
        const lRows = (landlords || []).map((l, i) => `
          <tr>
            <td style="white-space:nowrap; padding:0 8px 0 0; vertical-align:bottom;">
              Наймодатель ${landlords.length > 1 ? i + 1 : ''}
            </td>
            <td style="width:260px; padding:0 8px; vertical-align:bottom;">
              <span style="display:inline-block; font-family:monospace; letter-spacing:2px;">______________________________</span>
            </td>
            <td style="white-space:nowrap; padding-left:8px; vertical-align:bottom;">
              / ${escapeHtml(l.fullName || '')} /
            </td>
          </tr>
        `).join('');

        const tRows = (tenants || []).map((t, j) => `
          <tr>
            <td style="white-space:nowrap; padding:8px 8px 0 0; vertical-align:bottom;">
              Наниматель ${tenants.length > 1 ? j + 1 : ''}
            </td>
            <td style="width:260px; padding:8px 8px 0 8px; vertical-align:bottom;">
              <span style="display:inline-block; font-family:monospace; letter-spacing:2px;">______________________________</span>
            </td>
            <td style="white-space:nowrap; padding:8px 0 0 8px; vertical-align:bottom;">
              / ${escapeHtml(t.fullName || '')} /
            </td>
          </tr>
        `).join('');

        return `
          <br/>
          <table style="width:100%; border-collapse:collapse; margin-top:8pt;" cellspacing="0" cellpadding="0">
            <tbody>
              ${lRows}
              ${tRows}
            </tbody>
          </table>
        `;
      }
      // --- HTML для Приложения 1 (Опись имущества) — 5 колонок, ROWSPAN, TipTap-friendly
      (function buildInventoryHtml() {
        const BASE_ROOMS = ['Жилая комната', 'Кухня', 'Коридор', 'Санузел', 'Балкон'];

        // 1) карта "имя помещения" -> массив items
        const invByName = {};
        (inventory || []).forEach(r => {
          const n = String(r?.name || '').trim();
          invByName[n] = Array.isArray(r?.items) ? r.items : [];
        });

        // 2) фиксированный порядок базовых + добавочные помещения (если не базовые)
        const orderedRooms = [
          ...BASE_ROOMS.map(n => ({ name: n, items: invByName[n] || [] })),
          ...(inventory || [])
            .filter(r => !BASE_ROOMS.includes(String(r?.name || '').trim()))
            .map(r => ({ name: String(r.name || '').trim(), items: Array.isArray(r.items) ? r.items : [] })),
        ];

        // 3) генерация строк
        const rowsHtml = orderedRooms.map(room => {
          const items = Array.isArray(room.items) ? room.items : [];
          const rowspan = Math.max(1, items.length);

          // Нет предметов — одна пустая строка
          if (items.length === 0) {
            return `
              <tr>
                <td rowspan="1" style="border:1px solid #000; padding:3pt 4pt; vertical-align:top;"><p>${escapeHtml(room.name || '')}</p></td>
                <td style="border:1px solid #000; padding:3pt 4pt;"><p></p></td>
                <td style="border:1px solid #000; padding:3pt 4pt;"><p></p></td>
                <td style="border:1px solid #000; padding:3pt 4pt;"><p></p></td>
                <td style="border:1px solid #000; padding:3pt 4pt;"><p></p></td>
              </tr>
            `;
          }

          // Есть предметы — первая строка с room+первый item, остальные — только item-колонки
          let html = `
            <tr>
              <td rowspan="${rowspan}" style="border:1px solid #000; padding:3pt 4pt; vertical-align:top;"><p>${escapeHtml(room.name || '')}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${escapeHtml(items[0]?.name || '')}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${escapeHtml(items[0]?.condition || '')}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${formatRubShort(items[0]?.estimatedCost)}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${escapeHtml(items[0]?.notes || '')}</p></td>
            </tr>
          `;

          html += items.slice(1).map(it => `
            <tr>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${escapeHtml(it?.name || '')}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${escapeHtml(it?.condition || '')}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${formatRubShort(it?.estimatedCost)}</p></td>
              <td style="border:1px solid #000; padding:3pt 4pt;"><p>${escapeHtml(it?.notes || '')}</p></td>
            </tr>
          `).join('');

          return html;
        }).join('');



        terms.inventoryHtml = `
          <div class="pagebreak" style="page-break-before: always; break-before: page;"></div>
          <table class="inventory-table" cellspacing="0" cellpadding="0" style="width:100%; border-collapse:collapse;">
            <tbody>
              <!-- заголовок внутри tbody — чтобы TipTap не удалял -->
              <tr>
                <th style="border:1px solid #000; padding:3pt 4pt; text-align:center;"><p>Наименование помещения</p></th>
                <th style="border:1px solid #000; padding:3pt 4pt; text-align:center;"><p>Наименование имущества</p></th>
                <th style="border:1px solid #000; padding:3pt 4pt; text-align:center;"><p>Состояние имущества</p></th>
                <th style="border:1px solid #000; padding:3pt 4pt; text-align:center;"><p>Оценочная стоимость</p></th>
                <th style="border:1px solid #000; padding:3pt 4pt; text-align:center;"><p>Примечание</p></th>
              </tr>
              ${rowsHtml}
            </tbody>
          </table>
          ${buildSignaturesHtml(landlords, tenants)}
        `;

      })();


      // --- HTML для Приложения 2
      // --- HTML для Приложения 2 (Описание квартиры) — без thead, все ячейки с <p>
      terms.apartmentHtml = `
        <div class="pagebreak" style="page-break-before: always; break-before: page;"></div>
        <table class="apartment-table" cellspacing="0" cellpadding="4" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="border:1px solid #000;padding:3pt 4pt;">Помещение</th>
              <th style="border:1px solid #000;padding:3pt 4pt;">Пол</th>
              <th style="border:1px solid #000;padding:3pt 4pt;">Стены</th>
              <th style="border:1px solid #000;padding:3pt 4pt;">Потолок</th>
              <th style="border:1px solid #000;padding:3pt 4pt;">Двери</th>
              <th style="border:1px solid #000;padding:3pt 4pt;">Окна</th>
              <th style="border:1px solid #000;padding:3pt 4pt;">Состояние</th>
            </tr>
          </thead>
          <tbody>
            ${
              (apartmentDescription || []).map(room => `
                <tr>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.name || '—')}</td>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.floor || '—')}</td>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.walls || '—')}</td>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.ceiling || '—')}</td>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.doors || '—')}</td>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.windows || '—')}</td>
                  <td style="border:1px solid #000;padding:3pt 4pt;">${escapeHtml(room?.condition || '—')}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
        ${buildSignaturesHtml(landlords, tenants)}
      `;
      // === 1.2 Ключи: количество словами + правильное склонение «комплект(ов)»
      const keysNum = Number(terms.keysCount || 0);
      const keysWord = numToGenitive(keysNum); // «в количестве трёх»
      const keysNoun = ruPlural(keysNum, 'комплекта', 'комплектов');
      terms.keysCountWordsGen = keysWord;                 // напр.: «трёх»
      terms.keysCountNoun = keysNoun;                     // «комплектов»
      terms.keysCountDisplay = `${keysNum} (${keysWord}) ${keysNoun}`; // «3 (трёх) комплектов»

      // === 1.3 Показания счётчиков — одна строка вида: "Электроэнергия: день 110, ночь 50; ХВС: 100; ..."
      function buildMeterReadingsText(arr) {
        if (!Array.isArray(arr) || !arr.length) return '';
        return arr.map(m => {
          const type = (m.utilityType || '').trim();
          const num  = (m.meterNumber || '').trim();
          const val  = m.values || {};
          if (/электро|электроэнергия|электроэнерг/i.test(type)) {
            const day = (val.day ?? '').toString().trim();
            const night = (val.night ?? '').toString().trim();
            const parts = [];
            if (day) parts.push(`день ${day}`);
            if (night) parts.push(`ночь ${night}`);
            const tail = parts.length ? `: ${parts.join(', ')}` : '';
            return `Электроэнергия${tail}${num ? ` (прибор учета № ${num})` : ''}`;
          } else {
            const one = (val.value ?? '').toString().trim();
            const tail = one ? `: ${one}` : '';
            return `${type}${tail}${num ? ` (прибор учета № ${num})` : ''}`;
          }
        }).join('; ');
      }
      terms.meterReadingsText = buildMeterReadingsText(terms.meterReadings || []);


      
      // ➊ Собираем сырой formData (как у тебя)
      const formDataRaw = {
        landlords,
        tenants,
        inventory,
        apartmentDescription,
        terms: { 
          ...terms,
          inventoryHtml: terms.inventoryHtml,
          apartmentHtml: terms.apartmentHtml
        }
      };
      
      // 👇 Подставляем startDate, если не указано отдельно
      formDataRaw.terms.startDate = formDataRaw.terms.startDate || formDataRaw.terms.agreementDate; 

      // 🧠 Вычисление endDate по leaseTermMonths
      if (!formDataRaw.terms.endDate && formDataRaw.terms.agreementDate && formDataRaw.terms.leaseTermMonths) {
        const start = new Date(formDataRaw.terms.agreementDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + parseInt(formDataRaw.terms.leaseTermMonths));
        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, '0');
        const dd = String(end.getDate()).padStart(2, '0');
        formDataRaw.terms.endDate = `${yyyy}-${mm}-${dd}`;
      }

      // ➋ ОБОГАЩАЕМ для шаблона (длинные даты «… года», окончания, нумерация, представители)
      const formData = enrichFormDataForParties(formDataRaw);
            // === НОРМАЛИЗАЦИЯ ПЕРЕД ОТПРАВКОЙ В РЕДАКТОР ===
      // Жёстко приводим hasRepresentative к boolean и чистим пустых представителей
      formData.landlords = (formData.landlords || []).map(l => {
        const hasRep =
          l?.hasRepresentative === true ||
          l?.hasRepresentative === 'true';

        if (!hasRep) {
          // убираем объект представителя, чтобы data-if не сработал по наличию ключа
          if (l && 'representative' in l) delete l.representative;
        }
        l.hasRepresentative = !!hasRep;
        return l;
      });

      formData.tenants = (formData.tenants || []).map(t => {
        const hasRep =
          t?.hasRepresentative === true ||
          t?.hasRepresentative === 'true';

        if (!hasRep) {
          if (t && 'representative' in t) delete t.representative;
        }
        t.hasRepresentative = !!hasRep;
        return t;
      });


      // если общего представителя нет — ключ удаляем
      if (!formData.landlordsRepresentative?.fullName?.trim()) {
        delete formData.landlordsRepresentative;
      }
      // ➌ Лог и сохранение того, что реально читает DocumentEditorPage
      console.log('🔍 formData:', formData);
      window.sessionStorage.setItem('leaseFormData', JSON.stringify(formData));
      window.localStorage.setItem('leaseFormData', JSON.stringify(formData));

      // обратная совместимость — пусть останется
      window.localStorage.setItem('formData', JSON.stringify(formData));
      saveToLS({
        landlords,
        tenants,
        terms: formData.terms, // после твоих расчётов terms переименован в formData.terms — подставь актуальное
        inventory,
        apartmentDescription,
      });

      navigate('/document-editor');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Договор аренды квартиры</h1>
      
      <div className="flex justify-between mb-8 border-b">
        {[1, 2, 3, 4].map((stepNum) => (
          <button
            key={stepNum}
            onClick={() => setStep(stepNum)}
            className={`pb-2 px-4 relative ${
              step === stepNum 
                ? 'text-blue-600 font-medium border-b-2 border-blue-600' 
                : 'text-gray-600'
            }`}
          >
            {stepNum === 1 && <FontAwesomeIcon icon={faUser} className="mr-2" />}
            {stepNum === 2 && <FontAwesomeIcon icon={faUserTie} className="mr-2" />}
            {stepNum === 3 && <FontAwesomeIcon icon={faFileAlt} className="mr-2" />}
            {stepNum === 4 && <FontAwesomeIcon icon={faClipboardList} className="mr-2" />}
            {stepNum === 1 && 'Арендодатель'}
	    {stepNum === 2 && 'Арендатор'}
            {stepNum === 3 && 'Условия аренды'}
            {stepNum === 4 && 'Опись имущества'}
          </button>
        ))}
      </div>
      
      {/* ВСТАВИТЬ ПОД ОСНОВНЫМ ЗАГОЛОВКОМ ФОРМЫ (или рядом с другими кнопками управления) */}
      <div className="mt-4">
            <button
            type="button"
            onClick={clearStorageAndReload}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            title="Удалить сохранённые данные формы и перезагрузить страницу"
          >
            Очистить сохранённые данные
        </button>
      </div>

      {step === 1 && (
        <LandlordSection 
          landlords={landlords}
          currentLandlordIndex={currentLandlordIndex}
          setLandlords={setLandlords}
          setCurrentLandlordIndex={setCurrentLandlordIndex}
          errors={errors}
          addLandlord={addLandlord}
          removeLandlord={removeLandlord}
          handleLandlordRegistrationTypeChange={handleLandlordRegistrationTypeChange}
          handleLandlordAttorneyRegistrationTypeChange={handleLandlordAttorneyRegistrationTypeChange}
	        sharesMismatch={sharesMismatch}
        />
      )}
      
      {step === 2 && (
        <TenantSection 
          tenants={tenants}
          currentTenantIndex={currentTenantIndex}
          setTenants={setTenants}
          setCurrentTenantIndex={setCurrentTenantIndex}
          errors={errors}
          addTenant={addTenant}
          removeTenant={removeTenant}
          handleRegistrationTypeChange={handleRegistrationTypeChange}
        />
      )}
      
      {step === 3 && (
        <LeaseTermsSection 
          terms={terms}
          setTerms={setTerms}
          landlords={landlords}
          setLandlords={setLandlords}
          setSharesMismatch={setSharesMismatch}
        />
      )}
      
      {step === 4 && (
        <InventorySection 
          inventory={inventory}
          setInventory={setInventory}
          roomCount={terms?.rooms}
          apartmentDescription={apartmentDescription}
          setApartmentDescription={setApartmentDescription}
          hydrated={hydrated}
        />
      )}
      
      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className={`px-6 py-2 rounded-lg ${
            step === 1
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
          Назад
        </button>

        {step < 4 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Далее
            <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Сгенерировать договор
            <FontAwesomeIcon icon={faCheck} className="ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};

export default RentApartmentWizard;