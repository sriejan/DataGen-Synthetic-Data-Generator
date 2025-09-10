#!/bin/bash

# Synthetic Data Generator Docker Build Script

set -e

echo "🚀 Building Synthetic Data Generator Docker Images..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Parse command line arguments
BUILD_TYPE="all"
DETACHED=false
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend-only)
            BUILD_TYPE="frontend"
            shift
            ;;
        --backend-only)
            BUILD_TYPE="backend"
            shift
            ;;
        --detached|-d)
            DETACHED=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --frontend-only    Build only the frontend container"
            echo "  --backend-only     Build only the backend container"
            echo "  --detached, -d     Run containers in detached mode"
            echo "  --clean            Clean up before building"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Clean up if requested
if [ "$CLEAN" = true ]; then
    print_status "Cleaning up existing containers and images..."
    docker-compose down -v --remove-orphans 2>/dev/null || true
    docker system prune -f
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p synthetic-data-generator/uploads

# Set permissions
print_status "Setting permissions..."
chmod 755 synthetic-data-generator/uploads

# Build and run based on type
case $BUILD_TYPE in
    "frontend")
        print_status "Building frontend container..."
        docker-compose build frontend
        
        if [ "$DETACHED" = true ]; then
            print_status "Starting frontend in detached mode..."
            docker-compose up -d frontend
        else
            print_status "Starting frontend..."
            docker-compose up frontend
        fi
        ;;
    "backend")
        print_status "Building backend container..."
        docker-compose build backend
        
        if [ "$DETACHED" = true ]; then
            print_status "Starting backend in detached mode..."
            docker-compose up -d backend
        else
            print_status "Starting backend..."
            docker-compose up backend
        fi
        ;;
    "all")
        print_status "Building all containers..."
        docker-compose build
        
        if [ "$DETACHED" = true ]; then
            print_status "Starting all services in detached mode..."
            docker-compose up -d
        else
            print_status "Starting all services..."
            docker-compose up
        fi
        ;;
esac

print_status "Build completed successfully! 🎉"
print_status "Frontend: http://localhost:4000"
print_status "Backend: http://localhost:8000"
print_status "Health Check: http://localhost:8000/health"

if [ "$DETACHED" = true ]; then
    print_status "Containers are running in the background."
    print_status "Use 'docker-compose logs -f' to view logs."
    print_status "Use 'docker-compose down' to stop containers."
fi
