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

  let acct1cards = [];

  let NUM_SOLO;
  let NUM_PAIR;
  let NUM_COUPLE;
  let NUM_SOLO_AUDIO;
  let NUM_PAIR_AUDIO;
  let NUM_COUPLE_AUDIO;
  let NUM_BACKGROUNDS;

  async function forwardToNextLevel9() {
    let sanityLimit = 0;

    ethers.provider.send("evm_increaseTime", [60 * 10]);
    ethers.provider.send("evm_mine");

    do {
      await f473Contract.connect(acct1).roll();
      ethers.provider.send("evm_increaseTime", [60 * 10]);
      ethers.provider.send("evm_mine");
    }
    while ((await f473Contract.getLevel()).toNumber() !== 9 && sanityLimit++ < 20);

    expect((await f473Contract.getLevel()).toNumber()).to.equal(9);
  }

  before(async () => {
    [owner, acct1, acct2, ...accts] = await ethers.getSigners();

    const F473 = await ethers.getContractFactory('F473');
    f473Contract = await F473.deploy();

    NUM_SOLO         = (await f473Contract.NUM_SOLO_CHAR()).toNumber();
    NUM_PAIR         = (await f473Contract.NUM_PAIR_CHAR()).toNumber();
    NUM_COUPLE       = (await f473Contract.NUM_COUPLE_CHAR()).toNumber();
    NUM_SOLO_AUDIO   = (await f473Contract.NUM_SOLO_AUDIO()).toNumber();
    NUM_PAIR_AUDIO   = (await f473Contract.NUM_PAIR_AUDIO()).toNumber();
    NUM_COUPLE_AUDIO = (await f473Contract.NUM_COUPLE_AUDIO()).toNumber();
    NUM_BACKGROUNDS  = (await f473Contract.NUM_BACKGROUNDS()).toNumber();
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

  it('Should not allow a non-owner to set the URI', async function () {
    await expectRevert(f473Contract.connect(acct1).setBaseUri("testbreak"), 'Ownable: caller is not the owner');
    await expectRevert(f473Contract.connect(acct2).setBaseUri("testbreak"), 'Ownable: caller is not the owner');
  });

  it('Should allow owner to set the URI', async function () {
    let newUri = "https://portal.neondistrict.io/f473.json";
    await f473Contract.setBaseUri(newUri);

    let response = await f473Contract.uri(0);
    expect(response).to.equal(newUri);
  });

  it('Should not allow a non-allowed address to perform critical actions', async function () {
    await expectRevert(f473Contract.connect(acct1).claimSoloCard(0), 'Address is not permitted');
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

  it('Should allow adding another address to the permitted list, removing, and then adding again', async function () {
    response = await f473Contract.checkAllowedAddress(acct2.address);
    expect(response).to.equal(false);

    await f473Contract.setInAllowlist(acct2.address, true);

    response = await f473Contract.checkAllowedAddress(acct2.address);
    expect(response).to.equal(true);

    await f473Contract.setInAllowlist(acct2.address, false);

    response = await f473Contract.checkAllowedAddress(acct2.address);
    expect(response).to.equal(false);

    await f473Contract.setInAllowlist(acct2.address, true);

    response = await f473Contract.checkAllowedAddress(acct2.address);
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

      // Do some work, but not in the last block since we're going to do something else after
      if (iter < 23) {
        await f473Contract.connect(acct1).roll();
        await f473Contract.connect(acct2).roll();
      }
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
      let card = await f473Contract.getCurrentCardCharacter(iter);
      expect(card).to.be.gte(1);
      expect(card).to.be.lte(NUM_SOLO);
    }

    // Make sure we can't draw more than the level permits (or the game permits)
    await expectRevert(f473Contract.getCurrentCardCharacter(10), 'Invalid index');
  });

  it('Should allow player to claim a card during level 1', async function () {
    // Get the current time slice
    //let timeSlice = await f473Contract.getTimeSlice();

    // See what character card we're claiming
    let character = await f473Contract.getCurrentCardCharacter(0);
    let background = await f473Contract.getCurrentCardBackground(0);
    let audio = await f473Contract.getCurrentCardAudio();

    // Issue the claim card
    let tx = await f473Contract.connect(acct1).claimSoloCard(0);
    let receipt = await tx.wait();

    // Now review the event
    let eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'TransferSingle') {
        // Deconstruct the returned card
        let cardDeconstructed = await f473Contract.deconstructCard(event.args.id.toNumber());

        // Make sure that the transfer event has everything expected of it - from, to, id, value
        expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.args.to).to.equal(acct1.address);
        expect(cardDeconstructed.character.toNumber()).to.equal(character.toNumber());
        expect(event.args.value).to.equal(1);

        // Compare the background and audio
        expect(cardDeconstructed.background.toNumber()).to.equal(background.toNumber());
        expect(cardDeconstructed.audio.toNumber()).to.equal(audio.toNumber());

        // Keep track of cards
        acct1cards.push(event.args.id.toString());

        // Make sure an event fired
        eventPresent = true;
      }
    }

    // Verify that the event fired
    expect(eventPresent).to.equal(true);
  });

  it('Should not allow player to claim a second card during the same time slice', async function () {
    await expectRevert(f473Contract.connect(acct1).claimSoloCard(0), 'Already moved this time frame');
  });

  it('Should draw correct number of cards for all following levels without RNG change', async function () {
    for (let level = 1; level <= 12; level++) {
      for (let iter = 0; iter < 9; iter++) {
        if (iter <= (9 - level) && level <= 9) {
          let card = await f473Contract.getCurrentCardCharacter(iter);

          // Test number
          let COUNT = NUM_SOLO;
          if (level > 3) COUNT += NUM_PAIR;
          if (level > 6) COUNT += NUM_COUPLE;

          expect(card).to.be.gte(1);
          expect(card).to.be.lte(COUNT);

        } else {
          await expectRevert(f473Contract.getCurrentCardCharacter(iter), 'Invalid index');
        }
      }

      // Go to the next level
      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
  });

  it('Should draw correct number of cards for all following levels with RNG change & allow player to pick a card each time', async function () {
    for (let level = 1; level <= 12; level++) {
      let viableSelection = null, selectedCard;
      for (let iter = 0; iter < 9; iter++) {
        if (iter <= (9 - level) && level <= 9) {
          let card = await f473Contract.getCurrentCardCharacter(iter);
          if (card <= 45 && viableSelection === null) {
            selectedCard = card;
            viableSelection = iter;
          }

          // Test number
          let COUNT = NUM_SOLO;
          if (level > 3) COUNT += NUM_PAIR;
          if (level > 6) COUNT += NUM_COUPLE;

          expect(card).to.be.gte(1);
          expect(card).to.be.lte(COUNT);

        } else {
          await expectRevert(f473Contract.getCurrentCardCharacter(iter), 'Invalid index');
        }
      }

      // Player action
      if (level <= 9 && viableSelection !== null) {
        // Get the time slice & random number
        let timeSlice = await f473Contract.getTimeSlice();
        let thisRandomNumber = await f473Contract.getRandomNumber(timeSlice);
        let nextRandomNumber = await f473Contract.getRandomNumber(timeSlice + 1);

        // Get the expected background & audio for this layer
        let background = await f473Contract.getCurrentCardBackground(viableSelection);
        let audio = await f473Contract.getCurrentCardAudio();

        // Issue the claim card
        let tx = await f473Contract.connect(acct1).claimSoloCard(viableSelection);
        let receipt = await tx.wait();

        // Random number for *this* time slice should stay the same, random number for *next* time slice should change
        expect((await f473Contract.getRandomNumber(timeSlice)).toString()).to.equal(thisRandomNumber.toString());
        expect((await f473Contract.getRandomNumber(timeSlice + 1)).toString()).to.not.equal(nextRandomNumber.toString());

        // Now review the event
        let eventPresent = false;
        for (const event of receipt.events) {
          if (event.event === 'TransferSingle') {
            // Deconstruct the returned card
            let cardDeconstructed = await f473Contract.deconstructCard(event.args.id.toNumber());

            // Make sure that the transfer event has everything expected of it - from, to, id, value
            expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
            expect(event.args.to).to.equal(acct1.address);
            expect(cardDeconstructed.character.toNumber()).to.equal(selectedCard.toNumber());
            expect(event.args.value).to.equal(1);

            // Compare the background and audio
            expect(cardDeconstructed.background.toNumber()).to.equal(background.toNumber());
            expect(cardDeconstructed.audio.toNumber()).to.equal(audio.toNumber());

            /*
            console.log("\r\nlevel", level);
            console.log("character", cardDeconstructed.character.toNumber(), selectedCard.toNumber());
            console.log("background", cardDeconstructed.background.toNumber(), background.toNumber());
            console.log("audio", cardDeconstructed.audio.toNumber(), audio.toNumber());
            */

            // Keep track of cards
            acct1cards.push(event.args.id.toString());

            // Make sure an event fired
            eventPresent = true;
          }
        }

        // Verify that the event fired
        expect(eventPresent).to.equal(true);
      } else {
        await expectRevert(f473Contract.connect(acct1).claimSoloCard(0), (level <= 9) ? 'Can only claim solo cards' : 'Invalid index');
      }

      // Go to the next level
      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
  });

  it('Should get all card characters at once', async function () {
    for (let level = 1; level <= 12; level++) {
      let cards = await f473Contract.getCurrentCardCharacters();

      // Test number
      let COUNT = NUM_SOLO;
      if (level > 3) COUNT += NUM_PAIR;
      if (level > 6) COUNT += NUM_COUPLE;

      // Test all cards
      for (let cardIdx in cards) {
        let card = cards[cardIdx];
        if (cardIdx > 9 - level) {
          expect(card).to.be.equal(0);
        } else {
          expect(card).to.be.gte(1);
          expect(card).to.be.lte(COUNT);
        }
      }

      // Force a roll
      await f473Contract.connect(acct1).roll();

      // Go to the next level
      ethers.provider.send("evm_increaseTime", [60 * 10]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
  });

  it('Should allow account to trade in two solos for a pair card', async function () {
    // Go to the level before paired cards show up
    ethers.provider.send("evm_increaseTime", [60 * 10 * 2]); // Increase to Level 3, we'll jump to level 4
    ethers.provider.send("evm_mine");

    let level = await f473Contract.getLevel();
    expect(level).to.be.equal(3);

    // Find a paired card
    let pairedIndex, selectedCard;
    do {
      await f473Contract.connect(acct1).roll();
      ethers.provider.send("evm_increaseTime", [60 * 10]);
      ethers.provider.send("evm_mine");

      // Check the cards
      let characters = await f473Contract.getCurrentCardCharacters();

      for (let characterIdx in characters) {
        if (characters[characterIdx].toNumber() > NUM_SOLO && characters[characterIdx].toNumber() <= NUM_SOLO + NUM_PAIR) {
          pairedIndex = characterIdx;
          selectedCard = characters[characterIdx].toNumber();
        }
      }
    } while (pairedIndex === undefined || pairedIndex === null);

    // Determine which cards we're trading in
    inputCards = [
      acct1cards.pop(),
      acct1cards.pop()
    ];

    // Issue the claim card
    let tx = await f473Contract.connect(acct1).tradeForPairCard(inputCards[0], inputCards[1], pairedIndex);
    let receipt = await tx.wait();

    // Now review the events
    let eventsPresent = 0;
    for (const event of receipt.events) {
      if (event.event === 'TransferSingle') {
        if (event.args.from === '0x0000000000000000000000000000000000000000') {
          // Deconstruct the returned card
          let cardDeconstructed = await f473Contract.deconstructCard(event.args.id.toNumber());

          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
          expect(event.args.to).to.equal(acct1.address);
          expect(cardDeconstructed.character.toNumber()).to.equal(selectedCard);
          expect(event.args.value).to.equal(1);

          // Compare the background and audio
          //expect(cardDeconstructed.background.toNumber()).to.equal(background.toNumber());
          //expect(cardDeconstructed.audio.toNumber()).to.equal(audio.toNumber());

        } else {
          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal(acct1.address);
          expect(event.args.to).to.equal('0x0000000000000000000000000000000000000000');
          expect(event.args.id.toString()).to.equal(inputCards.shift());
          expect(event.args.value).to.equal(1);
        }

        // Make sure an event fired
        eventsPresent++;
      }
    }

    // Make sure all three events fired
    expect(eventsPresent).to.equal(3);
  });

  it('Allow owner to mint subset of pair characters to account that are necessary for tests', async function () {
    for (let charIdx = NUM_SOLO; charIdx <= NUM_PAIR + NUM_SOLO; charIdx++) {
      for (let bgIdx = 1; bgIdx <= 1; bgIdx++) {
        for (let audioIdx = NUM_SOLO_AUDIO + 1; audioIdx <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO; audioIdx++) {
          // Mint multiple times
          await f473Contract.connect(owner).mintCard(acct1.address, charIdx, bgIdx, audioIdx);
          await f473Contract.connect(owner).mintCard(acct1.address, charIdx, bgIdx, audioIdx);

          await f473Contract.connect(owner).mintCard(acct2.address, charIdx, bgIdx, audioIdx);
          await f473Contract.connect(owner).mintCard(acct2.address, charIdx, bgIdx, audioIdx);
        }
      }
    }
  });

  it.skip('Allow owner to mint all pair characters to account', async function () {
    for (let charIdx = NUM_SOLO; charIdx <= NUM_PAIR + NUM_SOLO; charIdx++) {
      for (let bgIdx = 1; bgIdx <= NUM_BACKGROUNDS; bgIdx++) {
        for (let audioIdx = NUM_SOLO_AUDIO + 1; audioIdx <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO; audioIdx++) {
          await f473Contract.connect(owner).mintCard(acct1.address, charIdx, bgIdx, audioIdx);
          await f473Contract.connect(owner).mintCard(acct2.address, charIdx, bgIdx, audioIdx);
        }
      }
    }
  });

  it('Allow acct2 to send a pair to get hearts', async function () {
    let eventPresent = false;

    let alternatingCase = 0;
    for (let charIdx = NUM_SOLO + 1; charIdx <= NUM_PAIR + NUM_SOLO; charIdx += 2) {
      ethers.provider.send("evm_increaseTime", [60 * 10]);
      ethers.provider.send("evm_mine");

      let id1CharIdx = charIdx;
      let id2CharIdx = charIdx+1;
      if (alternatingCase++%2==0) {
        id1CharIdx = charIdx+1;
        id2CharIdx = charIdx;
      }

      let id1 = await f473Contract.constructCardManual(id1CharIdx, 1, 2);
      let id2 = await f473Contract.constructCardManual(id2CharIdx, 1, 2);
      let tx = await f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct2.address, id2);
      let receipt = await tx.wait();

      // Now review the event
      for (const event of receipt.events) {
        if (event.event === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
          expect(event.args.to).to.equal(acct2.address);
          expect(event.args.id.toNumber()).to.be.gte(parseInt(0x10001, 10));
          expect(event.args.id.toNumber()).to.be.lte(parseInt(0x10007, 10));
          expect(event.args.value).to.equal(1);

          // Make sure an event fired
          eventPresent = true;
        }
      }
    }

    // Make sure both accounts have hearts
    expect((await f473Contract.balanceOfBatch([
      acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address
    ], [
      parseInt(0x10001, 10), parseInt(0x10002, 10), parseInt(0x10003, 10), parseInt(0x10004, 10), parseInt(0x10005, 10), parseInt(0x10006, 10), parseInt(0x10007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(0);

    expect((await f473Contract.balanceOfBatch([
      acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address
    ], [
      parseInt(0x10001, 10), parseInt(0x10002, 10), parseInt(0x10003, 10), parseInt(0x10004, 10), parseInt(0x10005, 10), parseInt(0x10006, 10), parseInt(0x10007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(NUM_PAIR);

    // Verify that the event fired
    expect(eventPresent).to.equal(true);
  });

  it('Disallow acct2 to send two of acct1 pairs to get hearts', async function () {
    ethers.provider.send("evm_increaseTime", [60 * 10]);
    ethers.provider.send("evm_mine");
    let id1 = await f473Contract.constructCardManual(46, 1, 2);
    let id2 = await f473Contract.constructCardManual(46+1, 1, 2);
    await expectRevert(f473Contract.connect(acct2).tradeForHearts(acct1.address, id1, acct1.address, id2), 'Caller must own at least one card');
  });

  it('Disallow acct2 to send two non-matching pairs to get hearts', async function () {
    ethers.provider.send("evm_increaseTime", [60 * 10]);
    ethers.provider.send("evm_mine");
    let id1 = await f473Contract.constructCardManual(46, 1, 2);
    let id2 = await f473Contract.constructCardManual(46+2, 1, 2);
    await expectRevert(f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct2.address, id2), 'Not a pair');
  });

  it('Allow acct2 to send one of their own and one of acct1 pair solos to get hearts', async function () {
    let eventPresent = false;

    for (let charIdx = NUM_SOLO + 1; charIdx <= NUM_PAIR + NUM_SOLO; charIdx += 2) {
      ethers.provider.send("evm_increaseTime", [60 * 10]);
      ethers.provider.send("evm_mine");

      let id1 = await f473Contract.constructCardManual(charIdx, 1, 2);
      let id2 = await f473Contract.constructCardManual(charIdx+1, 1, 2);
      let tx = await f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct1.address, id2);
      let receipt = await tx.wait();

      // Now review the event
      for (const event of receipt.events) {
        if (event.event === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
          expect(event.args.to).to.be.oneOf([acct1.address, acct2.address]);
          expect(event.args.id.toNumber()).to.be.gte(parseInt(0x10001, 10));
          expect(event.args.id.toNumber()).to.be.lte(parseInt(0x10007, 10));
          expect(event.args.value).to.equal(1);

          // Make sure an event fired
          eventPresent = true;
        }
      }
    }

    // Make sure both accounts have hearts
    expect((await f473Contract.balanceOfBatch([
      acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address
    ], [
      parseInt(0x10001, 10), parseInt(0x10002, 10), parseInt(0x10003, 10), parseInt(0x10004, 10), parseInt(0x10005, 10), parseInt(0x10006, 10), parseInt(0x10007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(NUM_PAIR / 2);

    expect((await f473Contract.balanceOfBatch([
      acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address
    ], [
      parseInt(0x10001, 10), parseInt(0x10002, 10), parseInt(0x10003, 10), parseInt(0x10004, 10), parseInt(0x10005, 10), parseInt(0x10006, 10), parseInt(0x10007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(NUM_PAIR + NUM_PAIR / 2);

    // Verify that the event fired
    expect(eventPresent).to.equal(true);
  });


  // Leaving here
    //console.log((await f473Contract.getLevel()).toNumber());
    //console.log((await f473Contract.getCurrentCardCharacter(0)).toNumber());
    //console.log((await f473Contract.getLoveMeterFilled()).toNumber());
    //console.log((await f473Contract.getLoveDecayRate()).toNumber());
    //console.log((await f473Contract.getLoveMeterSize()).toNumber());
    //console.log(randomRoll, newRandomRoll);

  it('Ensure that Level 9 has all the information needed, and random roll changes when solo or pair is replaced', async function () {
    // Start by finding a level that starts without a couple
    do {
      await forwardToNextLevel9();
    } while ((await f473Contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO + NUM_PAIR);

    expect((await f473Contract.getLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.lte(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(10);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(0);

    // Get the current random roll
    let timeSlice = (await f473Contract.getTimeSlice()).toNumber();
    let randomRoll = (await f473Contract.getRandomNumber(timeSlice)).toString();

    // Send hearts
    await f473Contract.connect(owner).mintHearts(acct1.address, 10);
    await f473Contract.connect(acct1).burnHearts(10);

    let newRandomRoll = (await f473Contract.getRandomNumber(timeSlice)).toString();

    // Expect this to be reset
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(0);

    // Expect new random roll locally
    expect(randomRoll).to.not.equal(newRandomRoll);
  });

  it('Trade for & claim couple card, Verify that decay rate speeds up as wallets claim couples', async function () {
    // Start by finding a level that starts with a couple
    do {
      await forwardToNextLevel9();
    } while ((await f473Contract.getCurrentCardCharacter(0)).toNumber() <= NUM_SOLO + NUM_PAIR);

    expect((await f473Contract.getLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.gt(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(100);

    // Get current character
    let currentCharacter = await f473Contract.getCurrentCardCharacter(0);

    // Trade card in
    let tx = await f473Contract.connect(acct1).tradeForCoupleCard(acct1cards.pop());
    let receipt = await tx.wait();

    // Now review the event
    let eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
        // Deconstruct the returned card
        let cardDeconstructed = await f473Contract.deconstructCard(event.args.id.toNumber());

        // Make sure that the transfer event has everything expected of it - from, to, id, value
        expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.args.to).to.equal(acct1.address);
        expect(cardDeconstructed.character.toNumber()).to.equal(currentCharacter.toNumber());
        expect(event.args.value).to.equal(1);

        // Make sure an event fired
        eventPresent = true;
      }
    }

    // Verify that the event fired
    expect(eventPresent).to.equal(true);

    // Increase in decay rate
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(2);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(100);
  });

  it('Allow players to beat the game', async function () {
    // Start by finding a level that starts without a couple
    do {
      await forwardToNextLevel9();
    } while ((await f473Contract.getCurrentCardCharacter(0)).toNumber() <= NUM_SOLO + NUM_PAIR);

    expect((await f473Contract.getLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.gt(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(100);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(0);

    // Provide the hearts needed from the owner
    await f473Contract.connect(owner).mintHearts(acct1.address, 100);
    await f473Contract.connect(owner).mintHearts(acct2.address, 100);

    // Submit all hearts needed
    await f473Contract.connect(acct1).burnHearts(10);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(9); // Decay rate of 1

    await f473Contract.connect(acct2).burnHearts(10);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(18); // Decay rate of 1

    await f473Contract.connect(acct1).burnHearts(50);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(67); // Decay rate of 1

    await f473Contract.connect(acct2).burnHearts(30);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(96); // Decay rate of 1

    // Sanity check
    expect(await f473Contract.GAME_OVER()).to.equal(false);

    // End the game
    await f473Contract.connect(acct1).burnHearts(7);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(103); // Decay rate does not matter when game is over

    // Game over state
    expect((await f473Contract.getLevel()).toNumber()).to.equal(12);
    expect((await f473Contract.getPhase()).toNumber()).to.equal(4);
    expect(await f473Contract.GAME_OVER()).to.equal(true);
  });


  it('Double check that every random number is unique', async function () {
    let timeSlice = (await f473Contract.getTimeSlice()).toNumber();
    let lastTsRandomNumber;
    for (let idx = 0; idx < timeSlice + 3; idx++) {
      let thisRandomNumber = await f473Contract.getRandomNumber(idx);
      let tsRandomNumber = await f473Contract.randomNumbers(idx);

      if (tsRandomNumber.toString() !== '0') {
        lastTsRandomNumber = tsRandomNumber;
      }

      expect(thisRandomNumber).to.equal(lastTsRandomNumber);
    }
  });

  it('Test getting the time slice after a very, very long period of time', async function () {
    let timeSlice = (await f473Contract.getTimeSlice()).toNumber();
    let lastReasonableRandomNumber = await f473Contract.getRandomNumber(timeSlice + 3);

    ethers.provider.send("evm_increaseTime", [60 * 100000]);
    ethers.provider.send("evm_mine");

    let laterTimeSlice = (await f473Contract.getTimeSlice()).toNumber();
    expect(await f473Contract.getRandomNumber(laterTimeSlice)).to.equal(lastReasonableRandomNumber);
  });

});
