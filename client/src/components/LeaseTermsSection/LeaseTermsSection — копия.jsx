import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faExclamationTriangle, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

import { useFormattedCurrency } from '../../hooks/useFormattedCurrency';
import bankDirectory from '../../data/bankDirectory.json';
import { extractBankDetailsFromPDF } from '../../utils/extractBankDetailsFromPdf';

// Утилиты адаптации данных выписки к UI (сопоставление ФИО, сборка оснований, проверка долей)
import {
  namesMatchStrict,
  namesMatchFuzzy,
  toUiDocGroups,
  computeSharesMismatch,
} from '../../utils/egrnUiAdapter';
import { UTILITIES_ALL, UTILITIES_METER_TYPES } from '../../data/utilities';


const LeaseTermsSection = ({ terms, setTerms, landlords, setLandlords, setSharesMismatch }) => {
  // Переключатель способа задания срока аренды
  const [useMonthsInput, setUseMonthsInput] = useState(false);
  useEffect(() => {
    if (terms.leaseTermMonths && !terms.startDate && !terms.endDate) {
      setUseMonthsInput(true);
    } else {
      setUseMonthsInput(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [warningVisible, setWarningVisible] = useState(false);

  // Форматирование сумм (визуал)
  const { formatted: rentFormatted } = useFormattedCurrency(terms.rentAmount);
  const { formatted: depositFormatted } = useFormattedCurrency(terms.securityDeposit?.amount);
  const { formatted: prepayFormatted } = useFormattedCurrency(terms.lastMonthRentPrepayment?.amount);

  // Формат кадастрового номера
  const formatCadastral = (value) => {
    const clean = String(value || '').replace(/\D/g, '');
    const groups = [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 11), clean.slice(11, 22)].filter(Boolean);
    return groups.join(':');
  };

  // Предупреждение про регистрацию (> 11 мес)
  useEffect(() => {
    if (!terms.agreementDate) return;

    if (useMonthsInput && terms.leaseTermMonths) {
      setWarningVisible(parseInt(terms.leaseTermMonths, 10) > 11);
    } else if (terms.startDate && terms.endDate) {
      const start = new Date(terms.startDate);
      const end = new Date(terms.endDate);
      const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      setWarningVisible(daysDiff > 335);
    }
  }, [terms.agreementDate, terms.leaseTermMonths, terms.startDate, terms.endDate, useMonthsInput]);

  // ---------------------------
  // Платежи — обработчики
  // ---------------------------
  const handleDepositChange = (field, value) => {
    setTerms({
      ...terms,
      securityDeposit: {
        ...(terms.securityDeposit || {}),
        [field]: value,
      },
    });
  };

  const handlePrepaymentChange = (field, value) => {
    setTerms({
      ...terms,
      lastMonthRentPrepayment: {
        ...(terms.lastMonthRentPrepayment || {}),
        [field]: value,
      },
    });
  };

  // ---------------------------
  // Приборы учета
  // ---------------------------
  const addMeterReading = () => {
    const next = {
      id: Date.now(),
      utilityType: 'ГВС', // ГВС | ХВС | Электроэнергия | Тепло | ГАЗ | Другой
      values: { value: '', day: '', night: '' },
      meterNumber: '',
    };
    setTerms({
      ...terms,
      meterReadings: [ ...(terms.meterReadings || []), next ],
    });
  };

  const removeMeterReading = (id) => {
    setTerms({
      ...terms,
      meterReadings: (terms.meterReadings || []).filter((m) => m.id !== id),
    });
  };

  const handleMeterChange = (id, field, value, subField) => {
    const updated = (terms.meterReadings || []).map((r) => {
      if (r.id !== id) return r;
      if (field === 'values') {
        return { ...r, values: { ...(r.values || {}), [subField]: value } };
      }
      return { ...r, [field]: value };
    });
    setTerms({ ...terms, meterReadings: updated });
  };

  // ------------------------------------------------------------
  // Сопоставление правообладателей и заполнение «Основание права»
  // ------------------------------------------------------------
  const reconcileOwners = (extracted) => {
    if (!Array.isArray(extracted) || !extracted.length) return;

    const updated = [...(landlords || [])];

    extracted.forEach((ext) => {
      const exactIndex = updated.findIndex((u) =>
        namesMatchStrict(u.fullName, u.birthDate, ext.fullName, ext.birthDate)
      );
      const fuzzyIndex =
        exactIndex === -1
          ? updated.findIndex((u) =>
              namesMatchFuzzy(u.fullName, u.birthDate, ext.fullName, ext.birthDate)
            )
          : -1;

      let idx = exactIndex;
      if (idx === -1 && fuzzyIndex !== -1) {
        const yes = window.confirm(
          `Совпадение по Имени+Отчеству и дате рождения:\n"${ext.fullName}"\nЭто один и тот же человек?`
        );
        if (yes) idx = fuzzyIndex;
      }

      // не нашли соответствие — предложим создать нового арендодателя
      if (idx === -1) {
	const add = window.confirm(
    	  `В выписке найден правообладатель:\n"${ext.fullName}"${ext.birthDate ? `, ${ext.birthDate}` : ''}\nСоздать карточку арендодателя и заполнить паспорт/основания?`
  	);
  	if (add) {
    	  const series = ext.passport?.series ? String(ext.passport.series).replace(/\s+/g, '') : '';
    	  const number = ext.passport?.number ? String(ext.passport.number).replace(/\s+/g, '') : '';
    	  const newCard = {
      	    // базовые поля карточки
      	    fullName: ext.fullName || '',
      	    birthDate: ext.birthDate || '',
      	    birthPlace: ext.birthPlace || '',
	    registration: ext.registration || '',
	    phone: ext.phone || '',
	    email: ext.email || '',
  	    snils: ext.snils || '',
  	    ownershipType: ext.ownershipType || '',

   	    // паспорт (как у ваших полей формы)
  	    passport: [series, number].filter(Boolean).join(' ').trim(),
  	    passportIssued: ext.passport?.issuedBy || '',
  	    issueDate: ext.passport?.issueDate || '',
  	    departmentCode: ext.passport?.deptCode || '',
            hasRepresentative: false,
	    useSharedRepresentative: false,
	    representative: {
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
	    },

  	    // «Основание права собственности» — сразу в UI-структуре
  	    documents: toUiDocGroups(ext),
    	  };
          updated.push(newCard);
  	}
  	return;
      }


      const current = { ...updated[idx] };

      // 1) Паспорт — по подтверждению
      const hasExtPassport =
        ext.passport &&
        (ext.passport.series ||
          ext.passport.number ||
          ext.passport.issuedBy ||
          ext.passport.issueDate ||
          ext.passport.deptCode);

      const wantPassportUpdate =
        hasExtPassport &&
        window.confirm(`Обновить паспортные данные для "${current.fullName}" из выписки?`);

      if (wantPassportUpdate) {
        const series = ext.passport.series ? String(ext.passport.series).replace(/\s+/g, '') : '';
        const number = ext.passport.number ? String(ext.passport.number).replace(/\s+/g, '') : '';
        current.passport = [series, number].filter(Boolean).join(' ').trim();
        current.passportIssued = ext.passport.issuedBy || current.passportIssued || '';
        current.issueDate = ext.passport.issueDate || current.issueDate || '';
        current.departmentCode = ext.passport.deptCode || current.departmentCode || '';
        current.registration = ext.registration || current.registration || '';
        current.snils = ext.snils || current.snils || '';
        current.phone = ext.phone || current.phone || '';
        current.email = ext.email || current.email || '';
      }

      // 2) Основания права
      const currentHasAnyBasis =
        Array.isArray(current.documents) &&
        current.documents.some((g) => (g?.basisDocuments?.length) || g?.regNumber || g?.regDate);

      const uiGroups = toUiDocGroups(ext); // группируем по (regNumber, regDate)

      if (!currentHasAnyBasis) {
        const yes = window.confirm(
          `У "${current.fullName}" блок "Основание права собственности" пуст. Заполнить из выписки?`
        );
        if (yes) current.documents = uiGroups;
      } else {
        const yes = window.confirm(
          `У "${current.fullName}" уже заполнены основания. Обновить по выписке (заменить текущие значения)?`
        );
        if (yes) current.documents = uiGroups;
      }

      updated[idx] = current;
    });

    setLandlords(updated);
  };

  // ------------------------------------------------------------
  // Загрузка выписки ЕГРН (PDF/ZIP)
  // ------------------------------------------------------------
  const handleEgrnUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const name = file.name.toLowerCase();
      let extractedTerms = {};
      let extractedLandlords = [];

      if (name.endsWith('.zip')) {
        const { extractEGRNFromZip } = await import('../../utils/extractEGRNFromZip');
        const result = await extractEGRNFromZip(file, { recipientName: '' });
        extractedTerms = result?.terms || {};
        extractedLandlords = result?.extractedLandlords || result?.landlords || [];
      } else if (name.endsWith('.pdf')) {
        const { extractEGRNDataFromPdf } = await import('../../utils/extractEGRNDataFromPdf');
        const result = await extractEGRNDataFromPdf(file);
        extractedTerms = result?.terms || {};
        extractedLandlords = result?.extractedLandlords || result?.landlords || [];
      } else {
        window.alert('Поддерживаются только файлы PDF или ZIP');
        return;
      }

      console.log('👤 Извлечённые правообладатели:', JSON.stringify(extractedLandlords, null, 2));

      // Проставляем базовые поля объекта
      setTerms((prev) => ({ ...prev, ...extractedTerms }));

      // Сопоставляем владельцев и предлагаем обновить данные
      reconcileOwners(extractedLandlords);

      // Выставляем флажок «Проверьте сумму долей»
      try {
        const mismatch = computeSharesMismatch(extractedLandlords);
        setSharesMismatch?.(!!mismatch);
      } catch {
        setSharesMismatch?.(false);
      }
    } catch (err) {
      console.error('Ошибка при распознавании выписки:', err);
      window.alert('Не удалось распознать выписку. Проверьте файл.');
    } finally {
      // сброс значения, чтобы можно было загрузить тот же файл повторно
      e.target.value = '';
    }
  };

  // ------------------------------------------------------------
  // Рендер
  // ------------------------------------------------------------
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">
        <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-blue-600" />
        Условия аренды
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Дата договора */}
        <div>
          <label className="block text-gray-700 mb-2">Дата договора*</label>
          <input
            type="date"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.agreementDate || ''}
            onChange={(e) => setTerms({ ...terms, agreementDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            max={new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]}
          />
          <p className="text-sm text-gray-500 mt-1">
            Дата может быть в будущем, но не более чем на 1 месяц от текущей даты
          </p>
        </div>

        {/* Место заключения договора */}
        <div>
          <label className="block text-gray-700 mb-2">Место заключения договора*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.agreementPlace || ''}
            onChange={(e) => setTerms({ ...terms, agreementPlace: e.target.value })}
            placeholder="Город заключения договора"
          />
        </div>

        {/* Адрес объекта + загрузка выписки */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Адрес объекта*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.address || ''}
            onChange={(e) => setTerms({ ...terms, address: e.target.value })}
            placeholder="Полный адрес квартиры"
          />
          <label className="cursor-pointer text-sm text-purple-600 underline inline-block mt-2">
            <input type="file" accept=".pdf,.zip" className="hidden" onChange={handleEgrnUpload} />
            Загрузить выписку ЕГРН (PDF/ZIP)
          </label>
          <small className="text-muted block">
            Будут заполнены: адрес, кадастр, этаж, площадь. А также предложено обновить паспорт и основания
            по найденным собственникам.
          </small>
        </div>

        {/* Кадастровый номер */}
        <div>
          <label className="block text-gray-700 mb-2">Кадастровый номер*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.cadastralNumber || ''}
            onChange={(e) => setTerms({ ...terms, cadastralNumber: formatCadastral(e.target.value) })}
            placeholder="XX:XX:XXXXXXX:XX"
            maxLength={21}
          />
          <p className="text-sm text-gray-500 mt-1">
            Формат: XX:XX:XXXXXXX:XX (до 21 символа)
          </p>
        </div>

        {/* Этаж */}
        <div>
          <label className="block text-gray-700 mb-2">Этаж*</label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.floor || ''}
            onChange={(e) => setTerms({ ...terms, floor: e.target.value })}
            placeholder="Номер этажа"
          />
        </div>

        {/* Количество комнат */}
        <div>
          <label className="block text-gray-700 mb-2">Количество комнат*</label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.rooms || ''}
            onChange={(e) => setTerms({ ...terms, rooms: e.target.value })}
            placeholder="Число комнат"
          />
        </div>

        {/* Метраж */}
        <div>
          <label className="block text-gray-700 mb-2">Метраж*</label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.area || ''}
            onChange={(e) => setTerms({ ...terms, area: e.target.value })}
            placeholder="Площадь в м²"
            step="0.01"
          />
        </div>

        {/* Стоимость аренды */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Стоимость аренды в месяц*</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.rentAmount || ''}
            onChange={(e) => setTerms({ ...terms, rentAmount: e.target.value })}
            placeholder="Сумма в рублях (можно использовать запятую для копеек)"
          />
          {terms.rentAmount && (
            <p className="text-sm text-gray-500 mt-1">{rentFormatted}</p>
          )}
        </div>

        {/* Новые поля для платежей */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Обеспечительный платеж */}
          <div className="border p-4 rounded-lg">
            <h3 className="font-medium mb-3">Обеспечительный платеж</h3>
            <div className="mb-3">
              <label className="block text-gray-700 mb-2">Сумма</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                value={terms.securityDeposit?.amount || ''}
                onChange={(e) => handleDepositChange('amount', e.target.value)}
                placeholder="Сумма в рублях"
              />
              {terms.securityDeposit?.amount && (
                <p className="text-sm text-gray-500 mt-1">{depositFormatted}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-gray-700 mb-2">Способ оплаты</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deposit-payment"
                    checked={(terms.securityDeposit?.paymentMethod || 'lump_sum') === 'lump_sum'}
                    onChange={() => handleDepositChange('paymentMethod', 'lump_sum')}
                    className="mr-2"
                  />
                  Единовременно при подписании
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deposit-payment"
                    checked={terms.securityDeposit?.paymentMethod === 'installments'}
                    onChange={() => handleDepositChange('paymentMethod', 'installments')}
                    className="mr-2"
                  />
                  Разбить на платежи
                </label>
              </div>
            </div>

            {terms.securityDeposit?.paymentMethod === 'installments' && (
              <div>
                <label className="block text-gray-700 mb-2">Количество платежей (макс. 4)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={terms.securityDeposit?.installmentsCount || 1}
                  onChange={(e) => {
                    let count = parseInt(e.target.value, 10);
                    if (Number.isNaN(count)) count = 1;
                    if (count > 4) count = 4;
                    if (count < 1) count = 1;
                    handleDepositChange('installmentsCount', count);
                  }}
                  min="1"
                  max="4"
                />
              </div>
            )}
          </div>

          {/* Предоплата за последний месяц */}
          <div className="border p-4 rounded-lg">
            <h3 className="font-medium mb-3">Предоплата за последний месяц</h3>

            <div className="mb-3">
              <label className="block text-gray-700 mb-2">Сумма</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                value={terms.lastMonthRentPrepayment?.amount || ''}
                onChange={(e) => handlePrepaymentChange('amount', e.target.value)}
                placeholder="Сумма в рублях"
              />
              {terms.lastMonthRentPrepayment?.amount && (
                <p className="text-sm text-gray-500 mt-1">{prepayFormatted}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-gray-700 mb-2">Способ оплаты</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="prepayment-payment"
                    checked={(terms.lastMonthRentPrepayment?.paymentMethod || 'lump_sum') === 'lump_sum'}
                    onChange={() => handlePrepaymentChange('paymentMethod', 'lump_sum')}
                    className="mr-2"
                  />
                  Единовременно при подписании
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="prepayment-payment"
                    checked={terms.lastMonthRentPrepayment?.paymentMethod === 'installments'}
                    onChange={() => handlePrepaymentChange('paymentMethod', 'installments')}
                    className="mr-2"
                  />
                  Разбить на платежи
                </label>
              </div>
            </div>

            {terms.lastMonthRentPrepayment?.paymentMethod === 'installments' && (
              <div>
                <label className="block text-gray-700 mb-2">Количество платежей (макс. 4)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={terms.lastMonthRentPrepayment?.installmentsCount || 1}
                  onChange={(e) => {
                    let count = parseInt(e.target.value, 10);
                    if (Number.isNaN(count)) count = 1;
                    if (count > 4) count = 4;
                    if (count < 1) count = 1;
                    handlePrepaymentChange('installmentsCount', count);
                  }}
                  min="1"
                  max="4"
                />
              </div>
            )}
          </div>
        </div>

        {/* Срок аренды - выбор типа ввода */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Способ указания срока аренды</label>
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="lease-term-type"
                checked={useMonthsInput}
                onChange={() => setUseMonthsInput(true)}
              />
              <span className="ml-2">Указать срок в месяцах</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="lease-term-type"
                checked={!useMonthsInput}
                onChange={() => setUseMonthsInput(false)}
              />
              <span className="ml-2">Указать даты</span>
            </label>
          </div>

          {useMonthsInput ? (
            <div>
              <label className="block text-gray-700 mb-2">Срок аренды в месяцах*</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={terms.leaseTermMonths || ''}
                onChange={(e) => setTerms({ ...terms, leaseTermMonths: e.target.value })}
                placeholder="Количество месяцев"
              />
              {terms.agreementDate && terms.leaseTermMonths && (
                <p className="text-sm text-gray-500 mt-1">
                  Договор заключен на срок с{' '}
                  {new Date(terms.agreementDate).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}{' '}
                  по{' '}
                  {new Date(
                    new Date(terms.agreementDate).setMonth(
                      new Date(terms.agreementDate).getMonth() + parseInt(terms.leaseTermMonths, 10)
                    )
                  ).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Дата начала договора*</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={terms.startDate || ''}
                  onChange={(e) => setTerms({ ...terms, startDate: e.target.value })}
                  min={terms.agreementDate || ''}
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Дата окончания договора*</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={terms.endDate || ''}
                  onChange={(e) => setTerms({ ...terms, endDate: e.target.value })}
                  min={terms.startDate || ''}
                />
              </div>
              {terms.startDate && terms.endDate && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 mt-1">
                    Договор заключен на срок с{' '}
                    {new Date(terms.startDate).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}{' '}
                    по{' '}
                    {new Date(terms.endDate).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {warningVisible && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg flex items-start">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 mt-1 text-yellow-600" />
              <span>
                Внимание, данный договор подлежит обязательной государственной регистрации в Едином Государственном Реестре Недвижимости
              </span>
            </div>
          )}
        </div>

        {/* Порядок оплаты + Загрузка PDF/QR для банка */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Порядок оплаты*</label>

          <div className="flex items-center gap-4">
            <select
              className="flex-1 p-3 border border-gray-300 rounded-lg"
              value={terms.paymentMethod || ''}
              onChange={(e) => setTerms({ ...terms, paymentMethod: e.target.value })}
            >
              <option value="">Выберите способ</option>
              <option value="cash">Наличными</option>
              <option value="bank">Банковский перевод</option>
            </select>

            {terms.paymentMethod === 'bank' && (
              <label className="cursor-pointer text-sm text-blue-600 underline">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      let details = {};
                      if (file.type === 'application/pdf') {
                        details = await extractBankDetailsFromPDF(file);
                      } else if (file.type.startsWith('image/')) {
                        const { extractBankDetailsFromQR } = await import('../../utils/extractBankDetailsFromQR');
                        details = await extractBankDetailsFromQR(file);
                      } else {
                        alert('Поддерживаются только PDF и изображения');
                        return;
                      }
                      setTerms((prev) => ({ ...prev, ...details }));
                    } catch (err) {
                      alert('Ошибка при распознавании: ' + err.message);
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
                Загрузить файл
              </label>
            )}
          </div>
        </div>

        {terms.paymentMethod === 'bank' && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-gray-50 border p-3 rounded-md text-sm">
            <div>
              <label className="block text-gray-700 mb-1">Номер счёта получателя</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={terms.bankAccount || ''}
                onChange={(e) => setTerms({ ...terms, bankAccount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">БИК</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={terms.bankBik || ''}
                onChange={(e) => {
                  const bik = e.target.value;
                  setTerms((prev) => ({ ...prev, bankBik: bik }));

                  // Автозаполнение по справочнику
                  if (bik.length === 9 && bankDirectory[bik]) {
                    const bank = bankDirectory[bik];
                    setTerms((prev) => ({
                      ...prev,
                      bankName: bank.name,
                      bankCorrAccount: bank.ks,
                    }));
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Банк-получатель</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={terms.bankName || ''}
                onChange={(e) => setTerms({ ...terms, bankName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Корр. счет (К/С)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={terms.bankCorrAccount || ''}
                onChange={(e) => setTerms({ ...terms, bankCorrAccount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">ИНН/КПП</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={terms.bankInnKpp || ''}
                onChange={(e) => setTerms({ ...terms, bankInnKpp: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Получатель</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={terms.bankRecipient || ''}
                onChange={(e) => setTerms({ ...terms, bankRecipient: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Срок оплаты аренды */}
        <div>
          <label className="block text-gray-700 mb-2">Срок оплаты аренды (число месяца)*</label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.paymentDeadline || ''}
            onChange={(e) => setTerms({ ...terms, paymentDeadline: e.target.value })}
            placeholder="Число месяца"
            min="1"
            max="31"
          />
        </div>

        {/* Количество передаваемых ключей */}
        <div>
          <label className="block text-gray-700 mb-2">Количество передаваемых ключей*</label>
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={terms.keysCount || ''}
            onChange={(e) => setTerms({ ...terms, keysCount: e.target.value })}
            placeholder="Количество ключей"
            min="1"
          />
        </div>

        {/* Коммунальные услуги */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Коммунальные услуги оплачивает*</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={terms.utilitiesPayer || ''}
              onChange={(e) => setTerms({ ...terms, utilitiesPayer: e.target.value })}
            >
              <option value="">Выберите плательщика</option>
              <option value="tenant">Арендатор</option>
              <option value="landlord">Арендодатель</option>
            </select>

            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={terms.utilitiesPaymentType || ''}
              onChange={(e) => setTerms({ ...terms, utilitiesPaymentType: e.target.value })}
            >
              <option value="">Выберите тип оплаты</option>
              <option value="full">Полностью</option>
              <option value="partial">Частично</option>
            </select>
          </div>

          {terms.utilitiesPaymentType === 'partial' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-gray-700 mb-2">Выберите коммунальные услуги:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {UTILITIES_ALL.map((service) => (
		  <label key={service} className="inline-flex items-center mr-4 mb-2">
		    <input
		      type="checkbox"
		      className="form-checkbox"
		      checked={(terms.utilitiesServices || []).includes(service)}
		      onChange={(e) => {
		        const current = new Set(terms.utilitiesServices || []);
		        if (e.target.checked) current.add(service);
		        else current.delete(service);
		        setTerms({ ...terms, utilitiesServices: Array.from(current) });
		      }}
		    />
		    <span className="ml-2">{service}</span>
		  </label>
		))}
              </div>
            </div>
          )}
        </div>

        {/* Домашние животные */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2">Возможность проживания с домашним животным*</label>
          <div className="flex space-x-4 mb-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="pets-allowed"
                value="yes"
                checked={terms.petsAllowed === 'yes'}
                onChange={() => setTerms({ ...terms, petsAllowed: 'yes' })}
              />
              <span className="ml-2">Да</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="pets-allowed"
                value="no"
                checked={terms.petsAllowed === 'no' || !terms.petsAllowed}
                onChange={() => setTerms({ ...terms, petsAllowed: 'no' })}
              />
              <span className="ml-2">Нет</span>
            </label>
          </div>

          {terms.petsAllowed === 'yes' && (
            <div>
              <label className="block text-gray-700 mb-2">Укажите животное</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={terms.petsDescription || ''}
                onChange={(e) => setTerms({ ...terms, petsDescription: e.target.value })}
                placeholder="Вид и количество животных"
              />
            </div>
          )}
        </div>

        {/* Показания приборов учета */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Показания приборов учета на момент заключения договора</h3>
            <button
              type="button"
              onClick={addMeterReading}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Добавить
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(terms.meterReadings || []).map((reading) => (
              <div key={reading.id} className="border p-4 rounded-lg relative">
                <button
                  type="button"
                  onClick={() => removeMeterReading(reading.id)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>

                <div className="mb-3">
                  <label className="block text-gray-700 mb-2">Тип прибора</label>
                  <select
		    className="w-full p-2 border border-gray-300 rounded"
		    value={reading.utilityType || ''}
		    onChange={(e) => handleMeterChange(reading.id, 'utilityType', e.target.value)}
		  >
		    {UTILITIES_METER_TYPES.map((u) => (
		      <option key={u} value={u}>{u}</option>
		    ))}
		  </select>
                </div>

                {reading.utilityType === 'Электроэнергия' ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="w-32">День (T1):</label>
                      <input
                        type="text"
                        className="flex-1 p-2 border border-gray-300 rounded"
                        value={reading.values.day || ''}
                        onChange={(e) => handleMeterChange(reading.id, 'values', e.target.value, 'day')}
                        placeholder="Показание"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="w-32">Ночь (T2):</label>
                      <input
                        type="text"
                        className="flex-1 p-2 border border-gray-300 rounded"
                        value={reading.values.night || ''}
                        onChange={(e) => handleMeterChange(reading.id, 'values', e.target.value, 'night')}
                        placeholder="Показание"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center mb-3">
                    <label className="w-32">Показание:</label>
                    <input
                      type="text"
                      className="flex-1 p-2 border border-gray-300 rounded"
                      value={reading.values.value || ''}
                      onChange={(e) => handleMeterChange(reading.id, 'values', e.target.value, 'value')}
                      placeholder="Показание"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <label className="w-32">Номер прибора:</label>
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded"
                    value={reading.meterNumber}
                    onChange={(e) => handleMeterChange(reading.id, 'meterNumber', e.target.value)}
                    placeholder="Номер счетчика"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaseTermsSection;
