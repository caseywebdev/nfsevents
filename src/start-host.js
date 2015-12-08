var chokidar = require('chokidar');
var path = require('path');
var zmq = require('zmq');

var sock = zmq.socket('push');
sock.bindSync('tcp://0.0.0.0:12321');

var send = function (path, stat) {
  sock.send(JSON.stringify({path: path, mtime: stat.mtime}));
};

chokidar
  .watch(path.resolve(), {
    alwaysStat: true,
    ignoreInitial: true,
    persistent: true
  })
  .on('add', send)
  .on('change', send);
