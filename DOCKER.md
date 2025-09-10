# Docker Setup for Synthetic Data Generator

This document explains how to run the Synthetic Data Generator application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually comes with Docker Desktop)

## Quick Start

### Option 1: Single Container (All-in-One)

```bash
# Build and run the application
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start both the frontend and backend in a single container.

### Option 2: Multi-Container (Recommended for Production)

```bash
# Build and run with separate containers
docker-compose up --build frontend backend

# Or run in detached mode
docker-compose up -d --build frontend backend
```

This approach separates the frontend and backend into different containers for better scalability and maintenance.

## Accessing the Application

- **Frontend**: http://localhost:4000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

## Docker Commands

### Building Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build frontend
docker-compose build backend
```

### Running Containers

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up frontend
docker-compose up backend

# Start in background
docker-compose up -d
```

### Managing Containers

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs
docker-compose logs frontend
docker-compose logs backend

# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Debugging

```bash
# Access container shell
docker-compose exec frontend sh
docker-compose exec backend bash

# View container logs
docker-compose logs -f backend
```

## Environment Variables

You can customize the application using environment variables:

```bash
# Create a .env file
echo "NODE_ENV=production" > .env
echo "PORT=4000" >> .env
echo "REACT_APP_API_URL=http://localhost:8000" >> .env
```

## Volumes

The application uses volumes for:

- **Uploads**: `./synthetic-data-generator/uploads` - Stores uploaded files and generated data
- **Python Script**: `./add2.py` - The main Python script for AI processing

## Production Deployment

### Using Docker Compose

1. **Prepare your environment**:
   ```bash
   # Clone the repository
   git clone <your-repo>
   cd DataGen
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Deploy**:
   ```bash
   # Build and start
   docker-compose up -d --build
   
   # Check status
   docker-compose ps
   ```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml synthetic-data-gen

# Check services
docker service ls
```

### Using Kubernetes

You can convert the docker-compose.yml to Kubernetes manifests:

```bash
# Install kompose
# https://kubernetes.io/docs/tasks/configure-pod-container/translate-compose-kubernetes/

# Convert
kompose convert

# Deploy
kubectl apply -f .
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :4000
   netstat -tulpn | grep :8000
   
   # Kill the process or change ports in docker-compose.yml
   ```

2. **Permission Issues**:
   ```bash
   # Fix uploads directory permissions
   sudo chown -R $USER:$USER synthetic-data-generator/uploads/
   ```

3. **API Key Issues**:
   - Make sure the API key in `add2.py` is valid
   - Check the logs: `docker-compose logs backend`

4. **Memory Issues**:
   ```bash
   # Increase Docker memory limit
   # In Docker Desktop: Settings > Resources > Memory
   ```

### Logs

```bash
# View all logs
docker-compose logs

# Follow logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks

The backend includes a health check endpoint:

```bash
# Check if backend is healthy
curl http://localhost:8000/health

# Expected response:
# {"status":"OK","timestamp":"2024-01-01T00:00:00.000Z"}
```

## Development

### Local Development with Docker

```bash
# Start only the backend
docker-compose up backend

# Run frontend locally
cd synthetic-data-generator
npm start
```

### Hot Reloading

For development with hot reloading, you can mount the source code:

```yaml
# Add to docker-compose.yml
volumes:
  - ./synthetic-data-generator/src:/app/synthetic-data-generator/src
  - ./add2.py:/app/add2.py
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use .env files for sensitive data
3. **Network**: Consider using Docker networks for service isolation
4. **Volumes**: Be careful with volume permissions

## Performance Optimization

1. **Multi-stage Builds**: Use multi-stage builds to reduce image size
2. **Caching**: Leverage Docker layer caching
3. **Resource Limits**: Set appropriate CPU and memory limits
4. **Health Checks**: Implement proper health checks

## Monitoring

Consider adding monitoring tools:

- **Prometheus + Grafana**: For metrics
- **ELK Stack**: For logging
- **Docker Stats**: For container metrics

```bash
# View container stats
docker stats

# View resource usage
docker-compose top
```
