console.log("[INFO] Program started...");
require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(
  `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_AUTH}`,
  {
    useNewUrlParser: true,
    dbName: process.env.DB_NAME,
  }
);

const io = require("socket.io")(process.env.SOCKET_IO_PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const redisAdapter = require("socket.io-redis");
io.adapter(
  redisAdapter({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    user: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  })
);

const Device = require("./model/Device");

const mqtt = require("mqtt");
var mqttClient = mqtt.connect(
  `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
  {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  }
);

mqttClient.on("connect", function () {
  mqttClient.subscribe("friansh/live_image/+/+", (err) => {
    if (!err) console.log("The server is listening to the live image topic.");
  });
});

mqttClient.on("message", async (topic, message) => {
  const messageParams = {
    dataType: topic.split("/")[1],
    deviceToken: topic.split("/")[2],
    datasetId: topic.split("/")[3],
  };

  if (messageParams.dataType == "live_image") {
    const device = await Device.findOne({ token: messageParams.deviceToken })
      .exec()
      .catch(() => console.error("Err1"));

    if (!device) {
      console.error("Invalid token!");
      return;
    }

    io.emit(`${messageParams.datasetId}/${device._id}`, message.toString());
    console.log("Emitted!");
  }
});
