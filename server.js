var WebSocketServer = require('ws').Server
    , http = require('http')
    , express = require('express')
    , app = express();

app.use(express.static(__dirname + '/'));
var server = http.createServer(app);
var wss = new WebSocketServer({server:server});

var redis = require('redis')
var sub = redis.createClient(6379, 'localhost');
var pub = redis.createClient(6379, 'localhost');
var log = redis.createClient(6379, 'localhost');
var channel = 'channel1'

wss.on('connection', function (ws) {
    sub.subscribe(channel);
    log.lrange('log:' + channel, 0, -1, function(err, history){
        console.log("(last) " + history.toString())
        ws.send(JSON.stringify(history));
    });
    console.log("(connection) count: " + wss.clients.length);
    ws.on('close', function () {
        console.log("(close) count: " + wss.clients.length);
    });
    ws.on('message', function (message) {
        var now = new Date().toString();
        var msg = '[' + now + '] ' + message
        console.log("(publish)" + msg);
        log.lrange('log:' + channel, 0, -1, function(err, history){
            history.push(msg)
            console.log("(update) " + history.toString())
            log.rpush('log:' + channel, history)
        });
        pub.publish(channel, msg);
    });
});

sub.on("message", function(channel, message) {
    wss.clients.forEach(function (ws, i) {
        console.log("(send) " + message);
        ws.send(JSON.stringify([message]));
    });
});

server.listen(3000);
