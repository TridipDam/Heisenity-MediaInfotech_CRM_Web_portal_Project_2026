#!/bin/bash

# Database management script for Docker MySQL

case "$1" in
  start)
    echo "Starting MySQL container..."
    docker-compose up -d mysql
    echo "MySQL is starting up. Wait a few seconds for it to be ready."
    ;;
  stop)
    echo "Stopping MySQL container..."
    docker-compose down
    ;;
  restart)
    echo "Restarting MySQL container..."
    docker-compose restart mysql
    ;;
  logs)
    echo "Showing MySQL logs..."
    docker-compose logs -f mysql
    ;;
  connect)
    echo "Connecting to MySQL..."
    docker exec -it prisma-mysql mysql -u prisma_user -pprisma_password prisma_db
    ;;
  reset)
    echo "Resetting database (this will delete all data)..."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      docker-compose up -d mysql
      echo "Database reset complete."
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|connect|reset}"
    echo ""
    echo "Commands:"
    echo "  start   - Start MySQL container"
    echo "  stop    - Stop MySQL container"
    echo "  restart - Restart MySQL container"
    echo "  logs    - Show MySQL logs"
    echo "  connect - Connect to MySQL CLI"
    echo "  reset   - Reset database (deletes all data)"
    exit 1
    ;;
esac