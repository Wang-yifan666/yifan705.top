// ============================================================
// 首页本地点击计数 — 使用 localStorage 持久保存
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'yifanCounterValue';
  const button = document.getElementById('counter-button');

  if (!button) return;

  let count = readStoredCount();
  updateCountText();

  button.addEventListener('click', function () {
    count += 1;
    updateCountText();
    writeStoredCount(count);
  });

  function readStoredCount() {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      if (storedValue === null) return 0;

      const parsedValue = Number(storedValue);
      if (Number.isSafeInteger(parsedValue) && parsedValue >= 0) {
        return parsedValue;
      }
    } catch (error) {
      return 0;
    }

    return 0;
  }

  function writeStoredCount(nextCount) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextCount));
    } catch (error) {
      return;
    }
  }

  function updateCountText() {
    button.textContent = String(count);
  }
})();