import { hoursStatus } from '../dsl/hours'

/**
 * Встроенный скрипт экспортированного сайта: пересчитывает бейдж «Открыто до …» и выделение сегодняшнего дня
 * при открытии страницы (сайт статический, HTML собран заранее). Логика — та же функция hoursStatus,
 * что и в превью: её исходный код вставляется в скрипт целиком. Без JavaScript остаётся таблица часов.
 */
export function hoursScript(): string {
  return `(function () {
  var hoursStatus = ${hoursStatus.toString()};
  var now = new Date();
  var weekday = (now.getDay() + 6) % 7;
  var minutes = now.getHours() * 60 + now.getMinutes();
  document.querySelectorAll('[data-md-hours]').forEach(function (badge) {
    var status = hoursStatus(JSON.parse(badge.getAttribute('data-md-hours')), weekday, minutes);
    var color = badge.getAttribute(status.open ? 'data-open-color' : 'data-closed-color');
    badge.querySelector('[data-md-hours-text]').textContent = status.text;
    badge.style.color = color;
    badge.style.background = color + '18';
    badge.style.borderColor = color + '44';
  });
  document.querySelectorAll('[data-md-days]').forEach(function (cell) {
    var today = cell.getAttribute('data-md-days').split(',').indexOf(String(weekday)) !== -1;
    cell.style.fontWeight = today ? '600' : '400';
    cell.style.color = cell.getAttribute(today ? 'data-today-color' : 'data-color');
  });
})();`
}
