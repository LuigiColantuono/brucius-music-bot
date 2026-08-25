export async function handleBotApiRequest(
    req: Request,
    client: any,
): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log(`📡 [API Bridge] Request: ${method} ${path}`);

    // CORS headers per permettere alla dashboard (su altra porta/container) di chiamare il bot
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
        // --- 📊 SYSTEM HEALTH ---
        if (path === "/api/bot/system-health" && method === "GET") {
            const memoryUsage = process.memoryUsage();
            const mappedHealth = {
                system: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    memory: {
                        used: memoryUsage.rss, // Bytes
                        rss: memoryUsage.rss, // Bytes
                        heapUsed: memoryUsage.heapUsed, // Bytes
                    },
                    uptime: Math.round(process.uptime()),
                    env: process.env.NODE_ENV || "production",
                    runtimeName: (process as any).versions?.bun
                        ? "Bun"
                        : "Node.js",
                    runtimeVersion:
                        (process as any).versions?.bun || process.version,
                },
                bot: {
                    guilds: client.guilds.cache.size,
                    users: client.guilds.cache.reduce(
                        (acc: number, g: any) => acc + (g.memberCount || 0),
                        0,
                    ),
                    channels: client.channels.cache.size,
                    ping: client.ws.ping,
                    uptime: client.uptime,
                    status: client.user?.presence?.status || "online",
                    shards: client.ws.shards.size || 1,
                },
                shards:
                    client.ws.shards.size > 0
                        ? Array.from(client.ws.shards.values()).map(
                              (s: any) => ({
                                  id: s.id,
                                  status:
                                      s.status === 0
                                          ? "online"
                                          : "reconnecting",
                                  ping: s.ping,
                                  guilds: client.guilds.cache.filter(
                                      (g: any) => g.shardId === s.id,
                                  ).size,
                              }),
                          )
                        : [
                              {
                                  id: 0,
                                  status: "online",
                                  ping: client.ws.ping,
                                  guilds: client.guilds.cache.size,
                              },
                          ],
                database: {
                    connected: (client as any)?.database?.isConnected !== false,
                    type: "PostgreSQL",
                },
            };

            return new Response(JSON.stringify(mappedHealth), {
                headers: corsHeaders,
            });
        }

        // --- 📊 CLUSTER INFO ---
        if (path === "/api/bot/cluster-info" && method === "GET") {
            const clusterInfo = {
                id: 0,
                total: 1,
                shards:
                    client.ws.shards.size > 0
                        ? Array.from(client.ws.shards.keys())
                        : [0],
                totalShards: client.ws.shards.size || 1,
                uptime: Math.round(process.uptime()),
                memoryUsage: process.memoryUsage().rss,
            };
            return new Response(JSON.stringify(clusterInfo), {
                headers: corsHeaders,
            });
        }

        // --- 📊 ALL SHARD STATS ---
        if (path === "/api/bot/all-shard-stats" && method === "GET") {
            const shardStats =
                client.ws.shards.size > 0
                    ? Array.from(client.ws.shards.values()).map((s: any) => ({
                          id: s.id,
                          status: s.status === 0 ? "online" : "reconnecting",
                          ping: s.ping,
                          guilds: client.guilds.cache.filter(
                              (g: any) => g.shardId === s.id,
                          ).size,
                          uptime: client.uptime,
                      }))
                    : [
                          {
                              id: 0,
                              status: "online",
                              ping: client.ws.ping,
                              guilds: client.guilds.cache.size,
                              uptime: client.uptime,
                          },
                      ];
            return new Response(JSON.stringify(shardStats), {
                headers: corsHeaders,
            });
        }

        // --- 📊 STATS ENDPOINT ---
        if (path === "/api/bot/stats" && method === "GET") {
            const stats = {
                guilds: client?.guilds?.cache?.size || 0,
                users:
                    client?.guilds?.cache?.reduce(
                        (acc: number, g: any) => acc + (g.memberCount || 0),
                        0,
                    ) || 0,
                uptime: client?.uptime || 0,
                ping: client?.ws?.ping || 0,
                commands: (client as any)?.commands?.size || 0,
                status: client?.user?.presence?.status || "online",
                shards: client?.ws?.shards?.size || 1,
            };
            return new Response(JSON.stringify(stats), {
                headers: corsHeaders,
            });
        }

        // --- 📊 LAVALINK NODES ---
        if (
            (path === "/api/bot/lavalink-nodes" ||
                path === "/api/lavalink/nodes") &&
            method === "GET"
        ) {
            const shoukaku =
                (client as any)?.audio?.kazagumo?.shoukaku ||
                (client as any)?.shoukaku ||
                (client as any)?.kazagumo?.shoukaku;

            if (!shoukaku) {
                return new Response(JSON.stringify([]), {
                    headers: corsHeaders,
                });
            }

            const formatUptimeLocal = (seconds: number): string => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                return `${days}d ${hours}h`;
            };

            const nodes = Array.from(shoukaku.nodes.values()).map(
                (node: any) => ({
                    id: node.name,
                    name: node.name,
                    connected: node.state === 1,
                    players: node.stats?.players || 0,
                    cpu: Math.round((node.stats?.cpu?.lavalinkLoad || 0) * 100),
                    memory: `${Math.round((node.stats?.memory?.used || 0) / 1024 / 1024)}MB`,
                    uptime: formatUptimeLocal(
                        Math.round((node.stats?.uptime || 0) / 1000),
                    ),
                }),
            );

            return new Response(JSON.stringify(nodes), {
                headers: corsHeaders,
            });
        }

        // --- 🏢 GUILDS ENDPOINT ---
        if (path === "/api/bot/guilds" && method === "GET") {
            const guilds = client.guilds.cache.map((guild: any) => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                icon: guild.iconURL(),
                owner: guild.ownerId,
            }));
            return new Response(
                JSON.stringify({ type: "guilds", data: guilds }),
                { headers: corsHeaders },
            );
        }

        return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: corsHeaders,
        });
    } catch (error: any) {
        console.error("❌ Bot API Bridge Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
        });
    }
}
