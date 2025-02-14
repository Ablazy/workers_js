// 转发腾讯云智能语言模型 API 请求，主要用于规避跨域问题
addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
});

// 配置项（建议通过环境变量设置）
const CONFIG = {
    // 启用密钥白名单验证（空数组表示不启用）
    ALLOWED_KEYS: [],

    // 强制路径前缀（如只允许 /v1/ 开头的接口）
    REQUIRE_API_PATH: true,

    // 启用请求日志
    ENABLE_LOGGING: true,
};

async function handleRequest(request) {
    // CORS 配置
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 处理预检请求
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // 配置参数
    const OPENAI_BASE = "https://api.lkeap.cloud.tencent.com";

    try {
        // 验证请求路径
        const url = new URL(request.url);
        if (CONFIG.REQUIRE_API_PATH && !url.pathname.startsWith("/v1/")) {
            throw new Error("API path must start with /v1/");
        }

        // 提取客户端 API 密钥
        const clientKey = request.headers.get("Authorization");
        if (!clientKey) {
            throw new Error("Missing Authorization header");
        }

        // 白名单验证（可选）
        if (CONFIG.ALLOWED_KEYS.length > 0) {
            const key = clientKey.replace("Bearer ", "");
            if (!CONFIG.ALLOWED_KEYS.includes(key)) {
                throw new Error("Unauthorized API key");
            }
        }

        // 构建 OpenAI 请求
        const targetUrl = `${OPENAI_BASE}${url.pathname}${url.search}`;
        const newHeaders = new Headers(request.headers);
        newHeaders.set("Host", "api.openai.com");

        // 转发请求日志（可选）
        if (CONFIG.ENABLE_LOGGING) {
            console.log(`Proxying request to: ${targetUrl}`);
        }

        // 发起请求
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: newHeaders,
            body: request.body,
        });

        // 构造响应
        const res = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: {
                    message: error.message,
                    type: "PROXY_ERROR",
                },
            }),
            {
                status: 401,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    }
}
