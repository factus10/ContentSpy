// ContentSpy Enhanced Content Detection Script - Phase 2
class EnhancedContentDetector {
    constructor() {
        this.contentSelectors = {
            articles: [
                'article',
                '[role="article"]',
                '.post',
                '.article',
                '.news-item',
                '.blog-post',
                '.entry',
                '.story',
                '.content-item',
                '.post-item'
            ],
            titles: [
                'h1',
                'h2',
                '.title',
                '.headline',
                '.post-title',
                '.entry-title',
                '.article-title',
                '.content-title'
            ],
            content: [
                '.content',
                '.post-content',
                '.entry-content',
                '.article-content',
                '.description',
                '.excerpt',
                '.summary',
                '.post-body'
            ],
            dates: [
                'time',
                '.date',
                '.published',
                '.post-date',
                '.article-date',
                '[datetime]',
                '.publish-date',
                '.created-date'
            ],
            authors: [
                '.author',
                '.byline',
                '.post-author',
                '.article-author',
                '[rel="author"]',
                '.writer',
                '.created-by'
            ]
        };
        
        this.lastKnownContent = new Set();
        this.contentExtractor = new ContentExtractor();
        this.seoAnalyzer = new SEOAnalyzer();
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'checkContent') {
                this.analyzePageContent(request.competitor)
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ error: error.message }));
                return true;
            } else if (request.action === 'discoverFeeds') {
                this.discoverRSSFeeds()
                    .then(feeds => sendResponse({ feeds }))
                    .catch(error => sendResponse({ error: error.message }));
                return true;
            } else if (request.action === 'findContentSections') {
                this.findContentSections()
                    .then(sections => sendResponse({ sections }))
                    .catch(error => sendResponse({ error: error.message }));
                return true;
            }
        });
    }

    async analyzePageContent(competitor) {
        console.log(`Enhanced analysis for ${competitor.label} on ${window.location.href}`);

        try {
            // Get stored content fingerprints
            const storedContent = await this.getStoredContentFingerprints(competitor.id);
            
            // Multiple detection strategies
            const detectedContent = await this.detectContentMultipleWays();
            
            // Enhanced content processing
            const processedContent = await this.processDetectedContent(detectedContent);
            
            // Filter out known content
            const newContent = this.filterNewContent(processedContent, storedContent);
            
            if (newContent.length > 0) {
                console.log(`Found ${newContent.length} new content items`);
                
                // Store fingerprints
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
                newFound: newContent.length,
                url: window.location.href
            };

        } catch (error) {
            console.error('Error in enhanced content analysis:', error);
            return { success: false, error: error.message };
        }
    }

    async detectContentMultipleWays() {
        const allContent = [];
        
        // Strategy 1: RSS/Atom feed discovery and parsing
        const feedContent = await this.detectAndParseFeedContent();
        allContent.push(...feedContent);

        // Strategy 2: Enhanced article detection
        const articleContent = await this.detectArticleContentEnhanced();
        allContent.push(...articleContent);

        // Strategy 3: Improved structured data detection
        const structuredContent = await this.detectStructuredContentEnhanced();
        allContent.push(...structuredContent);

        // Strategy 4: CMS-specific detection with more patterns
        const cmsContent = await this.detectCMSContentEnhanced();
        allContent.push(...cmsContent);

        // Strategy 5: Social media content detection
        const socialContent = await this.detectSocialContent();
        allContent.push(...socialContent);

        // Strategy 6: News aggregator detection
        const newsContent = await this.detectNewsContent();
        allContent.push(...newsContent);

        return this.deduplicateContent(allContent);
    }

    async detectAndParseFeedContent() {
        const content = [];
        
        // Look for feed links in the page
        const feedLinks = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        
        for (const feedLink of feedLinks) {
            try {
                console.log(`Found feed: ${feedLink.href}`);
                // Note: In a real implementation, you'd parse the feed here
                // For now, we'll just note the availability
                content.push({
                    title: `RSS Feed: ${feedLink.title || 'Untitled'}`,
                    content: 'RSS feed detected on this page',
                    url: feedLink.href,
                    type: 'feed',
                    source: 'rss_discovery'
                });
            } catch (error) {
                console.warn('Error processing feed link:', error);
            }
        }

        return content;
    }

    async detectArticleContentEnhanced() {
        const content = [];
        
        // Enhanced article detection with multiple strategies
        const articles = this.findElements(this.contentSelectors.articles);
        
        for (const [index, article] of articles.entries()) {
            const contentItem = await this.extractContentFromElementEnhanced(article, index);
            if (contentItem && this.isValidContentEnhanced(contentItem)) {
                // Add SEO analysis
                contentItem.seoAnalysis = this.seoAnalyzer.analyze(contentItem);
                content.push(contentItem);
            }
        }

        // If no articles found, try page-level detection
        if (content.length === 0) {
            const mainContent = await this.detectMainPageContentEnhanced();
            if (mainContent) {
                content.push(mainContent);
            }
        }

        // Look for pagination and load more content
        const paginatedContent = await this.detectPaginatedContent();
        content.push(...paginatedContent);

        return content;
    }

    async extractContentFromElementEnhanced(element, index) {
        const extracted = this.contentExtractor.extractFromElement(element);
        
        if (!extracted.title) {
            return null;
        }

        // Enhanced metadata extraction
        const metadata = this.extractMetadata(element);
        const readingTime = this.calculateReadingTime(extracted.content);
        const wordCount = this.countWords(extracted.content);
        
        return {
            title: extracted.title,
            content: extracted.content.substring(0, 1000), // Increased preview length
            url: extracted.url || window.location.href,
            publishDate: extracted.publishDate,
            author: extracted.author,
            type: this.detectContentType(extracted),
            source: 'enhanced_detection',
            fingerprint: this.generateFingerprint(extracted.title, extracted.url),
            element: index,
            metadata: metadata,
            readingTime: readingTime,
            wordCount: wordCount,
            images: this.extractImages(element),
            links: this.extractLinks(element)
        };
    }

    extractMetadata(element) {
        const metadata = {};
        
        // Extract meta tags if we're at document level
        if (element === document || element === document.documentElement) {
            const metaTags = document.querySelectorAll('meta[property], meta[name]');
            metaTags.forEach(meta => {
                const property = meta.getAttribute('property') || meta.getAttribute('name');
                const content = meta.getAttribute('content');
                if (property && content) {
                    metadata[property] = content;
                }
            });
        }
        
        // Extract data attributes from element
        Array.from(element.attributes || []).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                metadata[attr.name] = attr.value;
            }
        });
        
        return metadata;
    }

    calculateReadingTime(text) {
        const wordsPerMinute = 250;
        const wordCount = this.countWords(text);
        return Math.ceil(wordCount / wordsPerMinute);
    }

    countWords(text) {
        return text ? text.trim().split(/\s+/).length : 0;
    }

    detectContentType(content) {
        const title = content.title.toLowerCase();
        const text = `${content.title} ${content.content}`.toLowerCase();
        
        // Enhanced content type detection
        if (title.includes('how to') || title.includes('guide') || title.includes('tutorial')) {
            return 'guide';
        } else if (title.includes('case study') || text.includes('case study')) {
            return 'case_study';
        } else if (title.includes('review') || text.includes('review')) {
            return 'review';
        } else if (title.includes('news') || title.includes('announcement')) {
            return 'news';
        } else if (title.includes('interview') || text.includes('interview')) {
            return 'interview';
        } else if (title.includes('analysis') || title.includes('report')) {
            return 'analysis';
        } else if (title.includes('opinion') || title.includes('editorial')) {
            return 'opinion';
        } else {
            return 'article';
        }
    }

    extractImages(element) {
        const images = [];
        const imgElements = element.querySelectorAll('img');
        
        imgElements.forEach(img => {
            const src = img.src;
            const alt = img.alt;
            const title = img.title;
            
            if (src && !src.includes('data:image')) {
                images.push({
                    src: this.resolveURL(src),
                    alt: alt || '',
                    title: title || ''
                });
            }
        });
        
        return images.slice(0, 5); // Limit to 5 images
    }

    extractLinks(element) {
        const links = [];
        const linkElements = element.querySelectorAll('a[href]');
        
        linkElements.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();
            
            if (href && text && !href.startsWith('#')) {
                links.push({
                    url: this.resolveURL(href),
                    text: text,
                    title: link.title || ''
                });
            }
        });
        
        return links.slice(0, 10); // Limit to 10 links
    }

    async detectMainPageContentEnhanced() {
        const title = this.findBestTitle();
        const content = this.findMainContent();
        const date = this.findPublishDate();
        const author = this.findAuthor();
        
        if (!title) return null;

        const mainContent = {
            title: title,
            content: content || '',
            url: window.location.href,
            publishDate: date,
            author: author,
            type: this.detectContentType({ title, content }),
            source: 'main_page',
            fingerprint: this.generateFingerprint(title, window.location.href),
            readingTime: this.calculateReadingTime(content),
            wordCount: this.countWords(content),
            metadata: this.extractMetadata(document)
        };

        // Add schema.org data if available
        const schemaData = this.extractSchemaOrgData();
        if (schemaData) {
            mainContent.schema = schemaData;
        }

        return mainContent;
    }

    async detectPaginatedContent() {
        const content = [];
        
        // Look for "Load More" buttons or pagination
        const loadMoreButtons = document.querySelectorAll(
            '[data-load-more], .load-more, .show-more, .pagination a'
        );
        
        if (loadMoreButtons.length > 0) {
            // Note: In a real implementation, you might trigger these buttons
            // and wait for new content to load
            console.log(`Found ${loadMoreButtons.length} pagination elements`);
        }
        
        return content;
    }

    async detectStructuredContentEnhanced() {
        const content = [];
        
        // Enhanced JSON-LD parsing
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        
        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent);
                const articles = this.extractArticlesFromStructuredDataEnhanced(data);
                content.push(...articles);
            } catch (error) {
                console.warn('Error parsing JSON-LD:', error);
            }
        }

        // Enhanced microdata detection
        const microdataItems = document.querySelectorAll('[itemtype*="Article"], [itemtype*="BlogPosting"], [itemtype*="NewsArticle"]');
        for (const item of microdataItems) {
            const article = this.extractArticleFromMicrodataEnhanced(item);
            if (article) {
                content.push(article);
            }
        }

        return content;
    }

    extractArticlesFromStructuredDataEnhanced(data) {
        const articles = [];
        
        const processItem = (item) => {
            if (!item || typeof item !== 'object') return;
            
            const types = ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'ScholarlyArticle'];
            const itemType = item['@type'];
            
            if (types.includes(itemType)) {
                const article = {
                    title: item.headline || item.name || item.title,
                    content: (item.description || item.abstract || '').substring(0, 1000),
                    url: item.url || item.mainEntityOfPage?.['@id'] || window.location.href,
                    publishDate: item.datePublished || item.dateCreated,
                    modifiedDate: item.dateModified,
                    author: this.extractAuthorFromSchema(item.author),
                    publisher: this.extractPublisherFromSchema(item.publisher),
                    type: this.mapSchemaTypeToContentType(itemType),
                    source: 'structured_data',
                    fingerprint: this.generateFingerprint(
                        item.headline || item.name, 
                        item.url || window.location.href
                    ),
                    schema: {
                        type: itemType,
                        wordCount: item.wordCount,
                        keywords: item.keywords,
                        image: item.image,
                        video: item.video
                    }
                };
                
                if (article.title) {
                    articles.push(article);
                }
            }
            
            // Recursively process arrays and nested objects
            if (Array.isArray(item)) {
                item.forEach(processItem);
            } else if (typeof item === 'object') {
                Object.values(item).forEach(processItem);
            }
        };
        
        processItem(data);
        return articles;
    }

    extractAuthorFromSchema(author) {
        if (!author) return null;
        
        if (typeof author === 'string') return author;
        if (author.name) return author.name;
        if (Array.isArray(author)) {
            return author.map(a => a.name || a).join(', ');
        }
        
        return null;
    }

    extractPublisherFromSchema(publisher) {
        if (!publisher) return null;
        
        if (typeof publisher === 'string') return publisher;
        if (publisher.name) return publisher.name;
        
        return null;
    }

    mapSchemaTypeToContentType(schemaType) {
        const mapping = {
            'Article': 'article',
            'BlogPosting': 'blog_post',
            'NewsArticle': 'news',
            'TechArticle': 'technical',
            'ScholarlyArticle': 'research'
        };
        
        return mapping[schemaType] || 'article';
    }

    async detectCMSContentEnhanced() {
        const content = [];
        
        // Enhanced WordPress detection
        if (this.isWordPressSite()) {
            const wpContent = await this.detectWordPressContentEnhanced();
            content.push(...wpContent);
        }
        
        // Enhanced Shopify detection
        if (this.isShopifySite()) {
            const shopifyContent = await this.detectShopifyContentEnhanced();
            content.push(...shopifyContent);
        }
        
        // Drupal detection
        if (this.isDrupalSite()) {
            const drupalContent = await this.detectDrupalContent();
            content.push(...drupalContent);
        }
        
        // Ghost detection
        if (this.isGhostSite()) {
            const ghostContent = await this.detectGhostContent();
            content.push(...ghostContent);
        }
        
        // Medium detection
        if (this.isMediumSite()) {
            const mediumContent = await this.detectMediumContent();
            content.push(...mediumContent);
        }

        return content;
    }

    async detectWordPressContentEnhanced() {
        const content = [];
        
        // Enhanced WordPress selectors
        const wpSelectors = [
            '.post', '.hentry', 'article[id^="post-"]',
            '.wp-block-post', '.entry', '.blog-post',
            '.post-item', '.article-item'
        ];
        
        const posts = document.querySelectorAll(wpSelectors.join(', '));
        
        for (const [index, post] of posts.entries()) {
            const contentItem = await this.extractContentFromElementEnhanced(post, index);
            if (contentItem) {
                contentItem.cms = 'wordpress';
                content.push(contentItem);
            }
        }

        return content;
    }

    isDrupalSite() {
        return document.querySelector('meta[name="Generator"][content*="Drupal"]') ||
               document.querySelector('body.drupal') ||
               document.querySelector('[data-drupal-*]') ||
               window.Drupal !== undefined;
    }

    isGhostSite() {
        return document.querySelector('meta[name="generator"][content*="Ghost"]') ||
               document.querySelector('body.ghost-site') ||
               document.querySelector('.gh-*');
    }

    isMediumSite() {
        return window.location.hostname.includes('medium.com') ||
               document.querySelector('meta[property="al:web:url"][content*="medium.com"]');
    }

    async detectSocialContent() {
        const content = [];
        
        // Twitter/X content detection
        if (this.isTwitterSite()) {
            const tweets = await this.detectTweets();
            content.push(...tweets);
        }
        
        // LinkedIn content detection
        if (this.isLinkedInSite()) {
            const linkedinPosts = await this.detectLinkedInPosts();
            content.push(...linkedinPosts);
        }

        return content;
    }

    isTwitterSite() {
        return window.location.hostname.includes('twitter.com') ||
               window.location.hostname.includes('x.com');
    }

    isLinkedInSite() {
        return window.location.hostname.includes('linkedin.com');
    }

    async detectNewsContent() {
        const content = [];
        
        // News-specific selectors
        const newsSelectors = [
            '.news-item', '.article', '.story',
            '[data-news]', '.post-preview',
            '.headline', '.news-article'
        ];
        
        const newsItems = document.querySelectorAll(newsSelectors.join(', '));
        
        for (const [index, item] of newsItems.entries()) {
            const contentItem = await this.extractContentFromElementEnhanced(item, index);
            if (contentItem) {
                contentItem.contentCategory = 'news';
                content.push(contentItem);
            }
        }

        return content;
    }

    async processDetectedContent(content) {
        const processed = [];
        
        for (const item of content) {
            try {
                // Add enhanced processing
                const processedItem = {
                    ...item,
                    processedAt: new Date().toISOString(),
                    language: this.detectLanguage(item.content),
                    sentiment: this.analyzeSentiment(item.content),
                    topics: this.extractTopics(item.content),
                    readabilityScore: this.calculateReadability(item.content)
                };
                
                processed.push(processedItem);
            } catch (error) {
                console.warn('Error processing content item:', error);
                processed.push(item); // Include unprocessed item
            }
        }
        
        return processed;
    }

    detectLanguage(text) {
        // Simple language detection based on common words
        const languages = {
            english: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our'],
            spanish: ['que', 'los', 'una', 'con', 'por', 'para', 'como', 'más', 'pero', 'sus', 'les'],
            french: ['que', 'les', 'dans', 'est', 'pour', 'avec', 'son', 'une', 'sur', 'avoir'],
            german: ['der', 'die', 'und', 'in', 'den', 'zu', 'das', 'mit', 'sich', 'auf']
        };
        
        const words = text.toLowerCase().split(/\s+/).slice(0, 50);
        const scores = {};
        
        Object.entries(languages).forEach(([lang, commonWords]) => {
            scores[lang] = commonWords.filter(word => words.includes(word)).length;
        });
        
        const detectedLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
        return scores[detectedLang] > 0 ? detectedLang : 'unknown';
    }

    analyzeSentiment(text) {
        // Simple sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'love', 'best'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointing', 'poor'];
        
        const words = text.toLowerCase().split(/\s+/);
        const positive = positiveWords.filter(word => words.includes(word)).length;
        const negative = negativeWords.filter(word => words.includes(word)).length;
        
        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    extractTopics(text) {
        // Simple topic extraction based on keywords
        const topics = [];
        const topicKeywords = {
            technology: ['ai', 'artificial intelligence', 'machine learning', 'software', 'app', 'digital', 'tech'],
            business: ['revenue', 'profit', 'market', 'customer', 'sales', 'business', 'strategy'],
            marketing: ['campaign', 'brand', 'advertising', 'social media', 'marketing', 'promotion'],
            design: ['design', 'ux', 'ui', 'interface', 'visual', 'creative', 'aesthetic'],
            development: ['code', 'programming', 'developer', 'api', 'framework', 'javascript', 'python']
        };
        
        const lowerText = text.toLowerCase();
        
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                topics.push(topic);
            }
        });
        
        return topics;
    }

    calculateReadability(text) {
        // Simple readability score (Flesch-like)
        const sentences = text.split(/[.!?]+/).length;
        const words = text.split(/\s+/).length;
        const syllables = this.countSyllables(text);
        
        if (sentences === 0 || words === 0) return 0;
        
        const avgWordsPerSentence = words / sentences;
        const avgSyllablesPerWord = syllables / words;
        
        // Simplified Flesch Reading Ease score
        const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    countSyllables(text) {
        // Simple syllable counting
        const words = text.toLowerCase().match(/[a-z]+/g) || [];
        let syllableCount = 0;
        
        words.forEach(word => {
            const vowels = word.match(/[aeiouy]+/g);
            syllableCount += vowels ? vowels.length : 1;
        });
        
        return syllableCount;
    }

    extractSchemaOrgData() {
        const schemaData = {};
        
        try {
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach(script => {
                const data = JSON.parse(script.textContent);
                Object.assign(schemaData, data);
            });
        } catch (error) {
            console.warn('Error extracting schema data:', error);
        }
        
        return Object.keys(schemaData).length > 0 ? schemaData : null;
    }

    // Discovery methods
    async discoverRSSFeeds() {
        const feeds = [];
        
        // Look for RSS/Atom links in head
        const feedLinks = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        feedLinks.forEach(link => {
            feeds.push({
                url: this.resolveURL(link.href),
                title: link.title || 'RSS Feed',
                type: link.type.includes('rss') ? 'rss' : 'atom'
            });
        });
        
        // Look for RSS links in content
        const rssLinks = document.querySelectorAll('a[href*="rss"], a[href*="feed"], a[href*=".xml"]');
        rssLinks.forEach(link => {
            if (link.textContent.toLowerCase().includes('rss') || 
                link.textContent.toLowerCase().includes('feed')) {
                feeds.push({
                    url: this.resolveURL(link.href),
                    title: link.textContent.trim() || 'RSS Feed',
                    type: 'rss'
                });
            }
        });
        
        return feeds;
    }

    async findContentSections() {
        const sections = [];
        
        // Look for navigation links to content areas
        const navLinks = document.querySelectorAll('nav a, .menu a, .navigation a');
        
        navLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const href = link.getAttribute('href');
            
            if (href && (text.includes('blog') || text.includes('news') || 
                        text.includes('articles') || text.includes('insights'))) {
                sections.push({
                    url: this.resolveURL(href),
                    title: link.textContent.trim(),
                    type: 'content_section'
                });
            }
        });
        
        return sections;
    }

    // Enhanced validation
    isValidContentEnhanced(content) {
        if (!content || !content.title) return false;
        
        // Enhanced validation criteria
        const title = content.title.toLowerCase();
        const titleLength = content.title.length;
        
        // Check title length
        if (titleLength < 10 || titleLength > 200) return false;
        
        // Filter out common non-content
        const invalidPatterns = [
            'cookie', 'privacy policy', 'terms of service',
            'error 404', 'page not found', 'search results',
            'login', 'register', 'sign up', 'advertisement'
        ];
        
        if (invalidPatterns.some(pattern => title.includes(pattern))) {
            return false;
        }
        
        // Check for minimum content
        if (content.content && content.content.length < 50) {
            return false;
        }
        
        return true;
    }

    // Utility methods (enhanced versions of existing methods)
    findElements(selectors) {
        const elements = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                elements.push(...Array.from(found));
            } catch (error) {
                console.warn(`Invalid selector: ${selector}`);
            }
        });
        return [...new Set(elements)];
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

    resolveURL(url) {
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ') : '';
    }

    // Storage methods
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

    // Additional helper methods for backward compatibility
    findBestTitle() {
        const titleSelectors = [
            'h1', '.entry-title', '.post-title', '.article-title',
            '.title', 'meta[property="og:title"]', 'title'
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
            '.entry-content', '.post-content', '.article-content',
            '.content', 'main', '[role="main"]'
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
            'time[datetime]', '.published', '.post-date',
            '.article-date', 'meta[property="article:published_time"]'
        ];

        for (const selector of dateSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const date = element.getAttribute('datetime') || 
                           element.getAttribute('content') || 
                           element.textContent;
                
                if (date) {
                    try {
                        return new Date(date).toISOString();
                    } catch {
                        return null;
                    }
                }
            }
        }

        return null;
    }

    findAuthor() {
        const authorSelectors = [
            '.author', '.byline', '.post-author',
            '[rel="author"]', 'meta[name="author"]'
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

    isWordPressSite() {
        return document.querySelector('meta[name="generator"][content*="WordPress"]') ||
               document.querySelector('body.wordpress') ||
               document.querySelector('#wp-') ||
               window.wp !== undefined;
    }

    isShopifySite() {
        return document.querySelector('meta[name="shopify-checkout-api-token"]') ||
               window.Shopify !== undefined ||
               document.querySelector('script[src*="shopify"]');
    }
}

// Content Extractor helper class
class ContentExtractor {
    extractFromElement(element) {
        const title = this.findChildElement(element, [
            'h1', 'h2', '.title', '.headline', '.post-title',
            '.entry-title', '.article-title'
        ]);
        
        const content = this.findChildElement(element, [
            '.content', '.post-content', '.entry-content',
            '.article-content', '.description', '.excerpt', '.summary'
        ]);
        
        const date = this.findChildElement(element, [
            'time', '.date', '.published', '.post-date', '.article-date'
        ]);
        
        const author = this.findChildElement(element, [
            '.author', '.byline', '.post-author', '.article-author'
        ]);

        const link = element.querySelector('a[href]');
        const url = link ? this.resolveURL(link.href) : window.location.href;

        return {
            title: title ? this.cleanText(title.textContent) : null,
            content: content ? this.cleanText(content.textContent) : '',
            url: url,
            publishDate: this.extractDate(date),
            author: author ? this.cleanText(author.textContent) : null
        };
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
}

// SEO Analyzer helper class
class SEOAnalyzer {
    analyze(content) {
        return {
            titleLength: content.title ? content.title.length : 0,
            hasMetaDescription: this.hasMetaDescription(),
            hasHeadings: this.hasHeadings(),
            imageCount: content.images ? content.images.length : 0,
            linkCount: content.links ? content.links.length : 0,
            wordCount: content.wordCount || 0,
            readingTime: content.readingTime || 0
        };
    }

    hasMetaDescription() {
        const metaDesc = document.querySelector('meta[name="description"]');
        return metaDesc && metaDesc.getAttribute('content').length > 0;
    }

    hasHeadings() {
        return document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
    }
}

// Initialize enhanced content detector
if (typeof window !== 'undefined') {
    window.enhancedContentDetector = new EnhancedContentDetector();
}