@echo off

if "%1"=="start" (
    echo Starting MySQL container...
    docker-compose up -d mysql
    echo MySQL is starting up. Wait a few seconds for it to be ready.
    goto :eof
)

if "%1"=="stop" (
    echo Stopping MySQL container...
    docker-compose down
    goto :eof
)

if "%1"=="restart" (
    echo Restarting MySQL container...
    docker-compose restart mysql
    goto :eof
)

if "%1"=="logs" (
    echo Showing MySQL logs...
    docker-compose logs -f mysql
    goto :eof
)

if "%1"=="connect" (
    echo Connecting to MySQL...
    docker exec -it prisma-mysql mysql -u prisma_user -pprisma_password prisma_db
    goto :eof
)

if "%1"=="reset" (
    echo Resetting database (this will delete all data)...
    set /p confirm="Are you sure? (y/N): "
    if /i "%confirm%"=="y" (
        docker-compose down -v
        docker-compose up -d mysql
        echo Database reset complete.
    )
    goto :eof
)

echo Usage: %0 {start^|stop^|restart^|logs^|connect^|reset}
echo.
echo Commands:
echo   start   - Start MySQL container
echo   stop    - Stop MySQL container
echo   restart - Restart MySQL container
echo   logs    - Show MySQL logs
echo   connect - Connect to MySQL CLI
echo   reset   - Reset database (deletes all data)