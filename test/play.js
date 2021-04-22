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
  let owner;
  let acct1;
  let acct2;
  let accts;

  before(async () => {
    [owner, acct1, acct2, ...accts] = await ethers.getSigners();

    // Set the timestamp to a known number
    // NOTE: We do this so that the blockhashes are exactly as expected
    //ethers.provider.send("evm_setNextBlockTimestamp", [3155760000]);

    const F473 = await ethers.getContractFactory('F473');
    f473Contract = await F473.deploy();
  });

  it('URI should return as expected', async function () {
    let response = await f473Contract.uri(0);
    expect(response).to.equal("https://localhost/{uri}.json");
  });

  it('Should start at level 1, phase 1', async function () {
    let response = await f473Contract.getLevel();
    expect(response).to.equal(1);

    response = await f473Contract.getPhase();
    expect(response).to.equal(1);
  });

  it('Should not allow a non-allowed address to perform critical actions', async function () {
    await expectRevert(f473Contract.connect(acct1).claimCard(0), 'Address is not permitted');
  });

  it('Should allow adding an address to the permitted list, removing, and then adding again', async function () {
    response = await f473Contract.checkAllowedAddress(acct1.address);
    expect(response).to.equal(false);

    await f473Contract.setInAllowlist(acct1.address, true);

    response = await f473Contract.checkAllowedAddress(acct1.address);
    expect(response).to.equal(true);

    await f473Contract.setInAllowlist(acct1.address, false);

    response = await f473Contract.checkAllowedAddress(acct1.address);
    expect(response).to.equal(false);

    await f473Contract.setInAllowlist(acct1.address, true);

    response = await f473Contract.checkAllowedAddress(acct1.address);
    expect(response).to.equal(true);
  });

  it('Should iterate through all levels and phases as expected over a 4 hour period', async function () {
    for (let iter = 0; iter < 24; iter++) {
      let level = await f473Contract.getLevel();
      expect(level).to.equal((iter + 1) % 12 > 9 ? 0 : (iter + 1) % 12);

      let phase = await f473Contract.getPhase();
      expect(phase).to.equal((iter + 1) % 12 > 9 ? 0 : (Math.floor(iter / 3) + 1) % 4);

      let timeSlice = await f473Contract.getTimeSlice();
      expect(timeSlice).to.equal(iter);

      //console.log("level:", level, "- phase:", phase, "- time slice:", iter);

      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }

    let level = await f473Contract.getLevel();
    expect(level).to.equal(1);

    let phase = await f473Contract.getPhase();
    expect(phase).to.equal(1);

    let timeSlice = await f473Contract.getTimeSlice();
    expect(timeSlice).to.equal(24);

    //console.log("level:", level, "- phase:", phase, "- time slice:", timeSlice);
  });

  it('Should draw 9 cards for level 1', async function () {
    for (let iter = 0; iter < 9; iter++) {
      let timeSlice = await f473Contract.getTimeSlice();
      let card = await f473Contract.getCardDraw(iter);
      expect(card).to.equal([0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b,0x2c,0x1e][iter]);
    }

    // Make sure we can't draw more than the level permits (or the game permits)
    await expectRevert(f473Contract.getCardDraw(10), 'Invalid index');
  });

  it('Should draw correct number of cards for all following levels without RNG change', async function () {
    // In this instance, the random number is not changing at all, so the cards
    // keep drawing over and over again for the last valid random number
    const unchangingCards = [
      [0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b,0x2c,0x1e],
      [0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b,0x2c],
      [0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b],
      [0x1a,0x29,0x26,0x1b,0x2b,0x12],
      [0x1a,0x29,0x26,0x1b,0x2b],
      [0x1a,0x29,0x26,0x1b],
      [0x02,0x3b,0x08],
      [0x02,0x3b],
      [0x02]
    ];

    for (let level = 1; level <= 12; level++) {
      for (let iter = 0; iter < 9; iter++) {
        if (iter <= (9 - level) && level <= 9) {
          let card = await f473Contract.getCardDraw(iter);
          expect(card).to.equal(unchangingCards[level - 1][iter]);
        } else {
          await expectRevert(f473Contract.getCardDraw(iter), 'Invalid index');
        }
      }

      // Go to the next level
      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
  });

  it('Should draw correct number of cards for all following levels with RNG change & allow player to pick a card each time', async function () {
    // In this instance, the random number is not changing at all, so the cards
    // keep drawing over and over again for the last valid random number
    const unchangingCards = [
      [0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b,0x2c,0x1e],
      [0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b,0x2c],
      [0x1d,0x17,0x08,0x0b,0x0a,0x21,0x1b],
      [0x1a,0x29,0x26,0x1b,0x2b,0x12],
      [0x1a,0x29,0x26,0x1b,0x2b],
      [0x1a,0x29,0x26,0x1b],
      [0x02,0x3b,0x08],
      [0x02,0x3b],
      [0x02]
    ];

    for (let level = 1; level <= 12; level++) {
      for (let iter = 0; iter < 9; iter++) {
        console.log(level, iter);
        if (iter <= (9 - level) && level <= 9) {
          let card = await f473Contract.getCardDraw(iter);
          console.log(level, iter, card);
          //expect(card).to.equal(unchangingCards[level - 1][iter]);
        } else {
          await expectRevert(f473Contract.getCardDraw(iter), 'Invalid index');
        }
      }

      // Player action
      if (level <= 9) {
        await f473Contract.connect(acct1).claimCard(0);
      } else {
        await expectRevert(f473Contract.connect(acct1).claimCard(0), 'Invalid index');
      }

      // Go to the next level
      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
  });

});
