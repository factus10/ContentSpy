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
        // Simplified storage for background context using both sync and local storage
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
                const result = await chrome.storage.local.get(['recentActivity']);
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
                
                await chrome.storage.local.set({ recentActivity: activities });
            },
            
            async addContent(content) {
                const result = await chrome.storage.local.get(['contentHistory']);
                const contentHistory = result.contentHistory || [];
                
                contentHistory.unshift({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...content
                });
                
                // Keep only last 500 content entries
                if (contentHistory.length > 500) {
                    contentHistory.splice(500);
                }
                
                await chrome.storage.local.set({ contentHistory });
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

        // Clean up orphaned monitoring processes
        chrome.tabs.onRemoved.addListener((tabId) => {
            console.log(`Tab ${tabId} was removed`);
        });

        // Handle extension errors
        chrome.runtime.onSuspend.addListener(() => {
            console.log('Extension is being suspended');
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
            console.log(`Skipping check for inactive/missing competitor ${competitorId}`);
            return;
        }

        console.log(`Checking content for ${competitor.label}`);

        try {
            // Update last checked time first
            await this.storage.updateCompetitor(competitorId, {
                lastChecked: new Date().toISOString()
            });

            // Check if the site is already open in a tab
            const existingTabs = await chrome.tabs.query({ url: competitor.url });
            
            if (existingTabs.length > 0) {
                // Use existing tab
                const existingTab = existingTabs[0];
                console.log(`Using existing tab ${existingTab.id} for ${competitor.label}`);
                await this.injectContentScript(existingTab.id, competitor);
            } else {
                // Create a new monitoring tab
                console.log(`Creating new monitoring tab for ${competitor.label}`);
                await this.createMonitoringTab(competitor);
            }

            console.log(`Successfully checked content for ${competitor.label}`);

        } catch (error) {
            console.error(`Error checking content for ${competitor.label}:`, error);
            
            // Update competitor with error info but don't stop monitoring
            try {
                await this.storage.updateCompetitor(competitorId, {
                    lastError: error.message,
                    lastErrorTime: new Date().toISOString()
                });
            } catch (storageError) {
                console.error('Error updating competitor error info:', storageError);
            }
        }
    }

    async createMonitoringTab(competitor) {
        return new Promise((resolve, reject) => {
            let tabClosed = false;
            let timeoutId = null;
            
            chrome.tabs.create({
                url: competitor.url,
                active: false // Don't make the tab active
            }, async (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                const tabId = tab.id;
                console.log(`Created monitoring tab ${tabId} for ${competitor.label}`);

                // Function to safely close the tab
                const safeCloseTab = async () => {
                    if (tabClosed) return;
                    tabClosed = true;
                    
                    await this.safeCloseTab(tabId);
                    
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                };

                // Wait for the tab to load
                const checkTabReady = async (updatedTabId, changeInfo) => {
                    if (updatedTabId === tabId && changeInfo.status === 'complete' && !tabClosed) {
                        chrome.tabs.onUpdated.removeListener(checkTabReady);
                        
                        try {
                            // Inject content script and check content
                            await this.injectContentScript(tabId, competitor);
                            
                            // Close the tab after a short delay
                            setTimeout(safeCloseTab, 3000);
                            resolve();
                        } catch (error) {
                            console.error(`Error processing tab ${tabId}:`, error);
                            await safeCloseTab();
                            reject(error);
                        }
                    }
                };

                chrome.tabs.onUpdated.addListener(checkTabReady);

                // Handle tab removal (user closed it manually)
                const handleTabRemoved = (removedTabId) => {
                    if (removedTabId === tabId) {
                        tabClosed = true;
                        chrome.tabs.onRemoved.removeListener(handleTabRemoved);
                        chrome.tabs.onUpdated.removeListener(checkTabReady);
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        console.log(`Tab ${tabId} was removed externally`);
                        resolve(); // Don't reject, this is fine
                    }
                };
                
                chrome.tabs.onRemoved.addListener(handleTabRemoved);

                // Timeout after 30 seconds
                timeoutId = setTimeout(async () => {
                    chrome.tabs.onUpdated.removeListener(checkTabReady);
                    chrome.tabs.onRemoved.removeListener(handleTabRemoved);
                    await safeCloseTab();
                    reject(new Error('Tab loading timeout'));
                }, 30000);
            });
        });
    }

    async injectContentScript(tabId, competitor) {
        try {
            // First, check if the tab still exists
            if (!(await this.tabExists(tabId))) {
                throw new Error(`Tab ${tabId} no longer exists`);
            }

            // Send message to content script (it's already loaded via manifest)
            await chrome.tabs.sendMessage(tabId, {
                action: 'checkContent',
                competitor: competitor
            });

            console.log(`Successfully sent content check message to tab ${tabId}`);

        } catch (error) {
            if (error.message.includes('Could not establish connection') ||
                error.message.includes('Receiving end does not exist') ||
                error.message.includes('no longer exists') ||
                error.message.includes('Extension context invalidated')) {
                // These are expected errors when tabs are closed or content scripts aren't ready
                console.log(`Tab ${tabId} is not ready or was closed: ${error.message}`);
            } else {
                console.error('Error communicating with content script:', error);
                throw error;
            }
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

        let successCount = 0;
        let errorCount = 0;

        for (const competitor of activeCompetitors) {
            try {
                await this.checkCompetitorContent(competitor.id);
                successCount++;
                
                // Add delay between checks to avoid overwhelming servers and browser
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`Failed to refresh ${competitor.label}:`, error);
                errorCount++;
                
                // Continue with other competitors even if one fails
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`Refresh complete: ${successCount} successful, ${errorCount} errors`);

        // Notify that refresh is complete
        try {
            chrome.runtime.sendMessage({
                action: 'refreshComplete',
                successCount,
                errorCount
            });
        } catch (error) {
            // Popup might not be open
            console.log('Could not notify popup of refresh completion');
        }

        await this.storage.addActivity({
            text: `Refresh completed: ${successCount} successful, ${errorCount} errors`,
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
        try {
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
                console.log(`User is on monitored site: ${matchingCompetitor.label}`);
                // Could add page action or context menu item here
            }
        } catch (error) {
            console.error('Error checking monitored site:', error);
        }
    }

    // Helper function to safely check if a tab exists
    async tabExists(tabId) {
        try {
            await chrome.tabs.get(tabId);
            return true;
        } catch {
            return false;
        }
    }

    // Helper function to safely close a tab
    async safeCloseTab(tabId) {
        try {
            if (await this.tabExists(tabId)) {
                await chrome.tabs.remove(tabId);
                console.log(`Successfully closed tab ${tabId}`);
                return true;
            } else {
                console.log(`Tab ${tabId} was already closed`);
                return false;
            }
        } catch (error) {
            console.log(`Could not close tab ${tabId}: ${error.message}`);
            return false;
        }
    }
}

// Initialize the background service worker
const contentSpyBackground = new ContentSpyBackground();