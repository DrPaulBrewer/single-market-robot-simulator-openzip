/* eslint-env es2020 */
/* eslint no-shadow: "error" */

/* Copyright 2020 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

import pEachSeries from 'p-each-series';
import {unzip} from 'unzipit';
import {parse} from 'secure-json-parse';


const secureJSONPolicy = {
  protoAction: 'remove',
  constructorAction: 'remove'
};  // see https://github.com/fastify/secure-json-parse

class BReader {
  constructor(bstring){
    this.bstring = bstring;
  }
  close() {
    delete this.bstring;
    return true;
  }
  getLength() {
    return this.bstring.length;
  }
  read(offset, length) {
    const bstring = this.bstring;
    const data = new Uint8Array(length);
    for(let i=0;i<length;i++){
      data[i] = bstring.charCodeAt(offset+i) & 0xFF;  // eslint-disable-line no-bitwise
    }
    return data;
  }
}

function delay(waitingTimeMs){
  return new Promise(function(resolve){
    setTimeout(resolve,waitingTimeMs);
  });
}

export default async function openzip(zipdataAsPromise, SMRS, progress) {
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
    /* c8 ignore start */
    if (!parsedPath) throw new Error("simFromJSON: can not parse path: " + path);
    const slot = parseInt(parsedPath[1],10);
    if (!((slot >= 0) && (slot <= 999)))
      throw new Error("simFromJSON: bad slot " + slot + " in path: " + path);
    /* c8 ignore stop */
    const sConfig = parse(s, secureJSONPolicy);
    sConfig.logToFileSystem = false;
    data.sims[slot] = new SMRS.Simulation(sConfig);
  }

  function isLogFile(path) {
    const parsedPath = logRegex.exec(path);
    if (!parsedPath) return false;
    const slot = parseInt(parsedPath[1],10);
    const logname = parsedPath[2];
    return ((slot >= 0) && (slot <= 999) && (typeof(logname) === "string") && (SMRS.logNames.indexOf(logname) >= 0));
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
        await pEachSeries(simJSONFiles, async (path)=>{
          const simJSONString = await entries[path].text();
          if (progress) progress("found "+path);
          await delay(10);
          simFromJSON(path, simJSONString);
        });
        await delay(50);
        const logFiles = Object.keys(entries).filter((path)=>(isLogFile(path)));
        await pEachSeries(logFiles, async (path)=>{
          const logString = await entries[path].text();
          if (progress) progress("found "+path);
          await delay(10);
          restoreLog(path,logString);
        });
        await delay(50);
    }
  }

  const bString = await zipdataAsPromise;
  const reader = new BReader(bString);
  const unzipped = await unzip(reader);
  await readSimulations(unzipped);
  reader.close();
  return data;
}
