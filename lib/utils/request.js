'use strict';
var tr = require('tor-request')
const requestLib = require('request');
const throttled = require('throttled-request')(requestLib);
const debug = require('debug')('google-play-scraper');

tr.TorControlPort.password = 'dadascience';
tr.setTorAddress("localhost", "9050");

const requests_max = 1000;
var requests = 0;

function doRequest (opts, limit) {
  /*let req = requestLib;
  if (limit) {
    throttled.configure({
      requests: limit,
      milliseconds: 1000
    });
    req = throttled;
  }*/

  if(requests < 0) {
      requests = requests_max;
      tr.renewTorSession(function (err, msg) {
        if (msg) {
             printTOR_IP();
        }
      });
    }

  var waitTime = Math.floor(Math.random() * limit * 1000);
  sleep.msleep(waitTime);
  
  let req = tr.request
  return new Promise((resolve, reject) => req(opts, function (error, response, body) {
    if (error) {
      return reject(error);
    }
    if (response.statusCode >= 400) {
      return reject({response});
    }
    resolve(body);
  }));
}

function request (opts, limit) {
  debug('Making request: %j', opts);
  return doRequest(opts, limit)
    .then(function (response) {
      debug('Request finished');
      return response;
    })
    .catch(function (reason) {
      debug('Request error:', reason.message, reason.response && reason.response.statusCode);

      if (reason.response && reason.response.statusCode === 404) {
        const err = Error('App not found (404)');
        err.is404 = true;
        throw err;
      }
      throw Error('Error requesting Google Play:' + reason.message);
    });
}

module.exports = request;
