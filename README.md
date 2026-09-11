# Guru OS - Learning Tracker

A full-stack MERN application inspired by TakeUforward (TUF) for tracking learning progress across any subject.

## Features

- **Universal Vault**: Create any subject (DSA, System Design, French, etc.)
- **3-Level Architecture**: Dashboard → Sheet → Question Detail
- **TUF-Style UI**: Clean accordion layout with checkbox tracking
- **AI Content Generation**: Prompt-to-parse system for auto-populating content
- **3-Level PDF Export**: Question-wise, Topic-wise, Subject-wise
- **Checkbox Progress Tracking**: Mark questions as Done/In Progress/Revisit

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- CORS enabled
- RESTful API

### Frontend
- React 18 + Vite
- React Router DOM
- Tailwind CSS
- Lucide React Icons
- jsPDF + html2canvas for PDF generation
- Axios for API calls

## Project Structure

```
guru-os-tracker/
├── backend/
│   ├── server.js              # Express server entry
│   ├── .env                   # Environment variables (MongoDB URI)
│   ├── package.json
│   ├── models/
│   │   ├── Subject.js         # Subject schema
│   │   ├── Topic.js           # Topic schema
│   │   ├── Question.js        # Question schema
│   │   └── Progress.js        # Progress/Revision schema
│   └── routes/
│       ├── subjects.js        # Subject CRUD + progress
│       ├── topics.js          # Topic CRUD
│       └── questions.js       # Question CRUD + status
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env
    ├── package.json
    └── src/
        ├── main.jsx           # React entry
        ├── App.jsx            # Router setup
        ├── index.css          # Tailwind + custom styles
        ├── context/
        │   └── AppContext.jsx # Global state management
        ├── utils/
        │   ├── api.js         # API calls (Axios)
        │   └── pdfGenerator.js # PDF generation logic
        ├── components/
        │   ├── Navbar.jsx
        │   ├── SubjectCard.jsx
        │   ├── ProgressBar.jsx
        │   ├── Accordion.jsx
        │   ├── QuestionRow.jsx
        │   ├── ParserModal.jsx
        │   └── AddSubjectModal.jsx
        └── pages/
            ├── Dashboard.jsx   # Level 1: Vault
            ├── Sheet.jsx       # Level 2: Topic Accordion
            └── QuestionPage.jsx # Level 3: Detail View
```

## Setup Instructions

### 1. Clone & Navigate
```bash
cd guru-os-tracker
```

### 2. Backend Setup
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
```

### 3. Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

### 4. Environment Variables

Backend `.env`:
```
PORT=5000
MONGO_URI=mongodb+srv://tracker:AFi9CMdJBFVJYCDz@cluster0.6r61dar.mongodb.net/guruos?retryWrites=true&w=majority&appName=Cluster0
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/subjects | Get all subjects with progress |
| GET | /api/subjects/:id | Get subject with topics |
| POST | /api/subjects | Create new subject |
| PUT | /api/subjects/:id | Update subject |
| DELETE | /api/subjects/:id | Delete subject (cascade) |
| GET | /api/topics/subject/:subjectId | Get topics by subject |
| GET | /api/topics/:id | Get topic with questions |
| POST | /api/topics | Create topic |
| PUT | /api/topics/:id | Update topic |
| DELETE | /api/topics/:id | Delete topic |
| GET | /api/questions/topic/:topicId | Get questions by topic |
| GET | /api/questions/:id | Get single question |
| POST | /api/questions | Create question |
| PUT | /api/questions/:id | Update question (status) |
| PUT | /api/questions/:id/content | Update question content |
| DELETE | /api/questions/:id | Delete question |
| POST | /api/questions/bulk | Bulk create questions |

## Routes

| Route | Page | Description |
|-------|------|-------------|
| / | Dashboard | Bento grid of subjects |
| /sheet/:subjectId | Sheet | Accordion topics + questions |
| /question/:questionId | QuestionPage | Detail view + parser |

## Key Features Explained

### Checkbox Tracking
- Click checkbox on any question row to mark Done
- Status options: Not Started, In Progress, Done, Revisit
- Auto-updates progress bars at all levels

### AI Content Generation (Parser Modal)
1. Click "Generate Content" on any question
2. Copy pre-written prompt
3. Paste in ChatGPT/Claude
4. Copy AI response back
5. App auto-parses Approach, Code, Complexity

### PDF Export (3 Levels)
1. **Question-wise**: Each row has download button
2. **Topic-wise**: Accordion header has download button
3. **Subject-wise**: Sheet page has "Master PDF" button

## Demo Data

If MongoDB is not connected, the app falls back to demo data:
- DSA subject with 3 topics
- 7 sample questions with content
- All features work with local state

## Future Enhancements

- [ ] User authentication (JWT)
- [ ] Spaced repetition algorithm
- [ ] Playlist mode for daily revision
- [ ] Cloud sync
- [ ] Mobile app (React Native)
- [ ] AI integration (direct API calls)
