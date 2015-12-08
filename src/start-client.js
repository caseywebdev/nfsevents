var spawn = require('child_process').spawn;
var zmq = require('zmq');

var sock = zmq.socket('pull');
sock.connect('tcp://' + process.env.HOST + ':12321');
sock.on('message', function (data) {
  data = JSON.parse(data.toString());
  spawn('touch', ['-mcd', data.mtime, data.path]);
});
