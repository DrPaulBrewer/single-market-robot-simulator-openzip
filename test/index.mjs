/* eslint-env es2020, node, mocha */


// Copyright 2022 Paul Brewer Economic & Financial Technology Consulting LLC
// tests for single-market-robot-simulator-openzip
// Open Source License: The MIT Public License

// import assert from 'assert';
import 'should';
import fsPromises from 'fs/promises';
import * as SMRS from 'single-market-robot-simulator';
import transpluck from 'transpluck';
import openzip from '../index.mjs';

let zipdata = null;
let out1,out2 = null;
const zipFileName = 'test/data/20201004T001600.zip';
const configFileName = 'test/data/config.json';
const avgFileName = 'test/data/effVcaseid.json';

const latin1 = {encoding: 'latin1'};
const expectedSims = [
  0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18
];

describe('single-market-robot-simulator-openzip', ()=>{
  it('should be a function', ()=>{
    openzip.should.be.type('function');
  });
  it('Prerequisite:  input zip file should exist and be accessible', async ()=>{
    zipdata = await fsPromises.readFile(zipFileName, latin1);
    // encoding:latin1 is best encoding to stringify binary data
    zipdata.should.be.type('string');
    zipdata.length.should.be.above(1000000);
  });
  it('should unzip without error', async()=>{
    out1 = await openzip(zipdata, SMRS);
  });
  it('should unzip again without error, calling progress at least 75 times', async ()=>{
    let count = 0;
    function progress(){ count++; }
    out2 = await openzip(zipdata, SMRS, progress);
    count.should.be.above(75);
  });
  it('out.config should match file data/config.json (except for runtime options)', async ()=>{
    const expected = JSON.parse(await fsPromises.readFile(configFileName,latin1));
    // remove runtime-adjustable options common.periods, common.withoutOrderLogs
    [expected,out1.config,out2.config].forEach((obj)=>{
      delete obj.common.periods;
      delete obj.common.withoutOrderLogs;
    });
    out1.config.should.deepEqual(expected);
    out2.config.should.deepEqual(expected);
  });
  it('sim j should have caseid j and numberOfBuyers j+2 for j in 00..18', ()=>{
    [out1,out2].forEach((out)=>{
      expectedSims.forEach((j)=>{
        out.sims[j].config.caseid.should.equal(j);
        out.sims[j].config.numberOfBuyers.should.be.approximately(j+2,1e-6);
      });
    });
  });

  it(`avg efficiency in sim logs should match external file`, async ()=>{
    await Promise.all(
      [out1,out2].map(async (out)=>(
        await Promise.all(
          expectedSims.map(async (j)=>{
            const expected = JSON.parse(await fsPromises.readFile(avgFileName,latin1));
            const expectedAvgEff = expected[''+j];
            const effallocData = out.sims[j].logs.effalloc.data;
            const eff = transpluck(effallocData,{pluck:['efficiencyOfAllocation']}).efficiencyOfAllocation;
            const sum = eff.map((v)=>(+v)).reduce((a,b)=>(a+b),0);
            const avg = sum/eff.length;
            avg.should.be.approximately(expectedAvgEff,1e-6);
          })
        )
      )
    )
  );
  });
});
