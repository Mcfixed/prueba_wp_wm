module.exports = {
  apps: [
    {
      name: 'whatsapp-manager',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/developer/prueba_wp_wm',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
      },
      // Reinicio automático si se cuelga
      autorestart: true,
      // Archivo de logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      // Esperar 5s antes de reiniciar
      restart_delay: 5000,
      // Máximo 10 reinicios en 60s (evita loops)
      max_restarts: 10,
      min_uptime: 10000,
    },
  ],
};
