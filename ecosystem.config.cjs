module.exports = {
    apps: [
      {
        name: 'pxrecycle',
        cwd: '/home/ubuntu/pxrecycle/current',
        script: 'node_modules/next/dist/bin/next',
        args: 'start -p 3000',
        env: {
          NODE_ENV: 'production'
        }
      }
    ]
  };