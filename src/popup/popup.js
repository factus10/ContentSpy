// ContentSpy Popup JavaScript
class ContentSpyPopup {
    constructor() {
        this.competitors = [];
        this.recentActivity = [];
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderCompetitors();
        this.updateUI();
    }

    // Load data from Chrome storage
    async loadData() {
        try {
            const result = await chrome.storage.sync.get(['competitors', 'recentActivity']);
            this.competitors = result.competitors || [];
            this.recentActivity = result.recentActivity || [];
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Error loading data', 'error');
        }
    }

    // Save data to Chrome storage
    async saveData() {
        try {
            await chrome.storage.sync.set({
                competitors: this.competitors,
                recentActivity: this.recentActivity
            });
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('Error saving data', 'error');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Add competitor form
        document.getElementById('addCompetitorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCompetitor();
        });

        // Dashboard button
        document.getElementById('dashboardBtn').addEventListener('click', () => {
            this.openDashboard();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openDashboard();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshAllCompetitors();
        });

        // Auto-fill current tab URL when popup opens
        this.getCurrentTabUrl();
    }

    // Get current tab URL and auto-fill if it's a valid website
    async getCurrentTabUrl() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                const urlInput = document.getElementById('competitorUrl');
                const domain = new URL(tab.url).hostname;
                
                // Check if this domain isn't already tracked
                const isAlreadyTracked = this.competitors.some(comp => 
                    new URL(comp.url).hostname === domain
                );
                
                if (!isAlreadyTracked) {
                    urlInput.value = tab.url;
                    urlInput.placeholder = 'Current page URL detected';
                }
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    // Handle adding a new competitor
    async handleAddCompetitor() {
        const urlInput = document.getElementById('competitorUrl');
        const labelInput = document.getElementById('competitorLabel');
        
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

        // Create new competitor object
        const competitor = {
            id: Date.now().toString(),
            url: url,
            label: label || this.extractDomainName(url),
            addedAt: new Date().toISOString(),
            isActive: true,
            lastChecked: null,
            contentCount: 0,
            settings: {
                checkInterval: 30, // minutes
                notifications: true
            }
        };

        // Add to competitors list
        this.competitors.push(competitor);
        
        // Save data
        await this.saveData();
        
        // Update UI
        this.renderCompetitors();
        this.updateUI();
        
        // Clear form
        urlInput.value = '';
        labelInput.value = '';
        urlInput.placeholder = 'Enter competitor website URL';
        
        // Add to recent activity
        this.addActivity(`Added ${competitor.label}`, 'add');
        
        // Show success message
        this.showNotification(`Added ${competitor.label} successfully`, 'success');

        // Start monitoring this competitor
        this.startMonitoring(competitor.id);
    }

    // Extract domain name from URL for default label
    extractDomainName(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '').split('.')[0];
        } catch {
            return 'Unknown';
        }
    }

    // Render competitors list
    renderCompetitors() {
        const competitorsList = document.getElementById('competitorsList');
        const emptyState = document.getElementById('emptyState');
        const competitorCount = document.getElementById('competitorCount');

        // Update count
        competitorCount.textContent = this.competitors.length;

        if (this.competitors.length === 0) {
            competitorsList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // Clear current list
        competitorsList.innerHTML = '';

        // Render each competitor
        this.competitors.forEach(competitor => {
            const competitorElement = this.createCompetitorElement(competitor);
            competitorsList.appendChild(competitorElement);
        });
    }

    // Create competitor HTML element
    createCompetitorElement(competitor) {
        const template = document.getElementById('competitorTemplate');
        const element = template.content.cloneNode(true);

        // Set data attributes
        const competitorItem = element.querySelector('.competitor-item');
        competitorItem.dataset.url = competitor.url;
        competitorItem.dataset.id = competitor.id;

        // Fill in data
        element.querySelector('.competitor-name').textContent = competitor.label;
        element.querySelector('.competitor-url').textContent = competitor.url;
        
        // Update stats
        const stats = element.querySelectorAll('.stat-value');
        stats[0].textContent = competitor.contentCount || 0;
        stats[1].textContent = competitor.lastChecked ? 
            this.formatTimeAgo(competitor.lastChecked) : 'Never';

        // Set toggle state
        const toggleBtn = element.querySelector('.toggle-btn');
        if (!competitor.isActive) {
            toggleBtn.classList.remove('active');
        }

        // Add event listeners
        toggleBtn.addEventListener('click', () => {
            this.toggleCompetitor(competitor.id);
        });

        element.querySelector('.delete-btn').addEventListener('click', () => {
            this.removeCompetitor(competitor.id);
        });

        return element;
    }

    // Toggle competitor monitoring
    async toggleCompetitor(competitorId) {
        const competitor = this.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        competitor.isActive = !competitor.isActive;
        await this.saveData();
        this.renderCompetitors();

        const action = competitor.isActive ? 'enabled' : 'disabled';
        this.addActivity(`${action} monitoring for ${competitor.label}`, action);
        this.showNotification(`Monitoring ${action} for ${competitor.label}`, 'success');

        if (competitor.isActive) {
            this.startMonitoring(competitorId);
        } else {
            this.stopMonitoring(competitorId);
        }
    }

    // Remove competitor
    async removeCompetitor(competitorId) {
        const competitor = this.competitors.find(c => c.id === competitorId);
        if (!competitor) return;

        if (confirm(`Remove ${competitor.label} from tracking?`)) {
            this.competitors = this.competitors.filter(c => c.id !== competitorId);
            await this.saveData();
            this.renderCompetitors();
            this.updateUI();

            this.addActivity(`Removed ${competitor.label}`, 'remove');
            this.showNotification(`Removed ${competitor.label}`, 'success');
            this.stopMonitoring(competitorId);
        }
    }

    // Start monitoring a competitor
    startMonitoring(competitorId) {
        // Send message to background script to start monitoring
        chrome.runtime.sendMessage({
            action: 'startMonitoring',
            competitorId: competitorId
        });
    }

    // Stop monitoring a competitor
    stopMonitoring(competitorId) {
        // Send message to background script to stop monitoring
        chrome.runtime.sendMessage({
            action: 'stopMonitoring',
            competitorId: competitorId
        });
    }

    // Refresh all competitors
    async refreshAllCompetitors() {
        this.showLoading(true);
        
        try {
            // Send message to background script to refresh all
            chrome.runtime.sendMessage({
                action: 'refreshAll'
            });

            this.addActivity('Refreshed all competitors', 'refresh');
            this.showNotification('Refresh started', 'success');
        } catch (error) {
            console.error('Error refreshing:', error);
            this.showNotification('Error starting refresh', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Open dashboard
    openDashboard() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('dashboard/dashboard.html')
        });
    }

    // Add activity to recent activity
    addActivity(text, type = 'info') {
        const activity = {
            id: Date.now().toString(),
            text: text,
            type: type,
            timestamp: new Date().toISOString()
        };

        this.recentActivity.unshift(activity);
        
        // Keep only last 10 activities
        if (this.recentActivity.length > 10) {
            this.recentActivity = this.recentActivity.slice(0, 10);
        }

        this.saveData();
        this.renderRecentActivity();
    }

    // Render recent activity
    renderRecentActivity() {
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '';

        if (this.recentActivity.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">👋</div>
                    <div class="activity-content">
                        <p class="activity-text">Welcome to ContentSpy!</p>
                        <span class="activity-time">Just now</span>
                    </div>
                </div>
            `;
            return;
        }

        this.recentActivity.slice(0, 3).forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            
            const icon = this.getActivityIcon(activity.type);
            
            activityElement.innerHTML = `
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <p class="activity-text">${activity.text}</p>
                    <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
                </div>
            `;
            
            activityList.appendChild(activityElement);
        });
    }

    // Get icon for activity type
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

    // Format time ago
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

    // Show loading overlay
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${type === 'error' ? '#fee2e2' : type === 'success' ? '#dcfce7' : '#e0f2fe'};
            color: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#0369a1'};
            border-radius: 8px;
            border: 1px solid ${type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : '#7dd3fc'};
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Update overall UI state
    updateUI() {
        this.renderRecentActivity();
        
        // Enable/disable refresh button based on whether there are competitors
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.disabled = this.competitors.length === 0;
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
    if (request.action === 'competitorUpdated') {
        // Reload data and update UI
        popup.loadData().then(() => {
            popup.renderCompetitors();
            popup.addActivity(`New content found: ${request.competitor}`, 'content');
        });
    } else if (request.action === 'refreshComplete') {
        popup.showNotification('Refresh completed', 'success');
        popup.loadData().then(() => {
            popup.renderCompetitors();
        });
    }
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.popup = new ContentSpyPopup();
});