# single-market-robot-simulator-openzip

![Build Status](https://github.com/DrPaulBrewer/single-market-robot-simulator-openzip/actions/workflows/node.js.yml/badge.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/DrPaulBrewer/single-market-robot-simulator-openzip/badge.svg)](https://snyk.io/test/github/DrPaulBrewer/single-market-robot-simulator-openzip)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/DrPaulBrewer/single-market-robot-simulator-openzip.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/DrPaulBrewer/single-market-robot-simulator-openzip/context:javascript)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/DrPaulBrewer/single-market-robot-simulator-openzip.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/DrPaulBrewer/single-market-robot-simulator-openzip/alerts/)


Returns a Promise yielding restored simulation data from a zip file.  The returned data has single-market-robot-simulator simulations in `data.sims` and configuration data
in `data.config`.

Used by single-market-robot-simulator-app-framework

## Installation

    npm i single-market-robot-simulator-openzip -S


## Usage

This module exports a single function, `openzip`.

### import

    import openzip from 'single-market-robot-simulator-openzip';

### Calling

     const data = await openZip(zipdata, SMRS, progress);

returns a `Promise` resolving to properties `data.sims` and `data.config`

### Parameters

`zipdata` is a Blob or ArrayBuffer to be read by Greggman and Trevor Sanz's unzippit module

`SMRS` is an object containing an import of single-market-robot-simulator or similar code

`progress`, optional, is a function taking a single string parameter that writes status updates to an appropriate part of the screen `progress("almost done...")`

## Copyright

2020,2022- Paul Brewer Economic and Financial Technology Consulting LLC

## License

MIT License
