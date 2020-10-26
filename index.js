/* Copyright 2020 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */


const {unzip} = require('unzipit');
const {parse} = require('secure-json-parse');

const secureJSONPolicy = {
  protoAction: 'remove',
  constructorAction: 'remove'
};  // see https://github.com/fastify/secure-json-parse

module.exports = function openzip(zipdataAsPromise, SMRS, progress) {
  "use strict";
  const data = {};
  const simRegex = /\/(\d+)\/sim.json$/;
  const configRegex = /\/config.json$/;
  const logRegex = /\/(\d+)\/(\w+)\.csv$/;

  function configFromJSON(s) {
    data.config = parse(s, secureJSONPolicy);
  }

  function simFromJSON(path, s) {
    if (!data.sims) data.sims = [];
    const parse = simRegex.exec(path);
    if (!parse) throw new Error("simFromJSON: can not parse path: " + path);
    const slot = parseInt(parse[1],10);
    if (!((slot >= 0) && (slot <= 999)))
      throw new Error("simFromJSON: bad slot " + slot + " in path: " + path);
    const sConfig = parse(s, secureJSONPolicy);
    sConfig.logToFileSystem = false;
    data.sims[slot] = new SMRS.Simulation(sConfig);
  }

  function isLogFile(path) {
    let slot, logname;
    const parse = logRegex.exec(path);
    if (!parse) return false;
    try {
      slot = parseInt(parse[1],10);
      logname = parse[2];
    } catch (e) {} // eslint-disable-line no-empty
    return ((slot >= 0) && (slot <= 999) && (typeof (logname) === "string") && (SMRS.logNames.indexOf(logname) >= 0));
  }

  function restoreLog(path,s) {
    const parse = logRegex.exec(path);
    const slot = parseInt(parse[1],10);
    const logname = parse[2];
    const mylog = data.sims[slot].logs[logname];
    mylog.fromString(s);
  }

  async function readSimulations({entries}){
    const configJSONFile = Object.keys(entries).find((path)=>(configRegex.test(path)));
    const configJSONString = await entries[configJSONFile].string();
    if (progress) progress("found "+configJSONFile);
    configFromJSON(configJSONString);
    if (SMRS){
        const simJSONFiles = Object.keys(entries).filter((path)=>(simRegex.test(path)));
        const simPromises = simJSONFiles.map(async (path)=>{
          const simJSONString = await entries[path].string();
          if (progress) progress("found "+path);
          simFromJSON(path, simJSONString);
        });
        await Promise.all(simPromises);
        const logFiles = Object.keys(entries).filter((path)=>(isLogFile(path)));
        const logPromises = logFiles.map(async (path)=>{
          const logString = await entries[path].string();
          if (progress) progress("found "+path);
          restoreLog(path,logString);
        });
        await Promise.all(logPromises);
    }
  }

  return (zipdataAsPromise
      .then(unzip)
      .then(readSimulations)
      .then(function () { return data; })
    );
};
