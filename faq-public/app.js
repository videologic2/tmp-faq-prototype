const state = {
  faqs: [],
  openFaqId: null
};

const categoryMeta = {
  "Vitamines": { icon: "D", color: "#f0a51f" },
  "Supplementen": { icon: "+", color: "#24745a" },
  "Gebruik": { icon: "OK", color: "#2f6fbb" },
  "Bijwerkingen": { icon: "!", color: "#c85d4a" },
  "Levering": { icon: ">", color: "#7b5ac8" },
  "Allergieën": { icon: "*", color: "#d17a22" },
  "Zwangerschap": { icon: "Z", color: "#c44f7d" }
};

const elements = {
  faqList: document.querySelector("#faqList"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  categoryOptions: document.querySelector("#categoryOptions"),
  form: document.querySelector("#faqForm"),
  faqId: document.querySelector("#faqId"),
  questionInput: document.querySelector("#questionInput"),
  answerInput: document.querySelector("#answerInput"),
  categoryInput: document.querySelector("#categoryInput"),
  keywordsInput: document.querySelector("#keywordsInput"),
  formTitle: document.querySelector("#formTitle"),
  formMessage: document.querySelector("#formMessage"),
  newFaqButton: document.querySelector("#newFaqButton"),
  cancelEditButton: document.querySelector("#cancelEditButton")
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Onbekende fout.");
  return payload;
}

async function loadFaqs() {
  state.faqs = await apiRequest("/api/faqs");
  renderCategories();
  renderFaqs();
}

function getCategories() {
  return [...new Set(state.faqs.map((faq) => faq.category))].sort((a, b) => a.localeCompare(b));
}

function renderCategories() {
  const categories = getCategories();
  const activeCategory = elements.categoryFilter.value;
  elements.categoryFilter.innerHTML = `<option value="">Alle categorieen</option>`;
  elements.categoryOptions.innerHTML = "";

  categories.forEach((category) => {
    elements.categoryFilter.append(new Option(category, category));
    const option = document.createElement("option");
    option.value = category;
    elements.categoryOptions.append(option);
  });

  elements.categoryFilter.value = categories.includes(activeCategory) ? activeCategory : "";
}

function getFilteredFaqs() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;

  return state.faqs.filter((faq) => {
    const text = [faq.question, faq.answer, faq.category, ...(faq.keywords || [])].join(" ").toLowerCase();
    return (!query || text.includes(query)) && (!category || faq.category === category);
  });
}

function renderFaqs() {
  const faqs = getFilteredFaqs();

  if (!faqs.length) {
    elements.faqList.innerHTML = `<div class="empty-state">Geen FAQ's gevonden.</div>`;
    return;
  }

  elements.faqList.innerHTML = faqs.map((faq) => {
    const meta = categoryMeta[faq.category] || { icon: "#", color: "#627064" };
    const keywords = (faq.keywords || []).map((keyword) => `<span class="keyword">${escapeHtml(keyword)}</span>`).join("");
    const isOpen = state.openFaqId === faq.id;

    return `
      <article class="faq-card ${isOpen ? "open" : ""}">
        <button class="faq-summary" type="button" data-action="toggle" data-id="${faq.id}">
          <span>
            <h3>${escapeHtml(faq.question)}</h3>
            <span class="meta-row">
              <span class="badge" style="--category-color: ${meta.color}">
                <span class="category-icon" aria-hidden="true">${escapeHtml(meta.icon)}</span>
                ${escapeHtml(faq.category)}
              </span>
              ${keywords}
            </span>
          </span>
          <span class="chevron">${isOpen ? "-" : "+"}</span>
        </button>
        <div class="faq-body">
          <p>${escapeHtml(faq.answer)}</p>
          <div class="actions">
            <button class="secondary-button" type="button" data-action="edit" data-id="${faq.id}">Bewerken</button>
            <button class="danger-button" type="button" data-action="delete" data-id="${faq.id}">Verwijderen</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function resetForm() {
  elements.form.reset();
  elements.faqId.value = "";
  elements.formTitle.textContent = "Nieuwe FAQ";
  elements.formMessage.textContent = "";
  elements.cancelEditButton.classList.add("hidden");
}

function fillForm(faq) {
  elements.faqId.value = faq.id;
  elements.questionInput.value = faq.question;
  elements.answerInput.value = faq.answer;
  elements.categoryInput.value = faq.category;
  elements.keywordsInput.value = (faq.keywords || []).join(", ");
  elements.formTitle.textContent = "FAQ bewerken";
  elements.cancelEditButton.classList.remove("hidden");
  elements.questionInput.focus();
}

function getFormPayload() {
  return {
    question: elements.questionInput.value,
    answer: elements.answerInput.value,
    category: elements.categoryInput.value,
    keywords: elements.keywordsInput.value.split(",").map((keyword) => keyword.trim()).filter(Boolean)
  };
}

async function saveFaq(event) {
  event.preventDefault();
  const id = elements.faqId.value;
  const savedFaq = await apiRequest(id ? `/api/faqs/${id}` : "/api/faqs", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(getFormPayload())
  });

  state.openFaqId = savedFaq.id;
  resetForm();
  await loadFaqs();
  elements.formMessage.textContent = "Opgeslagen.";
}

async function deleteFaq(id) {
  const faq = state.faqs.find((item) => item.id === id);
  if (!faq || !confirm(`FAQ verwijderen?\n\n${faq.question}`)) return;
  await apiRequest(`/api/faqs/${id}`, { method: "DELETE" });
  if (state.openFaqId === id) state.openFaqId = null;
  resetForm();
  await loadFaqs();
}

function handleFaqClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const faq = state.faqs.find((item) => item.id === id);

  if (action === "toggle") {
    state.openFaqId = state.openFaqId === id ? null : id;
    renderFaqs();
  }

  if (action === "edit" && faq) {
    state.openFaqId = id;
    fillForm(faq);
    renderFaqs();
  }

  if (action === "delete") deleteFaq(id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

elements.searchInput.addEventListener("input", renderFaqs);
elements.categoryFilter.addEventListener("change", renderFaqs);
elements.faqList.addEventListener("click", handleFaqClick);
elements.form.addEventListener("submit", (event) => {
  saveFaq(event).catch((error) => {
    elements.formMessage.textContent = error.message;
  });
});
elements.newFaqButton.addEventListener("click", () => {
  resetForm();
  elements.questionInput.focus();
});
elements.cancelEditButton.addEventListener("click", resetForm);

loadFaqs().catch((error) => {
  elements.faqList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
});
