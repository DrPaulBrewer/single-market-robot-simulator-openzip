/* Copyright 2020 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* eslint no-shadow: "error" */


const {unzip} = require('unzipit');
const {parse} = require('secure-json-parse');

const secureJSONPolicy = {
  protoAction: 'remove',
  constructorAction: 'remove'
};  // see https://github.com/fastify/secure-json-parse

module.exports = async function openzip(zipdataAsPromise, SMRS, progress) {
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
    const parsedPath = simRegex.exec(path);
    if (!parsedPath) throw new Error("simFromJSON: can not parse path: " + path);
    const slot = parseInt(parsedPath[1],10);
    if (!((slot >= 0) && (slot <= 999)))
      throw new Error("simFromJSON: bad slot " + slot + " in path: " + path);
    const sConfig = parse(s, secureJSONPolicy);
    sConfig.logToFileSystem = false;
    data.sims[slot] = new SMRS.Simulation(sConfig);
  }

  function isLogFile(path) {
    let slot, logname;
    const parsedPath = logRegex.exec(path);
    if (!parsedPath) return false;
    try {
      slot = parseInt(parsedPath[1],10);
      logname = parsedPath[2];
    } catch (e) {} // eslint-disable-line no-empty
    return ((slot >= 0) && (slot <= 999) && (typeof (logname) === "string") && (SMRS.logNames.indexOf(logname) >= 0));
  }

  function restoreLog(path,s) {
    const parsedPath = logRegex.exec(path);
    const slot = parseInt(parsedPath[1],10);
    const logname = parsedPath[2];
    const mylog = data.sims[slot].logs[logname];
    mylog.fromString(s);
  }

  async function readSimulations({entries}){
    const configJSONFile = Object.keys(entries).find((path)=>(configRegex.test(path)));
    const configJSONString = await entries[configJSONFile].text();
    if (progress) progress("found "+configJSONFile);
    configFromJSON(configJSONString);
    if (SMRS){
        const simJSONFiles = Object.keys(entries).filter((path)=>(simRegex.test(path)));
        const simPromises = simJSONFiles.map(async (path)=>{
          const simJSONString = await entries[path].text();
          if (progress) progress("found "+path);
          simFromJSON(path, simJSONString);
        });
        await Promise.all(simPromises);
        const logFiles = Object.keys(entries).filter((path)=>(isLogFile(path)));
        const logPromises = logFiles.map(async (path)=>{
          const logString = await entries[path].text();
          if (progress) progress("found "+path);
          restoreLog(path,logString);
        });
        await Promise.all(logPromises);
    }
  }

  const bString = await zipdataAsPromise;
  // assume bString is a binary string and perform a manual copy to a Uint8Array
  const rawData = new Uint8Array(bString.length);
  for(let i=0,l=bString.length; i<l; i++){
    rawData[i] = bString.charCodeAt(i) & 0xFF;
  }
  const unzipped = await unzip(rawData);
  await readSimulations(unzipped);
  return data;
};
