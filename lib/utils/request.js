'use strict';
var tr = require('tor-request');
var fs = require('fs'); 
const requestLib = require('request');
const throttled = require('throttled-request')(requestLib);
const debug = require('debug')('google-play-scraper');
var sleep = require('sleep');


function createConnectionPool(){
  var pool = new Array();
  console.log("Create connection pool.")
  
  var connection_lists = fs.readdirSync('active_tor_sessions');
  for(let confIdx in connection_lists) {
    var config = fs.readFileSync('active_tor_sessions/'+connection_lists[confIdx], 'utf-8');
    var configElements = config.split(/\r?\n/);
    var con = {
      socksPort: configElements[0].split(" ")[1],
      controlPort: configElements[1].split(" ")[1]
    }
    pool.push(con);
    console.log(con);
    
  }
  console.log(pool);
  return pool;
}

var conPool = createConnectionPool();
const requests_max = 1000;
var requests = requests_max;

function applyCon(conIdx, tr){
  //tr.TorControlPort.password = 'dadascience';
  console.log("applyCon");
  var con = conPool[conIdx];
  console.log(con);
  tr.setTorAddress("localhost", parseInt(con.socksPort));
  tr.TorControlPort.port("localhost", parseInt(con.controlPort));
  tr.TorControlPort.password("localhost", "dadascience");
  console.log(tr);
  printTOR_IP();
  
  return tr;
}

var printTOR_IP = function () {

  tr.request('https://api.ipify.org', function (err, res, body) {
  if (!err && res.statusCode == 200) {
      console.log("Your public (through Tor) IP is: " + body);
   }
});
};



function doRequest (opts, limit) {
  console.log("Do request.");
  requests = requests - 1;
  
  var trRecent = applyCon(conPool, requests % conPool.length, tr);

  if(requests < 0) {
      requests = requests_max;
      tr.renewTorSession(function (err, msg) {
        if (msg) {
             printTOR_IP();
        }
      });
    }

  var waitTime = 0;//Math.floor(Math.random() * 2 * 1000);
  sleep.msleep(waitTime);
  
  let req = trRecent.request
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
