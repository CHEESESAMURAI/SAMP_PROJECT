module.exports = {
  apps: [
    {
      name: 'wild-backend',
      script: 'python3',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000',
      cwd: '/root/WILD_BOT_9/web-dashboard/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: '/root/WILD_BOT_9/logs/backend-error.log',
      out_file: '/root/WILD_BOT_9/logs/backend-out.log',
      log_file: '/root/WILD_BOT_9/logs/backend-combined.log',
      time: true
    },
    {
      name: 'wild-frontend',
      script: 'serve',
      args: '-s build -l 3000',
      cwd: '/root/WILD_BOT_9/wild-analytics-web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/WILD_BOT_9/logs/frontend-error.log',
      out_file: '/root/WILD_BOT_9/logs/frontend-out.log',
      log_file: '/root/WILD_BOT_9/logs/frontend-combined.log',
      time: true
    }
  ]
};





