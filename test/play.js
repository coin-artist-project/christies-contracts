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

  const NUM_SOLO         = 45;
  const NUM_PAIR         = 21;
  const NUM_COUPLE       = 6;
  const NUM_SOLO_AUDIO   = 3;
  const NUM_PAIR_AUDIO   = 3;
  const NUM_COUPLE_AUDIO = 3;
  const NUM_BACKGROUNDS  = 9;

  before(async () => {
    [owner, acct1, acct2, ...accts] = await ethers.getSigners();

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
      let card = await f473Contract.getCurrentCardCharacter(iter);
      expect(card).to.be.gte(1);
      expect(card).to.be.lte(NUM_SOLO);
    }

    // Make sure we can't draw more than the level permits (or the game permits)
    await expectRevert(f473Contract.getCurrentCardCharacter(10), 'Invalid index');
  });

  it('Should allow player to claim a card during level 1', async function () {
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
          expect(event.args.to).to.equal(f473Contract.address);
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

});