single-market-robot-simulator-openzip
======

Returns a Promise yielding restored simulation data from a zip file.  The returned data has single-market-robot-simulator simulations in `data.sims` and configuration data
in `data.config`.

Used by single-market-robot-simulator-app-framework

Useful only on the browser.  

On a node.js server, single-market-robot-simulator automatically saves multiple csv files without this module.

## Installation

    npm i single-market-robot-simulator-openzip -S

## Usage

This module exports a single function,

     const openZip = require('single-market-robot-simulator-openzip');

Calling:

     openZip(zipdata, SMRS, progress).then(function(data){ ... });

returns a promise with an object payload `data` with properties `data.sims` and `data.config`

Parameters:

`zipdata` is a Blob or ArrayBuffer to be read by jszip

`SMRS` is an object containing an import of single-market-robot-simulator or similar code

`progress`, optional, is a function taking a single string parameter that writes status updates to an appropriate part of the screen `progress("almost done...")` 

###Copyright

2017 Paul Brewer Economic and Financial Technology Consulting LLC

###License

MIT License

