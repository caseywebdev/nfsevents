'use strict';

const _ = require('underscore');
const chokidar = require('chokidar');
const minimatch = require('minimatch');
const path = require('path');
const zmq = require('zmq');

const PORT = 12321;
const LOG = message => module.exports.shouldLog && console.log(message);

const resolvePaths = paths => {
  if (!paths || !paths.length) paths = ['.'];
  return _.unique(_.map(paths, p => path.resolve(p)));
};

const GLOB = /([*{]|[?+@!]\().*/;
const DUMMY = 'dummy';
const flattenGlob = p =>
  GLOB.test(p) ? path.dirname(p.replace(GLOB, DUMMY)) : p;
const flattenGlobs = paths => _.map(paths, flattenGlob);

module.exports = {
  shouldLog: false,

  publish: (options) => {
    if (!options) options = {};
    const url = `tcp://*:${PORT}`;
    const publisher = zmq.socket('pub');

    const publish = (event, path) => {
      LOG(`Publishing ${path} ${event}`);
      publisher.send([path, event]);
    };

    const startWatching = () => {
      const paths = resolvePaths(options.paths);
      LOG(`Watching ${paths.join(', ')}`);
      chokidar
        .watch(paths, {
          ignoreInitial: true,
          ignorePermissionErrors: true
        })
        .on('all', publish);
    };

    const handleBind = er => {
      if (er) throw er;
      LOG(`Listening on ${url}`);
      startWatching();
    };

    LOG(`Binding to ${url}`);
    publisher.bind(url, handleBind);
  },

  subscribe: (options, cb) => {
    if (!options) options = {};
    const url = `tcp://${options.url || '0.0.0.0'}:${PORT}`;
    const paths = resolvePaths(options.paths);
    const subscriber = zmq.socket('sub');

    subscriber.on('message', (p, event) => {
      p = p.toString();
      if (!_.any(paths, _.partial(minimatch, p))) return;
      event = event.toString();
      LOG(`Received ${p} ${event}`);
      cb(p, event);
    });

    LOG(`Connecting to ${url}`);
    subscriber.connect(`tcp://${options.url}:${PORT}`);

    flattenGlobs(paths).forEach(p => {
      LOG(`Subscribing to ${p}`);
      subscriber.subscribe(p);
    });
  }
};
