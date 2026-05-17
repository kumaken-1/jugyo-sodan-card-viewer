(function () {
  "use strict";

  const DATA_URL = "assets/data/app_cards_full_values.tsv";
  const IMAGE_BASE = "assets/images/";
  const FAVORITE_KEY = "lessonCardViewer.favoriteCardIds";
  const MEMO_KEY = "lessonCardViewer.memo";
  const MAX_FAVORITES = 5;
  const SUGGESTED_TAGS = [
    "話し合い",
    "討論",
    "教材研究",
    "個別最適な学び",
    "つまずき",
    "発問",
    "課題設定",
    "見取り",
    "振り返り",
    "ICT活用",
    "情報活用",
    "書く活動",
    "話す活動",
    "対話",
    "安心感",
    "特別支援",
    "生活科",
    "総合的な学習",
    "単元構成",
    "比較",
    "根拠",
    "支援の手立て",
    "探究",
    "授業改善"
  ];
  const SEARCH_FIELDS = [
    "cardNumber",
    "cardName",
    "categoryName",
    "question",
    "issue",
    "point",
    "hints",
    "why",
    "what",
    "how"
  ];

  const TOP_LAYOUT = ["80", "10", "20", "70", "00", "30", "60", "50", "40"];
  const TOP_CAPTIONS = {
    "10": "子どもの出発点をつかみたい",
    "20": "教材・単元の芯をつかみたい",
    "30": "教科で課題解決的な学習を組み立てたい",
    "40": "書く・話す活動を学びにつなげたい",
    "50": "情報活用能力を、子どもの学びとして育てたい",
    "60": "見取り・振り返りを、次の授業の支援につなげたい",
    "70": "総合的な学習・生活科で、子どもの問いや願いを育てたい",
    "80": "特別支援学級で、その子の「できた」を設計したい"
  };
  const PROBLEM_GROUPS = [
    {
      id: "entry",
      label: "導入・課題",
      phrases: [
        "導入で子どもが乗ってこない",
        "めあてがうまく立てられない",
        "課題が子どものものにならない",
        "発問しても反応が薄い"
      ]
    },
    {
      id: "discussion",
      label: "発言・話し合い",
      phrases: [
        "子どもの考えを拾えない",
        "どの発言を取り上げればよいかわからない",
        "ペアやグループがうまく動かない",
        "話し合いが一部の子だけになる",
        "全体共有が発表会になってしまう"
      ]
    },
    {
      id: "writing",
      label: "書く・まとめる",
      phrases: [
        "板書がまとまらない",
        "ノートに何を書かせればよいかわからない",
        "活動が作業で終わってしまう",
        "まとめが教師の説明になってしまう",
        "書く量に差が出すぎる"
      ]
    },
    {
      id: "reflection",
      label: "見取り・評価",
      phrases: [
        "振り返りが感想だけになる",
        "評価をどこで見ればよいかわからない",
        "授業後に何を振り返ればよいかわからない",
        "次の授業にどうつなげればよいかわからない",
        "研究授業で何を見てもらえばよいかわからない"
      ]
    },
    {
      id: "management",
      label: "授業運営",
      phrases: [
        "時間配分がうまくいかない",
        "授業が予定通り進まない",
        "子どもが静かすぎる",
        "子どもがざわざわして集中しない",
        "指示が通らない",
        "活動の切り替えがうまくいかない"
      ]
    },
    {
      id: "materials",
      label: "教材・単元",
      phrases: [
        "教材研究で何を見ればよいかわからない",
        "単元の流れが見えない",
        "子どもの「できた」をどう見るかわからない"
      ]
    },
    {
      id: "ict",
      label: "ICT・情報",
      phrases: [
        "ICTを使うと学びが浅くなる",
        "調べ学習がコピーで終わる"
      ]
    },
    {
      id: "support",
      label: "支援",
      phrases: [
        "つまずいている子への声かけがわからない",
        "できる子を待たせてしまう",
        "支援が個別対応だけで終わってしまう",
        "特別な支援が必要な子への手立てに迷う",
        "交流学級・特別支援学級の学びをつなげたい"
      ]
    }
  ];
  const CATEGORY_LAYOUT_SUFFIXES = ["8", "1", "2", "7", "0", "3", "6", "5", "4"];

  const state = {
    cards: [],
    byId: new Map(),
    byImage: new Map(),
    normalCards: [],
    tagsById: {},
    problemPhrases: [],
    problemGroupId: PROBLEM_GROUPS[0].id
  };

  const els = {
    viewHeader: document.getElementById("viewHeader"),
    appView: document.getElementById("appView"),
    searchInput: document.getElementById("searchInput"),
    problemSuggestions: document.getElementById("problemSuggestions"),
    tagSuggestions: document.getElementById("tagSuggestions"),
    searchResults: document.getElementById("searchResults"),
    favoriteTray: document.getElementById("favoriteTray"),
    clearFavorites: document.getElementById("clearFavorites"),
    memoInput: document.getElementById("memoInput"),
    memoStatus: document.getElementById("memoStatus"),
    clearMemo: document.getElementById("clearMemo"),
    backButton: document.getElementById("backButton"),
    forwardButton: document.getElementById("forwardButton"),
    guideButton: document.getElementById("guideButton"),
    guideCloseButton: document.getElementById("guideCloseButton"),
    guideModal: document.getElementById("guideModal"),
    imageCardTemplate: document.getElementById("imageCardTemplate")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const tsv = await loadTsv();
      setCards(parseTsv(tsv));
      state.tagsById = window.APP_CARD_TAGS || {};
      state.problemPhrases = window.APP_PROBLEM_PHRASES || [];
      bindEvents();
      render();
    } catch (error) {
      renderLoadError(error);
    }
  }

  async function loadTsv() {
    if (window.APP_CARDS_TSV) {
      return window.APP_CARDS_TSV;
    }

    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("TSVを読み込めませんでした。");
    }
    return response.text();
  }

  function parseTsv(tsv) {
    const lines = tsv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    const headers = lines.shift().split("\t");
    return lines.map((line) => {
      const values = line.split("\t");
      return headers.reduce((record, header, index) => {
        record[header] = values[index] || "";
        return record;
      }, {});
    });
  }

  function setCards(cards) {
    state.cards = cards;
    state.byId = new Map(cards.map((card) => [card.id, card]));
    state.byImage = new Map(cards.map((card) => [card.imageFile, card]));
    state.normalCards = cards.filter((card) => card.level === "card");
  }

  function bindEvents() {
    window.addEventListener("hashchange", render);
    els.searchInput.addEventListener("input", renderSearch);
    els.problemSuggestions.addEventListener("click", (event) => {
      const groupButton = event.target.closest("button[data-problem-group]");
      if (groupButton) {
        state.problemGroupId = groupButton.dataset.problemGroup;
        renderProblemSuggestions(getRoute());
        return;
      }

      const button = event.target.closest("button[data-problem]");
      if (!button) {
        return;
      }
      els.searchInput.value = button.dataset.problem;
      renderSearch();
      els.searchInput.focus();
    });
    els.tagSuggestions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tag]");
      if (!button) {
        return;
      }
      els.searchInput.value = button.dataset.tag;
      renderSearch();
      els.searchInput.focus();
    });
    els.memoInput.value = sessionStorage.getItem(MEMO_KEY) || "";
    updateMemoStatus();
    els.memoInput.addEventListener("input", () => {
      sessionStorage.setItem(MEMO_KEY, els.memoInput.value);
      updateMemoStatus("保存しました");
    });
    els.clearMemo.addEventListener("click", () => {
      els.memoInput.value = "";
      sessionStorage.removeItem(MEMO_KEY);
      updateMemoStatus("クリアしました");
      els.memoInput.focus();
    });
    els.clearFavorites.addEventListener("click", () => {
      sessionStorage.removeItem(FAVORITE_KEY);
      renderFavorites();
      updateFavoriteButton();
    });
    els.backButton.addEventListener("click", () => {
      if (location.hash) {
        history.back();
      }
    });
    els.forwardButton.addEventListener("click", () => {
      history.forward();
    });
    els.guideButton.addEventListener("click", openGuide);
    els.guideCloseButton.addEventListener("click", closeGuide);
    els.guideModal.addEventListener("click", (event) => {
      if (event.target === els.guideModal) {
        closeGuide();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.guideModal.hidden) {
        closeGuide();
      }
    });
  }

  function render() {
    const route = getRoute();
    if (route.name === "category") {
      renderCategory(route.value);
    } else if (route.name === "card") {
      renderCardDetail(route.value);
    } else {
      renderTop();
    }
    renderProblemSuggestions(route);
    renderTagSuggestions(route);
    renderSearch();
    renderFavorites();
  }

  function getRoute() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    const params = new URLSearchParams(hash);
    if (params.has("category")) {
      return { name: "category", value: params.get("category") };
    }
    if (params.has("card")) {
      return { name: "card", value: params.get("card") };
    }
    return { name: "top" };
  }

  function renderTop() {
    setHeader("トップ画面", "マンダラシートです。周囲にある８枚のカードをクリックしてください");
    const grid = createGrid();

    TOP_LAYOUT.forEach((imageId) => {
      const fileName = `${imageId}.jpg`;
      const card = state.byImage.get(fileName);
      const isCenter = imageId === "00";
      const cell = createImageCell(card, {
        staticCell: isCenter,
        caption: isCenter ? "相談カテゴリー" : TOP_CAPTIONS[imageId],
        onClick: isCenter ? null : () => {
          const categoryId = String(Number(imageId) / 10);
          location.hash = `category=${categoryId}`;
        }
      });
      grid.appendChild(cell);
    });

    replaceView(grid);
  }

  function renderCategory(categoryId) {
    const centerFile = `${categoryId}0.jpg`;
    const centerCard = state.byImage.get(centerFile);
    if (!centerCard) {
      setHeader("カテゴリが見つかりません", "トップ画面から選び直してください。");
      replaceView(emptyState("指定されたカテゴリは見つかりませんでした。"));
      return;
    }

    setHeader(centerCard.cardName, centerCard.diagramCore || centerCard.categoryName);
    const grid = createGrid();
    CATEGORY_LAYOUT_SUFFIXES.forEach((suffix) => {
      const imageId = `${categoryId}${suffix}`;
      const fileName = `${imageId}.jpg`;
      const card = state.byImage.get(fileName);
      const isCenter = suffix === "0";
      const cell = createImageCell(card, {
        staticCell: isCenter,
        caption: card ? card.cardName : fileName,
        onClick: isCenter || !card ? null : () => {
          location.hash = `card=${encodeURIComponent(card.id)}`;
        }
      });
      grid.appendChild(cell);
    });

    replaceView(grid);
  }

  function renderCardDetail(cardId) {
    const card = state.byId.get(cardId);
    if (!card || card.level !== "card") {
      setHeader("カードが見つかりません", "カテゴリ画面から選び直してください。");
      replaceView(emptyState("指定されたカードは見つかりませんでした。"));
      return;
    }

    setHeader(`${card.cardNumber} ${card.cardName}`, card.categoryName);

    const layout = document.createElement("div");
    layout.className = "detail-layout";

    const imageBox = document.createElement("div");
    imageBox.className = "detail-image";
    const img = document.createElement("img");
    img.src = IMAGE_BASE + card.imageFile;
    img.alt = card.cardName;
    const fallback = document.createElement("span");
    fallback.className = "image-fallback";
    fallback.textContent = "準備中";
    img.addEventListener("error", () => {
      imageBox.classList.add("image-missing");
      img.remove();
      imageBox.appendChild(fallback);
    });
    imageBox.appendChild(img);

    const detail = document.createElement("div");
    const info = document.createElement("div");
    info.className = "info-list";
    [
      ["cardNumber", "カード番号"],
      ["cardName", "カード名"],
      ["categoryName", "カテゴリ"],
      ["question", "問い"],
      ["issue", "困りごと"],
      ["point", "見るポイント"],
      ["hints", "ヒント"],
      ["why", "Why"],
      ["what", "What"],
      ["how", "How"]
    ].forEach(([field, label]) => {
      info.appendChild(infoItem(label, card[field], field === "question" ? "is-question" : ""));
    });

    const actions = document.createElement("div");
    actions.className = "detail-actions";
    const backLink = document.createElement("a");
    backLink.className = "nav-link";
    backLink.href = `#category=${encodeURIComponent(card.categoryId)}`;
    backLink.textContent = "カテゴリへ戻る";
    const favButton = document.createElement("button");
    favButton.id = "favoriteToggle";
    favButton.className = "primary-button";
    favButton.type = "button";
    favButton.addEventListener("click", () => addFavorite(card.id));
    actions.append(backLink, favButton);

    detail.append(info, detailTags(card), actions);
    layout.append(imageBox, detail);
    replaceView(layout);
    updateFavoriteButton();
  }

  function createGrid() {
    const grid = document.createElement("div");
    grid.className = "mandala-grid";
    return grid;
  }

  function createImageCell(card, options) {
    const cell = els.imageCardTemplate.content.firstElementChild.cloneNode(true);
    const image = cell.querySelector("img");
    const caption = cell.querySelector(".cell-caption");
    const fileName = card ? card.imageFile : "";

    if (options.staticCell) {
      cell.classList.add("is-static");
      cell.setAttribute("aria-disabled", "true");
    }

    if (card && fileName) {
      image.src = IMAGE_BASE + fileName;
      image.alt = card.cardName;
    } else {
      cell.classList.add("image-missing");
      image.alt = "";
    }

    image.addEventListener("error", () => {
      cell.classList.add("image-missing");
    });

    caption.textContent = options.caption || "";
    if (options.onClick) {
      cell.addEventListener("click", options.onClick);
    }
    return cell;
  }

  function infoItem(label, value, modifierClass) {
    const item = document.createElement("div");
    item.className = "info-item";
    if (modifierClass) {
      item.classList.add(modifierClass);
    }
    const labelEl = document.createElement("span");
    labelEl.className = "info-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("div");
    valueEl.className = "info-value";
    valueEl.textContent = value || "";
    item.append(labelEl, valueEl);
    return item;
  }

  function detailTags(card) {
    const section = document.createElement("section");
    section.className = "detail-tags";
    const title = document.createElement("h3");
    title.textContent = "検索補助タグ";
    const list = document.createElement("div");
    list.className = "detail-tag-list";

    getTagsForCard(card).forEach((tag) => {
      const button = document.createElement("button");
      button.className = "tag-button";
      button.type = "button";
      button.dataset.tag = tag;
      button.textContent = tag;
      button.addEventListener("click", () => {
        els.searchInput.value = tag;
        renderSearch();
        els.searchInput.focus();
      });
      list.appendChild(button);
    });

    section.append(title, list);
    return section;
  }

  function renderSearch() {
    const query = els.searchInput.value.trim().toLowerCase();
    els.searchResults.replaceChildren();

    if (!query) {
      els.searchResults.appendChild(emptyState("検索語を入力すると、通常カードから探せます。"));
      return;
    }

    const results = state.normalCards.filter((card) => {
      return getSearchText(card).includes(query);
    });
    const problemMatches = getProblemMatchedCards(query);
    const mergedResults = mergeCards(results, problemMatches).slice(0, 20);

    if (mergedResults.length === 0) {
      els.searchResults.appendChild(emptyState("該当するカードはありません。"));
      return;
    }

    mergedResults.forEach((card) => {
      const link = document.createElement("a");
      link.className = "result-card";
      link.href = `#card=${encodeURIComponent(card.id)}`;
      link.append(
        textSpan("result-number-category", `${card.cardNumber}　${card.categoryName}`),
        textSpan("result-title", card.cardName),
        textSpan("result-question", card.question),
        textSpan("result-issue", card.issue)
      );
      els.searchResults.appendChild(link);
    });
  }

  function renderProblemSuggestions(route) {
    els.problemSuggestions.replaceChildren();

    const label = document.createElement("p");
    label.className = "problem-suggestion-label";
    label.textContent = getProblemSuggestionLabel(route);
    els.problemSuggestions.appendChild(label);

    const groupList = document.createElement("div");
    groupList.className = "problem-group-list";
    PROBLEM_GROUPS.forEach((group) => {
      const button = document.createElement("button");
      button.className = group.id === state.problemGroupId ? "problem-group-button is-active" : "problem-group-button";
      button.type = "button";
      button.dataset.problemGroup = group.id;
      button.textContent = group.label;
      groupList.appendChild(button);
    });
    els.problemSuggestions.appendChild(groupList);

    const selectedGroup = getSelectedProblemGroup();
    const problemLabel = document.createElement("p");
    problemLabel.className = "problem-suggestion-label problem-child-label";
    problemLabel.textContent = `${selectedGroup.label}の困りごと`;
    els.problemSuggestions.appendChild(problemLabel);

    getProblemsForGroup(selectedGroup).forEach((problem) => {
      const button = document.createElement("button");
      button.className = "problem-button";
      button.type = "button";
      button.dataset.problem = problem.phrase;
      button.textContent = problem.phrase;
      els.problemSuggestions.appendChild(button);
    });
  }

  function getProblemSuggestionLabel(route) {
    if (route.name === "card") {
      return "困りごとを大きく選ぶ";
    }
    if (route.name === "category") {
      return "困りごとを大きく選ぶ";
    }
    return "困りごとを大きく選ぶ";
  }

  function getSelectedProblemGroup() {
    return PROBLEM_GROUPS.find((group) => group.id === state.problemGroupId) || PROBLEM_GROUPS[0];
  }

  function getProblemsForGroup(group) {
    const phraseSet = new Set(group.phrases);
    return state.problemPhrases.filter((problem) => phraseSet.has(problem.phrase));
  }

  function renderTagSuggestions(route) {
    els.tagSuggestions.replaceChildren();

    const label = document.createElement("p");
    label.className = "tag-suggestion-label";
    label.textContent = getTagSuggestionLabel(route);
    els.tagSuggestions.appendChild(label);

    getSuggestedTags(route).forEach((tag) => {
      const button = document.createElement("button");
      button.className = "tag-button";
      button.type = "button";
      button.dataset.tag = tag;
      button.textContent = tag;
      els.tagSuggestions.appendChild(button);
    });
  }

  function getTagSuggestionLabel(route) {
    if (route.name === "card") {
      return "このカードに近い悩みタグ";
    }
    if (route.name === "category") {
      return "このカテゴリで探しやすいタグ";
    }
    return "よく使う悩みタグ";
  }

  function getSuggestedTags(route) {
    if (route.name === "card") {
      const card = state.byId.get(route.value);
      return card ? getTagsForCard(card).slice(0, 10) : SUGGESTED_TAGS.slice(0, 12);
    }

    if (route.name === "category") {
      return getCategoryTags(route.value).slice(0, 14);
    }

    return SUGGESTED_TAGS.slice(0, 18);
  }

  function getCategoryTags(categoryId) {
    const counts = new Map();
    state.normalCards
      .filter((card) => card.categoryId === categoryId)
      .forEach((card) => {
        getTagsForCard(card).forEach((tag) => {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        });
      });

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
      .map(([tag]) => tag);

    return ranked.length ? ranked : SUGGESTED_TAGS;
  }

  function getTagsForCard(card) {
    return state.tagsById[card.id] || [];
  }

  function getSearchText(card) {
    const tsvText = SEARCH_FIELDS.map((field) => card[field] || "").join(" ");
    const tagText = getTagsForCard(card).join(" ");
    return `${tsvText} ${tagText}`.toLowerCase();
  }

  function getProblemMatchedCards(query) {
    const ids = new Set();
    state.problemPhrases.forEach((problem) => {
      if (getProblemSearchText(problem).includes(query)) {
        problem.cardIds.forEach((id) => ids.add(id));
      }
    });
    return [...ids]
      .map((id) => state.byId.get(id))
      .filter((card) => card && card.level === "card");
  }

  function getProblemSearchText(problem) {
    return [problem.phrase, ...(problem.aliases || [])].join(" ").toLowerCase();
  }

  function mergeCards(primaryCards, secondaryCards) {
    const seen = new Set();
    return [...primaryCards, ...secondaryCards].filter((card) => {
      if (seen.has(card.id)) {
        return false;
      }
      seen.add(card.id);
      return true;
    });
  }

  function formatProblemMatches(card, query) {
    if (!query) {
      return "";
    }
    const matched = state.problemPhrases
      .filter((problem) => problem.cardIds.includes(card.id) && getProblemSearchText(problem).includes(query))
      .map((problem) => problem.phrase);
    return matched.length ? `困りごと：${matched.join("、")}` : "";
  }

  function formatTags(card) {
    const tags = getTagsForCard(card);
    return tags.length ? `検索補助タグ：${tags.join("、")}` : "";
  }

  function openGuide() {
    els.guideModal.hidden = false;
    document.body.classList.add("modal-open");
    els.guideCloseButton.focus();
  }

  function closeGuide() {
    els.guideModal.hidden = true;
    document.body.classList.remove("modal-open");
    els.guideButton.focus();
  }

  function renderFavorites() {
    const ids = getFavoriteIds();
    els.favoriteTray.replaceChildren();

    if (ids.length === 0) {
      els.favoriteTray.appendChild(emptyState("まだ保存されたカードはありません。"));
      return;
    }

    ids.forEach((id) => {
      const card = state.byId.get(id);
      if (!card) {
        return;
      }
      const item = document.createElement("div");
      item.className = "favorite-card";
      const link = document.createElement("a");
      link.className = "result-card";
      link.href = `#card=${encodeURIComponent(card.id)}`;
      link.append(
        textSpan("favorite-title", `${card.cardNumber} ${card.cardName}`),
        textSpan("favorite-meta", card.categoryName),
        textSpan("favorite-question", card.question)
      );

      const actions = document.createElement("div");
      actions.className = "favorite-actions";
      const remove = document.createElement("button");
      remove.className = "remove-button";
      remove.type = "button";
      remove.textContent = "削除";
      remove.addEventListener("click", () => removeFavorite(card.id));
      actions.appendChild(remove);
      item.append(link, actions);
      els.favoriteTray.appendChild(item);
    });
  }

  function addFavorite(id) {
    const ids = getFavoriteIds();
    if (ids.includes(id) || ids.length >= MAX_FAVORITES) {
      updateFavoriteButton();
      return;
    }
    ids.push(id);
    setFavoriteIds(ids);
    renderFavorites();
    updateFavoriteButton();
  }

  function removeFavorite(id) {
    setFavoriteIds(getFavoriteIds().filter((storedId) => storedId !== id));
    renderFavorites();
    updateFavoriteButton();
  }

  function getFavoriteIds() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(FAVORITE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch (_error) {
      return [];
    }
  }

  function setFavoriteIds(ids) {
    sessionStorage.setItem(FAVORITE_KEY, JSON.stringify(ids.slice(0, MAX_FAVORITES)));
  }

  function updateMemoStatus(message) {
    const length = els.memoInput.value.length;
    els.memoStatus.textContent = message ? `${message}（${length}文字）` : `${length}文字`;
  }

  function updateFavoriteButton() {
    const button = document.getElementById("favoriteToggle");
    if (!button) {
      return;
    }
    const route = getRoute();
    const ids = getFavoriteIds();
    const alreadySaved = ids.includes(route.value);
    const isFull = ids.length >= MAX_FAVORITES;
    button.textContent = alreadySaved ? "保存済み" : isFull ? "5枚まで保存済み" : "気になるカードに保存";
    button.disabled = alreadySaved || isFull;
  }

  function setHeader(title, lead) {
    els.viewHeader.replaceChildren();
    const group = document.createElement("div");
    const h1 = document.createElement("h1");
    h1.className = "view-title";
    h1.textContent = title;
    const p = document.createElement("p");
    p.className = "view-lead";
    p.textContent = lead || "";
    group.append(h1, p);
    els.viewHeader.appendChild(group);
  }

  function replaceView(node) {
    els.appView.replaceChildren(node);
  }

  function emptyState(message) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = message;
    return div;
  }

  function textSpan(className, value) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = value || "";
    return span;
  }

  function renderLoadError(error) {
    setHeader("読み込みエラー", "データを読み込めませんでした。");
    const div = document.createElement("div");
    div.className = "error-state";
    div.textContent = error.message || "不明なエラーです。";
    replaceView(div);
  }
})();
