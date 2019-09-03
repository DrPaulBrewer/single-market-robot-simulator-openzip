/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint browserify:true,jquery:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true */

const JSzip = require('jszip');

module.exports = function openzip(zipdataAsPromise, SMRS, progress) {
  "use strict";
  var data = { sims: [] };
  const simRegex = /\/(\d+)\/sim.json$/;
  const configRegex = /\/config.json$/;
  const logRegex = /\/(\d+)\/(\w+)\.csv$/;

  function configFromJSON(s) {
    data.config = JSON.parse(s);
  }

  function simFromJSON(path) {
    var parse = simRegex.exec(path);
    if (!parse) throw new Error("simFromJSON: can not parse path: " + path);
    var slot = parseInt(parse[1],10);
    if (!((slot >= 0) && (slot < 999)))
      throw new Error("simFromJSON: bad slot " + slot + " in path: " + path);
    return function (s) {
      const sConfig = JSON.parse(s);
      sConfig.logToFileSystem = false;
      data.sims[slot] = new SMRS.Simulation(sConfig);
    };
  }

  function isLogFile(path) {
    var slot, logname;
    var parse = logRegex.exec(path);
    if (!parse) return false;
    try {
      slot = parseInt(parse[1],10);
      logname = parse[2];
    } catch (e) {}
    return ((slot >= 0) && (slot <= 99) && (typeof (logname) === "string") && (SMRS.logNames.indexOf(logname) >= 0));
  }

  function restoreLog(path) {
    var parse = logRegex.exec(path);
    var slot = parseInt(parse[1],10);
    var logname = parse[2];
    return function (s) {
      var mylog = data.sims[slot].logs[logname];
      mylog.fromString(s);
    };
  }

  function pStage1(zip) {
    var stage1 = [Promise.resolve(zip)];
    zip.forEach(function (path, zipdata) {
      if (configRegex.test(path)) stage1.push(
        (zipdata
          .async("string")
          .then(configFromJSON)
          .then(function () { progress("found config.json"); })
        )
      );
      if (simRegex.test(path)) stage1.push(
        (zipdata
          .async("string")
          .then(simFromJSON(path))
          .then(function () { progress("found " + path); })
        )
      );
    });
    return Promise.all(stage1);
  }

  function pStage2(completedStage1) {
    var zip = completedStage1[0];
    var stage2 = [];
    zip.forEach(function (path, zipdata) {
      if (isLogFile(path)) stage2.push(
        (zipdata
          .async("string")
          .then(restoreLog(path))
          .then(function () { progress("found " + path); })
        )
      );
    });
    return Promise.all(stage2);
  }
  return (zipdataAsPromise
    .then(JSzip.loadAsync)
    .then(pStage1)
    .then(pStage2)
    .then(function () { return data; })
  );
};
