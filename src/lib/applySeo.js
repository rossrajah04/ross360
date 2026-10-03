import { pages, canonicalFor, jsonLdFor } from '../content/seo.js';

function setMeta(selector, create, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

const metaByName = (name) => () => {
  const el = document.createElement('meta');
  el.setAttribute('name', name);
  return el;
};

const metaByProperty = (property) => () => {
  const el = document.createElement('meta');
  el.setAttribute('property', property);
  return el;
};

/**
 * Update <title>, description, canonical, social tags, robots and JSON-LD for a page key.
 * Called from <Seo> in an effect that depends only on the (string) page key.
 */
export function applySeo(pageKey) {
  const page = pages[pageKey] || pages.notFound;
  const url = canonicalFor(page.path);

  document.title = page.title;
  setMeta('meta[name="description"]', metaByName('description'), page.description);
  setMeta('meta[property="og:title"]', metaByProperty('og:title'), page.title);
  setMeta('meta[property="og:description"]', metaByProperty('og:description'), page.description);
  setMeta('meta[property="og:type"]', metaByProperty('og:type'), 'website');
  if (page.noindex) {
    const ogUrl = document.head.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.remove();
  } else {
    setMeta('meta[property="og:url"]', metaByProperty('og:url'), url);
  }
  setMeta('meta[name="twitter:card"]', metaByName('twitter:card'), 'summary');

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  // The 404 page should not declare itself canonical.
  if (page.noindex) canonical.remove();
  else canonical.setAttribute('href', url);

  const robots = document.head.querySelector('meta[name="robots"]');
  if (page.noindex) {
    setMeta('meta[name="robots"]', metaByName('robots'), 'noindex');
  } else if (robots) {
    robots.remove();
  }

  document.head.querySelectorAll('script[data-seo-ld]').forEach((node) => node.remove());
  for (const item of jsonLdFor(pageKey)) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-ld', 'true');
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}
