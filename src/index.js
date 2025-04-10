export default {
  async fetch(request) {
    return handleRequest(request);
  },


	// 定时任务
	// async scheduled(controller, env, ctx) {
	// 	const res = await calcCount("000158", 5);
	// 	console.log(res);
	// },
};

async function handleRequest(request) {
  const url = new URL(request.url);
  const { searchParams } = url;

  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // 获取参数 `code` 和 `days`，默认值：code=000158, days=5
  const code = searchParams.get("code") || "000158";
  const days = parseInt(searchParams.get("days") || "5", 10);
  try {
    const res = await calcCount(code, days);
    res.str = Object.keys(res.info).map((key) => `${key}: ${res.info[key]}`).join("\n");

    console.log('res===>', res);
   // 返回 JSON 响应，并添加 CORS 头
   return new Response(JSON.stringify(res), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",  // 允许所有域访问（你可以改成指定域名）
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
  } catch (error) {
    console.log('error===>', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
}

// 计算某股票过去 `days` 天的帖子数量
async function calcCount(code, days = 5) {
  let page = 1;
  const res = {
    info: {},
  };
  const targetDay = new Date();
  targetDay.setDate(targetDay.getDate() - days);
  const targetDateStr = targetDay.toISOString().slice(0, 10).replace(/-/g, ""); // 格式化 YYYYMMDD

  while (true) {
    const { list, bar_info } = await getGubaCount(code, page++);
    if (!list || list.length === 0) break; // 没有数据就停止

    if (!res.bar_info) {
      res.bar_info = bar_info
    }

    for (const item of list) {
      const postDay = new Date(item.post_last_time).toISOString().slice(0, 10).replace(/-/g, "");

      if (postDay <= targetDateStr) {
        return res; // 如果已经到目标日期，直接返回结果
      }

      res.info[postDay] = (res.info[postDay] || 0) + 1;
    }
  }
  return res;
}

// 获取股票帖子数据
async function getGubaCount(code = "301366", page = 1) {
  const apiUrl = `https://gbapi.eastmoney.com/webarticlelist/api/Article/WebArticleList?code=${code}&p=${page}&ps=500&sorttype=0&plat=wap&version=300&product=guba&deviceid=1`;

  const response = await fetch(apiUrl, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  const data = await response.json();
  const list = (data.re || []).filter(item => ![1, 2, 3, 11].includes(item.post_type));

  return {
    list,
    bar_info: {
      OuterCode: data.bar_info?.OuterCode || "",
      ShowCode: data.bar_info?.ShowCode || "",
      ShortName: data.bar_info?.ShortName || "",
      QMarket: data.bar_info?.QMarket || "",
      QCode: data.bar_info?.QCode || "",
    }
  }
}
