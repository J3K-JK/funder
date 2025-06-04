// funder.js の先頭あたりに追加

function checkInitialTicketCount() {
  console.log("✅ チケットチェック関数定義済み");
}

// グローバルスコープで使うなら、明示的に window にバインド
window.checkInitialTicketCount = checkInitialTicketCount;

// funder.mjs
export function startFunderAutomation() {
  const isMobile = /iPhone|Android.+Mobile|Windows Phone/.test(navigator.userAgent);
  console.log("📱 モード:", isMobile ? "スマホ" : "PC");

  let selectedPerformance = "第1回公演";
  let ticketCount = 1;
  let childOption = "３才以下の子どもはいない";
  let triggerTime = "11:00";
  let automationStarted = false;

  const childOptions = [
    ["いない", "３才以下の子どもはいない"],
    ["1人", "チケットをお持ちの方１人につき、３才以下の子どもが１人"],
    ["2人", "チケットをお持ちの方１人につき、３才以下の子どもが２人"]
  ];

  function createControlPanel() {
    const panel = document.createElement("div");
    panel.style = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: #fff;
      border: 1px solid #ccc;
      padding: 10px;
      z-index: 9999;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 14px;
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const perfSelect = document.createElement("select");
    ["第1回公演", "第2回公演", "第3回公演", "第4回公演", "第5回公演"].forEach(text => {
      const opt = document.createElement("option");
      opt.value = text;
      opt.textContent = text;
      perfSelect.appendChild(opt);
    });
    perfSelect.onchange = () => selectedPerformance = perfSelect.value;
    perfSelect.value = selectedPerformance;

    const ticketInput = document.createElement("input");
    ticketInput.type = "number";
    ticketInput.min = 1;
    ticketInput.max = 5;
    ticketInput.value = ticketCount;
    ticketInput.onchange = () => ticketCount = parseInt(ticketInput.value);

    const childSelect = document.createElement("select");
    childOptions.forEach(([label, value]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      childSelect.appendChild(opt);
    });
    childSelect.onchange = () => childOption = childSelect.value;
    childSelect.value = childOption;

    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value = triggerTime;
    timeInput.onchange = () => triggerTime = timeInput.value;

    const startButton = document.createElement("button");
    startButton.textContent = "開始";
    startButton.style = `
      padding: 6px;
      background-color: #007bff;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    startButton.onclick = () => {
      if (!automationStarted) {
        automationStarted = true;
        startButton.textContent = "待機中...";
        startButton.disabled = true;
        monitorTimeAndTrigger();
      }
    };

    panel.appendChild(makeLabeled("公演", perfSelect));
    panel.appendChild(makeLabeled("枚数", ticketInput));
    panel.appendChild(makeLabeled("子供", childSelect));
    panel.appendChild(makeLabeled("時刻", timeInput));
    panel.appendChild(startButton);
    document.body.appendChild(panel);
  }

  function makeLabeled(label, input) {
    const wrapper = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.textContent = label;
    lbl.style.display = "block";
    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return wrapper;
  }

  function simulateFullUserClick(el) {
    ["pointerdown", "mousedown", "mouseup", "click"].forEach(type => {
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0
      }));
    });
  }

  function clickPerformanceCard() {
    const titles = document.querySelectorAll(".ticket-layout:not([style]) p.ticket-card-title__text");
    for (const title of titles) {
      if (title.textContent.includes(selectedPerformance)) {
        console.log("✅ 公演クリック: ", title.textContent.trim());
        simulateFullUserClick(title);
        return true;
      }
    }
    console.error("❌ 公演カードが見つかりません");
    return false;
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        }
      }, 300);
      setTimeout(() => {
        clearInterval(interval);
        reject("⏰ 要素取得タイムアウト: " + selector);
      }, timeout);
    });
  }

  async function waitForOverlay() {
    try {
      const overlay = await waitForElement(isMobile ? ".v-overlay.loader" : ".v-overlay.v-overlay--active");
      console.log("✅ オーバーレイ検出");
      return overlay;
    } catch (err) {
      console.error("❌ オーバーレイが見つかりません");
      throw err;
    }
  }

  async function setTicketQuantity() {
    const valueSpan = await waitForElement('.card-amount__number__value');
    let current = parseInt(valueSpan.textContent);

    for (let i = 0; i < 10; i++) {
      const addBtn = document.querySelector('.icon__add')?.closest('button');
      const removeBtn = document.querySelector('.icon__remove')?.closest('button');

      if (current < ticketCount && addBtn) {
        simulateFullUserClick(addBtn);
        current++;
      } else if (current > ticketCount && removeBtn) {
        simulateFullUserClick(removeBtn);
        current--;
      } else {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`🎫 枚数セット完了 (${ticketCount})`);
  }

  async function setChildSelection() {
    const select = await waitForElement(".custom-select");
    const selectedDiv = select.querySelector(".select-selected");
    simulateFullUserClick(selectedDiv);
    await new Promise(r => setTimeout(r, 300));

    const options = select.querySelectorAll(".select-items div");
    for (const opt of options) {
      if (opt.textContent.trim() === childOption) {
        simulateFullUserClick(opt);
        console.log("👶 子供オプション選択: " + childOption);
        return;
      }
    }
    console.error("❌ 子供選択肢が見つかりません");
  }

  async function waitAndClickConfirm() {
    for (let i = 0; i < 20; i++) {
      const btn = document.querySelector('button[data-custom-submit="true"]');
      if (btn && !btn.disabled && btn.style.opacity === "1") {
        simulateFullUserClick(btn);
        console.log("🪑 座席確認ボタンをクリックしました");
        return;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.error("❌ 座席確認ボタンが有効にならずタイムアウトしました");
  }

  async function fullAutomationFlow() {
    if (!clickPerformanceCard()) return;
    await waitForOverlay();
    await new Promise(r => setTimeout(r, 300));
    await setTicketQuantity();
    await setChildSelection();
    await waitAndClickConfirm();
  }

  function monitorTimeAndTrigger() {
    const [hh, mm] = triggerTime.split(":").map(Number);
    const triggerDate = new Date();
    triggerDate.setHours(hh, mm, 0, 0);
    const now = new Date();
    const delay = triggerDate - now;

    if (delay <= 0) {
      console.warn("⚠️ 指定時刻が過ぎています。即時実行します。");
      fullAutomationFlow();
      return;
    }

    console.log(`🕓 ${delay}ms 後に自動処理を実行します (${triggerTime})`);
    setTimeout(() => {
      console.log("⏰ 時刻到達！ 自動処理開始");
      fullAutomationFlow();
    }, delay);
  }

  window.addEventListener("load", createControlPanel);
}
