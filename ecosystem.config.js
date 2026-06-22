module.exports = {
  apps: [
    {
      name: "mozopost-api",
      cwd: "./apps/api",
      script: "npm",
      args: "start",
      env: {
        PORT: 4001,
        NODE_ENV: "production"
      }
    },
    {
      name: "mozopost-seller",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        PORT: 4000,
        NEXT_PUBLIC_APP_ROLE: "seller"
      }
    },
    {
      name: "mozopost-admin",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        PORT: 4002,
        NEXT_PUBLIC_APP_ROLE: "admin"
      }
    },
    {
      name: "mozopost-superadmin",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        PORT: 4003,
        NEXT_PUBLIC_APP_ROLE: "superadmin"
      }
    }
  ]
};
