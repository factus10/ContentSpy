# ContentSpy - Competitor Content Monitoring Chrome Extension

![ContentSpy Logo](icons/icon128.png)

**ContentSpy** is a powerful Chrome extension that automatically monitors competitor websites and social profiles for new content, analyzes posting patterns, and provides strategic insights for content strategists and marketers.

## 🚀 Features

- **🔍 Automatic Content Detection** - Monitors competitor blogs, news pages, and content hubs
- **📊 Real-time Analytics** - Track posting frequency, content types, and engagement patterns  
- **🔔 Smart Notifications** - Get alerted when competitors publish new content
- **📈 Visual Dashboard** - Comprehensive analytics with charts and insights
- **⚡ Background Monitoring** - Runs silently with configurable check intervals
- **💾 Data Export** - Export competitor data and insights for reports
- **🎯 Multi-CMS Support** - Works with WordPress, Shopify, and custom websites
- **🔄 Sync Across Devices** - Your competitor list syncs across Chrome installations

## 📦 Installation

### Method 1: Load as Developer Extension (Recommended for now)

1. **Download or Clone** this repository to your computer
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the `competitor-tracker` folder
5. **Pin the extension** to your toolbar for easy access

### Method 2: Chrome Web Store (Coming Soon)
*Extension will be available on Chrome Web Store after review process*

## 🎯 Quick Start Guide

### 1. Add Your First Competitor

1. **Click the ContentSpy icon** in your Chrome toolbar
2. **Enter a competitor URL** in the "Add Competitor" field
3. **Add a label** (optional - will auto-generate from domain)
4. **Click "Add Competitor"**

### 2. Monitor Content

- **Automatic monitoring** starts immediately (every 30 minutes by default)
- **Manual refresh** - Click the "🔄 Refresh All" button anytime
- **View activity** in the popup's Recent Activity section

### 3. Access Full Dashboard

1. **Click the "📊 Dashboard" button** in the popup
2. **Explore sections:**
   - **Overview** - Stats and recent content
   - **Competitors** - Manage your competitor list
   - **Content Feed** - All detected content chronologically
   - **Analytics** - Charts and insights
   - **Activity Log** - Complete monitoring history

## 📝 Best Practices: What URLs to Track

### ✅ Recommended Pages to Monitor

| Page Type | Example URLs | Why It Works |
|-----------|-------------|--------------|
| **Blog Homepages** | `blog.company.com`<br>`company.com/blog` | Shows latest posts prominently |
| **News Sections** | `company.com/news`<br>`company.com/press` | Regular updates and announcements |
| **Resource Centers** | `company.com/resources`<br>`company.com/insights` | Educational content and thought leadership |
| **Company Updates** | `company.com/updates`<br>`company.com/changelog` | Product updates and company news |

### ❌ Less Effective Pages

| Page Type | Why It's Not Ideal |
|-----------|-------------------|
| **Homepages** | Often static, content buried |
| **About Pages** | Rarely updated |
| **Product Pages** | Focus on products, not content |
| **Contact Pages** | No content updates |

### 🎯 Pro Tips for URL Selection

1. **Visit the competitor's website first** and find their blog/news section
2. **Look for "Blog", "News", "Resources", "Insights" in navigation**
3. **Check for RSS/XML feed links** (ContentSpy will detect these)
4. **Test URLs manually** - if you see recent articles, it's a good URL to track
5. **Use specific content URLs** rather than general pages

## 🛠️ How ContentSpy Detects Content

### Content Detection Methods

1. **📡 RSS/Atom Feeds** - Automatically finds and notes feed URLs
2. **🏗️ HTML Structure Analysis** - Looks for article tags, blog post classes
3. **📋 Structured Data** - Parses JSON-LD, microdata, and schema markup
4. **🎯 CMS Detection** - Specialized patterns for WordPress, Shopify, etc.
5. **📄 Single Article Pages** - Detects when entire page is an article

### Supported Content Types

- Blog posts and articles
- News announcements  
- Press releases
- Resource guides and whitepapers
- Company updates
- Product announcements

## ⚙️ Configuration Options

### Monitoring Settings

- **Check Interval**: 15 minutes to 6 hours (default: 30 minutes)
- **Notifications**: Enable/disable desktop notifications
- **Data Retention**: How long to keep content history

### Dashboard Features

- **📊 Analytics Charts** - Content activity over time
- **🔍 Search & Filter** - Find specific content or competitors
- **📤 Data Export** - Download data as JSON for external analysis
- **⚙️ Bulk Management** - Add, edit, or remove multiple competitors

## 🔔 Notifications

ContentSpy will notify you when:
- **New content is detected** from any competitor
- **Monitoring errors occur** (website issues, etc.)
- **Bulk refresh operations complete**

**Customize notifications:**
- Enable/disable in Settings
- Choose notification frequency
- Set quiet hours (coming soon)

## 📊 Analytics & Insights

### Overview Dashboard
- Total competitors tracked
- Content items discovered
- Today's new content
- Active monitoring status

### Content Analytics
- **Publishing frequency** over time
- **Content volume by competitor**
- **Peak publishing times**
- **Content type distribution**

### Competitive Intelligence
- **Most active competitors**
- **Content gap analysis**
- **Trending topics** (coming soon)
- **Engagement estimates** (coming soon)

## 🗃️ Data Management

### Export Your Data
1. **Open Dashboard** → Click "⚙️ Settings"
2. **Data Management** → "Export All Data"
3. **Downloads JSON file** with all competitors and content

### Import Data
1. **Settings** → "Import Data"
2. **Select JSON file** from previous export
3. **Validates and imports** your competitor data

### Clear Data
- **Individual competitors** - Delete from Competitors section
- **All activity** - Clear activity log
- **Complete reset** - Clear all data (Settings → Clear All Data)

## 🔧 Troubleshooting

### Common Issues

**❌ "No content found" for a competitor**
- ✅ Check if URL shows recent articles when visited manually
- ✅ Try the competitor's main blog/news URL instead
- ✅ Ensure the site isn't behind authentication

**❌ Extension won't load**
- ✅ Check manifest.json for syntax errors
- ✅ Ensure all files are in correct folders
- ✅ Try disabling and re-enabling Developer Mode

**❌ Notifications not appearing**
- ✅ Check Chrome notification permissions
- ✅ Verify notifications are enabled in Settings
- ✅ Check if Do Not Disturb is active

**❌ Storage quota errors**
- ✅ Extension automatically manages storage limits
- ✅ Try clearing old data in Settings
- ✅ Reduce number of tracked competitors

### Debug Information

**View Extension Logs:**
1. **Popup logs**: Right-click popup → Inspect
2. **Background logs**: Extensions page → ContentSpy → "Inspect views: service worker"
3. **Content logs**: Website DevTools → Console (filter for "ContentSpy")

## 📁 Project Structure

```
competitor-tracker/
├── manifest.json              # Extension configuration
├── popup/                     # Popup interface
│   ├── popup.html            # Popup layout
│   ├── popup.css             # Popup styling  
│   └── popup.js              # Popup functionality
├── background/               # Background monitoring
│   └── background.js         # Service worker
├── content/                  # Content detection
│   └── content.js            # Content analysis script
├── dashboard/                # Analytics dashboard
│   ├── dashboard.html        # Dashboard layout
│   ├── dashboard.css         # Dashboard styling
│   └── dashboard.js          # Dashboard functionality
├── utils/                    # Utility functions
│   └── storage.js            # Storage management
├── icons/                    # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                 # This file
```

## 🔒 Privacy & Security

### Data Collection
- **Only monitors public content** from URLs you specify
- **No personal data collection** from users
- **Content stored locally** in your browser
- **No data sent to external servers**

### Storage
- **Sync storage**: Competitor list and settings (syncs across devices)
- **Local storage**: Content history and activity (device-specific)
- **Automatic cleanup**: Old content removed based on retention settings

### Permissions
- **Storage**: Save competitor data and content
- **ActiveTab**: Access current page for adding competitors
- **Notifications**: Show content alerts
- **Alarms**: Schedule background monitoring
- **Host permissions**: Access competitor websites for monitoring

## 🚀 Roadmap

### Phase 2 Features (Coming Soon)
- **🔗 RSS feed parsing** for more reliable content detection
- **📱 Social media monitoring** (Twitter, LinkedIn)
- **🏷️ Content categorization** and tagging
- **📈 Engagement analysis** and performance metrics
- **🤖 AI-powered insights** and trend detection

### Phase 3 Features (Future)
- **👥 Team collaboration** features
- **🔗 API integrations** with marketing tools
- **📧 Email digest reports**
- **🎯 Content recommendation engine**

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Setup
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Make changes and test in browser
4. Check console for errors before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

**Need help?**
- **📧 Email**: support@contentspy.com (coming soon)
- **🐛 Bug Reports**: Create an issue on GitHub
- **💡 Feature Requests**: Open a GitHub discussion
- **📖 Documentation**: Check this README

## 🙏 Acknowledgments

- **Chart.js** for beautiful analytics visualizations
- **Chrome Extensions API** for powerful browser integration
- **Open source community** for inspiration and best practices

---

**Happy monitoring! 🕵️‍♂️**

*ContentSpy helps you stay ahead of the competition by keeping you informed of their latest content strategies.*