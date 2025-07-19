// ContentSpy Enhanced Background Service Worker - Phase 2
class ContentSpyBackgroundEnhanced {
    constructor() {
        this.monitoringIntervals = new Map();
        this.isInitialized = false;
        this.rssParser = new RSSParser();
        this.contentCategorizer = new ContentCategorizer();
        this.websiteCrawler = new WebsiteCrawler();
        this.init();
    }

    async init() {
        console.log('ContentSpy Enhanced Background Service Worker starting...');
        
        await this.loadStorageManager();
        this.setupEventListeners();
        await this.initializeMonitoring();
        
        this.isInitialized = true;
        console.log('ContentSpy Enhanced Background Service Worker initialized');
    }

    async loadStorageManager() {
        this.storage = {
            async getCompetitors() {
                const result = await chrome.storage.sync.get(['competitors']);
                return result.competitors || [];
            },
            
            async updateCompetitor(competitorId, updates) {
                const competitors = await this.getCompetitors();
                const index = competitors.findIndex(c => c.id === competitorId);
                if (index !== -1) {
                    competitors[index] = { ...competitors[index], ...updates };
                    await chrome.storage.sync.set({ competitors });
                    return competitors[index];
                }
                return null;
            },
            
            async addActivity(activity) {
                const result = await chrome.storage.local.get(['recentActivity']);
                const activities = result.recentActivity || [];
                
                activities.unshift({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...activity
                });
                
                if (activities.length > 100) {
                    activities.splice(100);
                }
                
                await chrome.storage.local.set({ recentActivity: activities });
            },
            
            async addContent(content) {
                const result = await chrome.storage.local.get(['contentHistory']);
                const contentHistory = result.contentHistory || [];
                
                // Add categorization
                const categorizedContent = await this.categorizeContent(content);
                
                contentHistory.unshift({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...categorizedContent
                });
                
                if (contentHistory.length > 500) {
                    contentHistory.splice(500);
                }
                
                await chrome.storage.local.set({ contentHistory });
            }
        };
    }

    setupEventListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        chrome.runtime.onStartup.addListener(() => {
            this.initializeMonitoring();
        });

        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleAlarm(alarm);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.checkIfMonitoredSite(tab);
            }
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'startMonitoring':
                    await this.startMonitoringCompetitor(request.competitorId);
                    sendResponse({ success: true });
                    break;

                case 'stopMonitoring':
                    await this.stopMonitoringCompetitor(request.competitorId);
                    sendResponse({ success: true });
                    break;

                case 'refreshAll':
                    await this.refreshAllCompetitors();
                    sendResponse({ success: true });
                    break;

                case 'discoverFeeds':
                    const feeds = await this.discoverRSSFeeds(request.competitorId);
                    sendResponse({ feeds });
                    break;

                case 'crawlWebsite':
                    const discoveredUrls = await this.crawlForContentSections(request.competitorId);
                    sendResponse({ urls: discoveredUrls });
                    break;

                case 'categorizeContent':
                    const categorized = await this.categorizeContent(request.content);
                    sendResponse({ categorized });
                    break;

                case 'getMonitoringStatus':
                    const status = await this.getMonitoringStatus();
                    sendResponse({ status });
                    break;

                case 'contentDetected':
                    await this.handleContentDetected(request.data);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async initializeMonitoring() {
        const competitors = await this.storage.getCompetitors();
        const activeCompetitors = competitors.filter(c => c.isActive);

        console.log(`Initializing monitoring for ${activeCompetitors.length} competitors`);

        for (const competitor of activeCompetitors) {
            await this.startMonitoringCompetitor(competitor.id);
        }
    }

    async startMonitoringCompetitor(competitorId) {
        const competitors = await this.storage.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (!competitor) {
            console.error('Competitor not found:', competitorId);
            return;
        }

        // Create alarm for this competitor
        const alarmName = `monitor_${competitorId}`;
        const interval = competitor.settings?.checkInterval || 30;

        await chrome.alarms.create(alarmName, {
            delayInMinutes: 1,
            periodInMinutes: interval
        });

        console.log(`Started monitoring ${competitor.label} every ${interval} minutes`);

        await this.storage.updateCompetitor(competitorId, {
            lastMonitoringStart: new Date().toISOString()
        });
    }

    async stopMonitoringCompetitor(competitorId) {
        const alarmName = `monitor_${competitorId}`;
        await chrome.alarms.clear(alarmName);
        console.log(`Stopped monitoring competitor ${competitorId}`);
    }

    async handleAlarm(alarm) {
        if (alarm.name.startsWith('monitor_')) {
            const competitorId = alarm.name.replace('monitor_', '');
            await this.checkCompetitorContent(competitorId);
        }
    }

    async checkCompetitorContent(competitorId) {
        const competitors = await this.storage.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (!competitor || !competitor.isActive) {
            console.log(`Skipping check for inactive/missing competitor ${competitorId}`);
            return;
        }

        console.log(`Checking content for ${competitor.label}`);

        try {
            await this.storage.updateCompetitor(competitorId, {
                lastChecked: new Date().toISOString()
            });

            // Enhanced monitoring: check all URLs for this competitor
            const urlsToCheck = this.getCompetitorUrls(competitor);
            const allNewContent = [];

            for (const urlData of urlsToCheck) {
                try {
                    let newContent = [];

                    if (urlData.type === 'rss') {
                        // Parse RSS feed
                        newContent = await this.checkRSSFeed(competitor, urlData);
                    } else {
                        // Regular page monitoring
                        newContent = await this.checkRegularPage(competitor, urlData);
                    }

                    allNewContent.push(...newContent);
                } catch (error) {
                    console.error(`Error checking ${urlData.url}:`, error);
                }

                // Respect rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (allNewContent.length > 0) {
                console.log(`Found ${allNewContent.length} new content items for ${competitor.label}`);
                
                // Notify about new content
                await this.handleContentDetected({
                    competitorId: competitor.id,
                    newContent: allNewContent
                });
            }

        } catch (error) {
            console.error(`Error checking content for ${competitor.label}:`, error);
            
            await this.storage.updateCompetitor(competitorId, {
                lastError: error.message,
                lastErrorTime: new Date().toISOString()
            });
        }
    }

    getCompetitorUrls(competitor) {
        const urls = [];
        
        // Primary URL (backward compatibility)
        if (competitor.url) {
            urls.push({
                url: competitor.url,
                type: 'page',
                label: 'Main URL'
            });
        }

        // Additional URLs (Phase 2 feature)
        if (competitor.urls && Array.isArray(competitor.urls)) {
            urls.push(...competitor.urls);
        }

        // RSS feeds
        if (competitor.rssFeeds && Array.isArray(competitor.rssFeeds)) {
            urls.push(...competitor.rssFeeds.map(feed => ({
                url: feed.url,
                type: 'rss',
                label: feed.title || 'RSS Feed'
            })));
        }

        return urls;
    }

    async checkRSSFeed(competitor, urlData) {
        try {
            const feedContent = await this.rssParser.parseFeed(urlData.url);
            const storedFingerprints = await this.getStoredContentFingerprints(competitor.id);
            
            const newContent = feedContent.items
                .filter(item => {
                    const fingerprint = this.generateFingerprint(item.title, item.link);
                    return !storedFingerprints.includes(fingerprint);
                })
                .map(item => ({
                    title: item.title,
                    content: item.description || item.summary || '',
                    url: item.link,
                    publishDate: item.pubDate,
                    author: item.author,
                    type: 'article',
                    source: 'rss',
                    fingerprint: this.generateFingerprint(item.title, item.link)
                }));

            if (newContent.length > 0) {
                await this.storeContentFingerprints(competitor.id, 
                    newContent.map(c => c.fingerprint));
            }

            return newContent;
        } catch (error) {
            console.error('Error parsing RSS feed:', error);
            return [];
        }
    }

    async checkRegularPage(competitor, urlData) {
        const existingTabs = await chrome.tabs.query({ url: urlData.url });
        
        if (existingTabs.length > 0) {
            return await this.injectContentScript(existingTabs[0].id, competitor);
        } else {
            return await this.createMonitoringTab(competitor, urlData.url);
        }
    }

    async createMonitoringTab(competitor, url = competitor.url) {
        return new Promise((resolve, reject) => {
            let tabClosed = false;
            let timeoutId = null;
            
            chrome.tabs.create({
                url: url,
                active: false
            }, async (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                const tabId = tab.id;
                console.log(`Created monitoring tab ${tabId} for ${competitor.label}`);

                const safeCloseTab = async () => {
                    if (tabClosed) return;
                    tabClosed = true;
                    await this.safeCloseTab(tabId);
                    if (timeoutId) clearTimeout(timeoutId);
                };

                const checkTabReady = async (updatedTabId, changeInfo) => {
                    if (updatedTabId === tabId && changeInfo.status === 'complete' && !tabClosed) {
                        chrome.tabs.onUpdated.removeListener(checkTabReady);
                        
                        try {
                            const result = await this.injectContentScript(tabId, competitor);
                            setTimeout(safeCloseTab, 3000);
                            resolve(result);
                        } catch (error) {
                            console.error(`Error processing tab ${tabId}:`, error);
                            await safeCloseTab();
                            reject(error);
                        }
                    }
                };

                chrome.tabs.onUpdated.addListener(checkTabReady);

                const handleTabRemoved = (removedTabId) => {
                    if (removedTabId === tabId) {
                        tabClosed = true;
                        chrome.tabs.onRemoved.removeListener(handleTabRemoved);
                        chrome.tabs.onUpdated.removeListener(checkTabReady);
                        if (timeoutId) clearTimeout(timeoutId);
                        resolve([]);
                    }
                };
                
                chrome.tabs.onRemoved.addListener(handleTabRemoved);

                timeoutId = setTimeout(async () => {
                    chrome.tabs.onUpdated.removeListener(checkTabReady);
                    chrome.tabs.onRemoved.removeListener(handleTabRemoved);
                    await safeCloseTab();
                    reject(new Error('Tab loading timeout'));
                }, 30000);
            });
        });
    }

    async injectContentScript(tabId, competitor) {
        try {
            if (!(await this.tabExists(tabId))) {
                throw new Error(`Tab ${tabId} no longer exists`);
            }

            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'checkContent',
                competitor: competitor
            });

            console.log(`Successfully checked content in tab ${tabId}`);
            return response?.newContent || [];

        } catch (error) {
            if (error.message.includes('Could not establish connection') ||
                error.message.includes('Receiving end does not exist') ||
                error.message.includes('no longer exists')) {
                console.log(`Tab ${tabId} is not ready: ${error.message}`);
                return [];
            } else {
                console.error('Error communicating with content script:', error);
                throw error;
            }
        }
    }

    // RSS Feed Discovery
    async discoverRSSFeeds(competitorId) {
        const competitors = await this.storage.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (!competitor) return [];

        try {
            const feeds = await this.websiteCrawler.discoverFeeds(competitor.url);
            
            // Update competitor with discovered feeds
            await this.storage.updateCompetitor(competitorId, {
                discoveredFeeds: feeds,
                lastFeedDiscovery: new Date().toISOString()
            });

            return feeds;
        } catch (error) {
            console.error('Error discovering RSS feeds:', error);
            return [];
        }
    }

    // Website Crawling for Content Sections
    async crawlForContentSections(competitorId) {
        const competitors = await this.storage.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (!competitor) return [];

        try {
            const discoveredUrls = await this.websiteCrawler.findContentSections(competitor.url);
            
            // Update competitor with discovered URLs
            await this.storage.updateCompetitor(competitorId, {
                discoveredUrls: discoveredUrls,
                lastUrlDiscovery: new Date().toISOString()
            });

            return discoveredUrls;
        } catch (error) {
            console.error('Error crawling for content sections:', error);
            return [];
        }
    }

    // Content Categorization
    async categorizeContent(content) {
        try {
            const category = await this.contentCategorizer.categorize(content);
            return {
                ...content,
                category: category.primary,
                categories: category.all,
                confidence: category.confidence,
                tags: category.tags
            };
        } catch (error) {
            console.error('Error categorizing content:', error);
            return {
                ...content,
                category: 'uncategorized',
                categories: ['uncategorized'],
                confidence: 0,
                tags: []
            };
        }
    }

    async handleContentDetected(data) {
        const { competitorId, newContent } = data;
        
        const competitors = await this.storage.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (competitor) {
            const updatedCompetitor = await this.storage.updateCompetitor(competitorId, {
                contentCount: (competitor.contentCount || 0) + newContent.length,
                lastContentFound: new Date().toISOString()
            });

            // Store the new content with categorization
            for (const content of newContent) {
                await this.storage.addContent({
                    competitorId: competitorId,
                    competitorLabel: competitor.label,
                    ...content
                });
            }

            await this.storage.addActivity({
                text: `Found ${newContent.length} new post(s) from ${competitor.label}`,
                type: 'content'
            });

            await this.sendContentNotification(competitor, newContent);

            try {
                chrome.runtime.sendMessage({
                    action: 'competitorUpdated',
                    competitor: competitor.label,
                    newContentCount: newContent.length
                });
            } catch (error) {
                // Popup might not be open
            }
        }
    }

    async sendContentNotification(competitor, newContent) {
        const settings = await chrome.storage.sync.get(['settings']);
        const notificationSettings = settings.settings?.notifications;
        
        if (!notificationSettings?.enabled) return;

        const message = newContent.length === 1 
            ? `New content: "${newContent[0].title}"`
            : `${newContent.length} new posts found`;

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: `${competitor.label} - New Content`,
            message: message
        });
    }

    async refreshAllCompetitors() {
        const competitors = await this.storage.getCompetitors();
        const activeCompetitors = competitors.filter(c => c.isActive);

        console.log(`Refreshing ${activeCompetitors.length} competitors`);

        let successCount = 0;
        let errorCount = 0;

        for (const competitor of activeCompetitors) {
            try {
                await this.checkCompetitorContent(competitor.id);
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`Failed to refresh ${competitor.label}:`, error);
                errorCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`Refresh complete: ${successCount} successful, ${errorCount} errors`);

        try {
            chrome.runtime.sendMessage({
                action: 'refreshComplete',
                successCount,
                errorCount
            });
        } catch (error) {
            console.log('Could not notify popup of refresh completion');
        }

        await this.storage.addActivity({
            text: `Refresh completed: ${successCount} successful, ${errorCount} errors`,
            type: 'refresh'
        });
    }

    async getMonitoringStatus() {
        const competitors = await this.storage.getCompetitors();
        const alarms = await chrome.alarms.getAll();
        
        return {
            totalCompetitors: competitors.length,
            activeCompetitors: competitors.filter(c => c.isActive).length,
            monitoringAlarms: alarms.filter(a => a.name.startsWith('monitor_')).length,
            totalUrls: competitors.reduce((sum, c) => sum + this.getCompetitorUrls(c).length, 0)
        };
    }

    // Helper methods
    async tabExists(tabId) {
        try {
            await chrome.tabs.get(tabId);
            return true;
        } catch {
            return false;
        }
    }

    async safeCloseTab(tabId) {
        try {
            if (await this.tabExists(tabId)) {
                await chrome.tabs.remove(tabId);
                console.log(`Successfully closed tab ${tabId}`);
                return true;
            } else {
                console.log(`Tab ${tabId} was already closed`);
                return false;
            }
        } catch (error) {
            console.log(`Could not close tab ${tabId}: ${error.message}`);
            return false;
        }
    }

    generateFingerprint(title, url) {
        const content = `${title}|${url}`;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async getStoredContentFingerprints(competitorId) {
        try {
            const result = await chrome.storage.local.get([`fingerprints_${competitorId}`]);
            return result[`fingerprints_${competitorId}`] || [];
        } catch (error) {
            console.error('Error getting stored fingerprints:', error);
            return [];
        }
    }

    async storeContentFingerprints(competitorId, newFingerprints) {
        try {
            const existingFingerprints = await this.getStoredContentFingerprints(competitorId);
            const allFingerprints = [...existingFingerprints, ...newFingerprints];
            
            if (allFingerprints.length > 200) {
                allFingerprints.splice(0, allFingerprints.length - 200);
            }

            await chrome.storage.local.set({
                [`fingerprints_${competitorId}`]: allFingerprints
            });
        } catch (error) {
            console.error('Error storing fingerprints:', error);
        }
    }
}

// RSS Parser Class
class RSSParser {
    async parseFeed(feedUrl) {
        try {
            const response = await fetch(feedUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for parsing errors
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('Invalid XML format');
            }
            
            // Detect feed type (RSS or Atom)
            if (xmlDoc.getElementsByTagName('rss').length > 0) {
                return this.parseRSSFeed(xmlDoc);
            } else if (xmlDoc.getElementsByTagName('feed').length > 0) {
                return this.parseAtomFeed(xmlDoc);
            } else {
                throw new Error('Unknown feed format');
            }
        } catch (error) {
            console.error('Error parsing RSS feed:', error);
            throw error;
        }
    }

    parseRSSFeed(xmlDoc) {
        const items = [];
        const itemElements = xmlDoc.getElementsByTagName('item');
        
        for (let i = 0; i < itemElements.length; i++) {
            const item = itemElements[i];
            
            const title = this.getElementText(item, 'title');
            const link = this.getElementText(item, 'link');
            const description = this.getElementText(item, 'description');
            const pubDate = this.getElementText(item, 'pubDate');
            const author = this.getElementText(item, 'author') || this.getElementText(item, 'dc:creator');
            
            if (title && link) {
                items.push({
                    title: title,
                    link: link,
                    description: description,
                    pubDate: pubDate ? new Date(pubDate).toISOString() : null,
                    author: author
                });
            }
        }
        
        return {
            title: this.getElementText(xmlDoc, 'title'),
            description: this.getElementText(xmlDoc, 'description'),
            link: this.getElementText(xmlDoc, 'link'),
            items: items
        };
    }

    parseAtomFeed(xmlDoc) {
        const items = [];
        const entryElements = xmlDoc.getElementsByTagName('entry');
        
        for (let i = 0; i < entryElements.length; i++) {
            const entry = entryElements[i];
            
            const title = this.getElementText(entry, 'title');
            const linkElement = entry.getElementsByTagName('link')[0];
            const link = linkElement ? linkElement.getAttribute('href') : null;
            const summary = this.getElementText(entry, 'summary') || this.getElementText(entry, 'content');
            const published = this.getElementText(entry, 'published') || this.getElementText(entry, 'updated');
            const authorElement = entry.getElementsByTagName('author')[0];
            const author = authorElement ? this.getElementText(authorElement, 'name') : null;
            
            if (title && link) {
                items.push({
                    title: title,
                    link: link,
                    description: summary,
                    pubDate: published ? new Date(published).toISOString() : null,
                    author: author
                });
            }
        }
        
        return {
            title: this.getElementText(xmlDoc, 'title'),
            description: this.getElementText(xmlDoc, 'subtitle'),
            link: xmlDoc.getElementsByTagName('link')[0]?.getAttribute('href'),
            items: items
        };
    }

    getElementText(parent, tagName) {
        const element = parent.getElementsByTagName(tagName)[0];
        return element ? element.textContent.trim() : null;
    }
}

// Website Crawler Class
class WebsiteCrawler {
    async discoverFeeds(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const feeds = [];
            
            // Look for RSS/Atom feed links in head
            const feedLinks = doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
            feedLinks.forEach(link => {
                const feedUrl = new URL(link.href, url).href;
                feeds.push({
                    url: feedUrl,
                    title: link.title || 'RSS Feed',
                    type: link.type.includes('rss') ? 'rss' : 'atom'
                });
            });
            
            // Look for common RSS URL patterns
            const commonPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/feeds/all.atom.xml'];
            for (const path of commonPaths) {
                try {
                    const feedUrl = new URL(path, url).href;
                    const response = await fetch(feedUrl, { method: 'HEAD' });
                    if (response.ok) {
                        const contentType = response.headers.get('content-type');
                        if (contentType && (contentType.includes('xml') || contentType.includes('rss'))) {
                            feeds.push({
                                url: feedUrl,
                                title: 'Discovered Feed',
                                type: 'rss'
                            });
                        }
                    }
                } catch {
                    // Continue with next path
                }
            }
            
            return feeds;
        } catch (error) {
            console.error('Error discovering feeds:', error);
            return [];
        }
    }

    async findContentSections(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const baseUrl = new URL(url);
            const discoveredUrls = [];
            
            // Look for navigation links that might lead to content sections
            const navSelectors = [
                'nav a',
                '.navigation a',
                '.menu a',
                'header a',
                '.nav a'
            ];
            
            const contentKeywords = [
                'blog', 'news', 'articles', 'posts', 'insights', 'resources',
                'updates', 'announcements', 'press', 'media', 'stories'
            ];
            
            navSelectors.forEach(selector => {
                const links = doc.querySelectorAll(selector);
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    const text = link.textContent.toLowerCase().trim();
                    
                    if (href && contentKeywords.some(keyword => text.includes(keyword))) {
                        try {
                            const fullUrl = new URL(href, baseUrl).href;
                            discoveredUrls.push({
                                url: fullUrl,
                                type: 'page',
                                label: link.textContent.trim(),
                                detected: 'navigation'
                            });
                        } catch {
                            // Invalid URL, skip
                        }
                    }
                });
            });
            
            // Look for common content section URLs
            const commonPaths = [
                '/blog',
                '/news',
                '/articles',
                '/insights',
                '/resources',
                '/updates',
                '/press',
                '/media'
            ];
            
            for (const path of commonPaths) {
                try {
                    const testUrl = new URL(path, baseUrl).href;
                    const response = await fetch(testUrl, { method: 'HEAD' });
                    if (response.ok) {
                        discoveredUrls.push({
                            url: testUrl,
                            type: 'page',
                            label: path.substring(1).charAt(0).toUpperCase() + path.substring(2),
                            detected: 'common_pattern'
                        });
                    }
                } catch {
                    // Continue with next path
                }
            }
            
            // Remove duplicates
            const uniqueUrls = discoveredUrls.filter((url, index, self) =>
                index === self.findIndex(u => u.url === url.url)
            );
            
            return uniqueUrls;
        } catch (error) {
            console.error('Error finding content sections:', error);
            return [];
        }
    }
}

// Content Categorizer Class
class ContentCategorizer {
    constructor() {
        this.categories = {
            'Product Updates': ['product', 'feature', 'release', 'update', 'launch', 'version'],
            'Company News': ['company', 'team', 'hiring', 'office', 'partnership', 'acquisition'],
            'Industry Insights': ['industry', 'market', 'trend', 'analysis', 'research', 'report'],
            'How-To Guides': ['how to', 'guide', 'tutorial', 'step', 'learn', 'beginner'],
            'Case Studies': ['case study', 'success story', 'customer', 'client', 'results'],
            'Thought Leadership': ['opinion', 'perspective', 'future', 'prediction', 'vision'],
            'Technical': ['api', 'technical', 'code', 'developer', 'integration', 'documentation'],
            'Marketing': ['marketing', 'campaign', 'brand', 'advertising', 'promotion'],
            'Events': ['event', 'conference', 'webinar', 'workshop', 'meetup', 'summit'],
            'Press Release': ['press release', 'announces', 'announcement', 'official']
        };
    }

    async categorize(content) {
        const text = `${content.title} ${content.content}`.toLowerCase();
        const scores = {};
        
        // Calculate scores for each category
        Object.entries(this.categories).forEach(([category, keywords]) => {
            let score = 0;
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });
            scores[category] = score;
        });
        
        // Find the category with the highest score
        const sortedCategories = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .filter(([,score]) => score > 0);
        
        if (sortedCategories.length === 0) {
            return {
                primary: 'General',
                all: ['General'],
                confidence: 0,
                tags: []
            };
        }
        
        const primaryCategory = sortedCategories[0][0];
        const primaryScore = sortedCategories[0][1];
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const confidence = totalScore > 0 ? primaryScore / totalScore : 0;
        
        // Extract tags based on keyword matches
        const tags = [];
        Object.entries(this.categories).forEach(([category, keywords]) => {
            keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    tags.push(keyword);
                }
            });
        });
        
        return {
            primary: primaryCategory,
            all: sortedCategories.slice(0, 3).map(([category]) => category),
            confidence: Math.round(confidence * 100) / 100,
            tags: [...new Set(tags)].slice(0, 10) // Unique tags, max 10
        };
    }
}

// Initialize the enhanced background service worker
const contentSpyBackground = new ContentSpyBackgroundEnhanced();