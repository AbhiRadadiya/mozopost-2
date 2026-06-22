module.exports = {
  apps: [
    {
      name: "mozopost-api",
      cwd: "./apps/api",
      script: "npm",
      args: "start",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    },
    {
      name: "mozopost-seller",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        PORT: 3000,
        NEXT_PUBLIC_APP_ROLE: "seller"
      }
    },
    {
      name: "mozopost-admin",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        PORT: 3002,
        NEXT_PUBLIC_APP_ROLE: "admin"
      }
    },
    {
      name: "mozopost-superadmin",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        PORT: 3003,
        NEXT_PUBLIC_APP_ROLE: "superadmin"
      }
    }
  ]
};
