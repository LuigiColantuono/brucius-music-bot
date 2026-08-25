module.exports = {
  apps: [
    {
      name: "brucius-bridge",
      script: "src/server.ts",
      interpreter: "bun",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "brucius-bot",
      script: "src/main.ts",
      interpreter: "bun",
      depends_on: ["brucius-bridge"],
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
