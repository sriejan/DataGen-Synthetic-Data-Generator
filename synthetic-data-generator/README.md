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

- Node.js (v14+)
- Python 3.7+ (for backend)
- pip (for installing Python dependencies)

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

1. Start the backend server:
```
python app.py
```

2. Start the React development server:
```
npm start
```

3. Open your browser and navigate to `http://localhost:4000`

## Backend API

The frontend communicates with a Flask API backend that handles:

- Data generation via Gemini 2.0 Flash
- Model training with SDV library
- Data transformations
- File processing

## Development Notes

- Backend API runs on port 5000
- Frontend development server runs on port 4000
- The frontend proxy configuration is set up to forward API requests to the backend

## License

MIT
