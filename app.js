// Hằng số giảm trừ 2026
const GT_BAN_THAN = 15_500_000;
const GT_PHU_THUOC = 6_200_000;

// Trần lương đóng BHXH & BHYT (20 × lương cơ sở 2.340.000)
const BHXH_BHYT_CAP = 46_800_000;

// Lương tối thiểu vùng & trần BHTN (20 × lương tối thiểu vùng) từ 01/01/2026
const REGION_DATA = {
  "1": {
    code: "I",
    name: "Vùng I",
    minWage: 5_310_000,
    bhtnCap: 5_310_000 * 20,
  },
  "2": {
    code: "II",
    name: "Vùng II",
    minWage: 4_730_000,
    bhtnCap: 4_730_000 * 20,
  },
  "3": {
    code: "III",
    name: "Vùng III",
    minWage: 4_140_000,
    bhtnCap: 4_140_000 * 20,
  },
  "4": {
    code: "IV",
    name: "Vùng IV",
    minWage: 3_700_000,
    bhtnCap: 3_700_000 * 20,
  },
};

function formatNumber(n) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

// Tính thuế TNCN theo biểu lũy tiến 5 bậc (dự kiến 2026) + chi tiết từng bậc
function tinhThueTNCN(tntt) {
  const taxable = Math.max(0, tntt);

  const brackets = [
    { index: 1, start: 0, limit: 10_000_000, rate: 0.05 },
    { index: 2, start: 10_000_000, limit: 30_000_000, rate: 0.15 },
    { index: 3, start: 30_000_000, limit: 60_000_000, rate: 0.25 },
    { index: 4, start: 60_000_000, limit: 100_000_000, rate: 0.3 },
    { index: 5, start: 100_000_000, limit: Infinity, rate: 0.35 },
  ];

  if (taxable <= 0) {
    return {
      tax: 0,
      breakdown: [],
      mainFormula: "Thu nhập tính thuế ≤ 0 ⇒ Thuế TNCN = 0",
    };
  }

  let totalTax = 0;
  const breakdown = [];

  for (const b of brackets) {
    if (taxable > b.start) {
      const upper = Math.min(taxable, b.limit);
      const incomeInBracket = upper - b.start;
      const taxInBracket = incomeInBracket * b.rate;
      totalTax += taxInBracket;

      breakdown.push({
        index: b.index,
        start: b.start,
        limit: b.limit,
        income: incomeInBracket,
        rate: b.rate,
        tax: taxInBracket,
      });

      if (taxable <= b.limit) {
        break;
      }
    }
  }

  const roundedTax = Math.round(totalTax);

  const mainFormula =
    "Thuế TNCN = tổng thuế của các bậc (xem bảng chi tiết) = " +
    formatNumber(roundedTax);

  return {
    tax: roundedTax,
    breakdown,
    mainFormula,
  };
}

// Cập nhật note dưới ô lương gross theo input
function updateGrossNote() {
  const grossInput = document.getElementById("gross");
  const noteEl = document.getElementById("grossNote");
  const raw = Number(grossInput.value || 0);

  if (!raw || raw <= 0) {
    noteEl.textContent = "Ví dụ: 40.000.000";
  } else {
    noteEl.textContent = "Bạn đang nhập: " + formatNumber(raw);
  }
}

// Cập nhật note theo vùng
function updateRegionNote() {
  const regionSelect = document.getElementById("region");
  const noteEl = document.getElementById("regionNote");
  const regionKey = regionSelect.value || "1";
  const region = REGION_DATA[regionKey] || REGION_DATA["1"];

  const minWageText = formatNumber(region.minWage);
  const bhtnCapText = formatNumber(region.bhtnCap);

  noteEl.textContent =
    `Lương tối thiểu đóng BHXH/BHTN (${region.name}): ` +
    `${minWageText} / tháng; trần BHTN: ${bhtnCapText} / tháng.`;
}

// Áp dụng / lưu theme
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

function initThemeToggle() {
  const toggle = document.getElementById("darkModeToggle");
  const stored = localStorage.getItem("tncn_theme");
  let currentTheme = stored;

  if (!currentTheme) {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    currentTheme = prefersDark ? "dark" : "light";
  }

  applyTheme(currentTheme);
  toggle.checked = currentTheme === "dark";

  toggle.addEventListener("change", () => {
    const newTheme = toggle.checked ? "dark" : "light";
    applyTheme(newTheme);
    localStorage.setItem("tncn_theme", newTheme);
  });
}

function calc() {
  const grossInput = document.getElementById("gross");
  const depInput = document.getElementById("dependents");
  const showBracketsInput = document.getElementById("showBrackets");
  const regionSelect = document.getElementById("region");
  const resultDiv = document.getElementById("result");

  let gross = Number(grossInput.value || 0);
  let dependents = Number(depInput.value || 0);
  if (dependents < 0) dependents = 0;

  const showBrackets = !!showBracketsInput.checked;

  const regionKey = regionSelect.value || "1";
  const region = REGION_DATA[regionKey] || REGION_DATA["1"];

  const floor = region.minWage;
  const bhtnCap = region.bhtnCap;

  // Base BHXH/BHYT: clamp(GROSS, floor, BHXH_BHYT_CAP)
  const baseBH_raw = gross;
  const baseBH = Math.min(Math.max(baseBH_raw, floor), BHXH_BHYT_CAP);

  const bhxh = Math.round(baseBH * 0.08);
  const bhyt = Math.round(baseBH * 0.015);

  // Base BHTN: clamp(GROSS, floor, bhtnCap)
  const baseBHTN_raw = gross;
  const baseBHTN = Math.min(Math.max(baseBHTN_raw, floor), bhtnCap);
  const bhtn = Math.round(baseBHTN * 0.01);

  const tongBH = bhxh + bhyt + bhtn;

  const gtBanThan = GT_BAN_THAN;
  const gtPhuThuoc = dependents * GT_PHU_THUOC;
  const thuNhapTinhThue = gross - tongBH - gtBanThan - gtPhuThuoc;

  const { tax: thueTNCN, breakdown, mainFormula } = tinhThueTNCN(
    thuNhapTinhThue
  );

  const net = gross - tongBH - thueTNCN;

  const rows = [];

  rows.push({
    label: "Lương GROSS",
    formula: `= ${formatNumber(gross)}`,
    value: gross,
    note: "C1",
    highlight: false,
    isNet: false,
  });

  rows.push({
    label: `BHXH (8%) – áp sàn & trần (BHXH/BHYT)`,
    formula:
      `Base BHXH/BHYT = clamp(GROSS, sàn vùng, trần BHXH/BHYT) ` +
      `= clamp(${formatNumber(baseBH_raw)}, ${formatNumber(
        floor
      )}, ${formatNumber(BHXH_BHYT_CAP)}) = ${formatNumber(baseBH)}; ` +
      `BHXH = ${formatNumber(baseBH)} × 0,08 = ${formatNumber(bhxh)}`,
    value: bhxh,
    note: "C2",
    highlight: false,
    isNet: false,
  });

  rows.push({
    label: `BHYT (1,5%) – cùng base với BHXH`,
    formula:
      `Base BHYT = Base BHXH/BHYT = ${formatNumber(
        baseBH
      )}; BHYT = ${formatNumber(baseBH)} × 0,015 = ${formatNumber(bhyt)}`,
    value: bhyt,
    note: "C3",
    highlight: false,
    isNet: false,
  });

  rows.push({
    label: `BHTN (1%) – áp sàn & trần theo vùng (${region.name})`,
    formula:
      `Base BHTN = clamp(GROSS, sàn vùng, trần BHTN vùng) ` +
      `= clamp(${formatNumber(baseBHTN_raw)}, ${formatNumber(
        floor
      )}, ${formatNumber(bhtnCap)}) = ${formatNumber(baseBHTN)}; ` +
      `BHTN = ${formatNumber(baseBHTN)} × 0,01 = ${formatNumber(bhtn)}`,
    value: bhtn,
    note: "C4",
    highlight: false,
    isNet: false,
  });

  rows.push({
    label: "Tổng BH NLĐ đóng",
    formula:
      `= C2 + C3 + C4 = ` +
      `${formatNumber(bhxh)} + ${formatNumber(bhyt)} + ${formatNumber(
        bhtn
      )} = ${formatNumber(tongBH)}`,
    value: tongBH,
    note: "C5",
    highlight: true,
    isNet: false,
  });

  rows.push({
    label: "Giảm trừ bản thân",
    formula: `= ${formatNumber(gtBanThan)}`,
    value: gtBanThan,
    note: "C6",
    highlight: false,
    isNet: false,
  });

  rows.push({
    label: `Giảm trừ người phụ thuộc (${dependents} người)`,
    formula:
      `= ${dependents} × ${formatNumber(
        GT_PHU_THUOC
      )} = ${formatNumber(gtPhuThuoc)}`,
    value: gtPhuThuoc,
    note: "C7",
    highlight: false,
    isNet: false,
  });

  rows.push({
    label: "Thu nhập tính thuế (C8)",
    formula:
      `= C1 - C5 - C6 - C7 = ` +
      `${formatNumber(gross)} - ${formatNumber(
        tongBH
      )} - ${formatNumber(gtBanThan)} - ${formatNumber(
        gtPhuThuoc
      )} = ${formatNumber(thuNhapTinhThue)}`,
    value: thuNhapTinhThue,
    note: "C8",
    highlight: true,
    isNet: false,
  });

  rows.push({
    label: "Thuế TNCN phải nộp",
    formula: mainFormula,
    value: thueTNCN,
    note: "C9",
    highlight: true,
    isNet: false,
  });

  rows.push({
    label: "Lương NET (thực nhận)",
    formula:
      `= C1 - C5 - C9 = ${formatNumber(gross)} - ${formatNumber(
        tongBH
      )} - ${formatNumber(thueTNCN)} = ${formatNumber(net)}`,
    value: net,
    note: "C10",
    highlight: true,
    isNet: true,
  });

  let html = `
    <div class="net-summary">
      Lương NET ước tính: <span style="color:#16a34a">${formatNumber(
        net
      )} VND</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Khoản</th>
          <th>Công thức (hiển thị rõ)</th>
          <th>Số tiền (VND)</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const r of rows) {
    const rowClass =
      (r.highlight ? "highlight " : "") + (r.isNet ? "net-row" : "");
    html += `
      <tr class="${rowClass}">
        <td>${r.label}</td>
        <td>${r.formula}</td>
        <td>${formatNumber(r.value)}</td>
        <td>${r.note}</td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  if (showBrackets && breakdown.length > 0) {
    const totalBracketTax = breakdown.reduce((s, b) => s + b.tax, 0);

    html += `
      <div class="bracket-title">Chi tiết thuế theo từng bậc</div>
      <table class="bracket-table">
        <thead>
          <tr>
            <th>Bậc</th>
            <th>Khoảng thu nhập</th>
            <th>Thu nhập tính thuế trong bậc</th>
            <th>Thuế suất</th>
            <th>Thuế phải nộp</th>
          </tr>
        </thead>
        <tbody>
    `;

    breakdown.forEach((b) => {
      const isInfinity = !Number.isFinite(b.limit);
      const rangeText = isInfinity
        ? `> ${formatNumber(b.start)}`
        : `${formatNumber(b.start)} – ${formatNumber(b.limit)}`;

      html += `
        <tr>
          <td>Bậc ${b.index}</td>
          <td>${rangeText}</td>
          <td>${formatNumber(b.income)}</td>
          <td>${(b.rate * 100).toFixed(0)}%</td>
          <td>${formatNumber(b.tax)}</td>
        </tr>
      `;
    });

    html += `
        <tr style="background:#eef6ff; font-weight:600;">
          <td colspan="4" style="text-align:right;">Tổng cộng</td>
          <td>${formatNumber(totalBracketTax)}</td>
        </tr>
        </tbody>
      </table>
    `;
  }

  html += `
    <div class="note">
      * BHXH & BHYT: base = clamp(GROSS, lương tối thiểu vùng, trần BHXH/BHYT = ${formatNumber(
        BHXH_BHYT_CAP
      )}).<br/>
      * BHTN: base = clamp(GROSS, lương tối thiểu vùng, trần BHTN vùng). Vùng hiện tại: ${
        region.name
      } (sàn = ${formatNumber(floor)}, trần BHTN = ${formatNumber(bhtnCap)}).
    </div>
  `;

  resultDiv.innerHTML = html;

  return { rows, breakdown };
}

// Event listeners
document.getElementById("calcBtn").addEventListener("click", calc);
document.getElementById("exampleBtn").addEventListener("click", () => {
  document.getElementById("gross").value = 40_000_000;
  document.getElementById("dependents").value = 1;
  document.getElementById("region").value = "1";
  updateGrossNote();
  updateRegionNote();
  calc();
});
document.getElementById("gross").addEventListener("input", () => {
  updateGrossNote();
});
document.getElementById("region").addEventListener("change", () => {
  updateRegionNote();
  calc();
});

// Khởi tạo theme + note + tính toán lần đầu
initThemeToggle();
updateGrossNote();
updateRegionNote();
calc();



document.addEventListener("DOMContentLoaded", () => {
  const grossInput = document.getElementById("gross");
  if (grossInput) grossInput.focus();
});

