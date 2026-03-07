function initBlogTopicFilters() {
  const filtersRoot = document.querySelector('[data-topic-filters]');
  const blogList = document.querySelector('.blog-list');
  if (!filtersRoot || !blogList) return;

  const allButton = filtersRoot.querySelector('[data-topic-all]');
  const topicButtons = Array.from(filtersRoot.querySelectorAll('[data-topic-filter]'));
  const articles = Array.from(blogList.querySelectorAll('.blog-item[data-topic]'));
  if (!allButton || topicButtons.length === 0 || articles.length === 0) return;

  const topicOrder = topicButtons.map((button) => button.dataset.topicFilter);
  const allowedTopics = new Set(topicOrder);

  function normalizeTopics(topics) {
    const selected = new Set(topics.filter((topic) => allowedTopics.has(topic)));
    return topicOrder.filter((topic) => selected.has(topic));
  }

  function readTopicsFromUrl() {
    const raw = new URL(window.location.href).searchParams.get('topics');
    if (!raw) return [];
    return normalizeTopics(
      raw
        .split(',')
        .map((topic) => topic.trim())
        .filter(Boolean),
    );
  }

  function updateUrl(topics) {
    const url = new URL(window.location.href);
    if (topics.length > 0) {
      url.searchParams.set('topics', topics.join(','));
    } else {
      url.searchParams.delete('topics');
    }

    const next =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') +
      url.hash;
    window.history.replaceState({}, '', next);
  }

  function updateYearHeadersVisibility() {
    let currentDivider = null;
    let hasVisibleArticles = false;

    function flushYear() {
      if (currentDivider) {
        currentDivider.hidden = !hasVisibleArticles;
      }
    }

    Array.from(blogList.children).forEach((node) => {
      if (node.classList.contains('blog-year-divider')) {
        flushYear();
        currentDivider = node;
        hasVisibleArticles = false;
        return;
      }

      if (node.classList.contains('blog-item') && !node.hidden) {
        hasVisibleArticles = true;
      }
    });

    flushYear();
  }

  function applyFilter(selectedTopics) {
    const selected = new Set(selectedTopics);
    const hasFilter = selected.size > 0;

    allButton.classList.toggle('is-active', !hasFilter);
    allButton.setAttribute('aria-pressed', String(!hasFilter));

    topicButtons.forEach((button) => {
      const topic = button.dataset.topicFilter;
      const isActive = hasFilter && selected.has(topic);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    articles.forEach((article) => {
      const isVisible = !hasFilter || selected.has(article.dataset.topic);
      article.hidden = !isVisible;
    });

    updateYearHeadersVisibility();
  }

  let selectedTopics = readTopicsFromUrl();
  applyFilter(selectedTopics);
  updateUrl(selectedTopics);

  allButton.addEventListener('click', () => {
    selectedTopics = [];
    applyFilter(selectedTopics);
    updateUrl(selectedTopics);
  });

  topicButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const topic = button.dataset.topicFilter;
      const selected = new Set(selectedTopics);

      if (selected.has(topic)) {
        selected.delete(topic);
      } else {
        selected.add(topic);
      }

      selectedTopics = normalizeTopics(Array.from(selected));
      applyFilter(selectedTopics);
      updateUrl(selectedTopics);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogTopicFilters);
} else {
  initBlogTopicFilters();
}
