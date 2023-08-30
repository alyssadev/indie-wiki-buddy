const breezeWikiRegex = /breezewiki\.com$|breeze\.hostux\.net$|bw\.projectsegfau\.lt$|antifandom\.com$|breezewiki\.pussthecat\.org$|bw\.vern\.cc$|breezewiki\.esmailelbob\.xyz$|bw\.artemislena\.eu$|bw\.hamstro\.dev$|nerd\.whatever\.social$|breeze\.nohost\.network$|breeze\.whateveritworks\.org$|bw\.home\.aly\.pet$/;
const currentURL = new URL(document.location);

// Create object prototypes for getting and setting attributes:
Object.prototype.get = function (prop) {
  this[prop] = this[prop] || {};
  return this[prop];
};
Object.prototype.set = function (prop, value) {
  this[prop] = value;
}

// Load website data:
async function getData() {
  const LANGS = ["DE", "EN", "ES", "FR", "IT", "PL", "TOK"];
  let sites = [];
  let promises = [];
  for (let i = 0; i < LANGS.length; i++) {
    promises.push(fetch(chrome.runtime.getURL('data/sites' + LANGS[i] + '.json'))
      .then((resp) => resp.json())
      .then(function (jsonData) {
        jsonData.forEach((site) => {
          site.origins.forEach((origin) => {
            sites.push({
              "id": site.id,
              "origin": origin.origin,
              "origin_base_url": origin.origin_base_url,
              "origin_content_path": origin.origin_content_path,
              "destination": site.destination,
              "destination_base_url": site.destination_base_url,
              "destination_content_path": site.destination_content_path,
              "destination_content_prefix": (site.destination_content_prefix ? site.destination_content_prefix : ""),
              "destination_platform": site.destination_platform,
              "destination_icon": site.destination_icon,
              "lang": LANGS[i]
            })
          })
        });
      }));
  }
  await Promise.all(promises);
  return sites;
}

function displayRedirectBanner(url, id, destination, storage) {
  // Output CSS
  styleString = `
    #indie-wiki-banner {
      font-family: sans-serif;
      width: 100%;
      z-index: 2147483647;
      position: sticky;
      top: 0;
      text-align: center;
      background-color: #acdae2;
      padding: 8px 10px;
    }
    #indie-wiki-banner-exit {
      float: right;
      font-size: 20px;
      color: #333;
      cursor: pointer;
    }
    #indie-wiki-banner-controls {
      padding-bottom: 5px;
    }
    .indie-wiki-banner-big-text {
      font-size: 14px;
      line-height: 24px;
      margin-top: 5px;
    }
    .indie-wiki-banner-link {
      font-size: 16px;
      font-weight: 600;
      color: #000080;
      cursor: pointer;
      padding: 0 10px;
      display: block;
      width: fit-content;
      margin: 0 auto;
    }
    .indie-wiki-banner-link:hover {
      text-decoration: underline;
      color: #000080;
    }
    .indie-wiki-banner-link-small {
      display: inline-block;
      font-size: 12px;
      min-width: 180px;
    }
    .indie-wiki-banner-disabled {
      color: #333;
      cursor: default;
    }
    .indie-wiki-banner-disabled:hover {
      text-decoration: none;
    }
    .indie-wiki-banner-hidden {
      display: none;
    }
  `
  style = document.createElement('style');
  style.textContent = styleString;
  document.head.append(style);

  // Output banner
  var banner = document.createElement('div');
  banner.id = 'indie-wiki-banner';
  var bannerExit = document.createElement('div');
  bannerExit.id = 'indie-wiki-banner-exit';
  banner.appendChild(bannerExit);
  bannerExit.textContent = '✕';
  bannerExit.onclick = function () { this.parentElement.remove(); };

  // Output control links container
  var bannerControls = document.createElement('div');
  bannerControls.id = 'indie-wiki-banner-controls';
  banner.appendChild(bannerControls);

  // Output "restore banner" link
  var bannerRestoreLink = document.createElement('div');
  bannerRestoreLink.id = 'indie-wiki-banner-restore';
  bannerRestoreLink.classList.add('indie-wiki-banner-link');
  bannerRestoreLink.classList.add('indie-wiki-banner-link-small');
  bannerRestoreLink.classList.add('indie-wiki-banner-hidden');
  bannerRestoreLink.textContent = '⎌ Restore banner';
  bannerControls.appendChild(bannerRestoreLink);
  bannerRestoreLink.onclick = function (e) {
    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
      response.siteSettings.get(id).set('action', 'alert');
      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
      e.target.textContent = '✓ Banner restored';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-redirect').textContent = '↪ Auto redirect this wiki';
      document.getElementById('indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-disable').textContent = '✕ Disable banner for this wiki';
      document.getElementById('indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "disable banner" link
  var bannerDisableLink = document.createElement('div');
  bannerDisableLink.id = 'indie-wiki-banner-disable';
  bannerDisableLink.classList.add('indie-wiki-banner-link');
  bannerDisableLink.classList.add('indie-wiki-banner-link-small');
  bannerDisableLink.textContent = '✕ Disable banner for this wiki';
  bannerControls.appendChild(bannerDisableLink);
  bannerDisableLink.onclick = function (e) {
    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
      response.siteSettings.get(id).set('action', 'disabled');
      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
      e.target.textContent = '✓ Banner disabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-redirect').textContent = '↪ Auto redirect this wiki';
      document.getElementById('indie-wiki-banner-redirect').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-restore').textContent = '⎌ Restore banner';
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output "auto redirect" link
  var bannerRedirectLink = document.createElement('div');
  bannerRedirectLink.id = 'indie-wiki-banner-redirect';
  bannerRedirectLink.classList.add('indie-wiki-banner-link');
  bannerRedirectLink.classList.add('indie-wiki-banner-link-small');
  bannerRedirectLink.textContent = '↪ Auto redirect this wiki';
  bannerControls.appendChild(bannerRedirectLink);
  bannerRedirectLink.onclick = function (e) {
    chrome.storage.sync.get({ 'siteSettings': {} }, function (response) {
      response.siteSettings.get(id).set('action', 'redirect');
      chrome.storage.sync.set({ 'siteSettings': response.siteSettings });
      e.target.textContent = '✓ Redirect enabled';
      e.target.classList.add('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-disable').textContent = '✕ Disable banner for this wiki';
      document.getElementById('indie-wiki-banner-disable').classList.remove('indie-wiki-banner-disabled');
      document.getElementById('indie-wiki-banner-restore').textContent = '⎌ Restore banner';
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-hidden');
      document.getElementById('indie-wiki-banner-restore').classList.remove('indie-wiki-banner-disabled');
    });
  }

  // Output main banner text
  var bannerText = document.createElement('span');
  bannerText.classList.add('indie-wiki-banner-big-text');
  banner.appendChild(bannerText);
  bannerText.textContent = 'There is an independent wiki covering this topic!';
  var bannerWikiLink = document.createElement('a');
  bannerWikiLink.classList.add('indie-wiki-banner-link');
  bannerText.appendChild(bannerWikiLink);
  bannerWikiLink.href = url;
  bannerWikiLink.textContent = 'Visit ' + destination + ' →';

  // Increment stats
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    document.body.insertAdjacentElement('beforeBegin', banner);
    if (storage.breezewiki === 'on') {
      if (currentURL.hostname.match(breezeWikiRegex)) {
        chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
      }
    } else {
      chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
    }
  } else {
    document.addEventListener('readystatechange', e => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        document.body.insertAdjacentElement('beforeBegin', banner);
        if (storage.breezewiki === 'on') {
          if (currentURL.hostname.match(breezeWikiRegex)) {
            chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
          }
        } else {
          chrome.storage.sync.set({ 'countAlerts': (storage.countAlerts ?? 0) + 1 });
        }
      }
    });
  }
}

function main() {
  chrome.storage.local.get(function (localStorage) {
    chrome.storage.sync.get(function (syncStorage) {
      const storage = { ...syncStorage, ...localStorage };
      // Check if extension is on:
      if ((storage.power ?? 'on') === 'on') {
        // Check if there is a pathname, to ensure we're looking at an article
        if (currentURL.pathname.length > 1) {
          let origin = currentURL;
          // If on a BreezeWiki site, convert to Fandom link to match with our list of wikis:
          if (currentURL.hostname.match(breezeWikiRegex)) {
            origin = String(currentURL.pathname).split('/')[1] + '.fandom.com/wiki/';
            if (currentURL.search.includes('?q=')) {
              origin = origin + currentURL.search.substring(3).split('&')[0];
            } else {
              origin = origin + currentURL.pathname.split('/')[3];
            }
          }
          getData().then(sites => {
            // Check if site is in our list of wikis:
            let matchingSites = sites.filter(el => String(origin).replace(/^https?:\/\//, '').startsWith(el.origin_base_url));
            if (matchingSites.length > 0) {
              // Select match with longest base URL 
              let closestMatch = "";
              matchingSites.forEach(site => {
                if (site.origin_base_url.length > closestMatch.length) {
                  closestMatch = site.origin_base_url;
                }
              });
              let site = matchingSites.find(site => site.origin_base_url === closestMatch);
              if (site) {
                // Get user's settings for the wiki
                let settings = storage.siteSettings || {};
                let id = site['id'];
                let siteSetting = '';
                if (settings.hasOwnProperty(id) && settings[id].hasOwnProperty('action')) {
                  siteSetting = settings[id].action;
                } else if (storage.defaultActionSettings && storage.defaultActionSettings[site.language]) {
                  siteSetting = storage.defaultActionSettings[site.language];
                } else {
                  siteSetting = 'alert';
                }
                // Notify if enabled for the wiki:
                if (siteSetting === 'alert') {
                  // Get article name from the end of the URL;
                  // We can't just take the last part of the path due to subpages;
                  // Instead, we take everything after the wiki's base URL + content path:
                  let article = String(origin).split(site['origin_base_url'] + site['origin_content_path'])[1];
                  // Set up URL to redirect user to based on wiki platform:
                  if (article || (!article && !url.href.split(site['origin_base_url'] + '/')[1])) {
                    let newURL = '';
                    if (article) {
                      let searchParams = '';
                      switch (site['destination_platform']) {
                        case 'mediawiki':
                          searchParams = 'Special:Search/' + site['destination_content_prefix'] + article;
                          break;
                        case 'doku':
                          searchParams = 'start?do=search&q=' + article;
                          break;
                      }
                      newURL = 'https://' + site["destination_base_url"] + site["destination_content_path"] + searchParams;
                    } else {
                      newURL = 'https://' + site["destination_base_url"];
                    }
                    // When head elem is loaded, notify that another wiki is available
                    const docObserver = new MutationObserver(function (mutations, mutationInstance) {
                      const headElement = document.querySelector('head');
                      if (headElement) {
                        displayRedirectBanner(newURL, site['id'], site['destination'], storage);
                        mutationInstance.disconnect();
                      }
                    });
                    docObserver.observe(document, {
                      childList: true,
                      subtree: true
                    });
                  }
                }
              }
            }
          });
        }
      }
    });
  });
}

main();
