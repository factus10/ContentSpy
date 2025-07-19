// ContentSpy Enhanced Popup JavaScript - Phase 2
class EnhancedContentSpyPopup {
    constructor() {
        this.competitors = [];
        this.recentActivity = [];
        this.aiInsights = [];
        this.analytics = {};
        this.currentTab = 'overview';
        this.selectedCompetitor = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupTabSystem();
        this.renderCurrentTab();
        this.updateStatusIndicator();
        this.loadAIInsights();
        this.setupSmartFeatures();
    }

    async loadData() {
        try {
            // Get sync data (competitors, settings)
            const syncResult = await chrome.storage.sync.get(['competitors', 'settings']);
            // Get local data (activity, analytics, AI insights)
            const localResult = await chrome.storage.local.get(['recentActivity', 'analytics', 'aiInsights']);
            
            this.competitors = syncResult.competitors || [];
            this.settings = syncResult.settings || {};
            this.recentActivity = localResult.recentActivity || [];
            this.analytics = localResult.analytics || {};
            this.aiInsights = localResult.aiInsights || [];
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading data', 'error');
        }
    }

    async saveData() {
        try {
            // Save competitors to sync storage
            await chrome.storage.sync.set({
                competitors: this.competitors
            });
            
            // Save activity to local storage
            await chrome.storage.local.set({
                recentActivity: this.recentActivity
            });
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('Error saving data', 'error');
        }
    }

    setupEventListeners() {
        // Tab system
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Smart features
        document.getElementById('autoDiscoverBtn')?.addEventListener('click', () => {
            this.autoDiscoverFeeds();
        });

        document.getElementById('aiCategorizeBtn')?.addEventListener('click', () => {
            this.runAICategorization();
        });

        document.getElementById('bulkAnalyzeBtn')?.addEventListener('click', () => {
            this.bulkAnalyzeContent();
        });

        document.getElementById('trendDetectionBtn')?.addEventListener('click', () => {
            this.detectTrends();
        });

        // Quick actions
        document.getElementById('quickRefreshBtn')?.addEventListener('click', () => {
            this.refreshAllCompetitors();
        });

        document.getElementById('quickDashboardBtn')?.addEventListener('click', () => {
            this.openDashboard();
        });

        document.getElementById('quickExportBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('quickSettingsBtn')?.addEventListener('click', () => {
            this.openDashboard();
        });

        // Add competitor form (enhanced)
        document.getElementById('addCompetitorForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddSmartCompetitor();
        });

        // Footer buttons
        document.getElementById('dashboardBtn')?.addEventListener('click', () => {
            this.openDashboard();
        });

        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshAllCompetitors();
        });

        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.openDashboard();
        });

        // URL management
        document.getElementById('addUrlBtn')?.addEventListener('click', () => {
            this.showAddUrlModal();
        });

        // Auto-fill current tab URL when popup opens
        this.getCurrentTabUrl();
    }

    setupTabSystem() {
        // Initialize tab system
        this.switchTab('overview');
    }

    switchTab(tabName) {
        // Update tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Show/hide tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');

        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'overview':
                this.renderOverviewTab();
                break;
            case 'competitors':
                this.renderCompetitorsTab();
                break;
            case 'insights':
                this.renderInsightsTab();
                break;
        }
    }

    renderOverviewTab() {
        this.updateAnalyticsSummary();
        this.renderAIInsights();
    }

    renderCompetitorsTab() {
        this.renderEnhancedCompetitors();
        this.updateCompetitorCount();
    }

    renderInsightsTab() {
        this.renderContentIntelligence();
        this.renderDiscoveryResults();
        this.renderSystemActivity();
    }

    updateStatusIndicator() {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (!statusDot || !statusText) return;

        const activeCompetitors = this.competitors.filter(c => c.isActive).length;
        const totalCompetitors = this.competitors.length;

        if (totalCompetitors === 0) {
            statusDot.className = 'status-dot warning';
            statusText.textContent = 'No competitors added';
        } else if (activeCompetitors === 0) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'All monitoring paused';
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = `Monitoring ${activeCompetitors} of ${totalCompetitors} competitors`;
        }
    }

    updateAnalyticsSummary() {
        this.updateWeeklyChart();
        this.updateTopCategory();
    }

    updateWeeklyChart() {
        const container = document.getElementById('weeklyChart');
        const countElement = document.getElementById('weeklyCount');
        
        if (!container || !countElement) return;

        // Generate last 7 days data
        const weekData = [];
        let totalCount = 0;

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            // In real implementation, this would come from contentHistory
            const count = Math.floor(Math.random() * 5); // Mock data
            weekData.push(count);
            totalCount += count;
        }

        // Create mini chart bars
        const maxCount = Math.max(...weekData, 1);
        container.innerHTML = '';
        
        weekData.forEach(count => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar-mini';
            bar.style.height = `${(count / maxCount) * 100}%`;
            container.appendChild(bar);
        });

        countElement.textContent = totalCount;
    }

    updateTopCategory() {
        const topCategoryElement = document.getElementById('topCategory');
        if (!topCategoryElement) return;

        // Mock data - in real implementation, analyze contentHistory
        const categories = ['Product Updates', 'Industry Insights', 'Company News', 'How-To Guides'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        topCategoryElement.textContent = randomCategory;
    }

    renderAIInsights() {
        const topTrendElement = document.getElementById('topTrend');
        const contentGapElement = document.getElementById('contentGap');

        if (this.aiInsights.length > 0) {
            const trendInsight = this.aiInsights.find(insight => insight.type === 'Top Trend');
            const gapInsight = this.aiInsights.find(insight => insight.type === 'Content Gap');

            if (topTrendElement && trendInsight) {
                topTrendElement.textContent = trendInsight.text;
            }

            if (contentGapElement && gapInsight) {
                contentGapElement.textContent = gapInsight.text;
            }
        } else {
            if (topTrendElement) {
                topTrendElement.textContent = 'Analyzing competitor trends...';
            }
            if (contentGapElement) {
                contentGapElement.textContent = 'Identifying content opportunities...';
            }
        }
    }

    loadAIInsights() {
        // Load AI insights from storage or generate new ones
        if (this.aiInsights.length === 0) {
            this.generateInitialInsights();
        }
    }

    generateInitialInsights() {
        // Generate some initial insights based on available data
        const insights = [];

        if (this.competitors.length > 0) {
            insights.push({
                type: 'Top Trend',
                text: `${this.competitors[0].label} is your most active competitor`,
                confidence: 'Medium'
            });

            insights.push({
                type: 'Content Gap',
                text: 'Consider adding more competitors for better insights',
                confidence: 'Low'
            });
        } else {
            insights.push({
                type: 'Getting Started',
                text: 'Add your first competitor to start monitoring',
                confidence: 'High'
            });
        }

        this.aiInsights = insights;
        this.renderAIInsights();
    }

    renderEnhancedCompetitors() {
        const competitorsList = document.getElementById('competitorsList');
        const emptyState = document.getElementById('emptyState');

        if (!competitorsList) return;

        if (this.competitors.length === 0) {
            competitorsList.innerHTML = '';
            emptyState?.classList.remove('hidden');
            return;
        }

        emptyState?.classList.add('hidden');
        competitorsList.innerHTML = '';

        this.competitors.forEach(competitor => {
            const competitorElement = this.createEnhancedCompetitorElement(competitor);
            competitorsList.appendChild(competitorElement);
        });
    }

    createEnhancedCompetitorElement(competitor) {
        const template = document.getElementById('enhancedCompetitorTemplate');
        const element = template.content.cloneNode(true);

        // Set data attributes
        const competitorItem = element.querySelector('.enhanced-competitor-item');
        competitorItem.dataset.id = competitor.id;

        // Fill in basic data
        element.querySelector('.competitor-name-enhanced').textContent = competitor.label;
        element.querySelector('.competitor-url').textContent = competitor.url;

        // Add badges
        const badgesContainer = element.querySelector('.competitor-badges');
        this.addCompetitorBadges(badgesContainer, competitor);

        // Show URLs
        const urlsContainer = element.querySelector('.url-list');
        this.renderCompetitorUrls(urlsContainer, competitor);

        // Update stats
        const stats = element.querySelectorAll('.stat-value-enhanced');
        stats[0].textContent = competitor.contentCount || 0;
        stats[1].textContent = this.getCompetitorUrlCount(competitor);
        stats[2].textContent = competitor.lastChecked ? 
            this.formatTimeAgo(competitor.lastChecked) : 'Never';

        // Setup actions
        this.setupEnhancedCompetitorActions(element, competitor);

        return element;
    }

    addCompetitorBadges(container, competitor) {
        container.innerHTML = '';

        // AI badge if categorization is enabled
        if (this.settings.ai?.categorization) {
            const aiBadge = this.createBadge('ai', 'AI');
            container.appendChild(aiBadge);
        }

        // RSS badge if feeds are available
        if (competitor.rssFeeds && competitor.rssFeeds.length > 0) {
            const rssBadge = this.createBadge('rss', 'RSS');
            container.appendChild(rssBadge);
        }

        // Multi-URL badge if additional URLs exist
        if (this.getCompetitorUrlCount(competitor) > 1) {
            const multiUrlBadge = this.createBadge('multi-url', 'Multi-URL');
            container.appendChild(multiUrlBadge);
        }
    }

    createBadge(type, text) {
        const badge = document.createElement('span');
        badge.className = `badge ${type}`;
        badge.textContent = text;
        return badge;
    }

    renderCompetitorUrls(container, competitor) {
        container.innerHTML = '';
        const urls = this.getCompetitorUrls(competitor);

        // Show first 2 URLs
        urls.slice(0, 2).forEach(urlData => {
            const urlElement = this.createUrlElement(urlData);
            container.appendChild(urlElement);
        });

        if (urls.length > 2) {
            const moreElement = document.createElement('div');
            moreElement.className = 'url-item';
            moreElement.innerHTML = `
                <span class="url-type">...</span>
                <span class="url-text">+${urls.length - 2} more</span>
            `;
            container.appendChild(moreElement);
        }
    }

    createUrlElement(urlData) {
        const template = document.getElementById('urlItemTemplate');
        const element = template.content.cloneNode(true);

        element.querySelector('.url-type').textContent = urlData.type.toUpperCase();
        element.querySelector('.url-type').className = `url-type ${urlData.type}`;
        element.querySelector('.url-text').textContent = urlData.label || urlData.url;
        element.querySelector('.url-text').title = urlData.url;

        // Add action listeners
        const editBtn = element.querySelector('.url-actions .url-action:first-child');
        const deleteBtn = element.querySelector('.url-actions .url-action:last-child');

        editBtn.addEventListener('click', () => this.editUrl(urlData));
        deleteBtn.addEventListener('click', () => this.deleteUrl(urlData));

        return element;
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

    getCompetitorUrlCount(competitor) {
        return this.getCompetitorUrls(competitor).length;
    }

    setupEnhancedCompetitorActions(element, competitor) {
        const toggleBtn = element.querySelector('.toggle-btn');
        const discoverBtn = element.querySelector('.discover-btn');
        const manageBtn = element.querySelector('.manage-btn');
        const deleteBtn = element.querySelector('.delete-btn');

        // Update toggle button state
        toggleBtn.textContent = competitor.isActive ? '👁️ Active' : '👁️ Paused';
        toggleBtn.classList.toggle('active', competitor.isActive);

        toggleBtn.addEventListener('click', () => {
            this.toggleCompetitor(competitor.id);
        });

        discoverBtn.addEventListener('click', () => {
            this.discoverCompetitorFeeds(competitor.id);
        });

        manageBtn.addEventListener('click', () => {
            this.manageCompetitorUrls(competitor.id);
        });

        deleteBtn.addEventListener('click', () => {
            this.deleteCompetitor(competitor.id);
        });
    }

    updateCompetitorCount() {
        const countElement = document.getElementById('competitorCount');
        if (countElement) {
            countElement.textContent = this.competitors.length;
        }
    }

    // Smart Features
    setupSmartFeatures() {
        // Initialize smart features based on settings
        if (this.settings.ai?.autoDiscovery) {
            this.scheduleAutoDiscovery();
        }
    }

    async autoDiscoverFeeds() {
        this.showLoading(true);
        
        try {
            let totalFeeds = 0;
            
            for (const competitor of this.competitors) {
                const feeds = await this.discoverCompetitorFeeds(competitor.id);
                totalFeeds += feeds.length;
            }

            this.showNotification(`Discovered ${totalFeeds} RSS feeds`, 'success');
            await this.loadData();
            this.renderCurrentTab();
        } catch (error) {
            this.showNotification('Error during auto-discovery', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async runAICategorization() {
        this.showLoading(true);
        
        try {
            // Send message to background to process content with AI
            await chrome.runtime.sendMessage({
                action: 'categorizeContent'
            });

            this.showNotification('AI categorization started', 'success');
        } catch (error) {
            this.showNotification('Error starting AI categorization', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async bulkAnalyzeContent() {
        this.showLoading(true);
        
        try {
            // Process all content for analysis
            await chrome.runtime.sendMessage({
                action: 'bulkAnalyze'
            });

            this.showNotification('Bulk analysis started', 'success');
        } catch (error) {
            this.showNotification('Error starting bulk analysis', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async detectTrends() {
        this.showLoading(true);
        
        try {
            // Trigger trend detection
            await chrome.runtime.sendMessage({
                action: 'detectTrends'
            });

            this.showNotification('Trend detection completed', 'success');
            
            // Refresh insights
            await this.loadData();
            this.renderAIInsights();
        } catch (error) {
            this.showNotification('Error detecting trends', 'error');
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

            const feeds = response.feeds || [];
            
            if (feeds.length > 0) {
                // Add discovered feeds to competitor
                const competitor = this.competitors.find(c => c.id === competitorId);
                if (competitor) {
                    if (!competitor.rssFeeds) competitor.rssFeeds = [];
                    
                    feeds.forEach(feed => {
                        // Check if feed doesn't already exist
                        const exists = competitor.rssFeeds.some(existing => existing.url === feed.url);
                        if (!exists) {
                            competitor.rssFeeds.push(feed);
                        }
                    });

                    await this.saveData();
                    this.renderCurrentTab();
                }
            }

            return feeds;
        } catch (error) {
            console.error('Error discovering feeds:', error);
            return [];
        }
    }

    // Competitor Management
    async getCurrentTabUrl() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                const urlInput = document.getElementById('competitorUrl');
                if (urlInput) {
                    const domain = new URL(tab.url).hostname;
                    
                    // Check if this domain isn't already tracked
                    const isAlreadyTracked = this.competitors.some(comp => {
                        try {
                            return new URL(comp.url).hostname === domain;
                        } catch {
                            return false;
                        }
                    });
                    
                    if (!isAlreadyTracked) {
                        urlInput.value = tab.url;
                        urlInput.placeholder = 'Current page URL detected';
                    }
                }
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    async handleAddSmartCompetitor() {
        const urlInput = document.getElementById('competitorUrl');
        const labelInput = document.getElementById('competitorLabel');
        const autoDiscover = document.getElementById('autoDiscover')?.checked || false;
        const enableAI = document.getElementById('enableAI')?.checked || false;
        
        const url = urlInput.value.trim();
        const label = labelInput.value.trim();

        if (!url) {
            this.showNotification('Please enter a URL', 'error');
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            this.showNotification('Please enter a valid URL', 'error');
            return;
        }

        // Check for duplicates
        const exists = this.competitors.some(comp => comp.url === url);
        if (exists) {
            this.showNotification('This competitor is already being tracked', 'error');
            return;
        }

        // Create new smart competitor object
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
                checkInterval: 30,
                notifications: true,
                autoDiscovery: autoDiscover,
                aiProcessing: enableAI
            }
        };

        // Add to competitors list
        this.competitors.push(competitor);
        
        // Save data
        await this.saveData();
        
        // Clear form
        urlInput.value = '';
        labelInput.value = '';
        urlInput.placeholder = 'Enter competitor website URL';
        
        // Add to recent activity
        this.addActivity(`Added smart competitor: ${competitor.label}`, 'add');
        
        // Show success message
        this.showNotification(`Added ${competitor.label} with smart features`, 'success');

        // Start monitoring
        this.startMonitoring(competitor.id);

        // Auto-discovery if enabled
        if (autoDiscover) {
            setTimeout(() => this.discoverCompetitorFeeds(competitor.id), 2000);
        }

        // Update UI
        this.renderCurrentTab();
        this.updateStatusIndicator();
    }

    extractDomainName(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '').split('.')[0];
        } catch {
            return 'Unknown';
        }
    }

    async toggleCompetitor(competitorId) {
        const competitor = this.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        competitor.isActive = !competitor.isActive;
        await this.saveData();
        this.renderCurrentTab();
        this.updateStatusIndicator();

        const action = competitor.isActive ? 'enabled' : 'disabled';
        this.addActivity(`${action} monitoring for ${competitor.label}`, action);
        this.showNotification(`Monitoring ${action} for ${competitor.label}`, 'success');

        if (competitor.isActive) {
            this.startMonitoring(competitorId);
        } else {
            this.stopMonitoring(competitorId);
        }
    }

    async deleteCompetitor(competitorId) {
        const competitor = this.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        if (confirm(`Remove ${competitor.label} from tracking?`)) {
            this.competitors = this.competitors.filter(c => c.id !== competitorId);
            await this.saveData();
            this.renderCurrentTab();
            this.updateStatusIndicator();

            this.addActivity(`Removed ${competitor.label}`, 'remove');
            this.showNotification(`Removed ${competitor.label}`, 'success');
            this.stopMonitoring(competitorId);
        }
    }

    manageCompetitorUrls(competitorId) {
        this.selectedCompetitor = competitorId;
        const competitor = this.competitors.find(c => c.id === competitorId);
        
        if (competitor) {
            this.showUrlManagement(competitor);
        }
    }

    showUrlManagement(competitor) {
        const urlManagement = document.getElementById('urlManagement');
        if (!urlManagement) return;

        // Show URL management section
        urlManagement.style.display = 'block';
        
        // Populate URL list
        const urlList = document.getElementById('urlList');
        if (urlList) {
            this.renderUrlManagementList(urlList, competitor);
        }
    }

    renderUrlManagementList(container, competitor) {
        container.innerHTML = '';
        const urls = this.getCompetitorUrls(competitor);

        urls.forEach(urlData => {
            const urlElement = this.createUrlElement(urlData);
            container.appendChild(urlElement);
        });
    }

    // URL Management
    editUrl(urlData) {
        const newUrl = prompt('Edit URL:', urlData.url);
        if (newUrl && newUrl !== urlData.url) {
            urlData.url = newUrl;
            this.saveData();
            this.renderCurrentTab();
        }
    }

    deleteUrl(urlData) {
        if (confirm('Delete this URL?')) {
            // Remove URL from competitor
            const competitor = this.competitors.find(c => c.id === this.selectedCompetitor);
            if (competitor) {
                // Remove from appropriate array
                if (urlData.type === 'rss') {
                    competitor.rssFeeds = competitor.rssFeeds?.filter(feed => feed.url !== urlData.url) || [];
                } else {
                    competitor.urls = competitor.urls?.filter(url => url.url !== urlData.url) || [];
                }
                
                this.saveData();
                this.renderCurrentTab();
            }
        }
    }

    showAddUrlModal() {
        const url = prompt('Enter URL to add:');
        const type = prompt('Enter type (page/rss):') || 'page';
        
        if (url && this.selectedCompetitor) {
            this.addUrlToCompetitor(this.selectedCompetitor, url, type);
        }
    }

    addUrlToCompetitor(competitorId, url, type) {
        const competitor = this.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        const urlData = {
            url: url,
            type: type,
            label: this.extractDomainName(url),
            addedAt: new Date().toISOString()
        };

        if (type === 'rss') {
            if (!competitor.rssFeeds) competitor.rssFeeds = [];
            competitor.rssFeeds.push(urlData);
        } else {
            if (!competitor.urls) competitor.urls = [];
            competitor.urls.push(urlData);
        }

        this.saveData();
        this.renderCurrentTab();
        this.showNotification('URL added successfully', 'success');
    }

    // Activity Management
    addActivity(text, type = 'info') {
        const activity = {
            id: Date.now().toString(),
            text: text,
            type: type,
            timestamp: new Date().toISOString()
        };

        this.recentActivity.unshift(activity);
        
        // Keep only last 20 activities
        if (this.recentActivity.length > 20) {
            this.recentActivity = this.recentActivity.slice(0, 20);
        }

        this.saveData();
    }

    renderContentIntelligence() {
        const intelligenceList = document.getElementById('intelligenceList');
        if (!intelligenceList) return;

        // Mock content intelligence data
        const intelligenceItems = [
            {
                icon: '🏷️',
                text: 'Categorized 5 new articles',
                time: '2 minutes ago'
            },
            {
                icon: '📈',
                text: 'Detected trending topic: "AI Integration"',
                time: '15 minutes ago'
            },
            {
                icon: '🎯',
                text: 'Found content gap in "Case Studies"',
                time: '1 hour ago'
            }
        ];

        intelligenceList.innerHTML = '';
        intelligenceItems.forEach(item => {
            const activityElement = this.createActivityElement(item);
            intelligenceList.appendChild(activityElement);
        });
    }

    renderDiscoveryResults() {
        const discoveryResults = document.getElementById('discoveryResults');
        if (!discoveryResults) return;

        // Mock discovery results - in real implementation, this would be dynamic
        const suggestions = [
            {
                title: 'RSS Feed Found',
                url: 'blog.competitor.com/feed',
                action: 'Add'
            },
            {
                title: 'Blog Section',
                url: 'competitor.com/insights',
                action: 'Add'
            }
        ];

        // Update existing suggestion elements if they exist
        const suggestionElements = discoveryResults.querySelectorAll('.discovery-suggestion');
        suggestions.forEach((suggestion, index) => {
            if (suggestionElements[index]) {
                const titleElement = suggestionElements[index].querySelector('.suggestion-title');
                const urlElement = suggestionElements[index].querySelector('div:last-child');
                const actionBtn = suggestionElements[index].querySelector('.suggestion-action');
                
                if (titleElement) titleElement.textContent = suggestion.title;
                if (urlElement) urlElement.textContent = suggestion.url;
                if (actionBtn) {
                    actionBtn.textContent = suggestion.action;
                    actionBtn.onclick = () => this.addDiscoveredSource(suggestion.url);
                }
            }
        });
    }

    renderSystemActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        activityList.innerHTML = '';

        if (this.recentActivity.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">👋</div>
                    <div class="activity-content">
                        <p class="activity-text">Welcome to Enhanced ContentSpy!</p>
                        <span class="activity-time">Just now</span>
                    </div>
                </div>
            `;
            return;
        }

        this.recentActivity.slice(0, 5).forEach(activity => {
            const activityElement = this.createActivityElement({
                icon: this.getActivityIcon(activity.type),
                text: activity.text,
                time: this.formatTimeAgo(activity.timestamp)
            });
            activityList.appendChild(activityElement);
        });
    }

    createActivityElement(item) {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        activityElement.innerHTML = `
            <div class="activity-icon">${item.icon}</div>
            <div class="activity-content">
                <p class="activity-text">${item.text}</p>
                <span class="activity-time">${item.time}</span>
            </div>
        `;
        return activityElement;
    }

    addDiscoveredSource(url) {
        if (this.selectedCompetitor) {
            this.addUrlToCompetitor(this.selectedCompetitor, url, 'page');
        } else if (this.competitors.length > 0) {
            this.addUrlToCompetitor(this.competitors[0].id, url, 'page');
        }
    }

    // Communication with background script
    startMonitoring(competitorId) {
        chrome.runtime.sendMessage({
            action: 'startMonitoring',
            competitorId: competitorId
        });
    }

    stopMonitoring(competitorId) {
        chrome.runtime.sendMessage({
            action: 'stopMonitoring',
            competitorId: competitorId
        });
    }

    async refreshAllCompetitors() {
        this.showLoading(true);
        
        try {
            chrome.runtime.sendMessage({
                action: 'refreshAll'
            });

            this.addActivity('Started smart refresh for all competitors', 'refresh');
            this.showNotification('Smart refresh started', 'success');
        } catch (error) {
            console.error('Error refreshing:', error);
            this.showNotification('Error starting refresh', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    openDashboard() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('dashboard/dashboard.html')
        });
    }

    exportData() {
        // Simple export functionality
        const data = {
            competitors: this.competitors,
            recentActivity: this.recentActivity,
            aiInsights: this.aiInsights,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `contentspy-popup-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully', 'success');
    }

    // Utility methods
    getActivityIcon(type) {
        const icons = {
            add: '➕',
            remove: '➖',
            enabled: '👁️',
            disabled: '🚫',
            refresh: '🔄',
            content: '📝',
            info: 'ℹ️',
            ai: '🧠',
            discovery: '🔍'
        };
        return icons[type] || icons.info;
    }

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
            overlay?.classList.add('active');
        } else {
            overlay?.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#dcfce7' : type === 'warning' ? '#fef3c7' : '#e0f2fe'};
            color: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : type === 'warning' ? '#d97706' : '#0369a1'};
            border-radius: 8px;
            border: 1px solid ${type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : type === 'warning' ? '#fcd34d' : '#7dd3fc'};
            font-size: 13px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 250px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    scheduleAutoDiscovery() {
        // Schedule periodic auto-discovery
        setInterval(() => {
            if (this.settings.ai?.autoDiscovery) {
                this.autoDiscoverFeeds();
            }
        }, 24 * 60 * 60 * 1000); // Daily
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (window.popup) {
        if (request.action === 'competitorUpdated') {
            popup.loadData().then(() => {
                popup.renderCurrentTab();
                popup.addActivity(`New content found: ${request.competitor}`, 'content');
            });
        } else if (request.action === 'refreshComplete') {
            const message = request.successCount !== undefined 
                ? `Smart refresh completed: ${request.successCount} successful, ${request.errorCount || 0} errors`
                : 'Smart refresh completed';
            popup.showNotification(message, request.errorCount > 0 ? 'warning' : 'success');
            popup.loadData().then(() => {
                popup.renderCurrentTab();
            });
        } else if (request.action === 'aiInsightsReady') {
            popup.loadData().then(() => {
                popup.renderAIInsights();
            });
        }
    }
});

// Initialize enhanced popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.popup = new EnhancedContentSpyPopup();
});