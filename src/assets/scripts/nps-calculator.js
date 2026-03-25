export function init() {
  const calcBtn = document.getElementById('btn-calc-matrix');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', function () {
    const getVal = (id) => Math.max(0, parseInt(document.getElementById(id).value, 10) || 0);
    const errorEl = document.getElementById('nps-calc-error');

    const aP = getVal('a-prom'), aN = getVal('a-neu'), aD = getVal('a-det');
    const bP = getVal('b-prom'), bN = getVal('b-neu'), bD = getVal('b-det');
    const cP = getVal('c-prom'), cN = getVal('c-neu'), cD = getVal('c-det');

    const aTotal = aP + aN + aD;
    const totalP = aP + bP + cP;
    const totalD = aD + bD + cD;
    const grandTotal = totalP + (aN + bN + cN) + totalD;

    if (grandTotal === 0) {
      errorEl.removeAttribute('hidden');
      errorEl.focus();
      return;
    }
    errorEl.setAttribute('hidden', '');

    const totalNPS = Math.round(((totalP / grandTotal) - (totalD / grandTotal)) * 100);
    const aNPS = aTotal > 0 ? Math.round(((aP / aTotal) - (aD / aTotal)) * 100) : null;

    document.getElementById('res-total-nps').textContent = totalNPS;
    const aNpsEl = document.getElementById('res-a-nps');
    aNpsEl.textContent = aNPS !== null ? aNPS : 'Нет данных';

    // Цвет значения NPS группы А
    if (aNPS !== null) {
      aNpsEl.dataset.signal = aNPS >= 30 ? 'good' : aNPS >= 0 ? 'warn' : 'bad';
    } else {
      aNpsEl.removeAttribute('data-signal');
    }

    // Диагноз — сначала абсолютный порог aNPS, потом относительный (vs totalNPS)
    let diagText = '';
    if (aTotal === 0) {
      diagText = 'Недостаточно данных по группе А. Без них нельзя оценить лояльность самых важных клиентов.';
    } else if (aNPS < 0) {
      diagText = 'Сильный сигнал риска. Среди клиентов группы А критиков больше, чем сторонников. Даже при положительном общем NPS это означает проблему в самой важной части клиентской базы. Разберите причины недовольства и отдельно свяжитесь с критиками из группы А.';
    } else if (aNPS >= 30) {
      diagText = 'У группы А высокий NPS. Определите, за что именно эти клиенты вас ценят, и используйте это в коммуникации, сервисе и программах рекомендаций.';
    } else if (aNPS < totalNPS) {
      diagText = 'Сигнал тревоги. Лояльность клиентов группы А ниже, чем в среднем по базе. Это значит, что самые важные для выручки клиенты оценивают опыт хуже остальных. Проверьте, что именно вызывает недовольство: выбор, покупка, доставка, использование или сервис.';
    } else {
      diagText = 'Бизнес стабилен, но уязвим. Клиенты Группы А скорее нейтральны: при выгодном предложении конкурента могут уйти. Здесь важно понять, что мешает им перейти из нейтральных в сторонники.';
    }

    document.getElementById('res-diagnosis').textContent = diagText;
    const resultBox = document.getElementById('matrix-result-box');
    resultBox.removeAttribute('hidden');
    resultBox.focus();
  });
}
