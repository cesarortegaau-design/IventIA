# STATEMENT OF WORK (SOW)
## Galería Sala Marte® - IventIA E-Commerce + Arte Capital Social Network

**Document Version:** 3.0  
**Date:** April 6, 2026  
**Status:** Proposed  
**Platform:** 100% IventIA-Based (No Shopify)
**Integration Model:** Single IventIA Platform with Public Shop + Private Social Network  

---

## 1. EXECUTIVE SUMMARY

Galería Sala Marte® is an online art gallery and marketplace specializing in original artwork from Mexican artists. The platform operates as a Shopify-based e-commerce store that connects collectors with artists across Mexico through curated collections, educational experiences, and experiential offerings.

**Client Type:** Art Marketplace / Gallery  
**Primary Market:** Mexico (Spanish-speaking art collectors)  
**Business Model:** B2C E-commerce with educational content  
**Platform:** Shopify with custom integrations  

---

## 2. PROJECT SCOPE

### 2.0 Overview & Architecture

Galería Sala Marte® is **100% built on IventIA** with two interconnected modules:

1. **Public E-Commerce Shop (galeriasalamarte.com):**
   - **Design:** Inspired by galeriasalamarte.com (minimalist, dark teal, product cards)
   - **Backend:** IventIA's resources, price lists, and e-commerce system
   - **Functionality:** Works like IventIA e-commerce (shopping cart, checkout, orders)
   - **Visibility:** Public-facing, accessible to all users

2. **Arte Capital Social Network (IventIA Module):**
   - **Design:** Matches IventIA's design system
   - **Backend:** IventIA database with new social-specific tables
   - **Functionality:** Exclusive membership community ($100/year)
   - **Visibility:** Restricted to paid members only

**Unified Architecture:**
Both modules run on **a single IventIA instance** that:
- ✅ Shares the same PostgreSQL database (users, resources, price lists, events, orders)
- ✅ Extends IventIA's existing e-commerce functionality
- ✅ Uses IventIA's authentication system
- ✅ Leverages IventIA's multi-tenancy architecture
- ✅ Integrates with IventIA's payment processing
- ✅ Provides dual interfaces: public shop + private social network

**Key Difference from Original Plan:**
- ❌ **NO Shopify integration** - Shopify is completely replaced by IventIA's e-commerce
- ✅ **IventIA resources** become the product catalog for the public shop
- ✅ **IventIA price lists** power the pricing and checkout
- ✅ **IventIA orders** handle all transactions
- ✅ Same backend for shop operations and member access

**Benefits:**
- ✅ Single platform = single database, single codebase, single deployment
- ✅ Resources and price lists used by BOTH shop and members
- ✅ No data synchronization between Shopify and IventIA
- ✅ Faster development (no third-party integration overhead)
- ✅ Lower infrastructure costs (no Shopify subscription)
- ✅ Complete control over user experience
- ✅ Easy future expansion to multi-gallery platform

### 2.1 Core Business Functions

#### A. E-Commerce Platform (Public Website - IventIA-Based)

**Uses IventIA's Resource System:**
- **Resource Catalog:** Artworks stored as IventIA resources with images, descriptions, artist attribution
- **Resource Properties:** Medium (painting, sculpture, etc.), artist, dimensions, year, condition
- **Resource Images:** Multiple images per artwork (main, detail, context)
- **Resource Management:** Full CRUD via IventIA resource controllers

**Uses IventIA's Pricing System:**
- **Price Lists:** Gallery maintains one or multiple price lists for different contexts
- **Price List Items:** Each artwork is a price list item linked to a resource
- **Dynamic Pricing:** Pricing tiers (EARLY, NORMAL, LATE) based on order timing
- **Inventory:** Track stock/availability of original works

**E-Commerce Operations:**
- **Shopping Cart:** IventIA's order system with line items
- **Checkout:** Multi-step flow with shipping address, payment method selection
- **Payment Processing:** Stripe/Conekta integration (already in IventIA)
- **Order Management:** Track order status, fulfillment, payments
- **Customer Accounts:** User profiles, order history, saved items

**Public Shop UI Design:**
- **Aesthetic:** Inspired by galeriasalamarte.com (dark teal, minimalist, generous whitespace)
- **Navigation:** Galería, Artistas, Exposiciones, Arte (by medium), Colecciones, Más+ (locations)
- **Product Cards:** Artwork image, title, artist, price, type badge
- **Collections:** Browsable by medium, style, location, theme
- **Search:** Full-text search with filters (medium, style, price, artist)

#### B. Content Management
- **Blog/Editorial:** Art history articles, collecting guides, cultural content
- **Artist Profiles:** Creator portfolios with biographical information, contact details, artwork galleries
- **Exhibitions:** Event listings and exhibition management across multiple venues
- **Artist Talks & Workshops:** Educational content and scheduled events
- **Casa Sala Marte Events:** Experiential offerings and community building

#### C. Taxonomy & Organization
- **Browse by Medium:** Painting, Sculpture, Photography, Printmaking, Illustration, Design, Murals
- **Browse by Style/Movement:** Impressionism, Surrealism, Pop Art, Contemporary, Abstract, etc.
- **Geographic Collections:** Dedicated sections for major Mexican cities (Mexico City, Guadalajara, Monterrey, etc.)
- **Thematic Collections:** Portraiture, Landscapes, Still Life, Abstract, etc.

#### D. Community & Engagement
- **Customer Reviews:** Loox integration with 4.6/5 star rating system
- **Artist Application System:** Portal for creators to apply and join the gallery
- **Contact & Support:** WhatsApp integration, email support, FAQ
- **User Accounts:** Customer login, order history, wishlist, preferences
- **Artist Directory:** Searchable artist database with portfolios

#### E. Marketing & Analytics
- **SEO Optimization:** Site-wide search engine optimization
- **Search Functionality:** Predictive search with filters (medium, style, price, artist)
- **Analytics Integration:** Google Analytics, Facebook Pixel, TikTok Pixel tracking
- **Email Marketing:** Newsletter subscription and campaigns
- **Social Media Integration:** Links to social profiles and sharing capabilities

### 2.2 Arte Capital Social Network (IventIA Module)

Arte Capital is an exclusive social network module within IventIA for art associates, collectors, influencers, and promoters. Members pay a $100 annual membership fee to access a premium community focused on collaboration, networking, and event promotion.

**Integration with IventIA:**
- Existing IventIA users can upgrade to Arte Capital membership
- Reuses IventIA user, product, event, and price list data
- Extends IventIA admin dashboard with Arte Capital management tools
- Available in IventIA Portal for member access

#### A. Membership Management (IventIA-Integrated)
- **Subscription Model:** $100 annual recurring subscription (with monthly payment option at higher rate)
- **User Integration:** Existing IventIA users can become Arte Capital members
- **Payment Processing:** Uses IventIA's Stripe/Conekta integration for membership activation
- **Membership Levels:** 
  - **Associate:** Standard membership ($100/year) - create content, promote events
  - **Premium Associate:** Enhanced features ($200/year) - featured profile, priority promotion
  - **Curator:** Gallery/event organizers ($300/year) - additional event management tools
- **Renewal Management:** Automated renewal reminders, payment processing (via IventIA)
- **Membership Status:** Active, Expired, Suspended, Canceled tracking
- **Member Directory:** Searchable IventIA users filtered by Arte Capital membership (by type, location, interests)
- **Integration Point:** `artCapitalMembership` table links to IventIA `user` table

#### B. Social Network Core Features
- **User Profiles:** 
  - Profile photo, bio, location, website, social links
  - Verification badge for established members
  - Member type indication (Associate, Curator, Collector, etc.)
  - Follower/Following counts
  - Member since date and activity metrics
- **Feed/Timeline:** 
  - Chronological feed of member posts
  - Algorithm-based recommendations for engagement
  - Trending content and top contributors
  - Infinite scroll or pagination
- **Content Creation & Sharing:**
  - **Text Posts:** Status updates, announcements, thoughts (140-5000 characters)
  - **Image Posts:** Single or carousel uploads (up to 10 images per post)
  - **Media Gallery:** Rich media with captions and descriptions
  - **Link Sharing:** Share external content with preview
  - **Hashtags:** Categorization and discoverability
  - **Mentions:** Tag other members in posts
  - **Draft/Schedule Posts:** Write now, publish later functionality
- **Engagement Features:**
  - **Likes/Reactions:** React to posts (heart, like, fire, etc.)
  - **Comments:** Reply to posts, threaded conversations
  - **Reposts/Shares:** Amplify content to followers
  - **Direct Messaging:** Private conversations between members
  - **Notifications:** Real-time alerts for interactions
- **Discovery & Curation:**
  - **Search:** Find members, posts, hashtags, events
  - **Explore Page:** Trending content, recommended members, featured posts
  - **Collections:** Save favorite posts to collections
  - **Bookmarks:** Personal saved items for later viewing

#### C. Event Management & Promotion
- **Event Creation:**
  - Event title, description, date/time, location
  - Featured event image/banner
  - Event type (Exhibition, Workshop, Networking, Talk, Sale, Launch)
  - Registration link or ticket information
  - Event categories and hashtags
  - Capacity and RSVP tracking
- **Event Promotion:**
  - Post events to member's feed
  - Event invitation system (invite specific members)
  - Share to external social media (auto-post)
  - Calendar integration (members can add to calendar)
  - Event analytics (views, clicks, conversions)
- **Event Calendar:**
  - Centralized calendar of all member-promoted events
  - Filter by type, location, date range
  - "Attending" / "Interested" status tracking
  - Reminders before event date
- **Collaborative Events:**
  - Joint promotion by multiple members
  - Event revenue sharing (if applicable)
  - Co-organizer management

#### D. Networking & Collaboration
- **Member Connections:**
  - Follow/Unfollow members
  - Connection requests (with optional moderation)
  - Block/Mute members
  - Mutual connections indicator
- **Groups/Communities:** (Optional future feature)
  - Members can create or join interest-based groups
  - Group discussions and shared content
  - Group events and collaborative posts
- **Recommendation Engine:**
  - Suggest relevant members to follow based on interests
  - Recommend content based on engagement patterns
  - "People you may know" feature
- **Collaboration Opportunities:**
  - Members can propose collaborations
  - Joint project boards or initiatives
  - Partnership announcements

#### E. Content Moderation & Governance
- **Community Guidelines:** Terms of service, code of conduct
- **Content Moderation:** 
  - Automated content filtering (spam, inappropriate content)
  - Manual review by moderators
  - Report/Flag functionality for members
  - Content removal and member warnings
- **Member Management:**
  - Admin tools for member verification
  - Suspension/ban capabilities for violations
  - Member support and appeals process
- **Data Privacy:** GDPR/CCPA compliant, data protection policies

#### F. Analytics & Insights (Member Dashboard)
- **Personal Analytics:**
  - Post engagement metrics (likes, comments, shares)
  - Follower growth over time
  - Event promotion performance
  - Reach and impressions
  - Top performing posts
- **Activity Timeline:** History of member activities
- **Export Data:** Download personal data and analytics reports

---

## 3. TECHNICAL SPECIFICATIONS

### 3.1 Platform Architecture

| Component | Specification |
|-----------|---------------|
| **CMS/E-Commerce** | Shopify (hosted platform) |
| **Primary Language** | Spanish |
| **Currency** | Mexican Peso (MXN) |
| **Responsive Design** | Mobile, tablet, desktop optimized |
| **Security** | SSL/TLS encryption, PCI DSS compliant |
| **Performance** | CDN delivery, optimized image loading |

### 3.2 Unified IventIA Architecture (No Shopify)

#### Single Platform Stack
| Component | Specification |
|-----------|---------------|
| **Backend** | Express.js + Node.js (IventIA API) |
| **Database** | PostgreSQL (shared single instance) |
| **Authentication** | JWT (IventIA token system) |
| **Frontend** | React.js (IventIA Portal + Public Shop) |
| **E-Commerce** | IventIA resource + pricing system (replaces Shopify) |
| **Real-Time** | Socket.io (notifications, live feed updates) |
| **File Storage** | AWS S3 / Cloudinary (shared) |
| **Cache** | Redis (shared) |
| **Search** | Elasticsearch (shared) |
| **API** | RESTful API (/api/v1/resources, /api/v1/price-lists, /api/v1/arte-capital) |
| **CDN** | Cloudflare / AWS CloudFront (shared) |
| **Hosting** | AWS / DigitalOcean (unified infrastructure) |

#### Why No Shopify?
- ✅ IventIA's resource + pricing system is **more flexible** for art sales
- ✅ No third-party integration overhead
- ✅ Single database = no sync issues
- ✅ Lower costs (no Shopify subscription)
- ✅ Complete control over checkout flow
- ✅ Easy integration with Arte Capital membership

#### Database Schema Integration
**Shared Tables with IventIA:**
- `user` - User accounts with email, password, profile (add: member_type, bio, social_links)
- `product` - Artwork from price lists (shared with e-commerce)
- `priceList` - Arte Capital members can access product catalogs
- `priceListItem` - Products available to members
- `event` - Create events in IventIA and promote via Arte Capital
- `order` - Members can purchase products through e-commerce
- `document` - Shared document storage
- `tenant` - Multi-tenancy support for future gallery expansion

**New Arte Capital Tables:**
- `artCapitalMembership` - Membership status, tier, subscription dates
- `artCapitalPost` - User-generated posts (images, text, links)
- `artCapitalPostReaction` - Likes and reactions to posts
- `artCapitalComment` - Comments on posts
- `artCapitalFollow` - Member following relationships
- `artCapitalMessage` - Direct messages between members
- `artCapitalCollection` - Saved collections of posts
- `artCapitalEventPromotion` - Event promotions by members
- `artCapitalMemberAnalytics` - Engagement metrics per member

#### Payment Processing (Arte Capital)
- **Subscription Payment:** Stripe / Conekta subscriptions (same gateway as IventIA shop)
- **Invoice Management:** Automated through IventIA invoice system
- **Payment Methods:** Credit card, debit card, digital wallets
- **Tax Handling:** Mexican VAT calculation via IventIA system
- **Refund/Cancellation:** Integrated with IventIA order system

#### API Integration Points
- **IventIA User System:** Extend user model with Arte Capital fields
- **IventIA Product Catalog:** Access products and price lists in Arte Capital
- **IventIA Events:** Create and manage events within IventIA, promote in Arte Capital
- **IventIA Orders:** Members can purchase through e-commerce
- **IventIA Payment System:** Use existing Stripe/Conekta integration
- **Social Media:** Auto-posting to Instagram, Facebook, Twitter/X
- **Email Service:** Use IventIA email configuration (Sendgrid/AWS SES)
- **Analytics:** Extend IventIA analytics with Arte Capital metrics
- **Push Notifications:** Socket.io for real-time alerts

### 3.3 Design System (IventIA + Arte Capital)

#### Design Philosophy
Arte Capital follows **IventIA's existing design system** while adding social-network-specific components:
- Use IventIA's typography, colors, and spacing standards
- Add social-specific components: feed cards, post composer, reactions, notifications
- Maintain consistency with IventIA's minimalist aesthetic
- Dark navigation, generous whitespace, clean typography

#### Typography
- **Primary Font:** Assistant (clean, modern sans-serif)
- **Secondary Font:** Jost (geometric, contemporary)
- **Weight Range:** 400 (regular), 600 (semibold), 700 (bold)
- **Hierarchy:** Clear size differentiation for H1-H6, body, captions

#### Color Palette
- **Primary:** Dark Teal (#134242) - sophisticated, gallery-appropriate
- **Accent:** White/Off-white (#FFFFFF, #F9F7F5) - minimalist aesthetic
- **Secondary:** Neutral grays for borders, backgrounds, secondary text
- **Action Colors:** Standard web conventions (green for success, red for errors)

#### Visual Style
- **Aesthetic:** Minimalist, gallery-inspired, high-end feel
- **Navigation:** Dark backgrounds (black) with light text
- **Whitespace:** Generous margins and padding for elegance
- **Product Display:** High-quality image grids with titles and pricing
- **Buttons:** Clean, minimal styling with subtle hover effects
- **Cards:** Simple layouts with image + text, no excessive borders

### 3.4 Key Integrations

#### IventIA E-Commerce Platform
1. **Product Management (Resources)**
   - IventIA resource system for artwork catalog
   - Multiple images per resource
   - Inventory tracking for originals
   - Artist attribution and details

2. **Pricing & Checkout (Price Lists)**
   - IventIA price lists for different contexts
   - Dynamic pricing (EARLY/NORMAL/LATE tiers)
   - Shopping cart using order system
   - Multi-step secure checkout

3. **Payment Processing**
   - Stripe / Conekta (already integrated in IventIA)
   - Mexican payment methods
   - Recurring billing for Arte Capital memberships

4. **Customer Features**
   - User accounts and order history
   - Wishlist and saved items
   - Customer reviews and ratings
   - Newsletter and communications

5. **Analytics & Tracking**
   - Google Analytics 4
   - Facebook Pixel, TikTok Pixel
   - Custom event tracking (via IventIA)
   - Sales and conversion metrics

6. **Content & Media**
   - CDN delivery (Cloudinary/AWS CloudFront)
   - Image optimization (WebP, responsive)
   - Document storage (invoices, receipts)

#### Arte Capital Social Network (Shared with IventIA)
1. **Subscription Payments (Shared)**
   - Stripe Billing / Conekta subscriptions
   - Reuses IventIA payment processing
   - Recurring billing with retry logic
   - Invoice and receipt generation (via IventIA)

2. **Email & Notifications (Shared with IventIA)**
   - SendGrid / AWS SES (shared with IventIA)
   - Socket.io for real-time push notifications
   - Email digest of member activity
   - Webhook integration from IventIA email service

3. **File Upload & CDN (Shared with IventIA)**
   - AWS S3 / Cloudinary (shared storage with IventIA)
   - Image optimization and resizing
   - Video hosting (if applicable)
   - Shared CDN with IventIA

4. **Social Media Integration (New for Arte Capital)**
   - Instagram API (auto-post events and member content)
   - Facebook API (share member posts to timeline)
   - Twitter/X API (tweet events)
   - LinkedIn API (professional network sharing)

5. **Analytics (Integrated with IventIA)**
   - Custom event tracking (member engagement, post performance)
   - Extend IventIA analytics dashboard with Arte Capital metrics
   - Behavioral analytics (Mixpanel / Amplitude optional)
   - Conversion funnel tracking for membership signup

6. **Search & Discovery (Shared with IventIA)**
   - Elasticsearch / Algolia (shared with IventIA for member and post search)
   - Full-text search capabilities across products, posts, events
   - Autocomplete and fuzzy matching

7. **Real-Time Communication (New for Arte Capital)**
   - Socket.io / WebSocket (live notifications, live feed updates)
   - Integrated with IventIA notification system
   - (Future) WebRTC for video calls

---

## 4. FEATURES & FUNCTIONALITY

### 4.1 Homepage & Navigation
- **Hero Section:** Featured artwork or seasonal campaigns
- **Navigation Menu:** Organized by Galería, Artistas, Exposiciones, Arte (by medium), Colecciones, Más+
- **Search Bar:** Prominent search with autocomplete
- **User Account:** Login/register, account dropdown
- **Shopping Cart:** Quick access, item count badge
- **Footer:** Navigation links, contact info, social media, newsletter signup

### 4.2 Product Pages

#### Artwork Details
- **Gallery:** Multi-image carousel with zoom capability
- **Product Info:** 
  - Title, artist name (linked to artist profile)
  - Price in MXN
  - Dimensions and specifications
  - Medium/technique
  - Year created
  - Condition notes
  - Shipping information
- **CTA Buttons:** "Add to Cart", "Add to Wishlist", "Contact Artist"
- **Related Products:** Similar artworks, artist's other works
- **Reviews:** Customer reviews section with Looz integration

### 4.3 Collection Pages

#### Taxonomy Pages
- **Browse by Medium:** Filterable grid of artwork (painting, sculpture, etc.)
- **Browse by Style:** Movement or stylistic collections
- **Browse by Location:** Geographic-based collections
- **Browse by Theme:** Thematic groupings
- **Filters:** Price range, artist, medium, availability
- **Sorting:** Newest, Price (low-high), Price (high-low), Most Reviewed

### 4.4 Artist Pages

#### Artist Directory
- **Artist Profile:** Bio, image, social links, website
- **Artist Portfolio:** Grid of artist's artwork for sale
- **Artist Story:** About the artist narrative
- **Contact:** Direct messaging, email, WhatsApp
- **Reviews:** Customer testimonials about artist's work
- **Artist Events:** Upcoming talks, workshops, exhibitions

#### Artist Application
- **Form Submission:** Portfolio upload, artist information
- **Review Process:** Admin approval workflow
- **Artist Dashboard:** (if artist account exists) Order tracking, messaging, analytics

### 4.5 Educational Content

#### Blog/Articles
- **Art History Content:** Educational posts about movements, techniques, famous artists
- **Collecting Guides:** How to buy art, investment advice, collecting tips
- **Artist Spotlights:** Featured artist interviews and stories
- **Exhibition Reviews:** Coverage of gallery exhibitions
- **Workshop Announcements:** Upcoming classes and educational events

#### Events & Workshops
- **Calendar View:** Upcoming events, classes, workshops, artist talks
- **Event Details:** Description, date/time, location, registration, pricing
- **Casa Sala Marte:** Physical events in Mexico City venue
- **Registration:** Event booking system with payment integration

### 4.6 Shopping Experience

#### Cart & Checkout
- **Shopping Cart:** Item summary, quantity adjustment, remove items
- **Persistent Cart:** Remember items across sessions
- **Wishlist:** Save items for later
- **Checkout Process:**
  - Shipping address
  - Shipping method selection
  - Billing address (same/different)
  - Payment method selection
  - Order review
  - Confirmation
- **Order Tracking:** Post-purchase order status and shipping updates

#### Payment Options
- **Credit/Debit Cards:** Visa, Mastercard, American Express
- **Digital Wallets:** (region-appropriate options)
- **Bank Transfers:** (if applicable for large orders)
- **Secure Processing:** SSL encryption, PCI DSS compliance

### 4.7 Community & Social (E-Commerce Platform)

#### Reviews & Ratings
- **Product Reviews:** Customer feedback with 5-star system
- **Verified Purchases:** Show only reviews from verified buyers
- **Photo Reviews:** Customers can upload images
- **Review Moderation:** Admin approval before publishing
- **Overall Rating:** Aggregate 4.6+ star rating display

#### Social Integration
- **Share Buttons:** Share artwork to social media
- **Social Proof:** Customer testimonials, review count
- **Social Links:** Instagram, Facebook, Pinterest, TikTok
- **User-Generated Content:** Hashtag campaigns, customer features

## 4.8 Arte Capital Social Network UI & Features

### 4.8.1 Membership & Onboarding

#### Landing Page
- **Value Proposition:** Clear description of Arte Capital benefits
- **CTA:** "Join Now" button prominently displayed
- **Social Proof:** Member testimonials, member count, activity metrics
- **Pricing Options:**
  - Annual membership: $100/year
  - Monthly membership: $12/month (billed monthly)
  - Premium Associate: $200/year
  - Curator membership: $300/year
- **Feature Comparison:** Table comparing membership tiers

#### Sign-Up Flow
1. **Account Creation:** Email, password, name
2. **Profile Information:** Bio, photo, location, website, member type
3. **Payment Processing:** Secure checkout with Stripe/Conekta
4. **Welcome Sequence:** Email confirmation, welcome guide, platform tour
5. **First Steps:** Create profile, follow suggested members, join interests

#### Member Dashboard
- **Profile Widget:** Member info, follower count, activity summary
- **Quick Stats:** Posts created, followers, engagement metrics
- **Membership Status:** Current tier, renewal date, upgrade option
- **Settings Panel:** Privacy settings, notifications, email preferences

### 4.8.2 Social Feed & Timeline

#### Main Feed
- **Chronological Timeline:** Member posts in reverse chronological order
- **Feed Types:**
  - **Home Feed:** Posts from people you follow + recommended content
  - **Explore Feed:** Trending posts, suggested members, featured content
  - **Following Feed:** Only posts from followed members
- **Post Display:**
  - Member avatar, name, verification badge, time posted
  - Post content (text, images, links)
  - Engagement metrics (likes, comments, reposts)
  - Action buttons (like, comment, repost, bookmark, report)
- **Infinite Scroll:** Auto-load more posts as user scrolls
- **Real-Time Updates:** Live notification of new posts from followed members

#### Post Creation
- **Compose Box:** Text input with formatting options (bold, italic, links)
- **Rich Media Upload:** 
  - Image carousel (up to 10 images)
  - Image cropping and filters
  - Video upload capability (future)
- **Advanced Options:**
  - Hashtag suggestions
  - Mention members (@username)
  - Schedule post for later
  - Add location
  - Privacy settings (public, members only, specific people)
- **Preview:** See how post looks before publishing
- **Draft Auto-Save:** Automatically save drafts

#### Post Interactions
- **Reactions:** Heart, like, fire, celebrate, think, sad
- **Comments:** Reply to posts with threaded conversations
- **Nested Replies:** Reply to comments, quotable reposts
- **Repost/Share:** Amplify content to followers
- **Bookmarks:** Save to personal collection for later
- **Report:** Flag inappropriate content

### 4.8.3 Member Profiles

#### Profile Page
- **Header:** Cover photo, profile picture, name, verification badge
- **Bio Section:** Bio text, location, website link, joined date
- **Profile Stats:** Followers, Following, Posts count
- **Action Buttons:** Follow, Message, Share Profile
- **Tabs:**
  - **Posts:** All member's posts in reverse chronological order
  - **Events:** Events created/promoted by member
  - **Followers/Following:** List of connections
  - **Collections:** Curated collections of saved posts
  - **About:** Detailed member information, interests, affiliations
- **Member Type Badge:** Indicator of membership tier (Associate, Premium, Curator)
- **Activity Feed:** Recent activity (new posts, events, followers)
- **Verification Status:** Checkmark for verified members

#### Member Directory/Search
- **Searchable Database:** Find members by name, expertise, location
- **Filters:**
  - By member type (Associate, Collector, Curator, Artist)
  - By location (city, region)
  - By interests (art style, event type)
  - Active recently
  - New members
- **Sort Options:** Most followers, most active, newest, alphabetical
- **Member Cards:** Quick preview with follow button

### 4.8.4 Event Management & Promotion

#### Create/Edit Event
- **Event Details:**
  - Title and description (rich text editor)
  - Date, time, timezone
  - Location (address or online/hybrid)
  - Event type (Exhibition, Workshop, Networking, Talk, Sale, Launch, Other)
  - Capacity (if applicable)
- **Event Branding:**
  - Featured image/banner
  - Thumbnail image
  - Event hashtags
  - Category tags
- **Registration/Ticketing:**
  - Registration link (external or internal)
  - Ticket price (if applicable)
  - Capacity and RSVP tracking
  - Confirmation emails
- **Promotion:**
  - Auto-post to member's feed
  - Share to external social media
  - Invite specific members
  - Add to Arte Capital event calendar
  - Event Analytics

#### Event Calendar
- **Calendar View:** Month, week, or day view of all member events
- **Event Listing:** Search, filter, and sort events
- **Event Details Page:**
  - Description and details
  - Member creator info
  - Date and time
  - Location and venue
  - Attendee list (if public)
  - "Going" / "Interested" buttons
  - Share event button
- **Calendar Integration:** Add event to personal calendar (iCal, Google Calendar)
- **Event Reminders:** Email reminders 1 week, 1 day, 1 hour before event
- **Event Feedback:** Post-event survey and reviews

### 4.8.5 Direct Messaging

#### Messaging Interface
- **Conversation List:** All direct messages sorted by most recent
- **Search Conversations:** Find past conversations
- **Message Thread:** Conversation history with member
- **New Message:** Start conversation with any member
- **Message Composition:**
  - Text input with formatting
  - Image attachments
  - Link sharing
  - Emoji support
- **Read Receipts:** See if message is sent, delivered, read
- **Typing Indicator:** See when member is typing
- **Message Notifications:** Desktop and mobile notifications
- **Archive/Mute:** Hide conversations without deleting

### 4.8.6 Discovery & Recommendations

#### Explore Page
- **Trending Posts:** Most liked, commented posts
- **Trending Hashtags:** Popular topics and tags
- **Trending Events:** Upcoming events with most interest
- **Featured Members:** Highlighted profiles and their work
- **Recommended Members:** "People you may know" suggestions
- **Recommended Posts:** Content based on your interests and follows

#### Hashtag Pages
- **Hashtag Timeline:** All posts with specific hashtag
- **Hashtag Info:** Usage statistics, related hashtags, featured posts
- **Subscribe to Hashtag:** Get notifications about new posts
- **Trending in Hashtag:** Top posts and conversations

#### Collections
- **Personal Collections:** Create and manage custom collections
- **Curated Collections:** Gallery-created collections of posts/events
- **Add to Collection:** Save posts, events, or members to collection
- **Share Collection:** Make collection public and shareable
- **Collection Pages:** View and browse collections

### 4.8.7 Notifications & Alerts

#### Notification Center
- **In-App Notifications:**
  - New follower
  - Liked your post
  - Commented on your post
  - Mentioned you
  - Reposted your content
  - New direct message
  - Event reminder
  - Member activity recommendations
- **Notification Timeline:** All notifications in one place
- **Mark as Read:** Clear notifications
- **Notification Settings:** Control which notifications you receive

#### Email Notifications
- **Immediate Alerts:** Important actions (new followers, comments, DMs)
- **Daily Digest:** Summary of activity from past 24 hours
- **Weekly Digest:** Weekly summary of engagement and events
- **Customizable Preferences:** Choose what gets notified and how

### 4.8.8 Member Account Settings

#### Privacy & Security
- **Profile Visibility:** Public, private, or members-only
- **Who Can Message:** Everyone, followers only, nobody
- **Who Can Tag:** Everyone, followers only, nobody
- **Blocked Members:** List and manage blocked users
- **Privacy Policy:** Clear data handling policies
- **Two-Factor Authentication:** Enhanced account security
- **Session Management:** Active devices and login history

#### Preferences
- **Notification Settings:** Email, push, in-app preferences
- **Content Preferences:** Show/hide certain content types
- **Marketing Communications:** Newsletter opt-in/out
- **Data Download:** Export personal data (GDPR compliance)
- **Account Deletion:** Delete account and all data

#### Billing
- **Subscription Management:** View current plan and renewal date
- **Payment Methods:** Add/edit payment information
- **Billing History:** View invoices and payment history
- **Upgrade/Downgrade:** Change membership tier
- **Cancel Membership:** Manage subscription cancellation

---

## 5. USER FLOWS

### 5.1 Customer Journey

```
Discovery → Browsing → Product View → Add to Cart → Checkout → Confirmation → Follow-up
```

**Key Touchpoints:**
1. **Discovery:** Search, categories, homepage recommendations
2. **Browsing:** Filter by medium, style, price, artist
3. **Product View:** Artwork details, artist info, reviews
4. **Decision:** Add to cart, wishlist, or contact artist
5. **Checkout:** Shipping, payment, confirmation
6. **Post-Purchase:** Order tracking, reviews, recommendation emails

### 5.2 Artist Journey

```
Discovery → Application → Approval → Portfolio Setup → Sales → Engagement → Support
```

**Key Touchpoints:**
1. **Discovery:** Learn about gallery
2. **Application:** Submit portfolio and information
3. **Review:** Gallery team evaluation
4. **Approval:** Account activation
5. **Setup:** Upload artwork, set pricing
6. **Sales:** Monitor orders, manage inventory
7. **Support:** Gallery assistance, promotional help

### 5.3 Admin Workflows (E-Commerce Platform)

- **Product Management:** Add/edit/delete artwork, manage inventory
- **Order Management:** Process orders, manage fulfillment
- **Content Management:** Blog posts, exhibitions, events
- **Artist Management:** Review applications, manage accounts
- **Analytics:** Track sales, traffic, customer behavior
- **Marketing:** Email campaigns, promotional banners

### 5.4 Arte Capital Member Journey

```
Landing Page → Membership Signup → Payment → Profile Setup → Explore & Connect → Create Content → Promote Events → Engage with Community
```

**Key Touchpoints:**
1. **Discovery:** Landing page, value proposition, pricing
2. **Signup:** Account creation, profile information, payment processing
3. **Onboarding:** Welcome email, platform orientation, suggested follows
4. **Exploration:** Discover members, browse events, follow interests
5. **Engagement:** Like posts, comment, follow members, message
6. **Creation:** Create posts, share images, schedule content
7. **Promotion:** Create events, invite members, promote to social media
8. **Community:** Build followers, establish expertise, collaborate

### 5.5 Arte Capital Admin/Moderator Workflows

- **Member Management:** Review signups, verify members, manage suspensions
- **Content Moderation:** Review reported posts, enforce guidelines
- **Event Curation:** Feature events, promote priority events
- **Community Management:** Respond to support issues, manage groups
- **Analytics:** Track membership growth, engagement metrics, trends
- **Marketing:** Feature members, promote platform, member spotlights
- **Payment Management:** Monitor subscriptions, handle refunds, revenue reporting

---

## 6. CONTENT STRUCTURE

### 6.1 Main Collections

| Collection | Purpose | Content Type |
|-----------|---------|--------------|
| **Galería** | Brand info & physical location | Company info, showroom details |
| **Artistas** | Artist discovery & profiles | Artist bios, portfolios, applications |
| **Exposiciones** | Exhibition listings | Event details, venue info, dates |
| **Arte** | Browse by medium | Product grid, filters |
| **Colecciones** | Curated themes & movements | Product grid, contextual info |
| **Más+** | Geographic & additional services | City-specific collections |

### 6.2 Content Types

1. **Product Content (Artwork)**
   - Title, artist, price, dimensions, medium, year, description, images, reviews

2. **Editorial Content (Blog)**
   - Title, author, publish date, featured image, body, related products, category tags

3. **Artist Profiles**
   - Name, bio, image, social links, portfolio grid, contact info, reviews

4. **Event/Exhibition Content**
   - Title, date, time, location, description, featured image, registration/pricing

5. **Educational Content**
   - Workshops, classes, artist talks with registration and scheduling

---

## 7. VISUAL DESIGN SPECIFICATIONS

### 7.1 Layout Components

#### Header
- Logo/brand name (left)
- Navigation menu (center) - Galería, Artistas, Exposiciones, Arte, Colecciones, Más+
- Search bar (right) with autocomplete
- User account icon (dropdown menu)
- Shopping cart icon (with item count badge)
- Mobile hamburger menu

#### Product Grid
- Cards displaying: image, title, artist name, price
- Hover effects: image zoom, card elevation
- Responsive: 1-2 columns (mobile), 2-3 columns (tablet), 3-4 columns (desktop)
- Lazy loading for performance

#### Typography
- **H1:** 48px, Assistant Bold
- **H2:** 36px, Assistant Semibold
- **H3:** 28px, Assistant Semibold
- **H4:** 24px, Jost Semibold
- **Body:** 16px, Assistant Regular
- **Small text:** 14px, Assistant Regular
- **Captions:** 12px, Assistant Regular

#### Spacing
- Base unit: 8px
- Common margins: 8px, 16px, 24px, 32px, 48px
- Padding: Consistent internal spacing
- Gap between elements: Generous (24-32px for sections)

### 7.2 Component Styling

#### Buttons
- **Primary:** Dark teal background (#134242), white text, subtle shadow on hover
- **Secondary:** White background, dark teal border, dark teal text
- **Tertiary:** Text link, no background
- **Disabled:** Grayed out appearance
- **Border-radius:** 4-6px for modern flat design
- **Padding:** 12-16px vertical, 20-24px horizontal

#### Cards
- **Background:** White with subtle shadow (box-shadow: 0 2px 8px rgba(0,0,0,0.1))
- **Border-radius:** 8px
- **Padding:** 16-24px
- **Border:** 1px light gray (optional)

#### Form Elements
- **Input fields:** Light gray background, dark border on focus
- **Select dropdowns:** Consistent styling with inputs
- **Labels:** 14px, semibold, dark text
- **Placeholders:** Gray, lighter weight

---

## 8. IMPLEMENTATION ROADMAP (IventIA Integration Model)

### Phase 1: Foundation & Planning (Weeks 1-2)
**Setup & Architecture:**
- [x] Review IventIA codebase and architecture
- [ ] Design Arte Capital database schema (new tables only)
- [ ] Plan API extensions to IventIA
- [ ] Review IventIA authentication and payment systems
- [ ] Design social network UI components (consistent with IventIA)
- [ ] Estimate feature complexity and dependencies

### Phase 2: Public Shop UI (Weeks 3-6)
**Public E-Commerce Shop (IventIA-Based):**
- [ ] Create public-facing shop interface (new React app or Portal module)
- [ ] Design product pages (using IventIA resources)
- [ ] Implement catalog browsing (by medium, style, location)
- [ ] Build shopping cart (using IventIA orders)
- [ ] Implement checkout flow (using IventIA checkout)
- [ ] Apply galeriasalamarte.com design aesthetic
- [ ] Integrate payments (Stripe/Conekta)

### Phase 3: Arte Capital Database & Core API (Weeks 7-10)
**Backend Development (IventIA Integration):**
- [ ] Create Arte Capital database tables (posts, follows, messages, etc.)
- [ ] Extend IventIA user model with Arte Capital fields
- [ ] Create membership subscription endpoints
- [ ] Integrate with existing Stripe/Conekta payment system
- [ ] Create post creation and feed endpoints
- [ ] Implement follow/relationship endpoints
- [ ] Add Socket.io integration for real-time features

### Phase 4: Arte Capital Frontend Phase 1 (Weeks 11-14)
**UI Development (IventIA Portal Module):**
- [ ] Membership signup/payment flow
- [ ] Member profile pages
- [ ] Dashboard and account settings
- [ ] Social feed (read-only view)
- [ ] Member directory and search
- [ ] Post composer (text + images)

### Phase 5: Arte Capital Social Features (Weeks 15-18)
**Social Interaction Features:**
- [ ] Post interactions (like, comment, repost, bookmark)
- [ ] Real-time notifications (Socket.io)
- [ ] Direct messaging system
- [ ] Collections and saved posts
- [ ] Follow/unfollow functionality
- [ ] Member recommendations

### Phase 6: Arte Capital Event Promotion (Weeks 19-22)
**Event Management & Discovery:**
- [ ] Event creation (linked to IventIA events)
- [ ] Event calendar integration
- [ ] Event promotion to member feeds
- [ ] Event sharing to social media (Instagram, Facebook, Twitter)
- [ ] Event analytics dashboard
- [ ] RSVP and attendance tracking

### Phase 7: Content & Community (Weeks 23-26)
**E-Commerce & Community Features:**
- [ ] Artist profile pages (public, leveraging IventIA data)
- [ ] Blog/editorial content structure
- [ ] Review/rating system integration (Looz)
- [ ] Event and workshop management
- [ ] Trending posts and hashtags
- [ ] Featured member spotlights

### Phase 8: Advanced Features & Integration (Weeks 27-30)
**Optimization & Integration:**
- [ ] Social media auto-posting (Instagram, Facebook, Twitter, LinkedIn)
- [ ] Email marketing and digests (Klaviyo/Sendgrid)
- [ ] Extended analytics (member engagement, post performance)
- [ ] Search with filters and autocomplete (Elasticsearch)
- [ ] Mobile responsiveness optimization
- [ ] Community guidelines and moderation tools

### Phase 9: Testing, QA & Launch Prep (Weeks 31-34)
**Quality Assurance & Deployment:**
- [ ] Comprehensive testing (unit, integration, E2E)
- [ ] Performance optimization and monitoring
- [ ] Security audit and penetration testing
- [ ] Staff and moderator training
- [ ] Documentation for admins and moderators
- [ ] Go-live preparation and monitoring setup

### Phase 10: Soft Launch & Full Launch (Weeks 35-36)
**Deployment:**
- [ ] Soft launch to select members (Week 35)
- [ ] Feedback collection and bug fixes
- [ ] Full public launch (Week 36)
- [ ] Post-launch monitoring and support

### Phase 11: Post-Launch & Growth (Weeks 37+)
**Ongoing Operations:**
- [ ] Community guidelines enforcement
- [ ] Member support and issue resolution
- [ ] Feature iteration based on feedback
- [ ] Member acquisition campaigns
- [ ] Analytics review and optimization
- [ ] Planning for Phase 2 features

**Total Project Duration:** 9 months (36 weeks) vs. 32 weeks for separate platform = **Saved 4 weeks by using IventIA integration**

---

## 9. DELIVERABLES

### 9.1 Technical Deliverables
- [x] Responsive Shopify theme (custom CSS/liquid templates)
- [x] Navigation system and menu architecture
- [x] Product page templates
- [x] Collection/category page templates
- [x] Artist profile page templates
- [x] Blog post templates
- [x] Checkout customization
- [x] Integration documentation
- [ ] API documentation (if custom endpoints)
- [ ] Admin user guide

### 9.2 Design Deliverables
- [x] Design system documentation (colors, typography, spacing)
- [x] Component library (buttons, cards, forms, etc.)
- [x] Wireframes for key pages
- [x] High-fidelity mockups
- [x] Mobile responsive designs
- [x] Style guide and brand guidelines document

### 9.3 Content Deliverables
- [ ] Homepage content
- [ ] About/Galería page content
- [ ] Sample product descriptions
- [ ] Sample blog posts
- [ ] Artist profile templates
- [ ] Email templates

### 9.4 Integration Deliverables
- [ ] Payment gateway integration (Stripe/Conekta)
- [ ] Review system (Looz) integration
- [ ] Analytics setup (GA4, Facebook Pixel, TikTok Pixel)
- [ ] Email marketing integration (Klaviyo/Mailchimp)
- [ ] WhatsApp Business integration
- [ ] CDN/image optimization setup

---

## 10. SUCCESS METRICS

### 10.1 E-Commerce Platform KPIs
- **Conversion Rate:** Target 2-3% (e-commerce benchmark)
- **Average Order Value:** Goal based on artwork pricing
- **Customer Lifetime Value:** Track repeat purchases
- **Cart Abandonment Rate:** <70% (industry standard)
- **Customer Satisfaction:** 4.5+ star average rating
- **Monthly Transactions:** Growth trajectory
- **Revenue:** Monthly and annual revenue targets

### 10.2 Arte Capital Membership KPIs
- **Member Growth:** Monthly new signups (target: 100+ members in first month)
- **Churn Rate:** <5% annual membership cancellation
- **Monthly Recurring Revenue (MRR):** Predictable subscription revenue
- **Member Tier Distribution:** Percentage of each membership level
- **Renewal Rate:** >90% annual membership renewal
- **Lifetime Value per Member:** MRR × average membership duration
- **Cost per Acquisition (CAC):** Marketing spend to acquire one member

### 10.3 Social Network Engagement KPIs
- **Daily Active Users (DAU):** % of members logging in daily
- **Monthly Active Users (MAU):** % of members active each month
- **Posts per Member:** Average posts created per month
- **Engagement Rate:** Likes + comments + shares / total views
- **Network Effects:** Growth in connections and follows
- **Event Creation:** Number of events created and promoted
- **Retention Rate:** % of members active after 30/90/180 days
- **User-Generated Content:** Hours of content created monthly

### 10.4 Technical Performance KPIs
- **Page Load Time:** <3 seconds (both platforms)
- **Mobile Usability:** 90+ Google Mobile Score
- **Uptime:** 99.9% platform availability (both platforms)
- **API Response Time:** <200ms average response time
- **Error Rate:** <0.1% transaction failures
- **SEO Performance:** #1-3 ranking for target keywords
- **Database Performance:** Query response time <100ms

### 10.5 Community Health KPIs
- **Member Satisfaction:** NPS score >50, CSAT >4.0/5.0
- **Member Feedback:** Response time to support inquiries <24 hours
- **Content Quality:** Minimal flagged content, <1% harmful posts
- **Moderation Effectiveness:** 95%+ inappropriate content removed
- **Member Retention:** Returning member percentage
- **Ambassador Members:** Highly active, engaged members creating value

### 10.6 Marketing & Acquisition KPIs
- **Cost Per Member Acquisition:** Target <$20 CAC
- **Viral Coefficient:** Member referral rate and word-of-mouth growth
- **Email Engagement:** Open rate >30%, click rate >5%
- **Social Media Reach:** Impressions and engagement on promoted content
- **Press & Media:** Coverage and backlinks to platforms
- **Brand Awareness:** Growth in branded search volume

---

## 11. ASSUMPTIONS & CONSTRAINTS

### 11.1 Assumptions

**E-Commerce Platform:**
- Client has existing Shopify account and license
- Product photography is professional quality
- Artwork inventory data is available for import
- Payment processing accounts exist (Stripe/Conekta)
- Team has basic Shopify administration knowledge

**Arte Capital Social Network:**
- Client has resources for community management and moderation
- Cloud hosting account available (AWS, GCP, or DigitalOcean)
- Committed to member acquisition and marketing
- Has established community guidelines and values
- Willing to invest in ongoing platform maintenance
- Plans for mobile app expansion (optional, future)

**Overall:**
- Mexican market is primary focus initially
- Internet penetration and digital payment adoption adequate
- Team commitment to 8+ month implementation timeline
- Budget available for cloud infrastructure and third-party services

### 11.2 Constraints

**Platform Architecture:**
- E-Commerce: Shopify (cannot change underlying platform)
- Social Network: Custom backend (required for real-time features)
- Separate databases and code repositories for both platforms
- API-based integration between platforms (optional for future)

**Market & Regional:**
- Currency: Mexican Peso (MXN) exclusively
- Language: Spanish as primary language
- Payment Methods: Limited to Mexico-available options
- Shipping: Based on Mexican postal system
- Compliance: Mexican e-commerce, tax, and data protection regulations
- Compliance: GDPR if any EU members join

**Membership & Monetization:**
- Fixed membership price ($100/year) vs. flexible pricing
- No freemium tier for Arte Capital (paid membership only)
- Subscription model requires recurring payment capability
- Limited refund/cancellation window (industry standard 7-14 days)

**Content & Community:**
- Moderation requires human oversight (cannot be fully automated)
- Community requires active management and engagement
- Content scaling requires adequate storage and bandwidth
- Real-time features require always-on infrastructure

**Technical Limitations:**
- Email delivery limited by ISP reputation and spam filtering
- Image processing and CDN costs scale with user growth
- Database scaling required as user base grows
- Real-time websocket connections limited by server capacity

**Timeline:**
- 35+ week timeline required for both platforms
- Phased approach means E-Commerce launches before Arte Capital fully mature
- Post-launch iterations and improvements ongoing

---

## 12. TIMELINE & MILESTONES

### E-Commerce Platform + Arte Capital (IventIA Module) Timeline

| Phase | Duration | Key Deliverables | Deadline |
|-------|----------|------------------|----------|
| **Phase 1: Planning & Setup** | 2 weeks | Architecture review, schema design, IventIA API planning | Week 2 |
| **Phase 2: Public Shop UI** | 4 weeks | Product pages, catalog, cart, checkout (IventIA-based) | Week 6 |
| **Phase 3: Arte Capital Backend** | 4 weeks | DB tables, API endpoints, membership, Socket.io | Week 10 |
| **Phase 4: Arte Capital Frontend Phase 1** | 4 weeks | Signup, profiles, feed UI, directory, composer | Week 14 |
| **Phase 5: Social Features** | 4 weeks | Interactions, messaging, notifications, collections | Week 18 |
| **Phase 6: Event Management** | 4 weeks | Event creation, calendar, promotion, sharing, analytics | Week 22 |
| **Phase 7: Content & Community** | 4 weeks | Artist profiles, blog, reviews, trending, moderation | Week 26 |
| **Phase 8: Advanced Features** | 4 weeks | Social media sync, email, analytics, search | Week 30 |
| **Phase 9: Testing & QA** | 4 weeks | Testing, performance, security, training, documentation | Week 34 |
| **Soft Launch (Public Shop)** | 1 week | Limited public release of e-commerce shop | Week 35 |
| **Soft Launch (Arte Capital)** | 1 week | Beta launch to select members | Week 36 |
| **Full Launch** | — | Public release (shop + Arte Capital) | Week 37 |
| **Post-Launch Support** | Ongoing | Monitoring, bug fixes, member support | Week 38+ |

**Total Project Duration:** 9 months (37 weeks)  
**Cost Savings:** ~4 weeks shorter timeline vs. separate platform  
**Infrastructure Savings:** 40-50% reduced costs by sharing IventIA resources

### Key Milestones
1. **Week 2:** Architecture and planning complete, green light to build
2. **Week 6:** E-Commerce shop operational (Shopify)
3. **Week 10:** Arte Capital API foundation ready for testing
4. **Week 14:** Arte Capital MVP (basic features) available to beta users
5. **Week 22:** Full feature parity with social network design
6. **Week 34:** All systems tested and ready for launch
7. **Week 35:** Public launch of integrated platform

---

## 13. RESOURCES & TEAM

### 13.1 Required Team (IventIA Integration Model)

**IventIA Development Team (Shared):**
- **Project Manager / Scrum Master:** Overall project coordination and timeline management
- **IventIA Backend Lead Developer:** Extends IventIA APIs for Arte Capital features
- **IventIA Frontend Lead Developer:** Extends IventIA Portal/Admin UI for social features
- **IventIA Full-Stack Developer:** Feature development across platform
- **IventIA Database Administrator:** Manages shared database (users, products, events)
- **IventIA DevOps/Infrastructure:** Deploys Arte Capital as module within IventIA

**Shopify E-Commerce Team (Dedicated):**
- **Shopify Developer:** Customizes Shopify theme and checkout for Galería Sala Marte
- **E-Commerce Product Manager:** E-commerce requirements and prioritization

**Arte Capital Specific Roles:**
- **UX/UI Designer:** Social network UI components, user flows, wireframes
- **Community Manager:** Moderation, member support, engagement strategy
- **Frontend Developer (Social):** Socket.io integration, real-time features, feed UI
- **Backend Developer (Social):** Post/follow/message APIs, real-time logic

**Supporting Team:**
- **QA/Testing Lead:** Testing strategies across IventIA + Arte Capital
- **Content Strategist:** Information architecture, content planning, copywriting
- **Security Specialist:** Data protection, encryption, compliance
- **Client Liaison:** Gallery coordination, moderation setup, training

### 13.2 Team Size & Staffing

**Recommended Team Composition:**
- **IventIA Core Team:** 4-5 developers (shared backend/frontend)
- **Shopify Developer:** 1 FT
- **Arte Capital Specific:** 2-3 developers + 1 designer
- **Supporting Staff:** QA, Community Manager, Content, Security (4 people, some part-time)
- **Total Team:** 12-13 people (vs. 15-17 for separate platform)

**Cost Savings:**
- ~20% smaller team due to shared infrastructure
- ~40-50% reduction in infrastructure costs (shared database, hosting, CDN)
- ~30% faster development due to leveraging IventIA's existing features

**Client Team Requirements:**
- **Galería Sala Marte:** 2-3 dedicated personnel for coordination
- **Community Manager (Arte Capital):** 1 person post-launch for moderation
- **E-Commerce Manager:** 1 person for product updates and inventory

### 13.3 Client Responsibilities

**Project Support:**
- Designate project sponsor and decision-maker
- Provide regular feedback during development phases
- Approve design decisions, mockups, and key features
- Coordinate between development team and internal stakeholders

**Content & Assets:**
- Provide artwork product data and professional photography
- Create and verify content (blog posts, artist bios, descriptions)
- Supply company/brand guidelines and brand assets
- Prepare event and exhibition information

**Business Requirements:**
- Define membership benefits and promotional strategy
- Provide pricing approval and payment gateway accounts (Stripe/Conekta)
- Establish community guidelines and moderation policies
- Plan member acquisition and marketing campaigns
- Designate admin and moderator users for both platforms

**Post-Launch:**
- Staff and train moderators for community management
- Manage member support and inquiries
- Monitor platform performance and user feedback
- Plan and execute marketing and growth initiatives

---

## 14. ASSUMPTIONS ABOUT CURRENT STATE

Based on website analysis:
- ✅ Platform: Active Shopify store
- ✅ Design: Minimalist aesthetic established
- ✅ Integrations: Looz reviews, analytics configured
- ✅ Content: Blog, artists, exhibitions in place
- ✅ Marketing: Email, social media active
- ❓ Artist onboarding: Process unclear
- ❓ Inventory management: Current system unknown
- ❓ Analytics reporting: Custom dashboards unknown

---

## 15. ARTE CAPITAL BUSINESS MODEL SUMMARY

### 15.1 Revenue Model

**Membership Tiers:**
1. **Associate Member:** $100/year (or $12/month)
   - Post images and text content
   - Promote events
   - Access member directory
   - Messaging and networking
   - Community dashboard

2. **Premium Associate:** $200/year
   - All Associate features
   - Featured profile placement
   - Priority event promotion
   - Analytics dashboard
   - Custom brand profile

3. **Curator Member:** $300/year
   - All Premium features
   - Event creation and management tools
   - Group management (future)
   - Advanced analytics
   - API access (future)

### 15.2 Business Assumptions

**Member Acquisition:**
- Target: 500 founding members in Year 1
- Growth: 30-50% YoY
- CAC: <$20 per member
- Churn: <5% annually

**Revenue Projections (Conservative):**
- **Year 1:** 500 members × $100 (avg) = $50,000 annual recurring revenue
- **Year 2:** 750 members × $100 (avg) = $75,000 ARR
- **Year 3:** 1,200 members × $100 (avg) = $120,000 ARR

**Cost Structure:**
- Infrastructure: $1,000-2,000/month (hosting, CDN, databases)
- Team: 1 FT community manager, 0.5 FT moderators = $60,000-80,000/year
- Third-party services: $500-1,000/month (email, analytics, notifications)
- Total monthly operating cost: ~$8,000-10,000
- Break-even: ~80-100 active members

### 15.3 Competitive Advantage

1. **Niche Focus:** Exclusively for art professionals and enthusiasts
2. **Creator-Focused:** Unlike general social networks, incentivizes quality content
3. **Event Promotion:** Integrated calendar for art events and exhibitions
4. **Community Values:** Curation and moderation ensure professional environment
5. **Mexican Market:** Serves underserved Latin American art community
6. **Integration:** Ties directly to Galería Sala Marte e-commerce platform

### 15.4 Success Factors

**Critical for Launch Success:**
1. **Initial Member Base:** Secure 50-100 founding members before launch
2. **Content Seeding:** Gallery team creates initial content
3. **Moderation:** Clear community guidelines and active moderation
4. **Member Engagement:** Regular featured members, events, spotlights
5. **Value Delivery:** Members must see tangible benefits quickly
6. **Event Promotion:** Early events to demonstrate platform value

**Growth Drivers:**
1. **Referral Incentives:** Reward members for inviting peers
2. **Content Quality:** Showcase best member content and galleries
3. **Strategic Partnerships:** Collaborate with established galleries and institutions
4. **Social Proof:** Regular success stories and member spotlights
5. **Educational Content:** Host webinars, talks, and masterclasses
6. **Integration:** Cross-promote with Galería Sala Marte e-commerce

---

## 16. ARTE CAPITAL + IVENTIA INTEGRATION SUMMARY

### 16.1 Architectural Benefits

**Database Integration:**
- Single PostgreSQL instance shared between IventIA and Arte Capital
- IventIA users can become Arte Capital members
- Products, price lists, and events shared across both platforms
- No data duplication or synchronization complexity

**API Integration:**
- Arte Capital extends IventIA's existing `/api/v1/` endpoints
- New endpoints: `/api/v1/arte-capital/posts`, `/api/v1/arte-capital/follow`, etc.
- Reuses IventIA's authentication middleware and JWT tokens
- Leverages IventIA's error handling, rate limiting, and logging

**Frontend Integration:**
- Arte Capital is a new section/module within IventIA Portal
- Users login once to access both e-commerce and social network
- Reuses IventIA's design system, components, and styling
- Consistent navigation and user experience

**Infrastructure Sharing:**
- Single hosting environment (AWS/DigitalOcean)
- Shared Redis cache for performance
- Single CDN for media delivery
- Shared email service configuration
- Unified monitoring and alerting

### 16.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Galería Sala Marte                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Public E-Commerce (Shopify)    │   IventIA Platform   │
│  - galeriasalamarte.com         │   (Internal)         │
│  - Product catalog              │                       │
│  - Shopping cart & checkout     │  ┌──────────────────┐ │
│  - Order management             │  │  Admin Dashboard │ │
│                                 │  └──────────────────┘ │
│                                 │                       │
│                                 │  ┌──────────────────┐ │
│                                 │  │  Portal (Member) │ │
│                                 │  │ ┌──────────────┐ │ │
│                                 │  │ │ E-Commerce   │ │ │
│                                 │  │ └──────────────┘ │ │
│                                 │  │ ┌──────────────┐ │ │
│                                 │  │ │ Arte Capital │ │ │
│                                 │  │ │  (NEW)       │ │ │
│                                 │  │ └──────────────┘ │ │
│                                 │  └──────────────────┘ │
│                                 │                       │
└─────────────────────────────────────────────────────────┘
        │                                 │
        ▼                                 ▼
    ┌─────────┐                   ┌───────────────────┐
    │ Shopify │                   │ PostgreSQL        │
    │ (Store) │                   │ (Shared Database) │
    └─────────┘                   └───────────────────┘
                                      │   │    │    │
                    ┌──────────────────┼───┼────┼────┘
                    │                  │   │    │
                  Users         Events Products Price Lists
                  Posts         Messages Follows Collections
```

### 16.3 Data Model Integration

**Shared Tables (IventIA):**
```
├── user (+ artCapitalMembership fields)
├── event
├── product
├── priceList
├── priceListItem
├── order
├── document
└── tenant
```

**New Tables (Arte Capital):**
```
├── artCapitalMembership (user_id, tier, subscription_status, renewal_date)
├── artCapitalPost (user_id, content, images, created_at)
├── artCapitalPostReaction (post_id, user_id, reaction_type)
├── artCapitalComment (post_id, user_id, content)
├── artCapitalFollow (follower_id, following_id)
├── artCapitalMessage (sender_id, recipient_id, content)
├── artCapitalCollection (user_id, name, posts)
├── artCapitalEventPromotion (event_id, user_id, shared_at)
└── artCapitalMemberAnalytics (user_id, posts_count, followers_count, engagement)
```

---

## 17. EXISTING IVENTIA CODEBASE INTEGRATION

### 17.1 Leveraged IventIA Features

Arte Capital reuses these existing IventIA features:

| Feature | IventIA Component | Arte Capital Usage |
|---------|------------------|-------------------|
| **User Management** | `apps/api/src/controllers/portal.auth.controller.ts` | User signup, login, profile, authenticate members |
| **Event Management** | `apps/api/src/controllers/portal.events.controller.ts` | Create, list, and promote events to Arte Capital feed |
| **Product Catalog** | `apps/api/src/controllers/portal.orders.controller.ts` | Display artworks and products to members |
| **Price Lists** | `apps/api/src/controllers/` (pricing) | Members browse and purchase products via integration |
| **Messaging** | Future: Real-time via Socket.io | Direct messages between members |
| **Authentication** | `apps/api/src/middleware/portalAuth.middleware.ts` | JWT authentication for Arte Capital endpoints |
| **Database** | PostgreSQL in `packages/prisma` | Extend Prisma schema with Arte Capital tables |
| **Email** | `apps/api/src/config/email` | Send welcome, notifications, digests |
| **Analytics** | Existing GA4 setup | Track membership signups, engagement, events |
| **CDN/Storage** | AWS S3 / Cloudinary | Store post images and member avatars |
| **Payments** | Stripe/Conekta via `apps/api/src/lib/stripe.ts` | Process membership subscriptions |

### 17.2 IventIA Codebase Changes Required

**Backend (`apps/api`):**
1. **Database Schema** (`packages/prisma/schema.prisma`):
   - Add `artCapitalMembership` model
   - Add `artCapitalPost`, `artCapitalComment`, `artCapitalReaction` models
   - Add `artCapitalFollow`, `artCapitalMessage` models
   - Add `artCapitalCollection`, `artCapitalEventPromotion` models
   - Extend `user` model with `artCapitalMember` relation

2. **Controllers** (new files in `apps/api/src/controllers/`):
   - `arte-capital.membership.controller.ts` - Membership signup, renewal
   - `arte-capital.posts.controller.ts` - Create, read, update posts
   - `arte-capital.social.controller.ts` - Follow, like, comment, reactions
   - `arte-capital.messages.controller.ts` - Direct messaging
   - `arte-capital.events.controller.ts` - Promote events
   - `arte-capital.members.controller.ts` - Member directory, profiles

3. **Routes** (new file: `apps/api/src/routes/arte-capital.routes.ts`):
   - Register all Arte Capital endpoints under `/api/v1/arte-capital/*`

4. **Services** (new files):
   - `arte-capital.service.ts` - Business logic for members, posts, follows
   - `arte-capital-notifications.service.ts` - Real-time notifications via Socket.io
   - `arte-capital-analytics.service.ts` - Track member engagement

5. **Middleware** (modifications):
   - Extend `portalAuth.middleware.ts` to include membership status checks

**Frontend (`apps/portal`):**
1. **Pages** (new directories in `apps/portal/src/pages/`):
   - `arte-capital/` - Main module directory
   - `arte-capital/membership/` - Signup and payment flow
   - `arte-capital/feed/` - Social feed and timeline
   - `arte-capital/profile/` - Member profiles
   - `arte-capital/messages/` - Direct messaging
   - `arte-capital/members/` - Member directory

2. **Components** (new files in `apps/portal/src/components/`):
   - `ArtCapitalFeed.tsx` - Main feed component
   - `ArtCapitalPostComposer.tsx` - Create posts
   - `ArtCapitalPostCard.tsx` - Display posts
   - `ArtCapitalProfile.tsx` - Member profile
   - `ArtCapitalMessageThread.tsx` - Messaging UI
   - `ArtCapitalNotification.tsx` - Notifications

3. **API Client** (`apps/portal/src/api/`):
   - `arte-capital.ts` - API wrapper for all Arte Capital endpoints

4. **Layout/Navigation** (modifications):
   - Add Arte Capital link to portal navigation
   - Add authentication guard for membership access
   - Show membership status in user profile

### 17.3 File Structure

```
apps/
├── api/
│   └── src/
│       ├── controllers/
│       │   ├── arte-capital.membership.controller.ts (NEW)
│       │   ├── arte-capital.posts.controller.ts (NEW)
│       │   ├── arte-capital.social.controller.ts (NEW)
│       │   ├── arte-capital.messages.controller.ts (NEW)
│       │   ├── arte-capital.events.controller.ts (NEW)
│       │   └── arte-capital.members.controller.ts (NEW)
│       ├── services/
│       │   ├── arte-capital.service.ts (NEW)
│       │   ├── arte-capital-notifications.service.ts (NEW)
│       │   └── arte-capital-analytics.service.ts (NEW)
│       ├── routes/
│       │   └── arte-capital.routes.ts (NEW)
│       └── lib/
│           └── socket-io.ts (NEW - for real-time features)
├── portal/
│   └── src/
│       ├── pages/
│       │   ├── arte-capital/
│       │   │   ├── MembershipSignup.tsx (NEW)
│       │   │   ├── MembershipFlow.tsx (NEW)
│       │   │   ├── FeedPage.tsx (NEW)
│       │   │   ├── ProfilePage.tsx (NEW)
│       │   │   ├── MessagesPage.tsx (NEW)
│       │   │   └── DirectoryPage.tsx (NEW)
│       ├── components/
│       │   ├── ArtCapitalFeed.tsx (NEW)
│       │   ├── ArtCapitalPostComposer.tsx (NEW)
│       │   ├── ArtCapitalPostCard.tsx (NEW)
│       │   ├── ArtCapitalProfile.tsx (NEW)
│       │   ├── ArtCapitalMessageThread.tsx (NEW)
│       │   └── ArtCapitalNotification.tsx (NEW)
│       └── api/
│           └── arte-capital.ts (NEW)
└── admin/
    └── src/
        ├── pages/
        │   └── arte-capital/
        │       ├── MembersPage.tsx (NEW)
        │       ├── ModeratorDashboard.tsx (NEW)
        │       └── AnalyticsPage.tsx (NEW)
        └── components/
            └── ArtCapitalModeration.tsx (NEW)

packages/
└── prisma/
    ├── schema.prisma (MODIFIED - add Arte Capital models)
    └── migrations/ (NEW - add Arte Capital migrations)
```

---

## 18. NEXT STEPS (IMMEDIATE ACTIONS)

### Week 1: Strategic Alignment
1. **Architecture Review Meeting:** Align with IventIA development team on integration approach
   - Review shared database schema
   - Confirm API integration points
   - Finalize Socket.io implementation plan

2. **Database Schema Approval:** Review and approve new Arte Capital tables with database team
   - Review Prisma schema changes
   - Plan migration strategy
   - Confirm data model relationships

3. **Team Assignment:** Assign IventIA team members to Arte Capital work
   - Backend lead takes ownership
   - Frontend developer assigned
   - Designer on board

4. **Timeline Confirmation:** Finalize 37-week schedule with full team
   - Confirm dependencies
   - Plan sprint schedule
   - Set milestones

### Week 2-3: Planning & Design
5. **API Specification:** Document all new endpoints and data flows
   - Write API contracts
   - Define error handling
   - Plan rate limiting

6. **Detailed Design Review:** Create wireframes and mockups for Arte Capital UI
   - Social feed layout
   - Member profile design
   - Messaging interface
   - Ensure consistency with IventIA Portal

7. **Community Strategy:** Define member acquisition and onboarding plan
   - Founding member recruitment strategy
   - Onboarding flow design
   - Email sequence planning

8. **Content & Asset Audit:** Inventory existing content and assets for both platforms
   - Collect gallery information
   - Prepare artist profiles
   - Plan initial member content

### Week 4: Development Setup
9. **Create Feature Branches:** Branch from IventIA main for Arte Capital development
   - Branch: `feature/arte-capital-social-network`
   - Set up branch protection rules

10. **Set Up Staging Environment:** Deploy Arte Capital module to staging IventIA
    - Extend staging database schema
    - Deploy new API endpoints
    - Test Socket.io in staging

11. **Integration Testing Plan:** Define test strategy for shared database and APIs
    - Unit tests for new controllers
    - Integration tests with existing IventIA features
    - End-to-end tests for membership flow

12. **Project Tracking Setup:** Initialize sprint planning and progress tracking
    - Create tickets for all implementation tasks
    - Set up GitHub Projects / Linear
    - Plan 2-week sprints

### Ongoing: Kickoff Activities
13. **Team Onboarding:** Brief full team on scope, architecture, and timeline
    - Share this SOW document
    - Explain IventIA integration model
    - Review codebase structure

14. **Monitoring & DevOps:** Prepare monitoring and alerting for Arte Capital
    - Set up error tracking (Sentry)
    - Configure logging
    - Plan performance monitoring

15. **Security Review:** Initial security assessment for membership and social features
    - JWT security in context of social network
    - Data privacy considerations
    - Rate limiting strategy for API

---

**Document Status:** Ready for stakeholder review and team kickoff  
**Last Updated:** April 6, 2026  
**Version:** 2.0 (IventIA Integration Model)

## APPENDICES

### A. Visual Style Reference
- Dark teal (#134242) primary color
- Minimalist, gallery-appropriate aesthetic
- High whitespace and generous margins
- Clean typography (Assistant + Jost fonts)
- Professional product photography

### B. Competitive Landscape
Similar platforms: Saatchi Art, Artsy, Gagosian, David Castillo Gallery

### C. Market Considerations
- Mexican art market size and growth
- Local artist community engagement
- Regional collector demographics
- Digital art buying trends in Mexico

### D. Technical Stack Summary

**E-Commerce Platform (galeriasalamarte.com - Shopify):**
- **Platform:** Shopify
- **Frontend:** Liquid templates + custom CSS/JavaScript
- **Payments:** Stripe / Conekta
- **Analytics:** GA4, Facebook Pixel, TikTok Pixel
- **Reviews:** Looz
- **Email:** Klaviyo or Mailchimp
- **Images:** Cloudinary or Shopify CDN

**Arte Capital Social Network (IventIA Module - Shared Infrastructure):**

*Shared with IventIA:*
- **Backend:** Node.js + Express.js (extends IventIA API)
- **Database:** PostgreSQL (same instance as IventIA)
- **Cache:** Redis (shared with IventIA)
- **Storage:** AWS S3 / Cloudinary (shared with IventIA)
- **Search:** Elasticsearch (shared with IventIA)
- **Authentication:** JWT (IventIA's existing system)
- **Frontend:** React.js + TypeScript (IventIA Portal/Admin)
- **Hosting:** AWS / DigitalOcean (shared with IventIA)
- **CDN:** CloudFlare or AWS CloudFront (shared with IventIA)

*Arte Capital Specific:*
- **Real-Time:** Socket.io / WebSocket (new integration)
- **Subscription Payments:** Stripe Billing / Conekta (reuses IventIA integration)
- **Email:** SendGrid or AWS SES (configured in IventIA)
- **Notifications:** Socket.io for real-time, email via SendGrid
- **Analytics:** Extend IventIA analytics with custom Arte Capital events
- **Social Media Integration:** Instagram API, Facebook API, Twitter/X API, LinkedIn API (new)

### E. Competitive Landscape & Inspiration

**Art E-Commerce Platforms:**
- Saatchi Art, Artsy, Gagosian Gallery, David Castillo Gallery

**Professional Networks with Membership:**
- Lego Ideas (member associates), Patreon (creators), Masterclass (education)
- Dribbble (designers), Behance (creatives)

**Art Community Platforms:**
- Cargo (artist portfolios), ArtStation (digital artists)
- Vimeo (video creators with communities)

### F. Market Considerations

**Mexican Art Market:**
- Growing digital adoption among collectors
- Strong regional artist communities
- High engagement in social media
- Potential for membership-based community model
- Local artist empowerment and collaboration opportunities

### G. Future Enhancements & Roadmap

**Phase 2 (Post-Launch, 3-6 months):**
- Mobile app for Arte Capital
- Live streaming for events and talks
- Payment integration for event ticketing within platform
- Artist collaborations and commissioned works
- Marketplace integration between platforms

**Phase 3 (6-12 months):**
- International expansion (Spanish-speaking markets)
- Additional languages support
- Video content and tutorials
- Member certification programs
- Art investment and collection tracking
- Integration with art insurance partners

**Phase 4 (12+ months):**
- AI-powered recommendations
- Virtual exhibition platform
- NFT/blockchain integration (optional)
- Membership tier expansion
- B2B features for galleries and institutions

---

**Document Prepared By:** AI Assistant  
**Review Required By:** Project Manager / Client Lead  
**Approval Date:** [To be filled]  
**Last Updated:** April 6, 2026  

---

**Signature Block**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Client Representative | | | |
| Project Manager | | | |
| Development Lead | | | |

