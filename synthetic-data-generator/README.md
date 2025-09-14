# Business DataGen

A modern React frontend for generating high-quality synthetic data using AI models and deep learning techniques.

## Features

- Generate synthetic data from text prompts using AI
- Upload existing datasets (Excel, CSV)
- Configure column types and primary keys
- Train different synthetic data generation models (CTGAN, TVAE, CopulaGAN)
- Visualize and compare distributions between original and synthetic data
- Statistical analysis of data quality
- Download synthetic data in different formats

## Tech Stack

- React with TypeScript
- Material UI for components
- Chart.js for data visualization
- Axios for API communication

## Getting Started

### Prerequisites

- Node.js (v18 or v20)
- Python 3.8+
- pip

### Installation
1. Clone the repository:
```
git clone <repository-url>
cd synthetic-data-generator
```

2. Install frontend dependencies:
```
npm install
```

3. Setup backend (from repository root):
```
pip install -r requirements.txt
```

### Running the Application

From `synthetic-data-generator/` in two terminals:

1) Backend (Node + Python CLI):
```
node server.js
```

2) Frontend (CRA dev server on port 4000):
```
npm start
```

Then open `http://localhost:4000`.

## Backend API

The frontend talks to a Node/Express server (`server.js`, port 8000). The Node server shells out to a Python CLI (`../add2.py`) for:

- Data generation (offline fallback if Gemini not configured)
- Model training with SDV (CTGAN/TVAE/CopulaGAN)
- File processing (CSV/XLSX)
- Safe (no-op) transformations

## Development Notes

- Backend API runs on port 8000
- Frontend dev server runs on port 4000
- The frontend `proxy` forwards to `http://localhost:8000`

## License

MIT
