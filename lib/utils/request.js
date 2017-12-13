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
  return pool;
};

var conPool = createConnectionPool();
var requests = 0;

function applyCon(pool, conIdx, tor){
  var round = Math.floor( requests / pool.length )
  console.log("Change Tor Session after " + (250 - (round % 250)) * pool.length + " further requests.")
  if(round % 250 == 0) {
      tor.renewTorSession(function (err, msg) {
        if (msg) {
             printTOR_IP(tor);
        }
      });
    }
  
  var aCon = pool[conIdx];

  tor.setTorAddress("localhost", parseInt(aCon.socksPort));
  tor.TorControlPort.port = parseInt(aCon.controlPort);
  tor.TorControlPort.password = "dadascience";
  //printTOR_IP(tor);
  
  return tor;
};


function printTOR_IP(tor) {
  tor.request('https://api.ipify.org', function (err, res, body) {
  if (!err && res.statusCode == 200) {
      console.log("Your public (through Tor) IP is: " + body);
   }
});
};



function doRequest (opts, limit) {
  requests = requests + 1;
  var trRecent = applyCon(conPool, requests % conPool.length, tr);
   
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
