// ContentSpy Enhanced Dashboard JavaScript - Phase 2
class EnhancedContentSpyDashboard {
    constructor() {
        this.data = {
            competitors: [],
            contentHistory: [],
            recentActivity: [],
            settings: {},
            analytics: {},
            aiInsights: []
        };
        this.charts = {};
        this.currentSection = 'overview';
        this.filters = {
            competitor: 'all',
            category: 'all',
            sentiment: 'all',
            dateRange: 'all',
            language: 'all'
        };
        this.bulkSelection = new Set();
        this.aiProcessor = new AIContentProcessor();
        this.init();
    }

    async init() {
        console.log('Initializing Enhanced ContentSpy Dashboard...');
        
        try {
            await this.loadData();
            this.setupEventListeners();
            this.initializeUI();
            this.setupCharts();
            this.startAutoRefresh();
            this.initializeAIFeatures();
            
            console.log('Enhanced Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showNotification('Error loading dashboard', 'error');
        }
    }

    async loadData() {
        // Get sync data (competitors, settings)
        const syncKeys = ['competitors', 'settings'];
        const syncResult = await chrome.storage.sync.get(syncKeys);
        
        // Get local data (content history, activity, analytics)
        const localKeys = ['contentHistory', 'recentActivity', 'analytics', 'aiInsights'];
        const localResult = await chrome.storage.local.get(localKeys);
        
        this.data.competitors = syncResult.competitors || [];
        this.data.settings = syncResult.settings || this.getDefaultSettings();
        this.data.contentHistory = localResult.contentHistory || [];
        this.data.recentActivity = localResult.recentActivity || [];
        this.data.analytics = localResult.analytics || {};
        this.data.aiInsights = localResult.aiInsights || [];
    }

    getDefaultSettings() {
        return {
            notifications: {
                enabled: true,
                sound: false,
                desktop: true,
                frequency: 'immediate'
            },
            monitoring: {
                interval: 30,
                retryAttempts: 3,
                respectRobots: true
            },
            analytics: {
                enabled: true,
                dataRetention: 90
            },
            ai: {
                categorization: true,
                sentimentAnalysis: true,
                topicExtraction: true,
                autoDiscovery: true
            }
        };
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchSection(item.dataset.section);
            });
        });

        // Header buttons
        document.getElementById('refreshAllBtn').addEventListener('click', () => {
            this.refreshAll();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        document.getElementById('aiInsightsBtn')?.addEventListener('click', () => {
            this.generateAIInsights();
        });

        document.getElementById('bulkActionsBtn')?.addEventListener('click', () => {
            this.toggleBulkActions();
        });

        // Enhanced competitor management
        document.getElementById('addCompetitorBtn').addEventListener('click', () => {
            this.openAddCompetitorModal();
        });

        document.getElementById('addCompetitorBtn2')?.addEventListener('click', () => {
            this.openAddCompetitorModal();
        });

        // Auto-discovery buttons
        document.getElementById('discoverAllBtn')?.addEventListener('click', () => {
            this.discoverAllFeeds();
        });

        document.getElementById('discoverFeedsBtn')?.addEventListener('click', () => {
            this.discoverRSSFeeds();
        });

        document.getElementById('crawlWebsitesBtn')?.addEventListener('click', () => {
            this.crawlForContentSections();
        });

        // Enhanced filters
        document.getElementById('competitorSearch')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sentimentFilter')?.addEventListener('change', (e) => {
            this.filters.sentiment = e.target.value;
            this.applyFilters();
        });

        document.getElementById('dateRangeFilter')?.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.applyFilters();
        });

        document.getElementById('languageFilter')?.addEventListener('change', (e) => {
            this.filters.language = e.target.value;
            this.applyFilters();
        });

        // Bulk selection
        document.getElementById('selectAll')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('headerCheckbox')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('bulkEnableBtn')?.addEventListener('click', () => {
            this.bulkToggleCompetitors(true);
        });

        document.getElementById('bulkDisableBtn')?.addEventListener('click', () => {
            this.bulkToggleCompetitors(false);
        });

        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
            this.bulkDeleteCompetitors();
        });

        // Advanced search
        document.getElementById('advancedSearchBtn')?.addEventListener('click', () => {
            this.toggleAdvancedSearch();
        });

        // Modal events
        this.setupModalEvents();

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleBackgroundMessage(request);
        });
    }

    setupModalEvents() {
        // Add competitor modal
        document.getElementById('closeAddModal')?.addEventListener('click', () => {
            this.closeModal('addCompetitorModal');
        });

        document.getElementById('addCompetitorForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCompetitor();
        });

        // Settings modal
        document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
            this.closeModal('settingsModal');
        });

        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id);
                }
            });
        });
    }

    initializeUI() {
        this.updateStats();
        this.renderCompetitors();
        this.renderContentFeed();
        this.renderActivityFeed();
        this.populateFilters();
        this.loadSettings();
        this.updateAnalyticsSummary();
    }

    async initializeAIFeatures() {
        // Initialize AI content processor
        await this.aiProcessor.initialize();
        
        // Generate initial insights
        await this.generateAIInsights();
        
        // Update content with AI analysis if not already done
        await this.processContentWithAI();
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'analytics':
                this.updateAnalytics();
                break;
            case 'discovery':
                this.updateDiscoveryResults();
                break;
            case 'insights':
                this.updateAIInsights();
                break;
        }
    }

    updateStats() {
        const totalCompetitors = this.data.competitors.length;
        const totalContent = this.data.contentHistory.length;
        const activeMonitoring = this.data.competitors.filter(c => c.isActive).length;
        
        // Calculate additional stats
        const totalUrls = this.data.competitors.reduce((sum, c) => {
            return sum + this.getCompetitorUrls(c).length;
        }, 0);

        const rssFeeds = this.data.competitors.reduce((sum, c) => {
            return sum + (c.rssFeeds?.length || 0);
        }, 0);

        // Calculate today's content
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayContent = this.data.contentHistory.filter(content => 
            new Date(content.timestamp) >= todayStart
        ).length;

        // Calculate average sentiment
        const sentiments = this.data.contentHistory
            .filter(c => c.sentiment)
            .map(c => c.sentiment);
        
        const avgSentiment = this.calculateAverageSentiment(sentiments);

        // Update UI
        document.getElementById('totalCompetitors').textContent = totalCompetitors;
        document.getElementById('totalUrls').textContent = totalUrls;
        document.getElementById('totalContent').textContent = totalContent;
        document.getElementById('todayContent').textContent = todayContent;
        document.getElementById('rssFeeds').textContent = rssFeeds;
        document.getElementById('avgSentiment').textContent = avgSentiment;
        document.getElementById('activeMonitoring').textContent = activeMonitoring;
    }

    getCompetitorUrls(competitor) {
        const urls = [];
        
        // Primary URL
        if (competitor.url) {
            urls.push({
                url: competitor.url,
                type: 'page',
                label: 'Main URL'
            });
        }

        // Additional URLs
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

    calculateAverageSentiment(sentiments) {
        if (sentiments.length === 0) return 'Neutral';
        
        const counts = sentiments.reduce((acc, sentiment) => {
            acc[sentiment] = (acc[sentiment] || 0) + 1;
            return acc;
        }, {});

        const max = Math.max(...Object.values(counts));
        const dominant = Object.keys(counts).find(key => counts[key] === max);
        
        return dominant.charAt(0).toUpperCase() + dominant.slice(1);
    }

    renderCompetitors() {
        const tableBody = document.getElementById('competitorsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.data.competitors.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <p>No competitors added yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.data.competitors.forEach(competitor => {
            const row = this.createEnhancedCompetitorRow(competitor);
            tableBody.appendChild(row);
        });
    }

    createEnhancedCompetitorRow(competitor) {
        const template = document.getElementById('enhancedCompetitorRowTemplate') ||
                         document.getElementById('competitorRowTemplate');
        const row = template.content.cloneNode(true);

        const rowElement = row.querySelector('.competitor-row');
        rowElement.dataset.id = competitor.id;

        // Checkbox for bulk selection
        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.toggleRowSelection(competitor.id, e.target.checked);
            });
        }

        // Basic info
        row.querySelector('.competitor-name').textContent = competitor.label;
        row.querySelector('.competitor-url').textContent = competitor.url;
        
        // URLs column
        const urlsContainer = row.querySelector('.urls-list');
        if (urlsContainer) {
            this.renderCompetitorUrls(urlsContainer, competitor);
        }

        // Status
        const statusBadge = row.querySelector('.status-badge');
        statusBadge.textContent = competitor.isActive ? 'Active' : 'Paused';
        statusBadge.className = `status-badge ${competitor.isActive ? 'active' : 'paused'}`;

        // Content count and categories
        const contentCount = this.data.contentHistory.filter(c => c.competitorId === competitor.id).length;
        row.querySelector('.content-count').textContent = contentCount;

        const categoriesContainer = row.querySelector('.content-categories');
        if (categoriesContainer) {
            this.renderContentCategories(categoriesContainer, competitor.id);
        }

        // Last check
        row.querySelector('.last-check').textContent = competitor.lastChecked 
            ? this.formatTimeAgo(competitor.lastChecked) 
            : 'Never';

        // Performance indicator
        const performanceContainer = row.querySelector('.performance-indicator');
        if (performanceContainer) {
            this.renderPerformanceIndicator(performanceContainer, competitor.id);
        }

        // Action buttons
        this.setupCompetitorActions(row, competitor);

        return row;
    }

    renderCompetitorUrls(container, competitor) {
        container.innerHTML = '';
        const urls = this.getCompetitorUrls(competitor);

        urls.slice(0, 3).forEach(urlData => {
            const urlElement = document.createElement('div');
            urlElement.className = 'url-item';
            urlElement.innerHTML = `
                <span class="url-type-badge ${urlData.type}">${urlData.type.toUpperCase()}</span>
                <span class="url-text" title="${urlData.url}">${urlData.label}</span>
                <div class="url-actions">
                    <button class="url-action" title="Edit">✏️</button>
                    <button class="url-action" title="Remove">🗑️</button>
                </div>
            `;
            container.appendChild(urlElement);
        });

        if (urls.length > 3) {
            const moreElement = document.createElement('div');
            moreElement.className = 'url-item';
            moreElement.innerHTML = `<span class="url-text">+${urls.length - 3} more...</span>`;
            container.appendChild(moreElement);
        }
    }

    renderContentCategories(container, competitorId) {
        container.innerHTML = '';
        
        const competitorContent = this.data.contentHistory.filter(c => c.competitorId === competitorId);
        const categories = {};
        
        competitorContent.forEach(content => {
            if (content.category) {
                categories[content.category] = (categories[content.category] || 0) + 1;
            }
        });

        const topCategories = Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        topCategories.forEach(([category, count]) => {
            const tag = document.createElement('span');
            tag.className = 'category-tag';
            tag.textContent = `${category} (${count})`;
            container.appendChild(tag);
        });
    }

    renderPerformanceIndicator(container, competitorId) {
        const competitorContent = this.data.contentHistory.filter(c => c.competitorId === competitorId);
        const recentContent = competitorContent.filter(c => {
            const contentDate = new Date(c.timestamp);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return contentDate > weekAgo;
        });

        let performance, color;
        if (recentContent.length >= 5) {
            performance = 'High';
            color = '#10b981';
        } else if (recentContent.length >= 2) {
            performance = 'Medium';
            color = '#f59e0b';
        } else {
            performance = 'Low';
            color = '#ef4444';
        }

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
                <span style="font-size: 12px;">${performance}</span>
            </div>
        `;
    }

    setupCompetitorActions(row, competitor) {
        const toggleBtn = row.querySelector('.toggle-btn');
        toggleBtn.addEventListener('click', () => {
            this.toggleCompetitor(competitor.id);
        });

        const editBtn = row.querySelector('.edit-btn');
        editBtn?.addEventListener('click', () => {
            this.editCompetitor(competitor.id);
        });

        const discoverBtn = row.querySelector('.discover-btn');
        discoverBtn?.addEventListener('click', () => {
            this.discoverCompetitorFeeds(competitor.id);
        });

        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            this.deleteCompetitor(competitor.id);
        });
    }

    renderContentFeed() {
        const contentFeed = document.getElementById('contentFeed');
        if (!contentFeed) return;

        contentFeed.innerHTML = '';

        let filteredContent = this.applyContentFilters(this.data.contentHistory);
        
        const sortedContent = filteredContent
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50);

        if (sortedContent.length === 0) {
            contentFeed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No content found</p>
                    <p class="empty-subtitle">Adjust your filters or add more competitors</p>
                </div>
            `;
            return;
        }

        sortedContent.forEach(content => {
            const contentItem = this.createEnhancedContentItem(content);
            contentFeed.appendChild(contentItem);
        });
    }

    createEnhancedContentItem(content) {
        const template = document.getElementById('enhancedContentItemTemplate') ||
                         document.getElementById('contentItemTemplate');
        const item = template.content.cloneNode(true);

        const competitor = this.data.competitors.find(c => c.id === content.competitorId);
        
        // Basic info
        item.querySelector('.competitor-badge').textContent = competitor?.label || 'Unknown';
        item.querySelector('.content-date').textContent = this.formatTimeAgo(content.timestamp);
        item.querySelector('.content-title').textContent = content.title;
        item.querySelector('.content-excerpt').textContent = content.content || 'No preview available';

        // Enhanced features
        const categoryTag = item.querySelector('.category-tag');
        if (categoryTag && content.category) {
            categoryTag.textContent = content.category;
            categoryTag.style.display = 'inline-block';
        } else if (categoryTag) {
            categoryTag.style.display = 'none';
        }

        const sentimentIndicator = item.querySelector('.sentiment-indicator');
        if (sentimentIndicator && content.sentiment) {
            sentimentIndicator.className = `sentiment-indicator ${content.sentiment}`;
            sentimentIndicator.style.display = 'inline-block';
        } else if (sentimentIndicator) {
            sentimentIndicator.style.display = 'none';
        }

        // Content stats
        const readingTime = item.querySelector('.reading-time');
        if (readingTime) {
            readingTime.textContent = content.readingTime || '?';
        }

        const wordCount = item.querySelector('.word-count');
        if (wordCount) {
            wordCount.textContent = content.wordCount || '?';
        }

        const language = item.querySelector('.language');
        if (language) {
            language.textContent = content.language || 'Unknown';
        }

        // Topic tags
        const topicsContainer = item.querySelector('.content-topics');
        if (topicsContainer && content.topics) {
            topicsContainer.innerHTML = '';
            content.topics.slice(0, 3).forEach(topic => {
                const topicTag = document.createElement('span');
                topicTag.className = 'topic-tag';
                topicTag.textContent = topic;
                topicsContainer.appendChild(topicTag);
            });
        }

        // Action button
        const actionBtn = item.querySelector('.content-action');
        actionBtn.addEventListener('click', () => {
            window.open(content.url, '_blank');
        });

        return item;
    }

    applyContentFilters(content) {
        return content.filter(item => {
            // Competitor filter
            if (this.filters.competitor !== 'all' && item.competitorId !== this.filters.competitor) {
                return false;
            }

            // Category filter
            if (this.filters.category !== 'all' && item.category !== this.filters.category) {
                return false;
            }

            // Sentiment filter
            if (this.filters.sentiment !== 'all' && item.sentiment !== this.filters.sentiment) {
                return false;
            }

            // Language filter
            if (this.filters.language !== 'all' && item.language !== this.filters.language) {
                return false;
            }

            // Date range filter
            if (this.filters.dateRange !== 'all') {
                const itemDate = new Date(item.timestamp);
                const now = new Date();
                let cutoff;

                switch (this.filters.dateRange) {
                    case 'today':
                        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'week':
                        cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - 7);
                        break;
                    case 'month':
                        cutoff = new Date();
                        cutoff.setMonth(cutoff.getMonth() - 1);
                        break;
                    default:
                        return true;
                }

                if (itemDate < cutoff) {
                    return false;
                }
            }

            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchableText = `${item.title} ${item.content} ${item.author}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });
    }

    applyFilters() {
        this.renderContentFeed();
        this.renderCompetitors();
    }

    updateAnalyticsSummary() {
        this.updateContentTypeChart();
        this.updateTopicCloud();
        this.updateLanguageChart();
    }

    updateContentTypeChart() {
        const container = document.getElementById('contentTypeChart');
        if (!container) return;

        const types = {};
        this.data.contentHistory.forEach(content => {
            const type = content.type || 'article';
            types[type] = (types[type] || 0) + 1;
        });

        const typeEntries = Object.entries(types).sort(([,a], [,b]) => b - a);
        
        container.innerHTML = '';
        typeEntries.forEach(([type, count]) => {
            const item = document.createElement('div');
            item.className = 'type-item';
            item.innerHTML = `
                <div>
                    <span class="type-icon">${this.getTypeIcon(type)}</span>
                    ${type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                <span>${count}</span>
            `;
            container.appendChild(item);
        });
    }

    updateTopicCloud() {
        const container = document.getElementById('topicCloud');
        if (!container) return;

        const topics = {};
        this.data.contentHistory.forEach(content => {
            if (content.topics) {
                content.topics.forEach(topic => {
                    topics[topic] = (topics[topic] || 0) + 1;
                });
            }
        });

        const topTopics = Object.entries(topics)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);

        container.innerHTML = '';
        topTopics.forEach(([topic, count]) => {
            const tag = document.createElement('span');
            tag.className = 'topic-tag';
            tag.textContent = `${topic} (${count})`;
            tag.style.fontSize = `${Math.min(16, 10 + count)}px`;
            container.appendChild(tag);
        });
    }

    updateLanguageChart() {
        const container = document.getElementById('languageChart');
        if (!container) return;

        const languages = {};
        this.data.contentHistory.forEach(content => {
            const lang = content.language || 'unknown';
            languages[lang] = (languages[lang] || 0) + 1;
        });

        const total = Object.values(languages).reduce((sum, count) => sum + count, 0);
        const langEntries = Object.entries(languages).sort(([,a], [,b]) => b - a);

        container.innerHTML = '';
        langEntries.forEach(([lang, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const item = document.createElement('div');
            item.className = 'language-item';
            item.innerHTML = `
                <span>${lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
                <div class="language-bar">
                    <div class="language-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span>${count}</span>
            `;
            container.appendChild(item);
        });
    }

    getTypeIcon(type) {
        const icons = {
            article: '📄',
            news: '📰',
            blog_post: '📝',
            guide: '📖',
            case_study: '📊',
            technical: '⚙️',
            review: '⭐',
            interview: '🎤',
            analysis: '🔍',
            opinion: '💭'
        };
        return icons[type] || '📄';
    }

    // Auto-discovery methods
    async discoverAllFeeds() {
        this.showLoading(true);
        
        try {
            const promises = this.data.competitors.map(competitor => 
                this.discoverCompetitorFeeds(competitor.id)
            );
            
            const results = await Promise.all(promises);
            const totalFeeds = results.reduce((sum, feeds) => sum + feeds.length, 0);
            
            this.showNotification(`Discovered ${totalFeeds} RSS feeds across all competitors`, 'success');
        } catch (error) {
            this.showNotification('Error during feed discovery', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async discoverRSSFeeds() {
        const container = document.getElementById('discoveryResults');
        if (!container) return;

        this.showLoading(true);
        container.innerHTML = '<p>Discovering RSS feeds...</p>';

        try {
            const discoveries = [];
            
            for (const competitor of this.data.competitors) {
                const feeds = await this.discoverCompetitorFeeds(competitor.id);
                discoveries.push(...feeds.map(feed => ({
                    competitorId: competitor.id,
                    competitorLabel: competitor.label,
                    ...feed
                })));
            }

            this.renderDiscoveryResults(discoveries, container);
        } catch (error) {
            container.innerHTML = '<p>Error discovering feeds</p>';
        } finally {
            this.showLoading(false);
        }
    }

    async discoverCompetitorFeeds(competitorId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'discoverFeeds',
                competitorId: competitorId
            });

            return response.feeds || [];
        } catch (error) {
            console.error('Error discovering feeds:', error);
            return [];
        }
    }

    async crawlForContentSections() {
        const container = document.getElementById('discoveryResults');
        if (!container) return;

        this.showLoading(true);
        container.innerHTML = '<p>Crawling for content sections...</p>';

        try {
            const discoveries = [];
            
            for (const competitor of this.data.competitors) {
                const response = await chrome.runtime.sendMessage({
                    action: 'crawlWebsite',
                    competitorId: competitor.id
                });

                const urls = response.urls || [];
                discoveries.push(...urls.map(url => ({
                    competitorId: competitor.id,
                    competitorLabel: competitor.label,
                    ...url
                })));
            }

            this.renderDiscoveryResults(discoveries, container);
        } catch (error) {
            container.innerHTML = '<p>Error crawling websites</p>';
        } finally {
            this.showLoading(false);
        }
    }

    renderDiscoveryResults(discoveries, container) {
        container.innerHTML = '';

        if (discoveries.length === 0) {
            container.innerHTML = '<p>No new sources discovered</p>';
            return;
        }

        discoveries.forEach(discovery => {
            const item = document.createElement('div');
            item.className = 'discovered-item';
            item.innerHTML = `
                <div class="discovered-info">
                    <div class="discovered-title">${discovery.title || discovery.label}</div>
                    <div class="discovered-url">${discovery.url}</div>
                    <small>From: ${discovery.competitorLabel}</small>
                </div>
                <button class="primary-btn" onclick="dashboard.addDiscoveredSource('${discovery.competitorId}', '${discovery.url}', '${discovery.type}')">
                    Add
                </button>
            `;
            container.appendChild(item);
        });
    }

    async addDiscoveredSource(competitorId, url, type) {
        try {
            const competitor = this.data.competitors.find(c => c.id === competitorId);
            if (!competitor) return;

            if (type === 'rss' || type === 'feed') {
                if (!competitor.rssFeeds) competitor.rssFeeds = [];
                competitor.rssFeeds.push({
                    url: url,
                    title: 'Discovered Feed',
                    type: 'rss'
                });
            } else {
                if (!competitor.urls) competitor.urls = [];
                competitor.urls.push({
                    url: url,
                    type: 'page',
                    label: 'Discovered URL'
                });
            }

            await this.saveData();
            this.showNotification('Source added successfully', 'success');
            this.renderCompetitors();
        } catch (error) {
            this.showNotification('Error adding source', 'error');
        }
    }

    // AI Processing methods
    async processContentWithAI() {
        const unprocessedContent = this.data.contentHistory.filter(content => 
            !content.category || !content.sentiment || !content.topics
        );

        if (unprocessedContent.length === 0) return;

        this.showLoading(true);
        
        try {
            for (const content of unprocessedContent) {
                const processed = await this.aiProcessor.processContent(content);
                Object.assign(content, processed);
            }

            await this.saveData();
            this.showNotification(`Processed ${unprocessedContent.length} content items with AI`, 'success');
            this.renderContentFeed();
        } catch (error) {
            this.showNotification('Error processing content with AI', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateAIInsights() {
        this.showLoading(true);
        
        try {
            const insights = await this.aiProcessor.generateInsights(
                this.data.contentHistory,
                this.data.competitors
            );

            this.data.aiInsights = insights;
            await this.saveData();
            
            this.updateAIInsightsBanner(insights);
            this.showNotification('AI insights generated', 'success');
        } catch (error) {
            this.showNotification('Error generating AI insights', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateAIInsightsBanner(insights) {
        const banner = document.getElementById('aiInsightsBanner');
        if (!banner || !insights.length) return;

        // Update banner with top insights
        const topInsights = insights.slice(0, 2);
        const insightElements = banner.querySelectorAll('.insight-item');
        
        topInsights.forEach((insight, index) => {
            if (insightElements[index]) {
                insightElements[index].innerHTML = `
                    <strong>${insight.type}:</strong> ${insight.text}
                    <span class="insight-score">${insight.confidence} Confidence</span>
                `;
            }
        });
    }

    updateAIInsights() {
        // Update the AI insights section with detailed analysis
        const strategyAnalysis = document.getElementById('strategyAnalysis');
        const publishingOptimization = document.getElementById('publishingOptimization');
        const competitivePositioning = document.getElementById('competitivePositioning');

        if (this.data.aiInsights.length === 0) {
            this.generateAIInsights();
            return;
        }

        // Group insights by type
        const insightsByType = this.data.aiInsights.reduce((acc, insight) => {
            if (!acc[insight.category]) acc[insight.category] = [];
            acc[insight.category].push(insight);
            return acc;
        }, {});

        // Update strategy analysis
        if (strategyAnalysis && insightsByType.strategy) {
            strategyAnalysis.innerHTML = '';
            insightsByType.strategy.forEach(insight => {
                const item = document.createElement('div');
                item.className = 'insight-item';
                item.innerHTML = `
                    <strong>${insight.type}:</strong> ${insight.text}
                    <span class="insight-score">${insight.confidence} Confidence</span>
                `;
                strategyAnalysis.appendChild(item);
            });
        }

        // Similar updates for other sections...
    }

    // Bulk operations
    toggleBulkActions() {
        const bulkActions = document.getElementById('bulkActions');
        if (bulkActions) {
            const isHidden = bulkActions.style.display === 'none';
            bulkActions.style.display = isHidden ? 'flex' : 'none';
        }
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.toggleRowSelection(checkbox.closest('tr').dataset.id, checked);
        });
    }

    toggleRowSelection(competitorId, selected) {
        if (selected) {
            this.bulkSelection.add(competitorId);
        } else {
            this.bulkSelection.delete(competitorId);
        }

        // Update bulk actions visibility
        const bulkActions = document.getElementById('bulkActions');
        if (bulkActions) {
            bulkActions.style.display = this.bulkSelection.size > 0 ? 'flex' : 'none';
        }
    }

    async bulkToggleCompetitors(enable) {
        const selectedIds = Array.from(this.bulkSelection);
        
        for (const id of selectedIds) {
            await this.toggleCompetitor(id, enable);
        }

        this.bulkSelection.clear();
        this.showNotification(`${enable ? 'Enabled' : 'Disabled'} ${selectedIds.length} competitors`, 'success');
        this.renderCompetitors();
    }

    async bulkDeleteCompetitors() {
        const selectedIds = Array.from(this.bulkSelection);
        
        if (confirm(`Delete ${selectedIds.length} selected competitors?`)) {
            for (const id of selectedIds) {
                await this.deleteCompetitor(id, false); // Don't show individual notifications
            }

            this.bulkSelection.clear();
            this.showNotification(`Deleted ${selectedIds.length} competitors`, 'success');
            this.renderCompetitors();
        }
    }

    // Enhanced competitor management
    async handleAddCompetitor() {
        const url = document.getElementById('modalCompetitorUrl').value.trim();
        const label = document.getElementById('modalCompetitorLabel').value.trim();
        const interval = parseInt(document.getElementById('modalCheckInterval').value);
        const autoDiscoverFeeds = document.getElementById('autoDiscoverFeeds')?.checked || false;
        const autoDiscoverSections = document.getElementById('autoDiscoverSections')?.checked || false;

        if (!url) {
            this.showNotification('Please enter a URL', 'error');
            return;
        }

        try {
            new URL(url);
        } catch {
            this.showNotification('Please enter a valid URL', 'error');
            return;
        }

        // Check for duplicates
        const exists = this.data.competitors.some(c => c.url === url);
        if (exists) {
            this.showNotification('This competitor is already being tracked', 'error');
            return;
        }

        const competitor = {
            id: Date.now().toString(),
            url: url,
            label: label || this.extractDomainName(url),
            addedAt: new Date().toISOString(),
            isActive: true,
            lastChecked: null,
            contentCount: 0,
            urls: [], // Additional URLs
            rssFeeds: [], // RSS feeds
            settings: {
                checkInterval: interval,
                notifications: true,
                autoDiscovery: autoDiscoverFeeds || autoDiscoverSections
            }
        };

        this.data.competitors.push(competitor);
        await this.saveData();

        // Start monitoring
        chrome.runtime.sendMessage({
            action: 'startMonitoring',
            competitorId: competitor.id
        });

        // Auto-discovery if enabled
        if (autoDiscoverFeeds) {
            setTimeout(() => this.discoverCompetitorFeeds(competitor.id), 2000);
        }

        this.closeModal('addCompetitorModal');
        this.showNotification(`Added ${competitor.label} successfully`, 'success');
        
        // Reset form
        document.getElementById('addCompetitorForm').reset();
        
        // Update UI
        this.updateStats();
        this.renderCompetitors();
        this.populateFilters();
    }

    extractDomainName(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '').split('.')[0];
        } catch {
            return 'Unknown';
        }
    }

    async toggleCompetitor(competitorId, forceState = null) {
        const competitor = this.data.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        const newState = forceState !== null ? forceState : !competitor.isActive;
        competitor.isActive = newState;
        await this.saveData();

        // Notify background script
        chrome.runtime.sendMessage({
            action: competitor.isActive ? 'startMonitoring' : 'stopMonitoring',
            competitorId: competitorId
        });

        if (forceState === null) { // Only show notification for manual toggles
            this.showNotification(
                `Monitoring ${competitor.isActive ? 'enabled' : 'disabled'} for ${competitor.label}`,
                'success'
            );
        }

        this.updateStats();
        this.renderCompetitors();
    }

    async deleteCompetitor(competitorId, showNotification = true) {
        const competitor = this.data.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        if (showNotification && !confirm(`Remove ${competitor.label} from tracking?`)) {
            return;
        }

        // Remove competitor
        this.data.competitors = this.data.competitors.filter(c => c.id !== competitorId);
        
        // Remove associated content
        this.data.contentHistory = this.data.contentHistory.filter(c => c.competitorId !== competitorId);
        
        await this.saveData();

        // Stop monitoring
        chrome.runtime.sendMessage({
            action: 'stopMonitoring',
            competitorId: competitorId
        });

        if (showNotification) {
            this.showNotification(`Removed ${competitor.label}`, 'success');
        }
        
        this.updateStats();
        this.renderCompetitors();
        this.renderContentFeed();
        this.populateFilters();
        this.updateCharts();
    }

    // Utility methods
    populateFilters() {
        // Populate competitor filter
        const competitorFilter = document.getElementById('contentCompetitorFilter');
        if (competitorFilter) {
            competitorFilter.innerHTML = '<option value="all">All Competitors</option>';
            this.data.competitors.forEach(competitor => {
                const option = document.createElement('option');
                option.value = competitor.id;
                option.textContent = competitor.label;
                competitorFilter.appendChild(option);
            });
        }

        // Populate other filters based on content data
        this.populateCategoryFilter();
        this.populateLanguageFilter();
    }

    populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;

        const categories = new Set();
        this.data.contentHistory.forEach(content => {
            if (content.category) {
                categories.add(content.category);
            }
        });

        // Keep existing options and add new ones
        const existingOptions = Array.from(categoryFilter.options).map(opt => opt.value);
        
        categories.forEach(category => {
            if (!existingOptions.includes(category)) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            }
        });
    }

    populateLanguageFilter() {
        const languageFilter = document.getElementById('languageFilter');
        if (!languageFilter) return;

        const languages = new Set();
        this.data.contentHistory.forEach(content => {
            if (content.language) {
                languages.add(content.language);
            }
        });

        // Keep existing options and add new ones
        const existingOptions = Array.from(languageFilter.options).map(opt => opt.value);
        
        languages.forEach(language => {
            if (!existingOptions.includes(language)) {
                const option = document.createElement('option');
                option.value = language;
                option.textContent = language.charAt(0).toUpperCase() + language.slice(1);
                languageFilter.appendChild(option);
            }
        });
    }

    async saveData() {
        // Save sync data
        await chrome.storage.sync.set({
            competitors: this.data.competitors,
            settings: this.data.settings
        });
        
        // Save local data
        await chrome.storage.local.set({
            contentHistory: this.data.contentHistory,
            recentActivity: this.data.recentActivity,
            analytics: this.data.analytics,
            aiInsights: this.data.aiInsights
        });
    }

    // Enhanced utility methods
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return time.toLocaleDateString();
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Enhanced notification with better styling
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#dcfce7' : type === 'warning' ? '#fef3c7' : '#e0f2fe'};
            color: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : type === 'warning' ? '#d97706' : '#0369a1'};
            border-radius: 12px;
            border: 1px solid ${type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : type === 'warning' ? '#fcd34d' : '#7dd3fc'};
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 350px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // Modal management
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    openAddCompetitorModal() {
        this.showModal('addCompetitorModal');
        document.getElementById('modalCompetitorUrl').focus();
    }

    openSettingsModal() {
        this.showModal('settingsModal');
        this.loadSettings();
    }

    loadSettings() {
        document.getElementById('enableNotifications').checked = this.data.settings.notifications?.enabled !== false;
        document.getElementById('notificationSound').checked = this.data.settings.notifications?.sound === true;
        document.getElementById('defaultInterval').value = this.data.settings.monitoring?.interval || 30;
        
        // AI settings
        document.getElementById('enableCategorization')?.checked = this.data.settings.ai?.categorization !== false;
        document.getElementById('sentimentAnalysis')?.checked = this.data.settings.ai?.sentimentAnalysis !== false;
        document.getElementById('topicExtraction')?.checked = this.data.settings.ai?.topicExtraction !== false;
        document.getElementById('autoDiscovery')?.checked = this.data.settings.ai?.autoDiscovery !== false;
    }

    async saveSettings() {
        this.data.settings.notifications = {
            ...this.data.settings.notifications,
            enabled: document.getElementById('enableNotifications').checked,
            sound: document.getElementById('notificationSound').checked
        };

        this.data.settings.monitoring = {
            ...this.data.settings.monitoring,
            interval: parseInt(document.getElementById('defaultInterval').value)
        };

        // AI settings
        this.data.settings.ai = {
            ...this.data.settings.ai,
            categorization: document.getElementById('enableCategorization')?.checked || false,
            sentimentAnalysis: document.getElementById('sentimentAnalysis')?.checked || false,
            topicExtraction: document.getElementById('topicExtraction')?.checked || false,
            autoDiscovery: document.getElementById('autoDiscovery')?.checked || false
        };

        await this.saveData();
        this.closeModal('settingsModal');
        this.showNotification('Settings saved successfully', 'success');
    }

    // Background message handling
    handleBackgroundMessage(request) {
        if (request.action === 'competitorUpdated') {
            this.loadData().then(() => {
                this.updateStats();
                this.renderCompetitors();
                this.renderContentFeed();
                this.updateCharts();
            });
        } else if (request.action === 'refreshComplete') {
            const message = request.successCount !== undefined 
                ? `Refresh completed: ${request.successCount} successful, ${request.errorCount || 0} errors`
                : 'Refresh completed';
            this.showNotification(message, request.errorCount > 0 ? 'warning' : 'success');
        }
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        setInterval(async () => {
            await this.loadData();
            this.updateStats();
        }, 30000);
    }

    // Placeholder methods for missing functionality
    updateAnalytics() {
        console.log('Advanced analytics update');
    }

    updateDiscoveryResults() {
        console.log('Discovery results update');
    }

    renderActivityFeed() {
        console.log('Activity feed render');
    }

    setupCharts() {
        console.log('Charts setup');
    }

    updateCharts() {
        console.log('Charts update');
    }

    exportData() {
        console.log('Data export');
    }

    refreshAll() {
        chrome.runtime.sendMessage({ action: 'refreshAll' });
    }

    editCompetitor(competitorId) {
        console.log('Edit competitor:', competitorId);
    }

    toggleAdvancedSearch() {
        const searchPanel = document.getElementById('advancedSearch');
        if (searchPanel) {
            searchPanel.style.display = searchPanel.style.display === 'none' ? 'block' : 'none';
        }
    }
}

// AI Content Processor Class
class AIContentProcessor {
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

    async initialize() {
        console.log('AI Content Processor initialized');
    }

    async processContent(content) {
        const category = this.categorizeContent(content);
        const sentiment = this.analyzeSentiment(content);
        const topics = this.extractTopics(content);
        const language = this.detectLanguage(content);

        return {
            category: category.primary,
            categories: category.all,
            confidence: category.confidence,
            sentiment: sentiment,
            topics: topics,
            language: language
        };
    }

    categorizeContent(content) {
        const text = `${content.title} ${content.content}`.toLowerCase();
        const scores = {};
        
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
        
        const sortedCategories = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .filter(([,score]) => score > 0);
        
        if (sortedCategories.length === 0) {
            return {
                primary: 'General',
                all: ['General'],
                confidence: 0
            };
        }
        
        const primaryCategory = sortedCategories[0][0];
        const primaryScore = sortedCategories[0][1];
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const confidence = totalScore > 0 ? primaryScore / totalScore : 0;
        
        return {
            primary: primaryCategory,
            all: sortedCategories.slice(0, 3).map(([category]) => category),
            confidence: Math.round(confidence * 100) / 100
        };
    }

    analyzeSentiment(content) {
        const text = `${content.title} ${content.content}`.toLowerCase();
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'love', 'best'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointing', 'poor'];
        
        const words = text.split(/\s+/);
        const positive = positiveWords.filter(word => words.includes(word)).length;
        const negative = negativeWords.filter(word => words.includes(word)).length;
        
        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    extractTopics(content) {
        const text = `${content.title} ${content.content}`.toLowerCase();
        const topics = [];
        const topicKeywords = {
            technology: ['ai', 'artificial intelligence', 'machine learning', 'software', 'app', 'digital', 'tech'],
            business: ['revenue', 'profit', 'market', 'customer', 'sales', 'business', 'strategy'],
            marketing: ['campaign', 'brand', 'advertising', 'social media', 'marketing', 'promotion'],
            design: ['design', 'ux', 'ui', 'interface', 'visual', 'creative', 'aesthetic'],
            development: ['code', 'programming', 'developer', 'api', 'framework', 'javascript', 'python']
        };
        
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            const matches = keywords.filter(keyword => text.includes(keyword));
            if (matches.length > 0) {
                topics.push(topic);
            }
        });
        
        return topics;
    }

    detectLanguage(content) {
        const text = `${content.title} ${content.content}`.toLowerCase();
        const languages = {
            english: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our'],
            spanish: ['que', 'los', 'una', 'con', 'por', 'para', 'como', 'más', 'pero', 'sus', 'les'],
            french: ['que', 'les', 'dans', 'est', 'pour', 'avec', 'son', 'une', 'sur', 'avoir'],
            german: ['der', 'die', 'und', 'in', 'den', 'zu', 'das', 'mit', 'sich', 'auf']
        };
        
        const words = text.split(/\s+/).slice(0, 50);
        const scores = {};
        
        Object.entries(languages).forEach(([lang, commonWords]) => {
            scores[lang] = commonWords.filter(word => words.includes(word)).length;
        });
        
        const detectedLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
        return scores[detectedLang] > 0 ? detectedLang : 'unknown';
    }

    async generateInsights(contentHistory, competitors) {
        const insights = [];

        // Analyze content trends
        const categoryTrends = this.analyzeCategoryTrends(contentHistory);
        if (categoryTrends.trending.length > 0) {
            insights.push({
                type: 'Top Trend',
                category: 'strategy',
                text: `${categoryTrends.trending[0]} content increased by ${categoryTrends.growth}% this month`,
                confidence: 'High'
            });
        }

        // Identify content gaps
        const gaps = this.identifyContentGaps(contentHistory, competitors);
        if (gaps.length > 0) {
            insights.push({
                type: 'Content Gap',
                category: 'strategy',
                text: `Missing "${gaps[0]}" content - competitors publish 3x more`,
                confidence: 'Medium'
            });
        }

        // Competitive analysis
        const competitiveInsights = this.analyzeCompetitivePosition(contentHistory, competitors);
        insights.push(...competitiveInsights);

        return insights;
    }

    analyzeCategoryTrends(contentHistory) {
        // Simple trend analysis - in real implementation, this would be more sophisticated
        const recentContent = contentHistory.filter(c => {
            const contentDate = new Date(c.timestamp);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return contentDate > monthAgo;
        });

        const categories = {};
        recentContent.forEach(content => {
            if (content.category) {
                categories[content.category] = (categories[content.category] || 0) + 1;
            }
        });

        const sortedCategories = Object.entries(categories).sort(([,a], [,b]) => b - a);
        
        return {
            trending: sortedCategories.map(([cat]) => cat),
            growth: Math.random() * 50 + 20 // Mock growth percentage
        };
    }

    identifyContentGaps(contentHistory, competitors) {
        // Mock content gap analysis
        const allCategories = Object.keys(this.categories);
        const publishedCategories = new Set(contentHistory.map(c => c.category).filter(Boolean));
        
        return allCategories.filter(cat => !publishedCategories.has(cat));
    }

    analyzeCompetitivePosition(contentHistory, competitors) {
        const insights = [];
        
        // Mock competitive insights
        if (competitors.length > 0) {
            insights.push({
                type: 'Competitive Position',
                category: 'competition',
                text: `${competitors[0].label} is the most active competitor with 40% of tracked content`,
                confidence: 'High'
            });
        }

        return insights;
    }
}

// Initialize enhanced dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new EnhancedContentSpyDashboard();
});