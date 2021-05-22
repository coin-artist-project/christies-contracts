const { expect } = require('chai');
const hre = require('hardhat');

const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

describe('F473', function () {
  let f473Contract, f473TokensContract, f473ReplayTokenContract;
  let owner;
  let acct1;
  let acct2;
  let puzzleAcct3;
  let accts;

  let acct1cards = [], acct2cards = [];

  let NUM_SOLO;
  let NUM_PAIR;
  let NUM_COUPLE;
  let NUM_SOLO_AUDIO;
  let NUM_PAIR_AUDIO;
  let NUM_COUPLE_AUDIO;
  let NUM_BACKGROUNDS;

  const TIME_SLICE_TIME = 60 * 10;
  const NUM_HEARTS_LEVEL_NINE_COUPLE = 100;
  const NUM_HEARTS_LEVEL_NINE_OTHER = 10;

  const HEARTS_TIME_BUFFER = 100;

  async function forwardToNextLevel9() {
    let sanityLimit = 0;

    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
    ethers.provider.send("evm_mine");

    do {
      await f473Contract.connect(acct1).roll();
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
      ethers.provider.send("evm_mine");
    }
    while ((await f473Contract.getCurrentLevel()).toNumber() !== 9 && sanityLimit++ < 50);

    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(9);
  }

  before(async () => {
    [owner, acct1, acct2, puzzleAcct3, ...accts] = await ethers.getSigners();

    const F473ReplayToken = await ethers.getContractFactory('F473ReplayToken');
    f473ReplayTokenContract = await F473ReplayToken.deploy("https://localhost/{uri}.json");

    const F473Tokens = await ethers.getContractFactory('F473Tokens');
    f473TokensContract = await F473Tokens.deploy();

    const F473 = await ethers.getContractFactory('F473');
    f473Contract = await F473.deploy(
      f473TokensContract.address,
      f473ReplayTokenContract.address,
      puzzleAcct3.address,
      TIME_SLICE_TIME,
      NUM_HEARTS_LEVEL_NINE_COUPLE,
      NUM_HEARTS_LEVEL_NINE_OTHER
    );

    await f473TokensContract.setGameAddress(f473Contract.address);
    await f473ReplayTokenContract.setGameAddress(f473Contract.address);

    NUM_SOLO         = (await f473TokensContract.NUM_SOLO_CHAR()).toNumber();
    NUM_PAIR         = (await f473TokensContract.NUM_PAIR_CHAR()).toNumber();
    NUM_COUPLE       = (await f473TokensContract.NUM_COUPLE_CHAR()).toNumber();
    NUM_SOLO_AUDIO   = (await f473TokensContract.NUM_SOLO_AUDIO()).toNumber();
    NUM_PAIR_AUDIO   = (await f473TokensContract.NUM_PAIR_AUDIO()).toNumber();
    NUM_COUPLE_AUDIO = (await f473TokensContract.NUM_COUPLE_AUDIO()).toNumber();
    NUM_BACKGROUNDS  = (await f473TokensContract.NUM_BACKGROUNDS()).toNumber();
  });

  it('Disallows doing anything if the game is not started', async function () {
    await expectRevert(f473Contract.getGameState(), 'Game not started');
  });

  it('Only allow starting the game once', async function () {
    await f473Contract.startGame();
    await expectRevert.unspecified(f473Contract.startGame());
  });

  it('URI should return as expected', async function () {
    let response = await f473TokensContract.uri(0);
    expect(response).to.equal("https://localhost/{uri}.json");
  });

  it('Should start at level 1, phase 1', async function () {
    let response = await f473Contract.getCurrentLevel();
    expect(response).to.equal(1);

    response = await f473Contract.getCurrentPhase();
    expect(response).to.equal(1);
  });

  it('Should not allow a non-owner to set the URI', async function () {
    await expectRevert(f473TokensContract.connect(acct1).setBaseUri("testbreak"), 'Ownable: caller is not the owner');
    await expectRevert(f473TokensContract.connect(acct2).setBaseUri("testbreak"), 'Ownable: caller is not the owner');
  });

  it('Should not allow a non-owner to set the Game Address', async function () {
    await expectRevert(f473TokensContract.connect(acct1).setGameAddress(acct1.address), 'Ownable: caller is not the owner');
    await expectRevert(f473TokensContract.connect(acct2).setGameAddress(acct1.address), 'Ownable: caller is not the owner');
    await expectRevert(f473ReplayTokenContract.connect(acct1).setGameAddress(acct1.address), 'Ownable: caller is not the owner');
    await expectRevert(f473ReplayTokenContract.connect(acct2).setGameAddress(acct1.address), 'Ownable: caller is not the owner');
  });

  it('Should not allow anyone, not even owner, to try to restart the game directly', async function () {
    await expectRevert(f473Contract.connect(owner).restartGame(), 'Replay Token required');
    await expectRevert(f473Contract.connect(acct1).restartGame(), 'Replay Token required');
    await expectRevert(f473Contract.connect(acct2).restartGame(), 'Replay Token required');
  });

  it('Should allow minting the Replay tokens', async function () {
    await f473ReplayTokenContract.connect(owner).mint(acct2.address, 5);
  });

  it('Should not allow replay token holder to restart game while game is active', async function () {
    await expectRevert(f473ReplayTokenContract.connect(owner).burnAndRestart(), "Game must be over to replay");
    await expectRevert(f473ReplayTokenContract.connect(acct1).burnAndRestart(), "Game must be over to replay");
    await expectRevert(f473ReplayTokenContract.connect(acct2).burnAndRestart(), "Game must be over to replay");
  });

  it('Should allow owner to set the URI', async function () {
    let newUri = "https://portal.neondistrict.io/f473.json";
    await f473TokensContract.setBaseUri(newUri);

    let response = await f473TokensContract.uri(0);
    expect(response).to.equal(newUri);
  });

  it('Should not allow a non-allowed address to perform critical actions', async function () {
    await expectRevert(f473Contract.connect(acct1).claimSoloCard(0), 'Address is not permitted');
  });

  it('Should not allow a non-owner or non-game address from minting', async function () {
    await expectRevert(f473TokensContract.connect(acct1).mintCard(acct1.address, 1, 1, 1, 1), 'Game or owner caller only');
    await expectRevert(f473TokensContract.connect(acct2).mintCard(acct1.address, 1, 1, 1, 1), 'Game or owner caller only');
    await expectRevert(f473TokensContract.connect(acct1).mintHearts(acct1.address, 1, 1, 1), 'Game or owner caller only');
    await expectRevert(f473TokensContract.connect(acct2).mintHearts(acct1.address, 1, 1, 1), 'Game or owner caller only');
    await expectRevert(f473TokensContract.connect(acct1).burn(acct1.address, 1, 1), 'Game or owner caller only');
    await expectRevert(f473TokensContract.connect(acct2).burn(acct1.address, 1, 1), 'Game or owner caller only');
  });

  it('Get all lights, should be zero', async function () {
    let lights = (await f473Contract.getLights());

    for (let light of lights) {
      expect(light.toNumber()).to.equal(0);
    }
  });

  


  /**
   * Gameplay
   **/

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

  it('Should iterate through all levels and phases as expected over a 4 hour period & also get appropriate positions', async function () {
    for (let iter = 0; iter < 24; iter++) {
      let gameState = await f473Contract.getGameState();
      // RBH TODO -- can do expects here to make sure everything is kosher

      let level = await f473Contract.getCurrentLevel();
      expect(level).to.equal((iter + 1) % 12 > 9 ? 0 : (iter + 1) % 12);

      let phase = await f473Contract.getCurrentPhase();
      expect(phase).to.equal((iter + 1) % 12 > 9 ? 0 : (Math.floor(iter / 3) + 1) % 4);

      let timeSlice = await f473Contract.getTimeSlice();
      expect(timeSlice).to.equal(iter);

      let positions = await f473Contract.getCardCharacterPositions(timeSlice);
      let foundPositions = [];

      //console.log(positions.map((a) => { return a.toNumber()}).join(' | '));

      if (level >= 1 && level <= 9) {
        for (let idx = 0; idx <= 9 - level; idx++) {
          expect(foundPositions.indexOf(positions[idx].toNumber()) === -1).to.equal(true);
          foundPositions.push(positions[idx].toNumber());
        }
      } else {
        for (let idx = 0; idx < 9; idx++) {
          expect(positions[idx].toNumber()).to.equal(0);
        }
      }

      //console.log("level:", level, "- phase:", phase, "- time slice:", iter);

      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");

      // Do some work, but not in the last block since we're going to do something else after
      if (iter < 23) {
        await f473Contract.connect(acct1).roll();
        await f473Contract.connect(acct2).roll();
      }
    }

    let level = await f473Contract.getCurrentLevel();
    expect(level).to.equal(1);

    let phase = await f473Contract.getCurrentPhase();
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
    for (const log of receipt.logs) {
      let event;
      try {
        event = f473TokensContract.interface.parseLog(log);
      } catch (_) {
        continue;
      }

      if (event.name === 'TransferSingle') {
        // Deconstruct the returned card
        let cardDeconstructed = await f473TokensContract.deconstructCard(event.args.id.toNumber());

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
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]); // Increase by 10 minutes
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
        let nextNextRandomNumber = await f473Contract.getRandomNumber(timeSlice + 2);

        // Get the expected background & audio for this layer
        let background = await f473Contract.getCurrentCardBackground(viableSelection);
        let audio = await f473Contract.getCurrentCardAudio();

        // Issue the claim card
        let tx = await f473Contract.connect(acct1).claimSoloCard(viableSelection);
        let receipt = await tx.wait();

        // Random number for *this* time slice should stay the same, random number for *next* time slice should change
        expect((await f473Contract.getRandomNumber(timeSlice)).toString()).to.equal(thisRandomNumber.toString());
        expect((await f473Contract.getRandomNumber(timeSlice + 1)).toString()).to.not.equal(nextRandomNumber.toString());
        expect((await f473Contract.getRandomNumber(timeSlice + 2)).toString()).to.not.equal(nextNextRandomNumber.toString());

        // Now review the event
        let eventPresent = false;
        for (const log of receipt.logs) {
          let event;
          try {
            event = f473TokensContract.interface.parseLog(log);
          } catch (_) {
            continue;
          }

          if (event.name === 'TransferSingle') {
            // Deconstruct the returned card
            let cardDeconstructed = await f473TokensContract.deconstructCard(event.args.id.toNumber());

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
        if (level > 9) {
          let timeRemaining = await f473Contract.getLevelTimeRemaining();
          expect(timeRemaining.toNumber()).to.be.lt(TIME_SLICE_TIME * (12 - level + 1));
          expect(timeRemaining.toNumber()).to.be.gt(TIME_SLICE_TIME * (12 - level));
        }
        await expectRevert(f473Contract.connect(acct1).claimSoloCard(0), (level <= 9) ? 'Can only claim solo cards' : 'Invalid index');
      }

      // Go to the next level
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]); // Increase by 10 minutes
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
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]); // Increase by 10 minutes
      ethers.provider.send("evm_mine");
    }
  });

  it('Should allow account to trade in two solos for a pair card', async function () {
    // Go to the level before paired cards show up
    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME * 2]); // Increase to Level 3, we'll jump to level 4
    ethers.provider.send("evm_mine");

    let level = await f473Contract.getCurrentLevel();
    expect(level).to.be.equal(3);

    // Find a paired card
    let pairedIndex, selectedCard;
    do {
      await f473Contract.connect(acct1).roll();
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
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
    for (const log of receipt.logs) {
      let event;
      try {
        event = f473TokensContract.interface.parseLog(log);
      } catch (_) {
        continue;
      }

      if (event.name === 'TransferSingle') {
        if (event.args.from === '0x0000000000000000000000000000000000000000') {
          // Deconstruct the returned card
          let cardDeconstructed = await f473TokensContract.deconstructCard(event.args.id.toNumber());

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
          await f473TokensContract.connect(owner).mintCard(acct1.address, charIdx, bgIdx, audioIdx, 1);
          await f473TokensContract.connect(owner).mintCard(acct1.address, charIdx, bgIdx, audioIdx, 1);

          await f473TokensContract.connect(owner).mintCard(acct2.address, charIdx, bgIdx, audioIdx, 1);
          await f473TokensContract.connect(owner).mintCard(acct2.address, charIdx, bgIdx, audioIdx, 1);
        }
      }
    }
  });

  it.skip('Allow owner to mint all pair characters to account', async function () {
    for (let charIdx = NUM_SOLO; charIdx <= NUM_PAIR + NUM_SOLO; charIdx++) {
      for (let bgIdx = 1; bgIdx <= NUM_BACKGROUNDS; bgIdx++) {
        for (let audioIdx = NUM_SOLO_AUDIO + 1; audioIdx <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO; audioIdx++) {
          await f473TokensContract.connect(owner).mintCard(acct1.address, charIdx, bgIdx, audioIdx, 1);
          await f473TokensContract.connect(owner).mintCard(acct2.address, charIdx, bgIdx, audioIdx, 1);
        }
      }
    }
  });

  it('Disallow acct2 to send two of the same pair card to claim hearts', async function () {
    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
    ethers.provider.send("evm_mine");
    let id1 = await f473TokensContract.constructCardManual(46, 1, 2, 1);
    await expectRevert(f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct2.address, id1), 'Not a pair');
  });

  it('Allow acct2 to send a pair to get hearts', async function () {
    let eventPresent = false;

    let alternatingCase = 0;
    for (let charIdx = NUM_SOLO + 1; charIdx <= NUM_PAIR + NUM_SOLO; charIdx += 2) {
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
      ethers.provider.send("evm_mine");

      let id1CharIdx = charIdx;
      let id2CharIdx = charIdx+1;
      if (alternatingCase++%2==0) {
        id1CharIdx = charIdx+1;
        id2CharIdx = charIdx;
      }

      let id1 = await f473TokensContract.constructCardManual(id1CharIdx, 1, 2, 1);
      let id2 = await f473TokensContract.constructCardManual(id2CharIdx, 1, 2, 1);
      let tx = await f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct2.address, id2);
      let receipt = await tx.wait();

      // Now review the event
      for (const log of receipt.logs) {
        let event;
        try {
          event = f473TokensContract.interface.parseLog(log);
        } catch (_) {
          continue;
        }

        if (event.name === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
          expect(event.args.to).to.equal(acct2.address);
          expect(event.args.id.toNumber()).to.be.gte(parseInt(0x110001, 10));
          expect(event.args.id.toNumber()).to.be.lte(parseInt(0x110007, 10));
          expect(event.args.value).to.equal(1);

          // Make sure an event fired
          eventPresent = true;
        }
      }
    }

    // Verify that the event fired
    expect(eventPresent).to.equal(true);

    // Make sure both accounts have hearts
    expect((await f473TokensContract.balanceOfBatch([
      acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address
    ], [
      parseInt(0x110001, 10), parseInt(0x110002, 10), parseInt(0x110003, 10), parseInt(0x110004, 10), parseInt(0x110005, 10), parseInt(0x110006, 10), parseInt(0x110007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(0);

    expect((await f473TokensContract.balanceOfBatch([
      acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address
    ], [
      parseInt(0x110001, 10), parseInt(0x110002, 10), parseInt(0x110003, 10), parseInt(0x110004, 10), parseInt(0x110005, 10), parseInt(0x110006, 10), parseInt(0x110007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(NUM_PAIR);
  });

  it('Disallow acct2 to send two of acct1 pairs to get hearts', async function () {
    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
    ethers.provider.send("evm_mine");
    let id1 = await f473TokensContract.constructCardManual(46, 1, 2, 1);
    let id2 = await f473TokensContract.constructCardManual(46+1, 1, 2, 1);
    await expectRevert(f473Contract.connect(acct2).tradeForHearts(acct1.address, id1, acct1.address, id2), 'Caller must own at least one card');
  });

  it('Disallow acct2 to send two non-matching pairs to get hearts', async function () {
    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
    ethers.provider.send("evm_mine");
    let id1 = await f473TokensContract.constructCardManual(46, 1, 2, 1);
    let id2 = await f473TokensContract.constructCardManual(46+2, 1, 2, 1);
    await expectRevert(f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct2.address, id2), 'Not a pair');
  });

  it('Allow acct2 to send one of their own and one of acct1 pair solos to get hearts', async function () {
    let eventPresent = false;

    for (let charIdx = NUM_SOLO + 1; charIdx <= NUM_PAIR + NUM_SOLO; charIdx += 2) {
      ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
      ethers.provider.send("evm_mine");

      let id1 = await f473TokensContract.constructCardManual(charIdx, 1, 2, 1);
      let id2 = await f473TokensContract.constructCardManual(charIdx+1, 1, 2, 1);
      let tx = await f473Contract.connect(acct2).tradeForHearts(acct2.address, id1, acct1.address, id2);
      let receipt = await tx.wait();

      // Now review the event
      for (const log of receipt.logs) {
        let event;
        try {
          event = f473TokensContract.interface.parseLog(log);
        } catch (_) {
          continue;
        }

        if (event.name === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
          expect(event.args.to).to.be.oneOf([acct1.address, acct2.address]);
          expect(event.args.id.toNumber()).to.be.gte(parseInt(0x110001, 10));
          expect(event.args.id.toNumber()).to.be.lte(parseInt(0x110007, 10));
          expect(event.args.value).to.equal(1);

          // Make sure an event fired
          eventPresent = true;
        }
      }

      // And review the PairCardTraded event
      let localEventPresent = false;
      for (const event of receipt.events) {
        if (event.event === 'PairCardTraded') {
          // Make sure that the transfer event has everything expected of it - from, to, id, value
          expect(event.args.from).to.equal(acct1.address);
          expect(event.args.id.toNumber()).to.equal(id2.toNumber());

          // Make sure an event fired
          localEventPresent = true;
        }
      }
      // Verify that the event fired
      expect(localEventPresent).to.equal(true);
    }

    // Make sure both accounts have hearts
    expect((await f473TokensContract.balanceOfBatch([
      acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address, acct1.address
    ], [
      parseInt(0x110001, 10), parseInt(0x110002, 10), parseInt(0x110003, 10), parseInt(0x110004, 10), parseInt(0x110005, 10), parseInt(0x110006, 10), parseInt(0x110007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(NUM_PAIR / 2);

    expect((await f473TokensContract.balanceOfBatch([
      acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address, acct2.address
    ], [
      parseInt(0x110001, 10), parseInt(0x110002, 10), parseInt(0x110003, 10), parseInt(0x110004, 10), parseInt(0x110005, 10), parseInt(0x110006, 10), parseInt(0x110007, 10)
    ])).reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})).to.equal(NUM_PAIR + NUM_PAIR / 2);

    // Verify that the event fired
    expect(eventPresent).to.equal(true);
  });


  // Leaving here
    //console.log((await f473Contract.getCurrentLevel()).toNumber());
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

    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.lte(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_OTHER);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(0);

    // Get the current random roll
    let timeSlice = (await f473Contract.getTimeSlice()).toNumber();
    let randomRoll = (await f473Contract.getRandomNumber(timeSlice)).toString();

    // Send hearts
    await f473TokensContract.connect(owner).mintHearts(acct1.address, f473Contract.heartsRandom(0), 1, NUM_HEARTS_LEVEL_NINE_OTHER + HEARTS_TIME_BUFFER);
    let tx = await f473Contract.connect(acct1).burnHearts(NUM_HEARTS_LEVEL_NINE_OTHER + HEARTS_TIME_BUFFER);
    let receipt = await tx.wait();

    // Check that decay event was emitted
    let eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'RandomNumberUpdated') {
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

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

    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.gt(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_COUPLE);

    // Get current character
    let currentCharacter = await f473Contract.getCurrentCardCharacter(0);

    // Trade card in
    let tx = await f473Contract.connect(acct1).tradeForCoupleCard(acct1cards.pop(), 0);
    let receipt = await tx.wait();

    // Now review the event
    let eventPresent = false;
    for (const log of receipt.logs) {
      let event;
      try {
        event = f473TokensContract.interface.parseLog(log);
      } catch (_) {
        continue;
      }

      if (event.name === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
        // Deconstruct the returned card
        let cardDeconstructed = await f473TokensContract.deconstructCard(event.args.id.toNumber());

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

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(0);
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    // Increase in decay rate
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(2);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_COUPLE);
  });

  it('Claim solo card, verify that decay occurs', async function () {
    // Start by finding a level that starts with a couple
    do {
      await forwardToNextLevel9();
    } while ((await f473Contract.getCurrentCardCharacter(0)).toNumber() >= NUM_SOLO);

    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.lte(NUM_SOLO);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_OTHER);

    // Get current character
    let currentCharacter = await f473Contract.getCurrentCardCharacter(0);

    // Trade card in
    let tx = await f473Contract.connect(acct1).claimSoloCard(0);
    let receipt = await tx.wait();

    // Now review the event
    let eventPresent = false;
    for (const log of receipt.logs) {
      let event;
      try {
        event = f473TokensContract.interface.parseLog(log);
      } catch (_) {
        continue;
      }

      if (event.name === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
        // Deconstruct the returned card
        let cardDeconstructed = await f473TokensContract.deconstructCard(event.args.id.toNumber());

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

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(0);
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    // Increase in decay rate
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_OTHER);
  });

  it('Trade & claim pair card, verify that decay occurs', async function () {
    // Start by finding a level that starts with a couple
    do {
      await forwardToNextLevel9();
    } while (
      (await f473Contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO + NUM_PAIR ||
      (await f473Contract.getCurrentCardCharacter(0)).toNumber() <= NUM_SOLO
    );

    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.gt(NUM_SOLO);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.lte(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_OTHER);

    // Get current character
    let currentCharacter = await f473Contract.getCurrentCardCharacter(0);

    // Trade card in
    let tx = await f473Contract.connect(acct1).tradeForPairCard(acct1cards.pop(), acct1cards.pop(), 0);
    let receipt = await tx.wait();

    // Now review the event
    let eventPresent = false;
    for (const log of receipt.logs) {
      let event;
      try {
        event = f473TokensContract.interface.parseLog(log);
      } catch (_) {
        continue;
      }

      if (event.name === 'TransferSingle' && event.args.from === '0x0000000000000000000000000000000000000000') {
        // Deconstruct the returned card
        let cardDeconstructed = await f473TokensContract.deconstructCard(event.args.id.toNumber());

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

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(0);
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    // Increase in decay rate
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_OTHER);
  });

  async function beatTheGame(version = 1) {
    // Start by finding a level that starts without a couple
    do {
      await forwardToNextLevel9();
    } while ((await f473Contract.getCurrentCardCharacter(0)).toNumber() <= NUM_SOLO + NUM_PAIR);

    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(9);
    expect((await f473Contract.getCurrentCardCharacter(0)).toNumber()).to.be.gt(NUM_SOLO + NUM_PAIR);
    expect((await f473Contract.getLoveDecayRate()).toNumber()).to.equal(1);
    expect((await f473Contract.getLoveMeterSize()).toNumber()).to.equal(NUM_HEARTS_LEVEL_NINE_COUPLE);
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(0);

    // Provide the hearts needed from the owner
    await f473TokensContract.connect(owner).mintHearts(acct1.address, f473Contract.heartsRandom(0), 1, NUM_HEARTS_LEVEL_NINE_COUPLE + HEARTS_TIME_BUFFER);
    await f473TokensContract.connect(owner).mintHearts(acct2.address, f473Contract.heartsRandom(0), 1, NUM_HEARTS_LEVEL_NINE_COUPLE + HEARTS_TIME_BUFFER);

    // Submit all hearts needed
    let tx = await f473Contract.connect(acct1).burnHearts(10);
    let receipt = await tx.wait();
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(Math.max(0, 10));

    // Check that decay event was emitted
    let eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(Math.max(0, 10));
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    // Eat some of the hearts
    tx = await f473Contract.connect(acct1).tradeForCoupleCard(acct1cards.pop(), 0);
    receipt = await tx.wait();

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(Math.max(0, 8));
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    tx = await f473Contract.connect(acct2).burnHearts(10);
    receipt = await tx.wait();
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(Math.max(0, 18));

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(Math.max(0, 18));
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    tx = await f473Contract.connect(acct1).burnHearts(50);
    receipt = await tx.wait();
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(Math.max(0, 68));

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(Math.max(0, 68));
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    tx = await f473Contract.connect(acct2).burnHearts(31);
    receipt = await tx.wait();
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(Math.max(0, 99));

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'HeartsBurned') {
        expect(event.args.currentBurned).to.equal(Math.max(0, 99));
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    // Sanity check
    expect(await f473Contract.GAME_OVER()).to.equal(false);

    // End the game
    tx = await f473Contract.connect(acct1).burnHearts(1);
    receipt = await tx.wait();
    expect((await f473Contract.getLoveMeterFilled()).toNumber()).to.equal(Math.max(0, 100));

    // Check that decay event was emitted
    eventPresent = false;
    for (const event of receipt.events) {
      if (event.event === 'GameOver') {
        eventPresent = true;
      }
    }
    expect(eventPresent).to.equal(true);

    // Game over state
    expect((await f473Contract.getCurrentLevel()).toNumber()).to.equal(12);
    expect((await f473Contract.getCurrentPhase()).toNumber()).to.equal(4);
    expect(await f473Contract.GAME_OVER()).to.equal(true);
  }

  it('Allow players to beat the game', beatTheGame.bind(this, 1));

  it('Should not allow non-replay token holder to restart game without token', async function () {
    await expectRevert(f473ReplayTokenContract.connect(owner).burnAndRestart(), "ERC1155: burn amount exceeds balance");
    await expectRevert(f473ReplayTokenContract.connect(acct1).burnAndRestart(), "ERC1155: burn amount exceeds balance");
  });

  it('Should allow replay token holder to replay game', async function () {
    // Make sure game is over
    expect(await f473Contract.GAME_OVER()).to.equal(true);

    await f473ReplayTokenContract.connect(acct2).burnAndRestart();
    expect((await f473ReplayTokenContract.balanceOf(acct2.address, 1)).toNumber()).to.equal(4);

    // Check that game is restarted
    expect(await f473Contract.GAME_OVER()).to.equal(false);

    // Move to the next time frame for the following test
    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
    ethers.provider.send("evm_mine");
  });

  it('Allow players to beat the game [again]', beatTheGame.bind(this, 2));

  it('Should allow regular players to restart the game using hearts', async function () {
    // Mint all hearts
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 1, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 2, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 3, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 4, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 5, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 6, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 7, 1, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 1, 2, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 2, 2, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 3, 2, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 4, 2, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 5, 2, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 6, 2, 40);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 7, 2, 40);

    // Set all of the lights to the restart pattern
    await f473Contract.connect(acct1).burnHeartLightRegion(0, 0x210001);
    await f473Contract.connect(acct1).burnHeartLightRegion(1, 0x110002);
    await f473Contract.connect(acct1).burnHeartLightRegion(2, 0x210003);
    await f473Contract.connect(acct1).burnHeartLightRegion(3, 0x210004);
    await f473Contract.connect(acct1).burnHeartLightRegion(4, 0x110005);
    await f473Contract.connect(acct1).burnHeartLightRegion(5, 0x210006);
    await f473Contract.connect(acct1).burnHeartLightRegion(6, 0x210007);
    await f473Contract.connect(acct1).burnHeartLightRegion(7, 0x210006);

    // Check that game is still over
    expect(await f473Contract.GAME_OVER()).to.equal(true);

    // Final color
    await f473Contract.connect(acct1).burnHeartLightRegion(8, 0x110005);

    // Check that game is restarted
    expect(await f473Contract.GAME_OVER()).to.equal(false);
  });

  // Required to verify later that the game is still over after puzzle is solved
  it('Allow players to beat the game [again x2]', beatTheGame.bind(this, 3));

  it('Enumerate both accounts tokens', async function () {
    let acct1Tokens = (await f473TokensContract.getAccountTokensCount(acct1.address)).toNumber();
    let acct2Tokens = (await f473TokensContract.getAccountTokensCount(acct2.address)).toNumber();

    expect(acct1Tokens).to.be.gte(1);
    expect(acct2Tokens).to.be.gte(1);

    let acct1TokenAtIndex = (await f473TokensContract.getAccountTokensByIndex(acct1.address, 0)).toNumber();
    let acct2TokenAtIndex = (await f473TokensContract.getAccountTokensByIndex(acct2.address, 0)).toNumber();

    expect(acct1TokenAtIndex).to.be.gte(1);
    expect(acct2TokenAtIndex).to.be.gte(1);

    // Enumerate
    let pageSize = 100, tokenCount = 0;
    for (let cursor = 0; cursor < acct1Tokens; cursor += pageSize) {
      let tokens = await f473TokensContract.getAccountTokensPaginated(acct1.address, cursor, pageSize);
      tokenCount += tokens.tokenIds.length;
      expect(tokens.tokenIds.length).to.equal(tokens.amounts.length);
    }

    expect(acct1Tokens).to.equal(tokenCount);

    tokenCount = 0;
    for (let cursor = 0; cursor < acct2Tokens; cursor += pageSize) {
      let tokens = await f473TokensContract.getAccountTokensPaginated(acct2.address, cursor, pageSize);
      tokenCount += tokens.tokenIds.length;
      expect(tokens.tokenIds.length).to.equal(tokens.amounts.length);
    }

    expect(acct2Tokens).to.equal(tokenCount);
  });


  /**
   * Hearts & Lights
   **/

  it('Send various hearts, should light them up appropriately', async function () {
    // Enumerate
    let tokens = await f473TokensContract.getAccountTokensPaginated(acct1.address, 0, 100);

    let lastLitRegion = 0, hearts = [
      ethers.BigNumber.from(0), ethers.BigNumber.from(0), ethers.BigNumber.from(0),
      ethers.BigNumber.from(0), ethers.BigNumber.from(0), ethers.BigNumber.from(0),
      ethers.BigNumber.from(0), ethers.BigNumber.from(0), ethers.BigNumber.from(0)
    ];

    let tokenIds = [...tokens.tokenIds];
    tokenIds.reverse();
    for (let token of tokenIds) {
      if ((token.toNumber() & parseInt(0x10000, 10)) > 0) {
        await f473Contract.connect(acct1).burnHeartLightRegion(lastLitRegion, token);
        hearts[lastLitRegion++] = token;
      }

      if (lastLitRegion > 8) {
        break;
      }
    }

    let lights = (await f473Contract.getLights());

    for (let idx in lights) {
      expect(lights[idx].toNumber()).to.equal(hearts[idx].toNumber());
    }

  });

  it('Should not allow a non-heart token to change the color of the lights', async function () {
    // Enumerate
    let tokens = await f473TokensContract.getAccountTokensPaginated(acct1.address, 0, 100);

    let lastLitRegion = 0, hearts = [];
    for (let token of tokens.tokenIds) {
      if ((token.toNumber() & parseInt(0x10000, 10)) === 0) {
        await expectRevert(f473Contract.connect(acct1).burnHeartLightRegion(0, token), 'Only hearts');
      }
    }
  });

  it('Test enumaration of assets', async function () {
    // Enumerate
    let tokens = await f473TokensContract.getAccountTokensFormatted(acct1.address, 0, 100);

    expect(tokens.tokenIds.length).to.be.gt(0);
    expect(tokens.character.length).to.equal(tokens.tokenIds.length);
    expect(tokens.background.length).to.equal(tokens.tokenIds.length);
    expect(tokens.audio.length).to.equal(tokens.tokenIds.length);
    expect(tokens.version.length).to.equal(tokens.tokenIds.length);
    expect(tokens.amounts.length).to.equal(tokens.tokenIds.length);
  });


  /**
   * Puzzle Prize checks & Puzzle Game Over
   **/

  it('F473 Contract should know that puzzle prize is unclaimed', async function () {
    let response = await f473Contract.checkPuzzlePrizeNotEmpty();
    expect(response).to.equal(true);
  });

  it('F473 Contract should see when puzzle prize is claimed', async function () {
    await puzzleAcct3.sendTransaction({
        from: puzzleAcct3.address,
        to: acct2.address,
        value: (await puzzleAcct3.getBalance()).sub("168008000000000")._hex // Subtract gas fee, convert to hex
    });

    let response = await f473Contract.checkPuzzlePrizeNotEmpty();
    expect(response).to.equal(false);
  });

  it('Should NOT allow regular players to restart the game using hearts', async function () {
    // Mint all hearts
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 1, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 2, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 3, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 4, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 5, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 6, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 7, 1, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 1, 2, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 2, 2, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 3, 2, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 4, 2, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 5, 2, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 6, 2, 20);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 7, 2, 20);

    // Set all of the lights to the restart pattern
    await f473Contract.connect(acct1).burnHeartLightRegion(0, 0x210001);
    await f473Contract.connect(acct1).burnHeartLightRegion(1, 0x110002);
    await f473Contract.connect(acct1).burnHeartLightRegion(2, 0x210003);
    await f473Contract.connect(acct1).burnHeartLightRegion(3, 0x210004);
    await f473Contract.connect(acct1).burnHeartLightRegion(4, 0x110005);
    await f473Contract.connect(acct1).burnHeartLightRegion(5, 0x210006);
    await f473Contract.connect(acct1).burnHeartLightRegion(6, 0x210007);
    await f473Contract.connect(acct1).burnHeartLightRegion(7, 0x210006);

    // Check that game is still over
    expect(await f473Contract.GAME_OVER()).to.equal(true);

    // Final color
    await f473Contract.connect(acct1).burnHeartLightRegion(8, 0x110005);

    // Check that game is restarted
    expect(await f473Contract.GAME_OVER()).to.equal(true);
  });

  it('Should allow replay token holder to replay game EVEN THOUGH puzzle is solved', async function () {
    // Make sure game is over
    expect(await f473Contract.GAME_OVER()).to.equal(true);

    await f473ReplayTokenContract.connect(acct2).burnAndRestart();
    expect((await f473ReplayTokenContract.balanceOf(acct2.address, 1)).toNumber()).to.equal(3);

    // Check that game is restarted
    expect(await f473Contract.GAME_OVER()).to.equal(false);

    // Move to the next time frame for the following test
    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME]);
    ethers.provider.send("evm_mine");
  });

  it('Allow players to beat the game [again x3]', beatTheGame.bind(this, 4));

  it('Should NOT allow regular players to restart the game using hearts [again]', async function () {
    // Mint all hearts
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 1, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 2, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 3, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 4, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 5, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 6, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 7, 1, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 1, 2, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 2, 2, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 3, 2, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 4, 2, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 5, 2, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 6, 2, 2);
    await f473TokensContract.connect(owner).mintHearts(acct1.address, 7, 2, 2);

    // Set all of the lights to the restart pattern
    await f473Contract.connect(acct1).burnHeartLightRegion(0, 0x210001);
    await f473Contract.connect(acct1).burnHeartLightRegion(1, 0x110002);
    await f473Contract.connect(acct1).burnHeartLightRegion(2, 0x210003);
    await f473Contract.connect(acct1).burnHeartLightRegion(3, 0x210004);
    await f473Contract.connect(acct1).burnHeartLightRegion(4, 0x110005);
    await f473Contract.connect(acct1).burnHeartLightRegion(5, 0x210006);
    await f473Contract.connect(acct1).burnHeartLightRegion(6, 0x210007);
    await f473Contract.connect(acct1).burnHeartLightRegion(7, 0x210006);

    // Check that game is still over
    expect(await f473Contract.GAME_OVER()).to.equal(true);

    // Final color
    await f473Contract.connect(acct1).burnHeartLightRegion(8, 0x110005);

    // Check that game is restarted
    expect(await f473Contract.GAME_OVER()).to.equal(true);
  });



  /**
   * Final sanity checks
   **/

  it('Should allow replay token holder to replay game [yet again]', async function () {
    // Make sure game is over
    expect(await f473Contract.GAME_OVER()).to.equal(true);

    await f473ReplayTokenContract.connect(acct2).burnAndRestart();
    expect((await f473ReplayTokenContract.balanceOf(acct2.address, 1)).toNumber()).to.equal(2);

    // Check that game is restarted
    expect(await f473Contract.GAME_OVER()).to.equal(false);
  });

  it('Ensure that we can get the time remaining ahead of the following level', async function () {
    // See how much time is remaining
    let timeRemaining = await f473Contract.getLevelTimeRemaining();

    // Start by finding a level that starts without a couple -- 5 is arbitrary
    for (let idx = 0; idx < 3; idx++) {
      // Bump a minute
      ethers.provider.send("evm_increaseTime", [5]);
      ethers.provider.send("evm_mine");

      // Expect that the time remaining is decreaing by 5 seconds each time 
      let currentTimeRemaining = await f473Contract.getLevelTimeRemaining();
      expect(timeRemaining - currentTimeRemaining).to.equal(5);
      timeRemaining = currentTimeRemaining;
    }
  });

  it('Double check that every random number is unique', async function () {
    let timeSlice = (await f473Contract.getTimeSlice()).toNumber();
    let lastTsRandomNumber;
    for (let idx = 0; idx < timeSlice + 3; idx++) {
      let thisRandomNumber = await f473Contract.getRandomNumber(idx);
      let tsRandomNumber = await f473Contract.randomNumbers(4, idx); // On version four

      if (tsRandomNumber.toString() !== '0') {
        lastTsRandomNumber = tsRandomNumber;
      }

      expect(thisRandomNumber).to.not.equal(lastTsRandomNumber);
    }
  });

  it('Test getting the time slice after a very, very long period of time', async function () {
    let timeSlice = (await f473Contract.getTimeSlice()).toNumber();
    let lastReasonableRandomNumber = await f473Contract.getRandomNumber(timeSlice + 3);

    ethers.provider.send("evm_increaseTime", [TIME_SLICE_TIME * 10000]);
    ethers.provider.send("evm_mine");

    let laterTimeSlice = (await f473Contract.getTimeSlice()).toNumber();
    expect(await f473Contract.getRandomNumber(laterTimeSlice)).to.not.equal(lastReasonableRandomNumber);
  });

});
