const WebSocket = require("ws");
const uuidv4 = require("uuid").v4;

const wss1 = new WebSocket.WebSocketServer({ noServer: true });

wss1.on("connection", function connection(ws) {
  ws.on("error", console.error);
  console.log("連線成功");

  const uuid = uuidv4();

  ws.uuid = uuid;

  const user = {
    context: "user",
    uuid,
    object: "",
    status: "",
  };
  //發送
  let total = [];
  wss1.clients.forEach(function each(client) {
    if (client.uuid !== user.uuid) total.push(client.uuid);
  });
  const randomIndex = Math.floor(Math.random() * total.length);
  user.object = total[randomIndex];
  ws.send(JSON.stringify(user));

  //監聽
  ws.on("message", (res) => {
    const { content, objectId, context, uuid, status, time } = JSON.parse(res);
    if (status) ws.status = status;
    console.log(uuid, status);
    if (ws.status === "wait") {
      console.log("wait");
      //配對
      let total = [];

      wss1.clients.forEach(function each(client) {
        console.log(client.uuid, client.status);
        if (
          client.readyState === WebSocket.OPEN &&
          client.status === "wait" &&
          client.uuid !== uuid
        ) {
          total.push(client);
        }
      });
      const randomIndex = Math.floor(Math.random() * total.length);
      const target = total[randomIndex];
      if (target) {
        const newMsg = {
          context: "success",
          objectId: target.uuid,
          status: "chatting",
        };
        ws.send(JSON.stringify(newMsg));
        const objectMsg = {
          context: "success",
          objectId: uuid,
          status: "chatting",
        };
        target.send(JSON.stringify(objectMsg));
        target.status = "chatting";
        ws.status = "chatting";
      }
    } else if (status === "quit") {
      const target = otherUser(objectId);
      const newMsg = {
        context: "message",
        content: "對方已離開聊天室",
      };
      if (target) target.send(JSON.stringify(newMsg));
      return;
    } else if (status) {
      //聊天
      const newMsg = {
        context: "message",
        content,
        time,
      };
      const target = otherUser(objectId);
      target.send(JSON.stringify(newMsg));
    }
  });
});

// 對方
function otherUser(objectId) {
  let target = null;
  wss1.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN && client.uuid === objectId) {
      target = client;
    }
  });
  return target;
}

//其他等待中
function otherWaitUser(uuid) {
  wss1.send(uuid);
}

module.exports = wss1;
