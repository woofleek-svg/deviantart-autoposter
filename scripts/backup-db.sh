#!/bin/bash

# MySQL Database Backup Script
# Art Gallery Cross-Post System

# Load environment variables
if [ -f "./backend/.env" ]; then
    export $(cat ./backend/.env | xargs)
fi

# Set defaults
DB_HOST=${DB_HOST:-mysql-db}
DB_NAME=${DB_NAME:-artwork_tracker}
DB_USER=${DB_USER:-artwork_user}
BACKUP_DIR=${BACKUP_DIR:-./backups}

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/artwork_tracker_backup_$TIMESTAMP.sql"

echo "🗃️  Starting MySQL backup..."
echo "📅 Timestamp: $TIMESTAMP"
echo "📁 Backup file: $BACKUP_FILE"

# Create the backup using docker exec
if docker ps | grep -q art-crosspost-mysql; then
    # Using docker exec to run mysqldump inside the container
    docker exec -e MYSQL_PWD="$DB_PASSWORD" art-crosspost-mysql mysqldump \
        -u "$DB_USER" \
        --single-transaction \
        --routines \
        --triggers \
        "$DB_NAME" > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✅ Backup completed successfully!"
        echo "📊 Backup size: $(du -h $BACKUP_FILE | cut -f1)"

        # Keep only the last 7 backups
        echo "🧹 Cleaning up old backups (keeping last 7)..."
        ls -t $BACKUP_DIR/artwork_tracker_backup_*.sql | tail -n +8 | xargs -r rm

        echo "📝 Available backups:"
        ls -lh $BACKUP_DIR/artwork_tracker_backup_*.sql | tail -7
    else
        echo "❌ Backup failed!"
        exit 1
    fi
else
    echo "❌ MySQL container 'art-crosspost-mysql' not found or not running!"
    echo "   Please make sure the MySQL service is running: docker-compose up mysql-db"
    exit 1
fi

echo "🎉 Backup process completed!"