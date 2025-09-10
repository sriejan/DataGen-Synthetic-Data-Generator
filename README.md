# DataGen - Synthetic Data Generator

A full-stack application for generating synthetic data using AI models.

## Project Structure

```
DataGen/
├── synthetic-data-generator/     # Main application
│   ├── src/                      # React frontend source
│   ├── public/                   # Static assets
│   ├── server.js                 # Backend server
│   ├── uploads/                  # Generated data files
│   └── package.json              # Frontend dependencies
├── Dockerfile                    # Main Docker configuration
├── Dockerfile.backend           # Backend Docker configuration
├── Dockerfile.frontend          # Frontend Docker configuration
├── docker-compose.yml           # Docker Compose setup
├── requirements.txt             # Python dependencies
└── env.example                  # Environment variables template
```

## Quick Start

### Using Docker (Recommended)
1. Copy `env.example` to `.env` and configure your settings
2. Run: `docker-compose up --build`

### Manual Setup
1. **Backend**: Install Python dependencies from `requirements.txt`
2. **Frontend**: Navigate to `synthetic-data-generator/` and run `npm install`
3. Start the backend server: `node server.js`
4. Start the frontend: `npm start`

## Features

- Upload and configure datasets
- Generate synthetic data using AI models
- Real-time data visualization
- Export results in multiple formats

## Requirements

- Node.js 16+
- Python 3.8+
- Docker (optional)

## License

MIT License
