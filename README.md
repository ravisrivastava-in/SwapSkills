# SwapSkills — Database Schema & Deployment Guide

## 📂 Project Folder Structure

```
SwapSkills/
├── index.html                    ← Landing / Home page
├── auth.html                     ← Login & Register page
├── dashboard.html                ← User dashboard
├── skills.html                   ← Skill management (add/remove)
├── matches.html                  ← Find matches, accept/reject, schedule, rate
├── chat.html                     ← Real-time chat per match
├── assets/
│   ├── css/
│   │   ├── main.css              ← eNno Bootstrap template styles
│   │   └── swapskills.css        ← SwapSkills custom styles + dark mode
│   ├── js/
│   │   ├── main.js               ← Template utilities (scroll, AOS, etc.)
│   │   ├── firebase-app.js       ← ★ Consolidated Firebase script (all logic)
│   │   └── modules/              ← Individual ES-module files (optional ref)
│   │       ├── firebase-config.js
│   │       ├── auth.js
│   │       ├── skills.js
│   │       ├── matching.js
│   │       ├── chat.js
│   │       └── sessions.js
│   ├── img/                      ← Images (hero, about, team, etc.)
│   └── vendor/                   ← Bootstrap, AOS, Swiper, etc.
└── forms/                        ← PHP contact forms (template default)
```

---

## 🗄️ Database Schema Design

### Firebase Firestore Collections

#### Collection: `users`
| Field           | Type          | Description                            |
|-----------------|---------------|----------------------------------------|
| uid             | string        | Firebase Auth UID (document ID)        |
| displayName     | string        | User's full name                       |
| email           | string        | Email address                          |
| bio             | string        | Short biography                        |
| skillsOffered   | array<object> | Skills user can teach                  |
| skillsWanted    | array<object> | Skills user wants to learn             |
| averageRating   | number        | Computed average rating (0–5)          |
| createdAt       | timestamp     | Account creation timestamp             |

**Skill Object (inside skillsOffered / skillsWanted):**
| Field       | Type   | Description                     |
|-------------|--------|---------------------------------|
| id          | string | Unique ID (Date.now)            |
| name        | string | Skill name ("Python", "Guitar") |
| category    | string | Category (Technology, Design…)  |
| level       | string | Beginner/Intermediate/Advanced/Expert |
| description | string | Optional short note             |

---

#### Collection: `matches`
| Field           | Type          | Description                            |
|-----------------|---------------|----------------------------------------|
| matchId         | string        | Document ID = sorted UIDs joined by _  |
| users           | array<string> | [uid1, uid2]                           |
| initiator       | string        | UID of user who sent the request       |
| receiver        | string        | UID of user who received the request   |
| skillsExchange  | map           | { uid1: [skills], uid2: [skills] }     |
| status          | string        | "pending" / "accepted" / "rejected"    |
| sessions        | array<object> | Scheduled learning sessions            |
| createdAt       | timestamp     | Request creation time                  |
| updatedAt       | timestamp     | Last update time                       |

**Session Object (inside sessions array):**
| Field       | Type   | Description                          |
|-------------|--------|--------------------------------------|
| id          | string | Unique ID                            |
| matchId     | string | Parent match reference               |
| scheduledBy | string | UID of scheduler                     |
| dateTime    | string | ISO date-time string                 |
| duration    | number | Duration in minutes                  |
| topic       | string | Session topic                        |
| notes       | string | Additional notes                     |
| status      | string | "scheduled" / "completed" / "cancelled" |
| createdAt   | string | ISO timestamp                        |

---

#### Collection: `ratings`
| Field     | Type      | Description                         |
|-----------|-----------|-------------------------------------|
| targetUid | string    | UID of user being rated             |
| fromUid   | string    | UID of rater                        |
| matchId   | string    | Related match ID                    |
| rating    | number    | 1–5 star rating                     |
| feedback  | string    | Optional text feedback              |
| createdAt | timestamp | When rating was submitted           |

---

### Firebase Realtime Database Structure (Chat)

```
chats/
  {matchId}/
    {autoId}/
      senderId:   "uid123"
      senderName: "Rahul"
      text:       "Hey! Ready for our session?"
      timestamp:  1711234567890
```

---

## 🔧 Firebase Configuration Steps

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add Project" → name it "swapskills-in"
3. Enable Google Analytics (optional)
4. Click "Create Project"

### 2. Enable Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

### 3. Create Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose "Start in **test mode**" (for development)
3. Select region (asia-south1 for India)
4. Click "Enable"

### 4. Create Realtime Database
1. Go to **Realtime Database** → **Create Database**
2. Choose region → Start in **test mode**
3. Note the database URL (update `databaseURL` in firebase-app.js)

### 5. Firestore Security Rules (Production)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: read by anyone authenticated, write only own doc
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Matches: read/write if user is part of the match
    match /matches/{matchId} {
      allow read, write: if request.auth != null
        && request.auth.uid in resource.data.users;
      allow create: if request.auth != null;
    }

    // Ratings: anyone authed can create, read all
    match /ratings/{ratingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

### 6. Realtime Database Security Rules (Production)
```json
{
  "rules": {
    "chats": {
      "$matchId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### 7. Get Firebase Config
1. Go to **Project Settings** → **General** → **Your apps**
2. Click the Web icon (`</>`) to register a web app
3. Copy the `firebaseConfig` object
4. Update `assets/js/firebase-app.js` with your values

---

## 🚀 Deployment Instructions

### Option A: Firebase Hosting (Recommended)

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialise in project folder
cd SwapSkills
firebase init hosting

# When prompted:
#   Public directory → . (current directory)
#   Single-page app → No
#   Overwrite index.html → No

# 4. Deploy
firebase deploy --only hosting
```

Your site will be live at: `https://swapskills-in.web.app`

### Option B: Cloudflare Pages

1. Push project to a GitHub/GitLab repo
2. Go to https://dash.cloudflare.com → **Pages** → **Create a project**
3. Connect your repository
4. Set:
   - Build command: (leave blank, static site)
   - Output directory: `.`
5. Click "Save and Deploy"

### Option C: Local Development

Simply open `index.html` in a browser using a local server:

```bash
# Using Python
cd SwapSkills
python3 -m http.server 8080

# Using Node.js
npx serve .

# Then open http://localhost:8080
```

> **Note:** Firebase modules use ES imports, so you MUST serve over HTTP
> (not `file://`). A simple local server is required.

---

## 🔁 Matching Algorithm Explained

The core matching logic in `firebase-app.js → findMatches()`:

```
For each user B (where B ≠ current user A):
  iTeach    = A.skillsOffered ∩ B.skillsWanted
  theyTeach = B.skillsOffered ∩ A.skillsWanted

  IF iTeach is not empty AND theyTeach is not empty:
      → This is a valid peer-to-peer match
      → matchScore = |iTeach| + |theyTeach|

Results sorted by matchScore (descending).
```

This ensures **true bidirectional exchange** — both users get value.

---

## ✨ Bonus Features Included

1. **Search users by skill** — Search bar on matches page
2. **Dark mode** — Toggle button in header (persists via localStorage)
3. **Notification badges** — Pending match counts shown in tabs

---

## 📝 Google Apps Script (Optional Automation)

You can automate email notifications using Google Apps Script:

```javascript
// In Google Apps Script editor
function sendMatchNotification(email, matcherName, skills) {
  const subject = "🔁 New Skill Match on SwapSkills!";
  const body = `Hi! ${matcherName} wants to exchange skills with you.\n\n`
    + `Skills they can teach: ${skills.join(', ')}\n\n`
    + `Login to SwapSkills to accept: https://swapskills-in.web.app`;
  MailApp.sendEmail(email, subject, body);
}
```

Trigger this from a Firestore Cloud Function or a scheduled Apps Script.

---

## 🛠️ Tech Stack Summary

| Layer      | Technology                               |
|------------|------------------------------------------|
| Frontend   | HTML5, CSS3, Bootstrap 5, JavaScript ES6 |
| Styling    | Bootstrap + Custom CSS (swapskills.css)  |
| Backend    | Firebase Auth, Firestore, Realtime DB    |
| Hosting    | Firebase Hosting / Cloudflare Pages      |
| Automation | Google Apps Script (optional)            |

---

**Built for MCA Final Year Project — Beginner-friendly & Scalable**
