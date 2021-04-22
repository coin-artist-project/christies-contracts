const { expect } = require('chai');
const hre = require('hardhat');

const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

describe('F473', function () {
  let f473Contract;

  before(async () => {
    const F473 = await ethers.getContractFactory('F473');
    f473Contract = await F473.deploy();
  });

  it('Default test: URI should return expected', async function () {
    let response = await f473Contract.uri(0);
    expect(response).to.equal("https://localhost/{uri}.json");
  });

  it('Default test: Should start at level 1, phase 1', async function () {
    let response = await f473Contract.getLevel();
    expect(response).to.equal(1);

    response = await f473Contract.getPhase();
    expect(response).to.equal(1);
  });

  it('Should iterate through all levels and phases as expected over a > 2 hour period', async function () {
    for (let iter = 0; iter < 14; iter++) {
      let level = await f473Contract.getLevel();
      expect(level).to.equal((iter + 1) % 12 > 9 ? 0 : (iter + 1) % 12);

      let phase = await f473Contract.getPhase();
      expect(phase).to.equal((iter + 1) % 12 > 9 ? 0 : (Math.floor(iter / 3) + 1) % 4);

      //console.log("level:", level, "- phase:", phase);

      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
    
  });

});
