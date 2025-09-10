@echo off
REM Synthetic Data Generator Docker Build Script for Windows

setlocal enabledelayedexpansion

echo 🚀 Building Synthetic Data Generator Docker Images...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] docker-compose is not installed. Please install it and try again.
    exit /b 1
)

REM Parse command line arguments
set BUILD_TYPE=all
set DETACHED=false
set CLEAN=false

:parse_args
if "%~1"=="" goto :build
if "%~1"=="--frontend-only" (
    set BUILD_TYPE=frontend
    shift
    goto :parse_args
)
if "%~1"=="--backend-only" (
    set BUILD_TYPE=backend
    shift
    goto :parse_args
)
if "%~1"=="--detached" (
    set DETACHED=true
    shift
    goto :parse_args
)
if "%~1"=="-d" (
    set DETACHED=true
    shift
    goto :parse_args
)
if "%~1"=="--clean" (
    set CLEAN=true
    shift
    goto :parse_args
)
if "%~1"=="--help" goto :help
if "%~1"=="-h" goto :help
echo [ERROR] Unknown option: %~1
exit /b 1

:help
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   --frontend-only    Build only the frontend container
echo   --backend-only     Build only the backend container
echo   --detached, -d     Run containers in detached mode
echo   --clean            Clean up before building
echo   --help, -h         Show this help message
exit /b 0

:build
REM Clean up if requested
if "%CLEAN%"=="true" (
    echo [INFO] Cleaning up existing containers and images...
    docker-compose down -v --remove-orphans 2>nul
    docker system prune -f
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "synthetic-data-generator\uploads" mkdir "synthetic-data-generator\uploads"

REM Build and run based on type
if "%BUILD_TYPE%"=="frontend" (
    echo [INFO] Building frontend container...
    docker-compose build frontend
    
    if "%DETACHED%"=="true" (
        echo [INFO] Starting frontend in detached mode...
        docker-compose up -d frontend
    ) else (
        echo [INFO] Starting frontend...
        docker-compose up frontend
    )
) else if "%BUILD_TYPE%"=="backend" (
    echo [INFO] Building backend container...
    docker-compose build backend
    
    if "%DETACHED%"=="true" (
        echo [INFO] Starting backend in detached mode...
        docker-compose up -d backend
    ) else (
        echo [INFO] Starting backend...
        docker-compose up backend
    )
) else (
    echo [INFO] Building all containers...
    docker-compose build
    
    if "%DETACHED%"=="true" (
        echo [INFO] Starting all services in detached mode...
        docker-compose up -d
    ) else (
        echo [INFO] Starting all services...
        docker-compose up
    )
)

echo [INFO] Build completed successfully! 🎉
echo [INFO] Frontend: http://localhost:4000
echo [INFO] Backend: http://localhost:8000
echo [INFO] Health Check: http://localhost:8000/health

if "%DETACHED%"=="true" (
    echo [INFO] Containers are running in the background.
    echo [INFO] Use 'docker-compose logs -f' to view logs.
    echo [INFO] Use 'docker-compose down' to stop containers.
)

endlocal
