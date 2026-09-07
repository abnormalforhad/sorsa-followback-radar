# Sorsa Follow-Back Radar 📡

> Discover high Sorsa Score accounts on X (Twitter) that reciprocate follows. Cinematic, client-side intelligence radar with zero backend dependencies.

![Sorsa Follow-Back Radar Preview](./public/vite.svg)

## Features

- **Follow-Back Intelligence**: Identifies high-reputation X accounts with favorable following-to-follower ratios (≥60–85% reciprocity).
- **Client-Side & Private**: Users provide their own Sorsa API key. Keys are persisted in the browser's `localStorage` and never transmitted to any third-party server.
- **Quota Optimized**: Engineered for conservative API budgets (smart endpoint routing, key usage tracking, and batch score lookups).
- **Cinematic Oceanic UI**: Ambient video background, glassmorphic controls, and an expandable real-time data matrix.
- **One-Click Export**: Export discovered candidates, Sorsa scores, and follow ratios directly to CSV.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Sorsa API Key from [api.sorsa.io](https://api.sorsa.io)

### Installation

```bash
# Clone the repository
git clone https://github.com/abnormalforhad/sorsa-followback-radar.git

# Enter the project directory
cd sorsa-followback-radar

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Use

1. Enter your **Sorsa API Key** (stored locally in your browser).
2. Enter any **Target X Handle** (e.g., `VitalikButerin`).
3. Click **Scan Network Radar**.
4. The matrix will traverse:
   - Sorsa API quota balance check.
   - Target account profile lookup.
   - Top scoring followers & following accounts.
   - Computed follow-back reciprocity ratio.
5. Filter by **Score**, **FB Ratio**, or **Followers**, and export results to **CSV**.

## Tech Stack

- **Vite**
- **Vanilla Modern JavaScript (ES Modules)**
- **Vanilla CSS3** (Custom glassmorphic design system)
- **Sorsa API v3**

## License

MIT License
