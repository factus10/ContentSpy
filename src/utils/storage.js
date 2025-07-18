// ContentSpy Storage Utility
class StorageManager {
    constructor() {
        this.storageKeys = {
            competitors: 'competitors',
            settings: 'settings',
            recentActivity: 'recentActivity',
            contentHistory: 'contentHistory',
            analytics: 'analytics'
        };
    }

    // Get data from storage
    async get(keys) {
        try {
            if (typeof keys === 'string') {
                keys = [keys];
            }
            const result = await chrome.storage.sync.get(keys);
            return result;
        } catch (error) {
            console.error('Storage get error:', error);
            throw error;
        }
    }

    // Set data in storage
    async set(data) {
        try {
            await chrome.storage.sync.set(data);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            throw error;
        }
    }

    // Remove data from storage
    async remove(keys) {
        try {
            await chrome.storage.sync.remove(keys);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            throw error;
        }
    }

    // Clear all storage
    async clear() {
        try {
            await chrome.storage.sync.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            throw error;
        }
    }

    // Get all competitors
    async getCompetitors() {
        const result = await this.get(this.storageKeys.competitors);
        return result[this.storageKeys.competitors] || [];
    }

    // Save competitors
    async setCompetitors(competitors) {
        return await this.set({ [this.storageKeys.competitors]: competitors });
    }

    // Add a single competitor
    async addCompetitor(competitor) {
        const competitors = await this.getCompetitors();
        
        // Check for duplicates
        const exists = competitors.some(c => c.url === competitor.url);
        if (exists) {
            throw new Error('Competitor already exists');
        }

        competitors.push(competitor);
        await this.setCompetitors(competitors);
        return competitor;
    }

    // Update a competitor
    async updateCompetitor(competitorId, updates) {
        const competitors = await this.getCompetitors();
        const index = competitors.findIndex(c => c.id === competitorId);
        
        if (index === -1) {
            throw new Error('Competitor not found');
        }

        competitors[index] = { ...competitors[index], ...updates };
        await this.setCompetitors(competitors);
        return competitors[index];
    }

    // Remove a competitor
    async removeCompetitor(competitorId) {
        const competitors = await this.getCompetitors();
        const filteredCompetitors = competitors.filter(c => c.id !== competitorId);
        
        if (filteredCompetitors.length === competitors.length) {
            throw new Error('Competitor not found');
        }

        await this.setCompetitors(filteredCompetitors);
        return true;
    }

    // Get competitor by ID
    async getCompetitor(competitorId) {
        const competitors = await this.getCompetitors();
        return competitors.find(c => c.id === competitorId) || null;
    }

    // Get settings
    async getSettings() {
        const result = await this.get(this.storageKeys.settings);
        return result[this.storageKeys.settings] || this.getDefaultSettings();
    }

    // Save settings
    async setSettings(settings) {
        return await this.set({ [this.storageKeys.settings]: settings });
    }

    // Get default settings
    getDefaultSettings() {
        return {
            notifications: {
                enabled: true,
                sound: false,
                desktop: true,
                frequency: 'immediate' // immediate, hourly, daily
            },
            monitoring: {
                interval: 30, // minutes
                retryAttempts: 3,
                respectRobots: true
            },
            analytics: {
                enabled: true,
                dataRetention: 90 // days
            },
            ui: {
                theme: 'light',
                compactMode: false
            }
        };
    }

    // Get recent activity
    async getRecentActivity() {
        const result = await this.get(this.storageKeys.recentActivity);
        return result[this.storageKeys.recentActivity] || [];
    }

    // Add activity entry
    async addActivity(activity) {
        const activities = await this.getRecentActivity();
        
        const newActivity = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...activity
        };

        activities.unshift(newActivity);
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(100);
        }

        await this.set({ [this.storageKeys.recentActivity]: activities });
        return newActivity;
    }

    // Get content history
    async getContentHistory(competitorId = null, limit = null) {
        const result = await this.get(this.storageKeys.contentHistory);
        let contentHistory = result[this.storageKeys.contentHistory] || [];

        if (competitorId) {
            contentHistory = contentHistory.filter(c => c.competitorId === competitorId);
        }

        if (limit) {
            contentHistory = contentHistory.slice(0, limit);
        }

        return contentHistory;
    }

    // Add content entry
    async addContent(content) {
        const contentHistory = await this.getContentHistory();
        
        const newContent = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...content
        };

        contentHistory.unshift(newContent);
        
        // Keep only last 1000 content entries
        if (contentHistory.length > 1000) {
            contentHistory.splice(1000);
        }

        await this.set({ [this.storageKeys.contentHistory]: contentHistory });
        return newContent;
    }

    // Get analytics data
    async getAnalytics() {
        const result = await this.get(this.storageKeys.analytics);
        return result[this.storageKeys.analytics] || {};
    }

    // Update analytics data
    async updateAnalytics(analyticsData) {
        const currentAnalytics = await this.getAnalytics();
        const updatedAnalytics = { ...currentAnalytics, ...analyticsData };
        await this.set({ [this.storageKeys.analytics]: updatedAnalytics });
        return updatedAnalytics;
    }

    // Cleanup old data
    async cleanup() {
        const settings = await this.getSettings();
        const retentionDays = settings.analytics.dataRetention || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Clean up old content history
        const contentHistory = await this.getContentHistory();
        const filteredContent = contentHistory.filter(content => 
            new Date(content.timestamp) > cutoffDate
        );

        if (filteredContent.length !== contentHistory.length) {
            await this.set({ [this.storageKeys.contentHistory]: filteredContent });
        }

        // Clean up old activity
        const activities = await this.getRecentActivity();
        const filteredActivities = activities.filter(activity => 
            new Date(activity.timestamp) > cutoffDate
        );

        if (filteredActivities.length !== activities.length) {
            await this.set({ [this.storageKeys.recentActivity]: filteredActivities });
        }

        return {
            contentRemoved: contentHistory.length - filteredContent.length,
            activitiesRemoved: activities.length - filteredActivities.length
        };
    }

    // Export all data
    async exportData() {
        const allData = await this.get(Object.values(this.storageKeys));
        return {
            ...allData,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    // Import data
    async importData(data) {
        // Validate data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        // Backup current data
        const backup = await this.exportData();
        
        try {
            // Clear current data
            await this.clear();
            
            // Import new data (excluding metadata)
            const { exportDate, version, ...importData } = data;
            await this.set(importData);
            
            return { success: true, backup };
        } catch (error) {
            // Restore backup if import fails
            await this.clear();
            await this.set(backup);
            throw error;
        }
    }

    // Get storage usage info
    async getStorageInfo() {
        try {
            const usage = await chrome.storage.sync.getBytesInUse();
            const allData = await chrome.storage.sync.get();
            
            return {
                bytesUsed: usage,
                maxBytes: chrome.storage.sync.QUOTA_BYTES,
                percentUsed: Math.round((usage / chrome.storage.sync.QUOTA_BYTES) * 100),
                itemCount: Object.keys(allData).length,
                maxItems: chrome.storage.sync.MAX_ITEMS
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    // Listen for storage changes
    onChanged(callback) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                callback(changes);
            }
        });
    }
}

// Create singleton instance
const storageManager = new StorageManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageManager;
} else {
    window.storageManager = storageManager;
}