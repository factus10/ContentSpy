// ContentSpy Storage Utility
class StorageManager {
    constructor() {
        // Sync storage - small, essential data that syncs across devices
        this.syncKeys = {
            competitors: 'competitors',
            settings: 'settings'
        };
        
        // Local storage - large data that stays on device
        this.localKeys = {
            recentActivity: 'recentActivity',
            contentHistory: 'contentHistory',
            analytics: 'analytics',
            contentFingerprints: 'contentFingerprints'
        };
    }

    // Get data from storage (automatically chooses sync or local)
    async get(keys) {
        try {
            if (typeof keys === 'string') {
                keys = [keys];
            }
            
            // Separate sync and local keys
            const syncKeys = keys.filter(key => Object.values(this.syncKeys).includes(key));
            const localKeys = keys.filter(key => Object.values(this.localKeys).includes(key));
            
            // Fetch from both storages
            const results = {};
            
            if (syncKeys.length > 0) {
                const syncResult = await chrome.storage.sync.get(syncKeys);
                Object.assign(results, syncResult);
            }
            
            if (localKeys.length > 0) {
                const localResult = await chrome.storage.local.get(localKeys);
                Object.assign(results, localResult);
            }
            
            return results;
        } catch (error) {
            console.error('Storage get error:', error);
            throw error;
        }
    }

    // Set data in storage (automatically chooses sync or local)
    async set(data) {
        try {
            const syncData = {};
            const localData = {};
            
            // Separate data based on storage type
            Object.keys(data).forEach(key => {
                if (Object.values(this.syncKeys).includes(key)) {
                    syncData[key] = data[key];
                } else {
                    localData[key] = data[key];
                }
            });
            
            // Save to appropriate storages
            if (Object.keys(syncData).length > 0) {
                await chrome.storage.sync.set(syncData);
            }
            
            if (Object.keys(localData).length > 0) {
                await chrome.storage.local.set(localData);
            }
            
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            throw error;
        }
    }

    // Remove data from storage
    async remove(keys) {
        try {
            if (typeof keys === 'string') {
                keys = [keys];
            }
            
            const syncKeys = keys.filter(key => Object.values(this.syncKeys).includes(key));
            const localKeys = keys.filter(key => Object.values(this.localKeys).includes(key));
            
            if (syncKeys.length > 0) {
                await chrome.storage.sync.remove(syncKeys);
            }
            
            if (localKeys.length > 0) {
                await chrome.storage.local.remove(localKeys);
            }
            
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
            await chrome.storage.local.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            throw error;
        }
    }

    // Get all competitors
    async getCompetitors() {
        const result = await this.get(this.syncKeys.competitors);
        return result[this.syncKeys.competitors] || [];
    }

    // Save competitors
    async setCompetitors(competitors) {
        return await this.set({ [this.syncKeys.competitors]: competitors });
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
        const result = await this.get(this.syncKeys.settings);
        return result[this.syncKeys.settings] || this.getDefaultSettings();
    }

    // Save settings
    async setSettings(settings) {
        return await this.set({ [this.syncKeys.settings]: settings });
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
        const result = await this.get(this.localKeys.recentActivity);
        return result[this.localKeys.recentActivity] || [];
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

        await this.set({ [this.localKeys.recentActivity]: activities });
        return newActivity;
    }

    // Get content history
    async getContentHistory(competitorId = null, limit = null) {
        const result = await this.get(this.localKeys.contentHistory);
        let contentHistory = result[this.localKeys.contentHistory] || [];

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
        
        // Keep only last 500 content entries (reduced from 1000)
        if (contentHistory.length > 500) {
            contentHistory.splice(500);
        }

        await this.set({ [this.localKeys.contentHistory]: contentHistory });
        return newContent;
    }

    // Get analytics data
    async getAnalytics() {
        const result = await this.get(this.localKeys.analytics);
        return result[this.localKeys.analytics] || {};
    }

    // Update analytics data
    async updateAnalytics(analyticsData) {
        const currentAnalytics = await this.getAnalytics();
        const updatedAnalytics = { ...currentAnalytics, ...analyticsData };
        await this.set({ [this.localKeys.analytics]: updatedAnalytics });
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
        const allKeys = [...Object.values(this.syncKeys), ...Object.values(this.localKeys)];
        const allData = await this.get(allKeys);
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
            const syncUsage = await chrome.storage.sync.getBytesInUse();
            const localUsage = await chrome.storage.local.getBytesInUse();
            const syncData = await chrome.storage.sync.get();
            const localData = await chrome.storage.local.get();
            
            return {
                sync: {
                    bytesUsed: syncUsage,
                    maxBytes: chrome.storage.sync.QUOTA_BYTES,
                    percentUsed: Math.round((syncUsage / chrome.storage.sync.QUOTA_BYTES) * 100),
                    itemCount: Object.keys(syncData).length
                },
                local: {
                    bytesUsed: localUsage,
                    maxBytes: chrome.storage.local.QUOTA_BYTES,
                    percentUsed: Math.round((localUsage / chrome.storage.local.QUOTA_BYTES) * 100),
                    itemCount: Object.keys(localData).length
                }
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    // Listen for storage changes
    onChanged(callback) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            callback(changes, namespace);
        });
    }

    // Content fingerprint management (using local storage)
    async getContentFingerprints(competitorId) {
        const key = `fingerprints_${competitorId}`;
        const result = await chrome.storage.local.get([key]);
        return result[key] || [];
    }

    async storeContentFingerprints(competitorId, fingerprints) {
        const key = `fingerprints_${competitorId}`;
        // Keep only last 200 fingerprints per competitor to manage storage
        const limitedFingerprints = fingerprints.slice(0, 200);
        await chrome.storage.local.set({ [key]: limitedFingerprints });
    }

    async addContentFingerprint(competitorId, fingerprint) {
        const existing = await this.getContentFingerprints(competitorId);
        if (!existing.includes(fingerprint)) {
            existing.unshift(fingerprint);
            await this.storeContentFingerprints(competitorId, existing);
        }
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