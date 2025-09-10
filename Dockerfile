# Use Python 3.10 as base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python script
COPY add2.py .

# Copy the synthetic-data-generator directory
COPY synthetic-data-generator/ ./synthetic-data-generator/

# Set working directory to synthetic-data-generator
WORKDIR /app/synthetic-data-generator

# Install Node.js dependencies
RUN npm install

# Create uploads directory
RUN mkdir -p uploads

# Expose ports
EXPOSE 4000 8000

# Create a startup script
RUN echo '#!/bin/bash\n\
# Start the backend server in the background\n\
node server.js &\n\
\n\
# Wait a moment for the server to start\n\
sleep 2\n\
\n\
# Start the React frontend\n\
npm start\n\
' > start.sh && chmod +x start.sh

# Set environment variables
ENV PORT=4000
ENV NODE_ENV=production

# Start the application
CMD ["./start.sh"]
