/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint browserify:true,jquery:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true */

const JSzip = require('jszip');

function pad(x){
    "use strict";
    return (x<10)? ("0"+x) : (''+x);
}

function myDateStamp(){
    "use strict";
    var now = new Date();
    return ( ''+ now.getUTCFullYear() + 
	     pad(now.getUTCMonth() + 1) +
             pad(now.getUTCDate()) +
             'T' + pad(now.getUTCHours()) +
             pad(now.getUTCMinutes())
	   );
}

function letter(n){
    "use strict";
    var A = "A".charCodeAt(0);
    return String.fromCharCode(A+n);
}

function csvString(rows){
    "use strict";
    var s = '';
    var i,l,row;
    for(i=0,l=rows.length;i<l;++i){
	row = rows[i];
	s += row.join(",") + "\n";
    }
    return s;
}

// see http://stackoverflow.com/a/7220510/103081 by http://stackoverflow.com/users/27862/user123444555621 for pretty printed stringify

module.exports = function openzip(zipdataAsPromise, SMRS, progress){
    "use strict";
    var data = { sims: [] };
    const simRegex = /\/([A-Z])\/sim.json$/ ;
    const configRegex = /\/config.json$/;
    const logRegex = /\/([A-Z])\/(\w+)\.csv$/ ;
    function configFromJSON(s){
	data.config = JSON.parse(s);
    }
    function simFromJSON(path){
	var parse = simRegex.exec(path);
	var slot = parse[0].charCodeAt(0)-"A".charCodeAt(0);
	return function(s){
	    if ((slot<0) || (slot>25)){
		console.log("bad slot in path: "+path);
	    } else {
		data.sims[slot] = new SMRS.Simulation(JSON.parse(s));
	    }	    
	}
    }
    function restoreLog(path){
	var parse = logRegex.exec(path);
	var slot = parse[0].charCodeAt(0)-"A".charCodeAt(0);
	var logname = parse[1];
	return function(s){
	    
	}
    }
    return new Promise(function(resolve, reject){
	(zipdataAsPromise
	 .then(JSzip.loadAsync)
	 .then(function(zip){
	     var stage1 = [];
	     zip.forEach(function(path, zipdata){
		 if (configRegex.test(path)) stage1.push(zipdata.async("string").then(configFromJSON));
		 if (simRegex.test(path)) stage1.push(zipdata.async("string").then(simFromJSON(path)));
	     });
	     Promise.all(stage1).then(function(){
		 var stage2 = [];
		 zip.forEach(function(path,zipdata){
		     if (logRegex.test(path)) stage2.push(zipdata.async("string").then(restoreLog(path)));
		 });
		 Promise.all(stage2).then(function(){
		     resolve(data);
		 });
	     });
	 })
	);
    };
};
