function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function getLocalDateInfo(date) {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return {
    dateString: `${year}-${month}-${day}`,
    dayOfWeek: date.getDay(),
  };
}

function getRandomFraction() {
  const cryptoSource = window.crypto || window.msCrypto;

  if (cryptoSource && typeof cryptoSource.getRandomValues === "function") {
    const randomValues = new Uint32Array(1);
    cryptoSource.getRandomValues(randomValues);
    return randomValues[0] / 4294967296;
  }

  return Math.random();
}

function getRandomInt(min, max) {
  return Math.floor(getRandomFraction() * (max - min + 1)) + min;
}

function shuffleItems(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomInt(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function getActiveSpecialEvents(dateInfo) {
  return LUCK_CONFIG.specialEvents.filter((specialEvent) => specialEvent.when(dateInfo));
}

function createEventPool(activeSpecialEvents) {
  return activeSpecialEvents.reduce(
    (events, specialEvent) => [
      ...events,
      ...Array(specialEvent.bonusCount).fill(specialEvent.event),
    ],
    [...LUCK_CONFIG.events]
  );
}

function getUniqueRemainingEvents(events, goodList) {
  const goodEvents = new Set(goodList);
  const seenEvents = new Set();
  const remaining = [];

  events.forEach((event) => {
    if (goodEvents.has(event) || seenEvents.has(event)) {
      return;
    }

    seenEvents.add(event);
    remaining.push(event);
  });

  return remaining;
}

function getUniqueLeadingEvents(events, count) {
  const seenEvents = new Set();
  const result = [];

  for (const event of events) {
    if (seenEvents.has(event)) {
      continue;
    }

    seenEvents.add(event);
    result.push(event);

    if (result.length === count) {
      break;
    }
  }

  return result;
}

function generateDailyLuck(date = new Date()) {
  const dateInfo = getLocalDateInfo(date);
  const activeSpecialEvents = getActiveSpecialEvents(dateInfo);
  const eventPool = createEventPool(activeSpecialEvents);
  const shuffledEvents = shuffleItems(eventPool);
  const level = LUCK_CONFIG.levels[getRandomInt(0, LUCK_CONFIG.levels.length - 1)];
  const goodCount = getRandomInt(
    LUCK_CONFIG.counts.good.min,
    Math.min(LUCK_CONFIG.counts.good.max, eventPool.length - 1)
  );
  const goodList = getUniqueLeadingEvents(shuffledEvents, goodCount);
  const remainingEvents = getUniqueRemainingEvents(shuffledEvents, goodList);
  const badCount = getRandomInt(
    LUCK_CONFIG.counts.bad.min,
    Math.min(LUCK_CONFIG.counts.bad.max, remainingEvents.length)
  );
  const badList = shuffleItems(remainingEvents).slice(0, badCount);
  const luckyNumber = getRandomInt(
    LUCK_CONFIG.luckyNumber.min,
    LUCK_CONFIG.luckyNumber.max
  );

  return {
    dateString: dateInfo.dateString,
    level,
    goodList,
    badList,
    luckyNumber,
  };
}

function renderList(element, items) {
  element.replaceChildren();

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    element.appendChild(listItem);
  });
}

function renderDailyLuck() {
  const luck = generateDailyLuck(new Date());
  const dateElement = document.getElementById("luck-date");

  dateElement.dateTime = luck.dateString;
  dateElement.textContent = luck.dateString;
  document.getElementById("luck-level").textContent = luck.level;
  document.getElementById("luck-number").textContent = String(luck.luckyNumber);
  renderList(document.getElementById("luck-good"), luck.goodList);
  renderList(document.getElementById("luck-bad"), luck.badList);
}

function bindRegenerateButton() {
  const regenerateButton = document.getElementById("luck-regenerate");

  regenerateButton.addEventListener("click", () => {
    renderDailyLuck();
  });
}

bindRegenerateButton();
renderDailyLuck();