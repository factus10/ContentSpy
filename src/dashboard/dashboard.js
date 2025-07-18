// ContentSpy Dashboard JavaScript
class ContentSpyDashboard {
    constructor() {
        this.data = {
            competitors: [],
            contentHistory: [],
            recentActivity: [],
            settings: {}
        };
        this.charts = {};
        this.currentSection = 'overview';
        this.init();
    }

    async init() {
        console.log('Initializing ContentSpy Dashboard...');
        
        try {
            // Load data from storage
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize the UI
            this.initializeUI();
            
            // Setup charts
            this.setupCharts();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showNotification('Error loading dashboard', 'error');
        }
    }

    async loadData() {
        // Get sync data (competitors, settings)
        const syncKeys = ['competitors', 'settings'];
        const syncResult = await chrome.storage.sync.get(syncKeys);
        
        // Get local data (content history, activity)
        const localKeys = ['contentHistory', 'recentActivity'];
        const localResult = await chrome.storage.local.get(localKeys);
        
        this.data.competitors = syncResult.competitors || [];
        this.data.settings = syncResult.settings || this.getDefaultSettings();
        this.data.contentHistory = localResult.contentHistory || [];
        this.data.recentActivity = localResult.recentActivity || [];
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

        // Add competitor modal
        document.getElementById('addCompetitorBtn').addEventListener('click', () => {
            this.openAddCompetitorModal();
        });

        document.getElementById('closeAddModal').addEventListener('click', () => {
            this.closeModal('addCompetitorModal');
        });

        document.getElementById('addCompetitorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCompetitor();
        });

        // Settings modal
        document.getElementById('closeSettingsModal').addEventListener('click', () => {
            this.closeModal('settingsModal');
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Filters and search
        document.getElementById('competitorSearch')?.addEventListener('input', (e) => {
            this.filterCompetitors(e.target.value);
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterByStatus(e.target.value);
        });

        document.getElementById('contentFilter')?.addEventListener('change', (e) => {
            this.filterContent(e.target.value);
        });

        // Data management
        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importFileInput')?.addEventListener('change', (e) => {
            this.handleImportData(e);
        });

        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
            this.clearAllData();
        });

        // Activity log
        document.getElementById('clearActivityBtn')?.addEventListener('click', () => {
            this.clearActivity();
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id);
                }
            });
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleBackgroundMessage(request);
        });
    }

    initializeUI() {
        this.updateStats();
        this.renderCompetitors();
        this.renderContentFeed();
        this.renderActivityFeed();
        this.populateFilters();
        this.loadSettings();
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
        if (sectionName === 'analytics') {
            this.updateAnalytics();
        }
    }

    updateAnalytics() {
        if (typeof Chart !== 'undefined') {
            // Use Chart.js for analytics if available
            // This would be implemented in Phase 2
            console.log('Chart.js analytics not yet implemented');
        } else {
            // Use simple analytics
            this.setupSimpleAnalytics();
        }
    }

    setupSimpleAnalytics() {
        this.setupFrequencyChart();
        this.setupTypeChart();
        this.setupTimeChart();
        this.setupTopCompetitors();
    }

    setupFrequencyChart() {
        const container = document.getElementById('frequencyChart');
        if (!container) return;

        // Calculate posting frequency by day of week
        const dayFrequency = new Array(7).fill(0);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        this.data.contentHistory.forEach(content => {
            const date = new Date(content.timestamp);
            dayFrequency[date.getDay()]++;
        });

        const maxFreq = Math.max(...dayFrequency, 1);
        container.innerHTML = `
            <div class="chart-bars">
                ${dayFrequency.map((freq, index) => `
                    <div class="chart-bar">
                        <div class="bar-fill" style="height: ${(freq / maxFreq) * 100}%"></div>
                        <div class="bar-label">${dayNames[index]}</div>
                        <div class="bar-value">${freq}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupTypeChart() {
        const container = document.getElementById('typeChart');
        if (!container) return;

        // Simple content type distribution
        container.innerHTML = `
            <div class="distribution-list">
                <div class="distribution-item">
                    <span class="distribution-label">Articles</span>
                    <span class="distribution-value">${this.data.contentHistory.length}</span>
                </div>
                <div class="distribution-item">
                    <span class="distribution-label">Active Sources</span>
                    <span class="distribution-value">${this.data.competitors.filter(c => c.isActive).length}</span>
                </div>
            </div>
        `;
    }

    setupTimeChart() {
        const container = document.getElementById('timeChart');
        if (!container) return;

        // Calculate hourly distribution
        const hourFrequency = new Array(24).fill(0);
        
        this.data.contentHistory.forEach(content => {
            const date = new Date(content.timestamp);
            hourFrequency[date.getHours()]++;
        });

        const maxHourFreq = Math.max(...hourFrequency, 1);
        const peakHour = hourFrequency.indexOf(maxHourFreq);
        
        container.innerHTML = `
            <div class="time-stats">
                <div class="time-stat">
                    <span class="time-label">Peak Hour</span>
                    <span class="time-value">${peakHour}:00</span>
                </div>
                <div class="time-stat">
                    <span class="time-label">Peak Posts</span>
                    <span class="time-value">${maxHourFreq}</span>
                </div>
            </div>
        `;
    }

    setupTopCompetitors() {
        const container = document.getElementById('topicsList');
        if (!container) return;

        const competitorCounts = this.data.competitors
            .map(competitor => ({
                name: competitor.label,
                count: this.data.contentHistory.filter(content => 
                    content.competitorId === competitor.id
                ).length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        container.innerHTML = `
            <div class="competitor-ranking">
                ${competitorCounts.map((competitor, index) => `
                    <div class="ranking-item">
                        <span class="ranking-position">#${index + 1}</span>
                        <span class="ranking-name">${competitor.name}</span>
                        <span class="ranking-count">${competitor.count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }


    updateStats() {
        const totalCompetitors = this.data.competitors.length;
        const totalContent = this.data.contentHistory.length;
        const activeMonitoring = this.data.competitors.filter(c => c.isActive).length;
        
        // Calculate today's content
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayContent = this.data.contentHistory.filter(content => 
            new Date(content.timestamp) >= todayStart
        ).length;

        document.getElementById('totalCompetitors').textContent = totalCompetitors;
        document.getElementById('totalContent').textContent = totalContent;
        document.getElementById('todayContent').textContent = todayContent;
        document.getElementById('activeMonitoring').textContent = activeMonitoring;
    }

    setupCharts() {
        // Check if Chart.js is available
        if (typeof Chart !== 'undefined') {
            this.setupActivityChart();
            this.setupCompetitorChart();
        } else {
            console.warn('Chart.js not available, using simple charts');
            this.setupSimpleCharts();
        }
        this.updateRecentContent();
    }

    setupSimpleCharts() {
        this.setupSimpleActivityChart();
        this.setupSimpleCompetitorChart();
    }

    setupSimpleActivityChart() {
        const container = document.getElementById('activityChart');
        if (!container) return;

        // Generate last 7 days data
        const last7Days = [];
        const contentCounts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            const count = this.data.contentHistory.filter(content => {
                const contentDate = new Date(content.timestamp);
                return contentDate >= dayStart && contentDate < dayEnd;
            }).length;
            
            last7Days.push(dateStr);
            contentCounts.push(count);
        }

        // Create simple bar chart
        const maxCount = Math.max(...contentCounts, 1);
        container.innerHTML = `
            <div class="chart-bars">
                ${last7Days.map((day, index) => `
                    <div class="chart-bar">
                        <div class="bar-fill" style="height: ${(contentCounts[index] / maxCount) * 100}%"></div>
                        <div class="bar-label">${day}</div>
                        <div class="bar-value">${contentCounts[index]}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupSimpleCompetitorChart() {
        const container = document.getElementById('competitorChart');
        if (!container) return;

        // Get top 5 competitors by content count
        const competitorCounts = this.data.competitors
            .map(competitor => ({
                name: competitor.label,
                count: this.data.contentHistory.filter(content => 
                    content.competitorId === competitor.id
                ).length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        if (competitorCounts.length === 0) {
            container.innerHTML = '<p class="no-data">No competitors with content yet</p>';
            return;
        }

        const maxCount = Math.max(...competitorCounts.map(c => c.count), 1);
        container.innerHTML = `
            <div class="competitor-bars">
                ${competitorCounts.map(competitor => `
                    <div class="competitor-bar">
                        <div class="competitor-name">${competitor.name}</div>
                        <div class="competitor-bar-container">
                            <div class="competitor-bar-fill" style="width: ${(competitor.count / maxCount) * 100}%"></div>
                            <div class="competitor-bar-value">${competitor.count}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        // Generate last 7 days data
        const last7Days = [];
        const contentCounts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            const count = this.data.contentHistory.filter(content => {
                const contentDate = new Date(content.timestamp);
                return contentDate >= dayStart && contentDate < dayEnd;
            }).length;
            
            last7Days.push(dateStr);
            contentCounts.push(count);
        }

        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Content Items',
                    data: contentCounts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    setupCompetitorChart() {
        const ctx = document.getElementById('competitorChart');
        if (!ctx) return;

        // Get top 5 competitors by content count
        const competitorCounts = this.data.competitors
            .map(competitor => ({
                name: competitor.label,
                count: this.data.contentHistory.filter(content => 
                    content.competitorId === competitor.id
                ).length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        this.charts.competitor = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: competitorCounts.map(c => c.name),
                datasets: [{
                    data: competitorCounts.map(c => c.count),
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#4facfe',
                        '#43e97b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateRecentContent() {
        const recentContentList = document.getElementById('recentContentList');
        if (!recentContentList) return;

        recentContentList.innerHTML = '';

        // Get last 5 content items
        const recentContent = this.data.contentHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        if (recentContent.length === 0) {
            recentContentList.innerHTML = `
                <div class="empty-state">
                    <p>No recent content found</p>
                </div>
            `;
            return;
        }

        recentContent.forEach(content => {
            const competitor = this.data.competitors.find(c => c.id === content.competitorId);
            const contentElement = document.createElement('div');
            contentElement.className = 'content-item-simple';
            contentElement.innerHTML = `
                <div class="content-simple-header">
                    <span class="competitor-badge">${competitor?.label || 'Unknown'}</span>
                    <span class="content-date">${this.formatTimeAgo(content.timestamp)}</span>
                </div>
                <h4 class="content-title">${content.title}</h4>
                <a href="${content.url}" target="_blank" class="content-link">View Article →</a>
            `;
            recentContentList.appendChild(contentElement);
        });
    }

    renderCompetitors() {
        const tableBody = document.getElementById('competitorsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.data.competitors.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>No competitors added yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.data.competitors.forEach(competitor => {
            const row = this.createCompetitorRow(competitor);
            tableBody.appendChild(row);
        });
    }

    createCompetitorRow(competitor) {
        const template = document.getElementById('competitorRowTemplate');
        const row = template.content.cloneNode(true);

        const rowElement = row.querySelector('.competitor-row');
        rowElement.dataset.id = competitor.id;

        // Fill in data
        row.querySelector('.competitor-name').textContent = competitor.label;
        row.querySelector('.competitor-url').textContent = competitor.url;
        
        const statusBadge = row.querySelector('.status-badge');
        statusBadge.textContent = competitor.isActive ? 'Active' : 'Paused';
        statusBadge.className = `status-badge ${competitor.isActive ? 'active' : 'paused'}`;

        const contentCount = this.data.contentHistory.filter(c => c.competitorId === competitor.id).length;
        row.querySelector('.content-count').textContent = contentCount;
        
        row.querySelector('.last-check').textContent = competitor.lastChecked 
            ? this.formatTimeAgo(competitor.lastChecked) 
            : 'Never';
            
        row.querySelector('.last-content').textContent = competitor.lastContentFound 
            ? this.formatTimeAgo(competitor.lastContentFound) 
            : 'None';

        // Add event listeners
        const toggleBtn = row.querySelector('.toggle-btn');
        toggleBtn.addEventListener('click', () => {
            this.toggleCompetitor(competitor.id);
        });

        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
            this.editCompetitor(competitor.id);
        });

        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            this.deleteCompetitor(competitor.id);
        });

        return row;
    }

    renderContentFeed() {
        const contentFeed = document.getElementById('contentFeed');
        if (!contentFeed) return;

        contentFeed.innerHTML = '';

        const sortedContent = this.data.contentHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50); // Show last 50 items

        if (sortedContent.length === 0) {
            contentFeed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No content found yet</p>
                    <p class="empty-subtitle">Content will appear here as competitors publish new articles</p>
                </div>
            `;
            return;
        }

        sortedContent.forEach(content => {
            const contentItem = this.createContentItem(content);
            contentFeed.appendChild(contentItem);
        });
    }

    createContentItem(content) {
        const template = document.getElementById('contentItemTemplate');
        const item = template.content.cloneNode(true);

        const competitor = this.data.competitors.find(c => c.id === content.competitorId);
        
        item.querySelector('.competitor-badge').textContent = competitor?.label || 'Unknown';
        item.querySelector('.content-date').textContent = this.formatTimeAgo(content.timestamp);
        item.querySelector('.content-title').textContent = content.title;
        item.querySelector('.content-excerpt').textContent = content.content || 'No preview available';

        const actionBtn = item.querySelector('.content-action');
        actionBtn.addEventListener('click', () => {
            window.open(content.url, '_blank');
        });

        return item;
    }

    renderActivityFeed() {
        const activityFeed = document.getElementById('activityFeed');
        if (!activityFeed) return;

        activityFeed.innerHTML = '';

        if (this.data.recentActivity.length === 0) {
            activityFeed.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🕒</div>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        this.data.recentActivity.slice(0, 20).forEach(activity => {
            const activityItem = this.createActivityItem(activity);
            activityFeed.appendChild(activityItem);
        });
    }

    createActivityItem(activity) {
        const template = document.getElementById('activityItemTemplate');
        const item = template.content.cloneNode(true);

        const icon = this.getActivityIcon(activity.type);
        item.querySelector('.activity-icon').textContent = icon;
        item.querySelector('.activity-text').textContent = activity.text;
        item.querySelector('.activity-time').textContent = this.formatTimeAgo(activity.timestamp);

        return item;
    }

    getActivityIcon(type) {
        const icons = {
            add: '➕',
            remove: '➖',
            enabled: '👁️',
            disabled: '🚫',
            refresh: '🔄',
            content: '📝',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Modal Management
    openAddCompetitorModal() {
        this.showModal('addCompetitorModal');
        document.getElementById('modalCompetitorUrl').focus();
    }

    openSettingsModal() {
        this.showModal('settingsModal');
        this.loadSettings();
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    async handleAddCompetitor() {
        const url = document.getElementById('modalCompetitorUrl').value.trim();
        const label = document.getElementById('modalCompetitorLabel').value.trim();
        const interval = parseInt(document.getElementById('modalCheckInterval').value);

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
            settings: {
                checkInterval: interval,
                notifications: true
            }
        };

        this.data.competitors.push(competitor);
        await this.saveData();

        // Start monitoring
        chrome.runtime.sendMessage({
            action: 'startMonitoring',
            competitorId: competitor.id
        });

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

    async toggleCompetitor(competitorId) {
        const competitor = this.data.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        competitor.isActive = !competitor.isActive;
        await this.saveData();

        // Notify background script
        chrome.runtime.sendMessage({
            action: competitor.isActive ? 'startMonitoring' : 'stopMonitoring',
            competitorId: competitorId
        });

        this.showNotification(
            `Monitoring ${competitor.isActive ? 'enabled' : 'disabled'} for ${competitor.label}`,
            'success'
        );

        this.updateStats();
        this.renderCompetitors();
    }

    async deleteCompetitor(competitorId) {
        const competitor = this.data.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        if (confirm(`Remove ${competitor.label} from tracking? This will also delete all associated content.`)) {
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

            this.showNotification(`Removed ${competitor.label}`, 'success');
            
            this.updateStats();
            this.renderCompetitors();
            this.renderContentFeed();
            this.populateFilters();
            this.updateCharts();
        }
    }

    loadSettings() {
        document.getElementById('enableNotifications').checked = this.data.settings.notifications?.enabled !== false;
        document.getElementById('notificationSound').checked = this.data.settings.notifications?.sound === true;
        document.getElementById('defaultInterval').value = this.data.settings.monitoring?.interval || 30;
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

        await this.saveData();
        this.closeModal('settingsModal');
        this.showNotification('Settings saved successfully', 'success');
    }

    populateFilters() {
        const competitorFilter = document.getElementById('competitorFilter');
        if (!competitorFilter) return;

        // Clear current options (except "All Competitors")
        competitorFilter.innerHTML = '<option value="all">All Competitors</option>';

        this.data.competitors.forEach(competitor => {
            const option = document.createElement('option');
            option.value = competitor.id;
            option.textContent = competitor.label;
            competitorFilter.appendChild(option);
        });
    }

    async refreshAll() {
        this.showLoading(true);
        
        try {
            chrome.runtime.sendMessage({ action: 'refreshAll' });
            this.showNotification('Refresh started for all competitors', 'success');
        } catch (error) {
            this.showNotification('Error starting refresh', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async exportData() {
        try {
            const exportData = {
                competitors: this.data.competitors,
                contentHistory: this.data.contentHistory,
                settings: this.data.settings,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `contentspy-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            this.showNotification('Error exporting data', 'error');
        }
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
            recentActivity: this.data.recentActivity
        });
    }

    updateCharts() {
        if (typeof Chart !== 'undefined') {
            // Destroy existing Chart.js charts
            if (this.charts.activity) {
                this.charts.activity.destroy();
            }
            if (this.charts.competitor) {
                this.charts.competitor.destroy();
            }
            this.setupActivityChart();
            this.setupCompetitorChart();
        } else {
            // Update simple charts
            this.setupSimpleCharts();
        }
    }

    handleBackgroundMessage(request) {
        if (request.action === 'competitorUpdated') {
            // Reload data and update UI
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
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
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

    .content-item-simple {
        padding: 12px 0;
        border-bottom: 1px solid #f1f5f9;
    }

    .content-item-simple:last-child {
        border-bottom: none;
    }

    .content-simple-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .content-link {
        color: #667eea;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        margin-top: 4px;
        display: inline-block;
    }

    .content-link:hover {
        text-decoration: underline;
    }

    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #64748b;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
    }

    .empty-subtitle {
        font-size: 14px;
        opacity: 0.8;
        margin-top: 4px;
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ContentSpyDashboard();
});