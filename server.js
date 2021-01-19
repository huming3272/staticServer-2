var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/
  const session = JSON.parse(fs.readFileSync('./session.json').toString())
  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);
  if (path === "/sign_in" && method === "POST") {
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on("data", (chunk) => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string); // name password
      const user = userArray.find(
        (user) => user.name === obj.name && user.password === obj.password
        //寻找符合条件的用户名和密码
      );
      if (user === undefined) {
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json; charset=utf-8");
        // 如果找不到用户名就返回400
      } else {
        response.statusCode = 200;
        const random = Math.random();
        session[random] = { user_id: user.id };
        // 生成一个随机数对应用户名，免得cookie被人揣测修改
        fs.writeFileSync("./session.json", JSON.stringify(session));
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
      }
      response.end();
    });
  } else if (path === "/home.html") {
    // 不用cookie写不出来
    const cookie = request.headers["cookie"];
    //从header里得到cookie
    let sessionId;
    try {
      sessionId = cookie
        .split(";")
        .filter((s) => s.indexOf("session_id=") >= 0)[0]
        .split("=")[1];
        // 得到用户id之后把它作为用户名写到页面里 
    } catch (error) {}
    if (sessionId && session[sessionId]) {
      const userId = session[sessionId].user_id;
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
      const user = userArray.find((user) => user.id === userId);
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      let string = "";
      if (user) {
        string = homeHtml
          .replace("{{loginStatus}}", "已登录")
          .replace("{{user.name}}", user.name);
      }
      // 读取home页面然后把页面中的关键字替换
      response.write(string);
    } else {
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml
        .replace("{{loginStatus}}", "未登录")
        .replace("{{user.name}}", "");
      response.write(string);
    }
    response.end();
  } else if (path === "/register" && method === "POST") {
    //请求路径和请求类型
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    // 设置请求头的类型，防止读出来的内容是乱码
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    //读取users.json文件
    const array = [];
    request.on("data", (chunk) => {
      // 监听数据上传事件，每上传一点就往数组里写一点
      array.push(chunk);
    });
    request.on("end", () => {
      // 监听上传结束时的事件
      const string = Buffer.concat(array).toString();
      // 把utf-8的编码转换可读的字符串
      const obj = JSON.parse(string);
      const lastUser = userArray[userArray.length - 1];
      // 数组长度-1的为数组最后一位的索引
      const newUser = {
        // id 为最后一个用户的 id + 1
        id: lastUser ? lastUser.id + 1 : 1,
        name: obj.name,
        password: obj.password,
      };
      userArray.push(newUser);
      fs.writeFileSync("./db/users.json", JSON.stringify(userArray));
      response.end();
    });
  } else {
    response.statusCode = 200;
    // 默认首页
    let filePath;
    filePath = path === "/" ? "/index.html" : path;
    let index = filePath.lastIndexOf(".");
    // let suffix = filePath.substring(index)
    let suffix = filePath.substring(index).replace(".", "");
    let fileType = {
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      gif: "image/gif",
      png: "image/png",
      jpg: "image/jpeg",
    };
    response.setHeader(
      "Content-Type",
      `${fileType[suffix] || "text/html"};charset=utf-8`
    );
    console.log("suffix-----" + suffix);
    try {
      response.write(fs.readFileSync(`./public${filePath}`));
      response.write("/*后台写了些渣渣进去*/");
    } catch (error) {
      response.write("你访问的文件不存在");
    }
    console.log(filePath + "到底是什么");
    response.end();
  }
  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);
