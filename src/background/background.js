// ContentSpy Background Service Worker
class ContentSpyBackground {
    constructor() {
        this.monitoringIntervals = new Map();
        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log('ContentSpy Background Service Worker starting...');
        
        // Load storage utility
        await this.loadStorageManager();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize monitoring for active competitors
        await this.initializeMonitoring();
        
        this.isInitialized = true;
        console.log('ContentSpy Background Service Worker initialized');
    }

    async loadStorageManager() {
        // Import storage utility (simplified for background context)
        // In a real implementation, you'd import the storage.js file
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
                const result = await chrome.storage.sync.get(['recentActivity']);
                const activities = result.recentActivity || [];
                
                activities.unshift({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...activity
                });
                
                // Keep only last 100 activities
                if (activities.length > 100) {
                    activities.splice(100);
                }
                
                await chrome.storage.sync.set({ recentActivity: activities });
            },
            
            async addContent(content) {
                const result = await chrome.storage.sync.get(['contentHistory']);
                const contentHistory = result.contentHistory || [];
                
                contentHistory.unshift({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...content
                });
                
                // Keep only last 1000 content entries
                if (contentHistory.length > 1000) {
                    contentHistory.splice(1000);
                }
                
                await chrome.storage.sync.set({ contentHistory });
            }
        };
    }

    setupEventListeners() {
        // Handle messages from popup and content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Handle extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.initializeMonitoring();
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // Handle alarm events (for scheduled monitoring)
        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleAlarm(alarm);
        });

        // Handle tab updates (to check if we're on a monitored site)
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

    async handleInstall(details) {
        if (details.reason === 'install') {
            // First time installation
            await this.setupDefaultSettings();
            
            // Create welcome notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'ContentSpy Installed!',
                message: 'Click the extension icon to start tracking competitors.'
            });

            // Add welcome activity
            await this.storage.addActivity({
                text: 'ContentSpy installed successfully',
                type: 'info'
            });
        }
    }

    async setupDefaultSettings() {
        const defaultSettings = {
            notifications: {
                enabled: true,
                sound: false,
                desktop: true,
                frequency: 'immediate'
            },
            monitoring: {
                interval: 30, // minutes
                retryAttempts: 3,
                respectRobots: true
            }
        };

        await chrome.storage.sync.set({ settings: defaultSettings });
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
            delayInMinutes: 1, // Start checking after 1 minute
            periodInMinutes: interval
        });

        console.log(`Started monitoring ${competitor.label} every ${interval} minutes`);

        // Update last monitoring start time
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
            return;
        }

        console.log(`Checking content for ${competitor.label}`);

        try {
            // Update last checked time
            await this.storage.updateCompetitor(competitorId, {
                lastChecked: new Date().toISOString()
            });

            // Inject content script to check for new content
            const [tab] = await chrome.tabs.query({ url: competitor.url });
            
            if (tab) {
                // If the site is already open in a tab, use that
                await this.injectContentScript(tab.id, competitor);
            } else {
                // Create a new tab to check the content
                await this.createMonitoringTab(competitor);
            }

        } catch (error) {
            console.error(`Error checking content for ${competitor.label}:`, error);
            
            // Update competitor with error info
            await this.storage.updateCompetitor(competitorId, {
                lastError: error.message,
                lastErrorTime: new Date().toISOString()
            });
        }
    }

    async createMonitoringTab(competitor) {
        return new Promise((resolve, reject) => {
            chrome.tabs.create({
                url: competitor.url,
                active: false // Don't make the tab active
            }, async (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                // Wait for the tab to load
                const checkTabReady = (tabId, changeInfo) => {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(checkTabReady);
                        
                        // Inject content script
                        this.injectContentScript(tab.id, competitor).then(() => {
                            // Close the tab after checking
                            setTimeout(() => {
                                chrome.tabs.remove(tab.id);
                            }, 5000);
                            resolve();
                        }).catch(reject);
                    }
                };

                chrome.tabs.onUpdated.addListener(checkTabReady);

                // Timeout after 30 seconds
                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(checkTabReady);
                    chrome.tabs.remove(tab.id);
                    reject(new Error('Tab loading timeout'));
                }, 30000);
            });
        });
    }

    async injectContentScript(tabId, competitor) {
        try {
            // Don't inject - content script is already loaded via manifest
            // Just send the message to check content
            await chrome.tabs.sendMessage(tabId, {
                action: 'checkContent',
                competitor: competitor
            });

        } catch (error) {
            console.error('Error communicating with content script:', error);
            throw error;
        }
    }

    async handleContentDetected(data) {
        const { competitorId, newContent } = data;
        
        // Update competitor content count
        const competitors = await this.storage.getCompetitors();
        const competitor = competitors.find(c => c.id === competitorId);
        
        if (competitor) {
            const updatedCompetitor = await this.storage.updateCompetitor(competitorId, {
                contentCount: (competitor.contentCount || 0) + newContent.length,
                lastContentFound: new Date().toISOString()
            });

            // Store the new content
            for (const content of newContent) {
                await this.storage.addContent({
                    competitorId: competitorId,
                    competitorLabel: competitor.label,
                    ...content
                });
            }

            // Add activity
            await this.storage.addActivity({
                text: `Found ${newContent.length} new post(s) from ${competitor.label}`,
                type: 'content'
            });

            // Send notification
            await this.sendContentNotification(competitor, newContent);

            // Notify popup if open
            try {
                chrome.runtime.sendMessage({
                    action: 'competitorUpdated',
                    competitor: competitor.label,
                    newContentCount: newContent.length
                });
            } catch (error) {
                // Popup might not be open, that's okay
            }
        }
    }

    async sendContentNotification(competitor, newContent) {
        // Check if notifications are enabled
        const settings = await chrome.storage.sync.get(['settings']);
        const notificationSettings = settings.settings?.notifications;
        
        if (!notificationSettings?.enabled) {
            return;
        }

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

        for (const competitor of activeCompetitors) {
            await this.checkCompetitorContent(competitor.id);
            
            // Add small delay between checks to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Notify that refresh is complete
        try {
            chrome.runtime.sendMessage({
                action: 'refreshComplete'
            });
        } catch (error) {
            // Popup might not be open
        }

        await this.storage.addActivity({
            text: 'Completed refresh of all competitors',
            type: 'refresh'
        });
    }

    async getMonitoringStatus() {
        const competitors = await this.storage.getCompetitors();
        const alarms = await chrome.alarms.getAll();
        
        return {
            totalCompetitors: competitors.length,
            activeCompetitors: competitors.filter(c => c.isActive).length,
            monitoringAlarms: alarms.filter(a => a.name.startsWith('monitor_')).length
        };
    }

    async checkIfMonitoredSite(tab) {
        const competitors = await this.storage.getCompetitors();
        const matchingCompetitor = competitors.find(c => {
            try {
                const competitorDomain = new URL(c.url).hostname;
                const tabDomain = new URL(tab.url).hostname;
                return competitorDomain === tabDomain;
            } catch {
                return false;
            }
        });

        if (matchingCompetitor) {
            // Optionally add a page action or context menu item
            console.log(`User is on monitored site: ${matchingCompetitor.label}`);
        }
    }
}

// Initialize the background service worker
const contentSpyBackground = new ContentSpyBackground();