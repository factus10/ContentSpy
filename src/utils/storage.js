// ContentSpy Enhanced Storage Utility - Phase 2
class EnhancedStorageManager {
    constructor() {
        // Sync storage - small, essential data that syncs across devices
        this.syncKeys = {
            competitors: 'competitors',
            settings: 'settings',
            userPreferences: 'userPreferences'
        };
        
        // Local storage - large data that stays on device
        this.localKeys = {
            recentActivity: 'recentActivity',
            contentHistory: 'contentHistory',
            analytics: 'analytics',
            contentFingerprints: 'contentFingerprints',
            aiInsights: 'aiInsights',
            discoveryCache: 'discoveryCache',
            performanceMetrics: 'performanceMetrics'
        };

        // Initialize data schemas
        this.initializeSchemas();
    }

    initializeSchemas() {
        this.schemas = {
            competitor: {
                id: 'string',
                url: 'string',
                label: 'string',
                addedAt: 'string',
                isActive: 'boolean',
                lastChecked: 'string',
                lastContentFound: 'string',
                contentCount: 'number',
                urls: 'array',
                rssFeeds: 'array',
                discoveredFeeds: 'array',
                discoveredUrls: 'array',
                settings: 'object',
                metadata: 'object',
                performance: 'object'
            },
            content: {
                id: 'string',
                competitorId: 'string',
                competitorLabel: 'string',
                title: 'string',
                content: 'string',
                url: 'string',
                publishDate: 'string',
                author: 'string',
                type: 'string',
                source: 'string',
                fingerprint: 'string',
                timestamp: 'string',
                category: 'string',
                categories: 'array',
                confidence: 'number',
                sentiment: 'string',
                topics: 'array',
                language: 'string',
                readingTime: 'number',
                wordCount: 'number',
                metadata: 'object'
            },
            settings: {
                notifications: 'object',
                monitoring: 'object',
                analytics: 'object',
                ai: 'object',
                ui: 'object',
                privacy: 'object'
            }
        };
    }

    // Enhanced get method with caching and validation
    async get(keys, options = {}) {
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
            
            // Apply validation if requested
            if (options.validate) {
                this.validateData(results);
            }
            
            return results;
        } catch (error) {
            console.error('Enhanced storage get error:', error);
            throw error;
        }
    }

    // Enhanced set method with validation and backup
    async set(data, options = {}) {
        try {
            // Validate data if requested
            if (options.validate) {
                this.validateData(data);
            }

            // Create backup if requested
            if (options.backup) {
                await this.createBackup(data);
            }

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
            
            // Update performance metrics
            await this.updatePerformanceMetrics('write', Object.keys(data).length);
            
            return true;
        } catch (error) {
            console.error('Enhanced storage set error:', error);
            throw error;
        }
    }

    // Enhanced remove method
    async remove(keys, options = {}) {
        try {
            if (typeof keys === 'string') {
                keys = [keys];
            }
            
            // Create backup if requested
            if (options.backup) {
                const dataToBackup = await this.get(keys);
                await this.createBackup(dataToBackup);
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
            console.error('Enhanced storage remove error:', error);
            throw error;
        }
    }

    // Enhanced clear method with selective clearing
    async clear(storageType = 'both') {
        try {
            if (storageType === 'both' || storageType === 'sync') {
                await chrome.storage.sync.clear();
            }
            
            if (storageType === 'both' || storageType === 'local') {
                await chrome.storage.local.clear();
            }
            
            return true;
        } catch (error) {
            console.error('Enhanced storage clear error:', error);
            throw error;
        }
    }

    // Enhanced competitor management
    async getCompetitors(options = {}) {
        const result = await this.get(this.syncKeys.competitors, options);
        const competitors = result[this.syncKeys.competitors] || [];
        
        // Apply filters if provided
        if (options.filter) {
            return competitors.filter(options.filter);
        }
        
        // Sort if requested
        if (options.sort) {
            return competitors.sort(options.sort);
        }
        
        return competitors;
    }

    async setCompetitors(competitors, options = {}) {
        return await this.set({ [this.syncKeys.competitors]: competitors }, options);
    }

    async addCompetitor(competitor, options = {}) {
        // Validate competitor data
        if (options.validate !== false) {
            this.validateCompetitor(competitor);
        }

        const competitors = await this.getCompetitors();
        
        // Check for duplicates
        const exists = competitors.some(c => c.url === competitor.url);
        if (exists) {
            throw new Error('Competitor already exists');
        }

        // Add metadata
        competitor.metadata = {
            addedAt: new Date().toISOString(),
            version: '2.0.0',
            ...competitor.metadata
        };

        competitors.push(competitor);
        await this.setCompetitors(competitors, options);
        
        // Log activity
        await this.addActivity({
            text: `Added competitor: ${competitor.label}`,
            type: 'add',
            competitorId: competitor.id
        });
        
        return competitor;
    }

    async updateCompetitor(competitorId, updates, options = {}) {
        const competitors = await this.getCompetitors();
        const index = competitors.findIndex(c => c.id === competitorId);
        
        if (index === -1) {
            throw new Error('Competitor not found');
        }

        // Merge updates
        const updatedCompetitor = { 
            ...competitors[index], 
            ...updates,
            metadata: {
                ...competitors[index].metadata,
                lastUpdated: new Date().toISOString()
            }
        };

        // Validate if requested
        if (options.validate !== false) {
            this.validateCompetitor(updatedCompetitor);
        }

        competitors[index] = updatedCompetitor;
        await this.setCompetitors(competitors, options);
        
        return updatedCompetitor;
    }

    async removeCompetitor(competitorId, options = {}) {
        const competitors = await this.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (!competitor) {
            throw new Error('Competitor not found');
        }

        // Remove competitor
        const filteredCompetitors = competitors.filter(c => c.id !== competitorId);
        await this.setCompetitors(filteredCompetitors, options);
        
        // Clean up related data
        await this.cleanupCompetitorData(competitorId);
        
        // Log activity
        await this.addActivity({
            text: `Removed competitor: ${competitor.label}`,
            type: 'remove',
            competitorId: competitorId
        });
        
        return true;
    }

    async getCompetitor(competitorId, options = {}) {
        const competitors = await this.getCompetitors(options);
        return competitors.find(c => c.id === competitorId) || null;
    }

    // Enhanced settings management
    async getSettings(category = null) {
        const result = await this.get(this.syncKeys.settings);
        const settings = result[this.syncKeys.settings] || this.getDefaultSettings();
        
        if (category) {
            return settings[category] || {};
        }
        
        return settings;
    }

    async setSettings(settings, options = {}) {
        return await this.set({ [this.syncKeys.settings]: settings }, options);
    }

    async updateSettings(category, updates, options = {}) {
        const currentSettings = await this.getSettings();
        
        if (!currentSettings[category]) {
            currentSettings[category] = {};
        }
        
        currentSettings[category] = {
            ...currentSettings[category],
            ...updates
        };
        
        return await this.setSettings(currentSettings, options);
    }

    getDefaultSettings() {
        return {
            notifications: {
                enabled: true,
                sound: false,
                desktop: true,
                frequency: 'immediate',
                quiet_hours: {
                    enabled: false,
                    start: '22:00',
                    end: '08:00'
                }
            },
            monitoring: {
                interval: 30,
                retryAttempts: 3,
                respectRobots: true,
                batchSize: 5,
                timeout: 30000
            },
            analytics: {
                enabled: true,
                dataRetention: 90,
                autoGenerateReports: true,
                trackPerformance: true
            },
            ai: {
                categorization: true,
                sentimentAnalysis: true,
                topicExtraction: true,
                autoDiscovery: true,
                languageDetection: true,
                insightsGeneration: true
            },
            ui: {
                theme: 'auto',
                compactMode: false,
                showPreviews: true,
                animationsEnabled: true
            },
            privacy: {
                anonymizeData: false,
                shareAnalytics: true,
                dataExportEnabled: true
            }
        };
    }

    // Enhanced content management
    async getContentHistory(competitorId = null, options = {}) {
        const result = await this.get(this.localKeys.contentHistory);
        let contentHistory = result[this.localKeys.contentHistory] || [];

        // Apply filters
        if (competitorId) {
            contentHistory = contentHistory.filter(c => c.competitorId === competitorId);
        }

        if (options.category) {
            contentHistory = contentHistory.filter(c => c.category === options.category);
        }

        if (options.sentiment) {
            contentHistory = contentHistory.filter(c => c.sentiment === options.sentiment);
        }

        if (options.language) {
            contentHistory = contentHistory.filter(c => c.language === options.language);
        }

        if (options.dateRange) {
            const { start, end } = options.dateRange;
            contentHistory = contentHistory.filter(c => {
                const date = new Date(c.timestamp);
                return date >= start && date <= end;
            });
        }

        // Apply sorting
        if (options.sort) {
            contentHistory = contentHistory.sort(options.sort);
        }

        // Apply limit
        if (options.limit) {
            contentHistory = contentHistory.slice(0, options.limit);
        }

        return contentHistory;
    }

    async addContent(content, options = {}) {
        const contentHistory = await this.getContentHistory();
        
        const newContent = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...content,
            metadata: {
                version: '2.0.0',
                processed: !!content.category,
                ...content.metadata
            }
        };

        contentHistory.unshift(newContent);
        
        // Keep only last 1000 content entries (increased from 500)
        if (contentHistory.length > 1000) {
            contentHistory.splice(1000);
        }

        await this.set({ [this.localKeys.contentHistory]: contentHistory }, options);
        
        // Update analytics
        await this.updateAnalytics('content_added', {
            competitorId: content.competitorId,
            category: content.category,
            sentiment: content.sentiment,
            language: content.language
        });
        
        return newContent;
    }

    async bulkAddContent(contentArray, options = {}) {
        const contentHistory = await this.getContentHistory();
        const timestamp = new Date().toISOString();
        
        const processedContent = contentArray.map(content => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: timestamp,
            ...content,
            metadata: {
                version: '2.0.0',
                processed: !!content.category,
                bulk: true,
                ...content.metadata
            }
        }));

        contentHistory.unshift(...processedContent);
        
        // Keep only last 1000 content entries
        if (contentHistory.length > 1000) {
            contentHistory.splice(1000);
        }

        await this.set({ [this.localKeys.contentHistory]: contentHistory }, options);
        
        // Update analytics
        await this.updateAnalytics('bulk_content_added', {
            count: contentArray.length,
            categories: [...new Set(contentArray.map(c => c.category).filter(Boolean))],
            competitors: [...new Set(contentArray.map(c => c.competitorId))]
        });
        
        return processedContent;
    }

    // Enhanced activity management
    async getRecentActivity(options = {}) {
        const result = await this.get(this.localKeys.recentActivity);
        let activities = result[this.localKeys.recentActivity] || [];

        // Apply filters
        if (options.type) {
            activities = activities.filter(a => a.type === options.type);
        }

        if (options.competitorId) {
            activities = activities.filter(a => a.competitorId === options.competitorId);
        }

        if (options.limit) {
            activities = activities.slice(0, options.limit);
        }

        return activities;
    }

    async addActivity(activity, options = {}) {
        const activities = await this.getRecentActivity();
        
        const newActivity = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...activity
        };

        activities.unshift(newActivity);
        
        // Keep only last 200 activities (increased from 100)
        if (activities.length > 200) {
            activities.splice(200);
        }

        await this.set({ [this.localKeys.recentActivity]: activities }, options);
        
        return newActivity;
    }

    async clearActivity(olderThan = null) {
        let activities = await this.getRecentActivity();
        
        if (olderThan) {
            const cutoff = new Date(olderThan);
            activities = activities.filter(a => new Date(a.timestamp) > cutoff);
        } else {
            activities = [];
        }

        await this.set({ [this.localKeys.recentActivity]: activities });
        
        return activities.length;
    }

    // Enhanced analytics management
    async getAnalytics(category = null) {
        const result = await this.get(this.localKeys.analytics);
        const analytics = result[this.localKeys.analytics] || {};
        
        if (category) {
            return analytics[category] || {};
        }
        
        return analytics;
    }

    async updateAnalytics(event, data) {
        const analytics = await this.getAnalytics();
        const today = new Date().toISOString().split('T')[0];
        
        if (!analytics[today]) {
            analytics[today] = {};
        }
        
        if (!analytics[today][event]) {
            analytics[today][event] = [];
        }
        
        analytics[today][event].push({
            timestamp: new Date().toISOString(),
            ...data
        });
        
        // Keep only last 30 days of analytics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        Object.keys(analytics).forEach(date => {
            if (new Date(date) < thirtyDaysAgo) {
                delete analytics[date];
            }
        });
        
        await this.set({ [this.localKeys.analytics]: analytics });
    }

    async generateAnalyticsReport(dateRange = 7) {
        const analytics = await this.getAnalytics();
        const report = {
            dateRange: dateRange,
            generatedAt: new Date().toISOString(),
            summary: {},
            details: {}
        };

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);

        // Process analytics data
        Object.keys(analytics).forEach(date => {
            const analyticsDate = new Date(date);
            if (analyticsDate >= startDate && analyticsDate <= endDate) {
                report.details[date] = analytics[date];
                
                // Update summary
                Object.keys(analytics[date]).forEach(event => {
                    if (!report.summary[event]) {
                        report.summary[event] = 0;
                    }
                    report.summary[event] += analytics[date][event].length;
                });
            }
        });

        return report;
    }

    // AI insights management
    async getAIInsights(category = null) {
        const result = await this.get(this.localKeys.aiInsights);
        let insights = result[this.localKeys.aiInsights] || [];

        if (category) {
            insights = insights.filter(i => i.category === category);
        }

        return insights;
    }

    async addAIInsight(insight, options = {}) {
        const insights = await this.getAIInsights();
        
        const newInsight = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...insight
        };

        insights.unshift(newInsight);
        
        // Keep only last 100 insights
        if (insights.length > 100) {
            insights.splice(100);
        }

        await this.set({ [this.localKeys.aiInsights]: insights }, options);
        
        return newInsight;
    }

    async bulkAddAIInsights(insightsArray, options = {}) {
        const insights = await this.getAIInsights();
        const timestamp = new Date().toISOString();
        
        const processedInsights = insightsArray.map(insight => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: timestamp,
            ...insight
        }));

        insights.unshift(...processedInsights);
        
        // Keep only last 100 insights
        if (insights.length > 100) {
            insights.splice(100);
        }

        await this.set({ [this.localKeys.aiInsights]: insights }, options);
        
        return processedInsights;
    }

    // Discovery cache management
    async getDiscoveryCache(competitorId = null) {
        const result = await this.get(this.localKeys.discoveryCache);
        const cache = result[this.localKeys.discoveryCache] || {};

        if (competitorId) {
            return cache[competitorId] || {};
        }

        return cache;
    }

    async setDiscoveryCache(competitorId, data, options = {}) {
        const cache = await this.getDiscoveryCache();
        
        cache[competitorId] = {
            ...data,
            lastUpdated: new Date().toISOString(),
            ttl: options.ttl || 24 * 60 * 60 * 1000 // 24 hours default
        };

        await this.set({ [this.localKeys.discoveryCache]: cache }, options);
    }

    async clearDiscoveryCache(competitorId = null) {
        if (competitorId) {
            const cache = await this.getDiscoveryCache();
            delete cache[competitorId];
            await this.set({ [this.localKeys.discoveryCache]: cache });
        } else {
            await this.set({ [this.localKeys.discoveryCache]: {} });
        }
    }

    // Content fingerprint management (enhanced)
    async getContentFingerprints(competitorId) {
        const key = `fingerprints_${competitorId}`;
        const result = await chrome.storage.local.get([key]);
        return result[key] || [];
    }

    async storeContentFingerprints(competitorId, fingerprints, options = {}) {
        const key = `fingerprints_${competitorId}`;
        
        // Enhanced fingerprint storage with metadata
        const fingerprintData = {
            fingerprints: fingerprints.slice(0, 500), // Increased limit
            lastUpdated: new Date().toISOString(),
            count: fingerprints.length,
            version: '2.0.0'
        };

        await chrome.storage.local.set({ [key]: fingerprintData });
        
        // Update performance metrics
        await this.updatePerformanceMetrics('fingerprint_update', fingerprints.length);
    }

    async addContentFingerprint(competitorId, fingerprint, metadata = {}) {
        const existing = await this.getContentFingerprints(competitorId);
        
        if (!existing.fingerprints) {
            existing.fingerprints = [];
        }
        
        if (!existing.fingerprints.includes(fingerprint)) {
            existing.fingerprints.unshift(fingerprint);
            await this.storeContentFingerprints(competitorId, existing.fingerprints);
        }
    }

    // Performance metrics
    async updatePerformanceMetrics(operation, value) {
        const result = await this.get(this.localKeys.performanceMetrics);
        const metrics = result[this.localKeys.performanceMetrics] || {};
        
        const today = new Date().toISOString().split('T')[0];
        
        if (!metrics[today]) {
            metrics[today] = {};
        }
        
        if (!metrics[today][operation]) {
            metrics[today][operation] = [];
        }
        
        metrics[today][operation].push({
            timestamp: new Date().toISOString(),
            value: value
        });
        
        // Keep only last 7 days of metrics
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        Object.keys(metrics).forEach(date => {
            if (new Date(date) < sevenDaysAgo) {
                delete metrics[date];
            }
        });
        
        await this.set({ [this.localKeys.performanceMetrics]: metrics });
    }

    async getPerformanceMetrics() {
        const result = await this.get(this.localKeys.performanceMetrics);
        return result[this.localKeys.performanceMetrics] || {};
    }

    // Data validation
    validateData(data) {
        Object.keys(data).forEach(key => {
            if (key === 'competitors' && Array.isArray(data[key])) {
                data[key].forEach(competitor => this.validateCompetitor(competitor));
            } else if (key === 'contentHistory' && Array.isArray(data[key])) {
                data[key].forEach(content => this.validateContent(content));
            }
        });
    }

    validateCompetitor(competitor) {
        if (!competitor.id || !competitor.url || !competitor.label) {
            throw new Error('Invalid competitor data: missing required fields');
        }
        
        try {
            new URL(competitor.url);
        } catch {
            throw new Error('Invalid competitor URL');
        }
    }

    validateContent(content) {
        if (!content.title || !content.url || !content.competitorId) {
            throw new Error('Invalid content data: missing required fields');
        }
    }

    // Backup and restore
    async createBackup(data) {
        const backups = await this.get(['backups']);
        const backupHistory = backups.backups || [];
        
        const backup = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            data: data,
            version: '2.0.0'
        };
        
        backupHistory.unshift(backup);
        
        // Keep only last 5 backups
        if (backupHistory.length > 5) {
            backupHistory.splice(5);
        }
        
        await this.set({ backups: backupHistory });
    }

    async restoreBackup(backupId) {
        const backups = await this.get(['backups']);
        const backupHistory = backups.backups || [];
        
        const backup = backupHistory.find(b => b.id === backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }
        
        await this.set(backup.data);
        
        return backup;
    }

    async listBackups() {
        const backups = await this.get(['backups']);
        return backups.backups || [];
    }

    // Enhanced cleanup
    async cleanup(options = {}) {
        const settings = await this.getSettings();
        const retentionDays = settings.analytics?.dataRetention || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        let cleanupStats = {
            contentRemoved: 0,
            activitiesRemoved: 0,
            analyticsRemoved: 0,
            cacheCleared: 0
        };

        // Clean up old content history
        if (options.content !== false) {
            const contentHistory = await this.getContentHistory();
            const filteredContent = contentHistory.filter(content => 
                new Date(content.timestamp) > cutoffDate
            );
            
            if (filteredContent.length !== contentHistory.length) {
                await this.set({ [this.localKeys.contentHistory]: filteredContent });
                cleanupStats.contentRemoved = contentHistory.length - filteredContent.length;
            }
        }

        // Clean up old activity
        if (options.activity !== false) {
            const activities = await this.getRecentActivity();
            const filteredActivities = activities.filter(activity => 
                new Date(activity.timestamp) > cutoffDate
            );
            
            if (filteredActivities.length !== activities.length) {
                await this.set({ [this.localKeys.recentActivity]: filteredActivities });
                cleanupStats.activitiesRemoved = activities.length - filteredActivities.length;
            }
        }

        // Clean up old analytics
        if (options.analytics !== false) {
            const analytics = await this.getAnalytics();
            const filteredAnalytics = {};
            
            Object.keys(analytics).forEach(date => {
                if (new Date(date) > cutoffDate) {
                    filteredAnalytics[date] = analytics[date];
                } else {
                    cleanupStats.analyticsRemoved++;
                }
            });
            
            await this.set({ [this.localKeys.analytics]: filteredAnalytics });
        }

        // Clean up expired cache entries
        if (options.cache !== false) {
            const cache = await this.getDiscoveryCache();
            const filteredCache = {};
            
            Object.keys(cache).forEach(competitorId => {
                const cacheEntry = cache[competitorId];
                if (cacheEntry.lastUpdated) {
                    const entryDate = new Date(cacheEntry.lastUpdated);
                    const ttl = cacheEntry.ttl || 24 * 60 * 60 * 1000;
                    
                    if (Date.now() - entryDate.getTime() < ttl) {
                        filteredCache[competitorId] = cacheEntry;
                    } else {
                        cleanupStats.cacheCleared++;
                    }
                }
            });
            
            await this.set({ [this.localKeys.discoveryCache]: filteredCache });
        }

        // Update performance metrics
        await this.updatePerformanceMetrics('cleanup', cleanupStats);

        return cleanupStats;
    }

    // Enhanced data cleanup for removed competitors
    async cleanupCompetitorData(competitorId) {
        // Remove content history
        const contentHistory = await this.getContentHistory();
        const filteredContent = contentHistory.filter(c => c.competitorId !== competitorId);
        await this.set({ [this.localKeys.contentHistory]: filteredContent });

        // Remove activity
        const activities = await this.getRecentActivity();
        const filteredActivities = activities.filter(a => a.competitorId !== competitorId);
        await this.set({ [this.localKeys.recentActivity]: filteredActivities });

        // Remove fingerprints
        const fingerprintKey = `fingerprints_${competitorId}`;
        await chrome.storage.local.remove([fingerprintKey]);

        // Remove discovery cache
        await this.clearDiscoveryCache(competitorId);

        // Remove AI insights
        const insights = await this.getAIInsights();
        const filteredInsights = insights.filter(i => i.competitorId !== competitorId);
        await this.set({ [this.localKeys.aiInsights]: filteredInsights });
    }

    // Enhanced export functionality
    async exportData(options = {}) {
        const allKeys = [...Object.values(this.syncKeys), ...Object.values(this.localKeys)];
        const allData = await this.get(allKeys);
        
        const exportData = {
            ...allData,
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            options: options
        };

        // Include performance metrics if requested
        if (options.includeMetrics) {
            exportData.performanceMetrics = await this.getPerformanceMetrics();
        }

        // Include backups if requested
        if (options.includeBackups) {
            exportData.backups = await this.listBackups();
        }

        return exportData;
    }

    // Enhanced import functionality
    async importData(data, options = {}) {
        // Validate data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        // Check version compatibility
        if (data.version && data.version !== '2.0.0') {
            console.warn('Importing data from different version:', data.version);
        }

        // Backup current data if requested
        let backup = null;
        if (options.backup !== false) {
            backup = await this.exportData();
            await this.createBackup(backup);
        }
        
        try {
            // Clear current data if requested
            if (options.merge !== true) {
                await this.clear();
            }
            
            // Import new data (excluding metadata)
            const { exportDate, version, options: exportOptions, performanceMetrics, backups, ...importData } = data;
            
            // Validate imported data
            if (options.validate !== false) {
                this.validateData(importData);
            }
            
            await this.set(importData);
            
            // Update performance metrics
            await this.updatePerformanceMetrics('import', Object.keys(importData).length);
            
            return { success: true, backup };
        } catch (error) {
            // Restore backup if import fails and backup exists
            if (backup && options.backup !== false) {
                await this.clear();
                const { exportDate, version, options: backupOptions, ...restoreData } = backup;
                await this.set(restoreData);
            }
            throw error;
        }
    }

    // Enhanced storage usage info
    async getStorageInfo() {
        try {
            const [syncUsage, localUsage] = await Promise.all([
                chrome.storage.sync.getBytesInUse(),
                chrome.storage.local.getBytesInUse()
            ]);
            
            const [syncData, localData] = await Promise.all([
                chrome.storage.sync.get(),
                chrome.storage.local.get()
            ]);
            
            return {
                sync: {
                    bytesUsed: syncUsage,
                    maxBytes: chrome.storage.sync.QUOTA_BYTES,
                    percentUsed: Math.round((syncUsage / chrome.storage.sync.QUOTA_BYTES) * 100),
                    itemCount: Object.keys(syncData).length,
                    itemsPerCategory: this.categorizeStorageItems(syncData)
                },
                local: {
                    bytesUsed: localUsage,
                    maxBytes: chrome.storage.local.QUOTA_BYTES,
                    percentUsed: Math.round((localUsage / chrome.storage.local.QUOTA_BYTES) * 100),
                    itemCount: Object.keys(localData).length,
                    itemsPerCategory: this.categorizeStorageItems(localData)
                },
                total: {
                    bytesUsed: syncUsage + localUsage,
                    itemCount: Object.keys(syncData).length + Object.keys(localData).length
                }
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    categorizeStorageItems(data) {
        const categories = {
            competitors: 0,
            content: 0,
            settings: 0,
            analytics: 0,
            cache: 0,
            other: 0
        };

        Object.keys(data).forEach(key => {
            if (key === 'competitors') {
                categories.competitors = Array.isArray(data[key]) ? data[key].length : 1;
            } else if (key === 'contentHistory') {
                categories.content = Array.isArray(data[key]) ? data[key].length : 1;
            } else if (key === 'settings') {
                categories.settings = 1;
            } else if (key === 'analytics' || key === 'performanceMetrics') {
                categories.analytics = 1;
            } else if (key.includes('cache') || key.includes('fingerprints')) {
                categories.cache = 1;
            } else {
                categories.other = 1;
            }
        });

        return categories;
    }

    // Enhanced storage change listener
    onChanged(callback) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            const enhancedChanges = {};
            
            Object.keys(changes).forEach(key => {
                enhancedChanges[key] = {
                    ...changes[key],
                    namespace: namespace,
                    timestamp: new Date().toISOString()
                };
            });
            
            callback(enhancedChanges, namespace);
        });
    }

    // Initialize storage with default data
    async initialize() {
        const settings = await this.getSettings();
        if (!settings.version) {
            // First time initialization
            const defaultSettings = this.getDefaultSettings();
            defaultSettings.version = '2.0.0';
            await this.setSettings(defaultSettings);
            
            // Add welcome activity
            await this.addActivity({
                text: 'ContentSpy Enhanced initialized',
                type: 'info'
            });
        }
    }
}

// Create singleton instance
const enhancedStorageManager = new EnhancedStorageManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = enhancedStorageManager;
} else {
    window.enhancedStorageManager = enhancedStorageManager;
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    enhancedStorageManager.initialize();
}