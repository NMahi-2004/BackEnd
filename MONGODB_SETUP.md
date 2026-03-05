# MongoDB Setup Instructions

## Option 1: Local MongoDB Installation

### Windows:
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install MongoDB following the installer instructions
3. Start MongoDB service:
   ```bash
   net start MongoDB
   ```
4. Verify installation:
   ```bash
   mongo --version
   ```

### macOS (using Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### Linux (Ubuntu/Debian):
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

## Option 2: MongoDB Atlas (Cloud - Recommended)

1. **Create Account:**
   - Go to https://www.mongodb.com/atlas
   - Sign up for a free account

2. **Create Cluster:**
   - Click "Build a Database"
   - Choose "FREE" tier
   - Select a cloud provider and region
   - Click "Create Cluster"

3. **Setup Database Access:**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password
   - Set role to "Atlas Admin" or "Read and write to any database"

4. **Setup Network Access:**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or add your specific IP address

5. **Get Connection String:**
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

6. **Update .env file:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lms_database?retryWrites=true&w=majority
   ```

## Option 3: Docker (Quick Setup)

```bash
# Run MongoDB in Docker container
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Stop container
docker stop mongodb

# Start existing container
docker start mongodb
```

## After MongoDB Setup:

1. **Update your .env file** with the correct MongoDB URI
2. **Start the backend server:**
   ```bash
   npm run dev
   ```
3. **Seed the admin user:**
   ```bash
   npm run seed:admin
   ```

## Test Connection:

Visit: http://localhost:5000/api/health

You should see:
```json
{
  "success": true,
  "message": "LMS Backend API is running",
  "timestamp": "2024-01-27T...",
  "environment": "development"
}
```

## Default Admin Credentials:

After seeding:
- **Username:** admin
- **Password:** admin123
- **Email:** admin@lms.com
- **Role:** admin