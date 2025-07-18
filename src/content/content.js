// ContentSpy Content Script
class ContentDetector {
    constructor() {
        this.contentSelectors = {
            // Common blog/news article selectors
            articles: [
                'article',
                '[role="article"]',
                '.post',
                '.article',
                '.news-item',
                '.blog-post',
                '.entry',
                '.story'
            ],
            titles: [
                'h1',
                'h2',
                '.title',
                '.headline',
                '.post-title',
                '.entry-title',
                '.article-title'
            ],
            content: [
                '.content',
                '.post-content',
                '.entry-content',
                '.article-content',
                '.description',
                '.excerpt',
                '.summary'
            ],
            dates: [
                'time',
                '.date',
                '.published',
                '.post-date',
                '.article-date',
                '[datetime]'
            ],
            authors: [
                '.author',
                '.byline',
                '.post-author',
                '.article-author',
                '[rel="author"]'
            ]
        };
        
        this.lastKnownContent = new Set();
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'checkContent') {
                this.analyzePageContent(request.competitor)
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ error: error.message }));
                return true; // Keep message channel open
            }
        });
    }

    async analyzePageContent(competitor) {
        console.log(`Analyzing content for ${competitor.label} on ${window.location.href}`);

        try {
            // Get stored content fingerprints for this competitor
            const storedContent = await this.getStoredContentFingerprints(competitor.id);
            
            // Detect content on current page
            const detectedContent = await this.detectContent();
            
            // Filter out already known content
            const newContent = this.filterNewContent(detectedContent, storedContent);
            
            if (newContent.length > 0) {
                console.log(`Found ${newContent.length} new content items`);
                
                // Store the new content fingerprints
                await this.storeContentFingerprints(competitor.id, newContent);
                
                // Notify background script
                chrome.runtime.sendMessage({
                    action: 'contentDetected',
                    data: {
                        competitorId: competitor.id,
                        newContent: newContent
                    }
                });
            }

            return {
                success: true,
                totalFound: detectedContent.length,
                newFound: newContent.length
            };

        } catch (error) {
            console.error('Error analyzing content:', error);
            return { success: false, error: error.message };
        }
    }

    async detectContent() {
        const content = [];
        
        // Strategy 1: Look for RSS/Atom feeds
        const feedContent = this.detectFeedContent();
        content.push(...feedContent);

        // Strategy 2: Detect articles/posts using common selectors
        const articleContent = this.detectArticleContent();
        content.push(...articleContent);

        // Strategy 3: Look for structured data (JSON-LD, microdata)
        const structuredContent = this.detectStructuredContent();
        content.push(...structuredContent);

        // Strategy 4: Look for common CMS patterns (WordPress, etc.)
        const cmsContent = this.detectCMSContent();
        content.push(...cmsContent);

        // Remove duplicates based on title and URL
        return this.deduplicateContent(content);
    }

    detectFeedContent() {
        const content = [];
        
        // Look for RSS/Atom feed links
        const feedLinks = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        
        // For now, just note that feeds are available
        // In a full implementation, you'd fetch and parse the feeds
        feedLinks.forEach(link => {
            console.log(`Found feed: ${link.href}`);
        });

        return content;
    }

    detectArticleContent() {
        const content = [];
        
        // Look for article elements
        const articles = this.findElements(this.contentSelectors.articles);
        
        articles.forEach((article, index) => {
            const contentItem = this.extractContentFromElement(article, index);
            if (contentItem && this.isValidContent(contentItem)) {
                content.push(contentItem);
            }
        });

        // If no articles found, look for title/content patterns in the main content
        if (content.length === 0) {
            const mainContent = this.detectMainPageContent();
            if (mainContent) {
                content.push(mainContent);
            }
        }

        return content;
    }

    detectMainPageContent() {
        // Look for main page content (single article pages, etc.)
        const title = this.findBestTitle();
        const content = this.findMainContent();
        const date = this.findPublishDate();
        const author = this.findAuthor();

        if (title) {
            return {
                title: title,
                content: content || '',
                url: window.location.href,
                publishDate: date,
                author: author,
                type: 'article',
                fingerprint: this.generateFingerprint(title, window.location.href)
            };
        }

        return null;
    }

    extractContentFromElement(element, index) {
        const title = this.findChildElement(element, this.contentSelectors.titles);
        const content = this.findChildElement(element, this.contentSelectors.content);
        const date = this.findChildElement(element, this.contentSelectors.dates);
        const author = this.findChildElement(element, this.contentSelectors.authors);

        // Look for links within the article
        const link = element.querySelector('a[href]');
        const url = link ? this.resolveURL(link.href) : window.location.href;

        if (!title) {
            return null;
        }

        const titleText = this.cleanText(title.textContent);
        const contentText = content ? this.cleanText(content.textContent) : '';
        
        return {
            title: titleText,
            content: contentText.substring(0, 500), // Limit content preview
            url: url,
            publishDate: this.extractDate(date),
            author: author ? this.cleanText(author.textContent) : null,
            type: 'article',
            fingerprint: this.generateFingerprint(titleText, url),
            element: index
        };
    }

    detectStructuredContent() {
        const content = [];
        
        // Look for JSON-LD structured data
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                const articles = this.extractArticlesFromStructuredData(data);
                content.push(...articles);
            } catch (error) {
                console.warn('Error parsing JSON-LD:', error);
            }
        });

        // Look for microdata
        const microdataItems = document.querySelectorAll('[itemtype*="Article"]');
        microdataItems.forEach(item => {
            const article = this.extractArticleFromMicrodata(item);
            if (article) {
                content.push(article);
            }
        });

        return content;
    }

    extractArticlesFromStructuredData(data) {
        const articles = [];
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                articles.push(...this.extractArticlesFromStructuredData(item));
            });
        } else if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
            const article = {
                title: data.headline || data.name,
                content: (data.description || '').substring(0, 500),
                url: data.url || window.location.href,
                publishDate: data.datePublished,
                author: data.author?.name || data.author,
                type: 'article',
                fingerprint: this.generateFingerprint(data.headline || data.name, data.url || window.location.href)
            };
            articles.push(article);
        }

        return articles;
    }

    extractArticleFromMicrodata(element) {
        const title = element.querySelector('[itemprop="headline"], [itemprop="name"]')?.textContent;
        const description = element.querySelector('[itemprop="description"]')?.textContent;
        const url = element.querySelector('[itemprop="url"]')?.href;
        const datePublished = element.querySelector('[itemprop="datePublished"]')?.getAttribute('datetime');
        const author = element.querySelector('[itemprop="author"]')?.textContent;

        if (title) {
            return {
                title: this.cleanText(title),
                content: description ? this.cleanText(description).substring(0, 500) : '',
                url: url || window.location.href,
                publishDate: datePublished,
                author: author ? this.cleanText(author) : null,
                type: 'article',
                fingerprint: this.generateFingerprint(title, url || window.location.href)
            };
        }

        return null;
    }

    detectCMSContent() {
        const content = [];
        
        // WordPress detection
        if (this.isWordPressSite()) {
            const wpContent = this.detectWordPressContent();
            content.push(...wpContent);
        }

        // Shopify blog detection
        if (this.isShopifySite()) {
            const shopifyContent = this.detectShopifyContent();
            content.push(...shopifyContent);
        }

        return content;
    }

    isWordPressSite() {
        return document.querySelector('meta[name="generator"][content*="WordPress"]') ||
               document.querySelector('body.wordpress') ||
               document.querySelector('#wp-') ||
               window.wp !== undefined;
    }

    detectWordPressContent() {
        const content = [];
        
        // WordPress posts typically have these classes/structures
        const posts = document.querySelectorAll('.post, .hentry, article[id^="post-"]');
        
        posts.forEach((post, index) => {
            const contentItem = this.extractContentFromElement(post, index);
            if (contentItem) {
                content.push(contentItem);
            }
        });

        return content;
    }

    isShopifySite() {
        return document.querySelector('meta[name="shopify-checkout-api-token"]') ||
               window.Shopify !== undefined ||
               document.querySelector('script[src*="shopify"]');
    }

    detectShopifyContent() {
        const content = [];
        
        // Shopify blog posts
        const posts = document.querySelectorAll('.article, .blog-post, .post');
        
        posts.forEach((post, index) => {
            const contentItem = this.extractContentFromElement(post, index);
            if (contentItem) {
                content.push(contentItem);
            }
        });

        return content;
    }

    // Helper methods
    findElements(selectors) {
        const elements = [];
        selectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            elements.push(...Array.from(found));
        });
        return [...new Set(elements)]; // Remove duplicates
    }

    findChildElement(parent, selectors) {
        for (const selector of selectors) {
            const element = parent.querySelector(selector);
            if (element) {
                return element;
            }
        }
        return null;
    }

    findBestTitle() {
        // Priority order for title detection
        const titleSelectors = [
            'h1',
            '.entry-title',
            '.post-title',
            '.article-title',
            '.title',
            'meta[property="og:title"]',
            'title'
        ];

        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const content = selector === 'meta[property="og:title"]' 
                    ? element.getAttribute('content')
                    : element.textContent;
                
                if (content && content.trim().length > 0) {
                    return this.cleanText(content);
                }
            }
        }

        return null;
    }

    findMainContent() {
        const contentSelectors = [
            '.entry-content',
            '.post-content',
            '.article-content',
            '.content',
            'main',
            '[role="main"]'
        ];

        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return this.cleanText(element.textContent);
            }
        }

        return null;
    }

    findPublishDate() {
        const dateSelectors = [
            'time[datetime]',
            '.published',
            '.post-date',
            '.article-date',
            'meta[property="article:published_time"]'
        ];

        for (const selector of dateSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const date = element.getAttribute('datetime') || 
                           element.getAttribute('content') || 
                           element.textContent;
                
                if (date) {
                    return this.extractDate({ textContent: date });
                }
            }
        }

        return null;
    }

    findAuthor() {
        const authorSelectors = [
            '.author',
            '.byline',
            '.post-author',
            '[rel="author"]',
            'meta[name="author"]'
        ];

        for (const selector of authorSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const author = element.getAttribute('content') || element.textContent;
                if (author && author.trim().length > 0) {
                    return this.cleanText(author);
                }
            }
        }

        return null;
    }

    extractDate(element) {
        if (!element) return null;
        
        const dateText = element.getAttribute('datetime') || element.textContent;
        if (!dateText) return null;

        try {
            const date = new Date(dateText);
            return date.toISOString();
        } catch {
            return null;
        }
    }

    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ') : '';
    }

    resolveURL(url) {
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    generateFingerprint(title, url) {
        const content = `${title}|${url}`;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    isValidContent(content) {
        return content &&
               content.title &&
               content.title.length > 10 &&
               content.title.length < 200 &&
               content.url &&
               !content.title.toLowerCase().includes('cookie') &&
               !content.title.toLowerCase().includes('privacy policy');
    }

    deduplicateContent(content) {
        const seen = new Set();
        return content.filter(item => {
            const key = `${item.title}|${item.url}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    filterNewContent(detectedContent, storedFingerprints) {
        return detectedContent.filter(content => 
            !storedFingerprints.includes(content.fingerprint)
        );
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

    async storeContentFingerprints(competitorId, newContent) {
        try {
            const fingerprints = await this.getStoredContentFingerprints(competitorId);
            const newFingerprints = newContent.map(c => c.fingerprint);
            
            const updatedFingerprints = [...fingerprints, ...newFingerprints];
            
            // Keep only last 200 fingerprints to manage storage efficiently
            if (updatedFingerprints.length > 200) {
                updatedFingerprints.splice(0, updatedFingerprints.length - 200);
            }

            await chrome.storage.local.set({
                [`fingerprints_${competitorId}`]: updatedFingerprints
            });
        } catch (error) {
            console.error('Error storing fingerprints:', error);
        }
    }
}

// Initialize content detector when script loads
if (typeof window !== 'undefined') {
    window.contentDetector = new ContentDetector();
}