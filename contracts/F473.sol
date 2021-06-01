//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./F473Tokens.sol";

contract F473 is ReentrancyGuard, Ownable
{
	// NFT Contract
	F473Tokens public f473tokensContract;

	// Replay Token Address
	address public F473_REPLAY_ADDRESS;

	// Final ending
	bool SHOW_FINAL_ENDING;
	bool SHOW_FINAL_ENDING_TEMPORARY;
	bool IGNORE_FINAL_ENDING_SWITCH;

	// NFTs Config
	uint256 NUM_SOLO_CHAR;
	uint256 NUM_PAIR_CHAR;
	uint256 NUM_COUPLE_CHAR;
	uint256 NUM_BACKGROUNDS;
	uint256 NUM_SOLO_AUDIO;
	uint256 NUM_PAIR_AUDIO;
	uint256 NUM_COUPLE_AUDIO;
	uint256 NUM_FINAL_AUDIO;
	uint256 NUM_HEARTS_COLORS;

	// Hearts token Logic
	uint256 constant NUM_HEARTS_MINTED = 1;
	uint256 public   heartsMinted;

	// Winning the game
	uint256 public NUM_HEARTS_LEVEL_NINE_COUPLE = 347;
	uint256 public NUM_HEARTS_LEVEL_NINE_OTHER = 10;
	mapping(uint256 => mapping (uint256 => uint256)) couplesClaimed;
	mapping(uint256 => mapping (uint256 => uint256)) heartsBurned;
	mapping(uint256 => mapping (uint256 => uint256)) loveDecayRate;

	// Game Config
	uint256 constant NUM_LEVELS = 9;
	uint256 constant LEVELS_PER_PHASE = 3;
	uint256 constant NUM_INTERMISSION_LEVELS = 3;
	uint256 public SECONDS_PER_LEVEL = 10 minutes; // Has override in constructor

	// Game Board Config
	uint256 constant TOTAL_CARD_SLOTS = 9;

	// Game State
	uint256 public GAME_START;
	bool public GAME_OVER;
	uint256 public GAME_VERSION;
	uint256[] public regionHearts;

	// Allowlist & Logic
	mapping (address => bool) allowedAddresses;
	mapping (uint256 => mapping (address => uint256)) addressLastMove;
	bool public REQUIRE_ALLOWLIST = true; // Default is locked

	// RNG
	mapping (uint256 => mapping (uint256 => uint256)) public randomNumbers;
	uint256 lastRandomTimeSlice;

	// Events
	event PairCardTraded(address from, uint256 id);
	event HeartsBurned(uint256 currentBurned);
	event BurnHeartLightRegion();
	event RandomNumberUpdated();
	event GameOver();

	/**
	 * Management
	 */

	constructor(
		address payable _f473TokensAddress,
		address _f473ReplayTokensAddress,
		uint256 _secondsPerLevel,
		uint256 _numHeartsLevelNineCouple,
		uint256 _numHeartsLevelNineOther
	)
		Ownable()
	{
		// Set the F473 Tokens Contract, addresses, and config
		f473tokensContract = F473Tokens(_f473TokensAddress);
		F473_REPLAY_ADDRESS = _f473ReplayTokensAddress;
		SECONDS_PER_LEVEL = _secondsPerLevel;
		NUM_HEARTS_LEVEL_NINE_COUPLE = _numHeartsLevelNineCouple;
		NUM_HEARTS_LEVEL_NINE_OTHER = _numHeartsLevelNineOther;

		// Get all the config values
		NUM_SOLO_CHAR     = f473tokensContract.NUM_SOLO_CHAR();
		NUM_PAIR_CHAR     = f473tokensContract.NUM_PAIR_CHAR();
		NUM_COUPLE_CHAR   = f473tokensContract.NUM_COUPLE_CHAR();
		NUM_BACKGROUNDS   = f473tokensContract.NUM_BACKGROUNDS();
		NUM_SOLO_AUDIO    = f473tokensContract.NUM_SOLO_AUDIO();
		NUM_PAIR_AUDIO    = f473tokensContract.NUM_PAIR_AUDIO();
		NUM_COUPLE_AUDIO  = f473tokensContract.NUM_COUPLE_AUDIO();
		NUM_FINAL_AUDIO   = f473tokensContract.NUM_FINAL_AUDIO();
		NUM_HEARTS_COLORS = f473tokensContract.NUM_HEARTS_COLORS();

		// For the very first game, disallow showing the game ending
		IGNORE_FINAL_ENDING_SWITCH = true;

		// Set up the region lights
		regionHearts = new uint256[](9);
	}

	function startGame()
		public
		onlyOwner
	{
		// Require that the game was never started before
		require(GAME_VERSION == 0);

		// Start the game for the first time
		_restartGame();
	}

	function _restartGame()
		internal
	{
		// Increase the game version, starts at 1
		GAME_VERSION++;

		// Set the game start
		GAME_START = block.timestamp;
		GAME_OVER = false;

		// Get time slice
		uint256 timeSlice = getTimeSlice();

		// Set the first few random numbers
		randomNumbers[GAME_VERSION][timeSlice] = uint256(
			keccak256(
				abi.encodePacked(
					blockhash(block.number - 1),
					_msgSender()
				)
			)
		);

		randomNumbers[GAME_VERSION][timeSlice + 1] = uint256(
			keccak256(
				abi.encodePacked(
					randomNumbers[GAME_VERSION][0],
					blockhash(block.number - 1),
					_msgSender()
				)
			)
		);

		randomNumbers[GAME_VERSION][timeSlice + 2] = uint256(
			keccak256(
				abi.encodePacked(
					randomNumbers[GAME_VERSION][1],
					blockhash(block.number - 1),
					_msgSender()
				)
			)
		);

		// Reset all lights
		regionHearts[0] = 0;
		regionHearts[1] = 0;
		regionHearts[2] = 0;
		regionHearts[3] = 0;
		regionHearts[4] = 0;
		regionHearts[5] = 0;
		regionHearts[6] = 0;
		regionHearts[7] = 0;
		regionHearts[8] = 0;

		// Set last random time slice
		lastRandomTimeSlice = timeSlice + 2;
	}

	modifier onlyAllowedAddress() {
		require(!REQUIRE_ALLOWLIST || checkAllowedAddress(_msgSender()), "Address is not permitted");
		_;
	}

	modifier gameStarted() {
		require(GAME_VERSION > 0, "Game not started");
		_;
	}

	modifier gameNotOver() {
		require(checkGameNotOver(), "Game Over");
		_;
	}

	function checkGameNotOver()
		public
		view
		returns (bool)
	{
		return (!GAME_OVER && (!showingFinalEnding() || IGNORE_FINAL_ENDING_SWITCH));
	}

	modifier validTimeSlice(uint256 _timeSlice) {
		require(_timeSlice <= getTimeSlice(), "Invalid time slice");
		_;
	}

	modifier validIndex(uint256 _timeSlice, uint256 _index) {
		require(_index <= TOTAL_CARD_SLOTS - getLevel(_timeSlice) && getLevel(_timeSlice) > 0 && getLevel(_timeSlice) <= 9, "Invalid index");
		_;
	}

	modifier onlyReplayToken() {
		require(_msgSender() == F473_REPLAY_ADDRESS, "Replay Token required");
		_;
	}

	modifier nextRandomNumber() {
		// Do everything else first
		_;

		// We pick two ahead because a time slice is effectively ten minutes, which
		// is safely within the length of reorgs that one can expect on Polygon and
		// we don't want a reorg to happen on blocks right before the slice turnover
		lastRandomTimeSlice = getTimeSlice() + 2;
		updateRandomNumber(lastRandomTimeSlice);
	}

	modifier decayHeartsBurned() {
		// Do everything else first
		_;

		uint256 timeSlice = getTimeSlice();
		if (!GAME_OVER && getLevel(timeSlice) == 9) {
			if (heartsBurned[GAME_VERSION][timeSlice] > (loveDecayRate[GAME_VERSION][timeSlice] + 1)) {
				heartsBurned[GAME_VERSION][timeSlice] -= (loveDecayRate[GAME_VERSION][timeSlice] + 1);
			} else {
				heartsBurned[GAME_VERSION][timeSlice] = 0;
			}
			emit HeartsBurned(heartsBurned[GAME_VERSION][timeSlice]);
		}
	}

	modifier oneActionPerAddressPerTimeSlice() {
		// Make sure that this address hasn't already moved this time slice
		uint256 timeSlice = getTimeSlice();
		require(addressLastMove[GAME_VERSION][_msgSender()] < timeSlice + 1, "Already moved this time frame");
		addressLastMove[GAME_VERSION][_msgSender()] = timeSlice + 1; // Why +1? Because 0 is the first index.
		_;
	}

	function movedThisFrame(
		address _addr
	)
		public
		view
		gameStarted
		returns (bool)
	{
		return addressLastMove[GAME_VERSION][_addr] == (getTimeSlice() + 1);
	}

	function updateRandomNumber(
		uint256 _timeSlice
	)
		internal
	{
		randomNumbers[GAME_VERSION][_timeSlice] = uint256(
			keccak256(
				abi.encodePacked(
					blockhash(block.number - 1),
					_msgSender(),
					randomNumbers[GAME_VERSION][_timeSlice]
				)
			)
		);
	}

	function setNumHeartsLevelNineCouple(
		uint256 _setting
	)
		external
		onlyOwner
	{
		NUM_HEARTS_LEVEL_NINE_COUPLE = _setting;
	}

	function setNumHeartsLevelNineOther(
		uint256 _setting
	)
		external
		onlyOwner
	{
		NUM_HEARTS_LEVEL_NINE_OTHER = _setting;
	}

	function toggleFinalEnding(
		bool _setting
	)
		external
		onlyOwner
	{
		SHOW_FINAL_ENDING = _setting;
	}

	function setInAllowlist(
		address _address,
		bool _setting
	)
		external
		onlyOwner
	{
		allowedAddresses[_address] = _setting;
	}

	function checkAllowedAddress(
		address _address
	)
		public
		view
		returns (bool)
	{
		return allowedAddresses[_address] || f473tokensContract.receivedHeart(_address);
	}

	function toggleAllowlist(
		bool _trueOrFalse
	)
		external
		onlyOwner
	{
		REQUIRE_ALLOWLIST = _trueOrFalse;
	}

	function showingFinalEnding()
		public
		view
		returns (bool)
	{
		return SHOW_FINAL_ENDING || SHOW_FINAL_ENDING_TEMPORARY;
	}

	function showingFinalEndingOnlyTemporary()
		public
		view
		returns (bool)
	{
		return !SHOW_FINAL_ENDING && SHOW_FINAL_ENDING_TEMPORARY;
	}

	function heartsRandom(
		uint256 _idxOffset
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices, +2 for audio + hearts (120 bits shifted)
		uint256 timeSlice = getTimeSlice();
		uint256 randomNumber = getRandomNumber(timeSlice) >> ((NUM_LEVELS + TOTAL_CARD_SLOTS + 2 + heartsMinted % 2 + heartsBurned[GAME_VERSION][timeSlice] % 2) * 6);
		return ((randomNumber + heartsMinted + heartsBurned[GAME_VERSION][timeSlice] + _idxOffset) % NUM_HEARTS_COLORS) + 1;
	}

	function mintCardAtIndex(
		address _to,
		uint256 _index
	)
		internal
	{
		uint256 timeSlice = getTimeSlice();

		uint256 character = getCardCharacter(timeSlice, _index);
		uint256 background = getCardBackground(timeSlice, _index);
		uint256 audio = getLevelAudio(timeSlice);

		f473tokensContract.mintCard(_to, character, background, audio, GAME_VERSION);
	}

	function mintHearts(
		address _to,
		uint256 _amount
	)
		internal
	{
		uint256 heartsIndex = heartsRandom(0);
		heartsMinted += _amount;
		f473tokensContract.mintHearts(_to, heartsIndex, GAME_VERSION, _amount);
	}


	/**
	 * Playing the Game
	 */
	function roll()
		public
		gameStarted
		onlyAllowedAddress
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
	{
		// Doesn't do anything else, forces a random roll change, but acts as a turn
	}

	function claimSoloCard(
		uint256 _index
	)
		public
		gameStarted
		onlyAllowedAddress
		gameNotOver
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
		decayHeartsBurned
	{
		// Determine whether this card is permissible to be claimed
		// Look up the token ID based on the index & game state
		require(getCurrentCardCharacter(_index) <= NUM_SOLO_CHAR, "Can only claim solo cards");

		// If allowed, mint
		mintCardAtIndex(_msgSender(), _index);
	}

	function tradeForPairCard(
		uint256 _cardId1,
		uint256 _cardId2,
		uint256 _index
	)
		public
		gameStarted
		onlyAllowedAddress
		gameNotOver
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
		decayHeartsBurned
	{
		// Determine whether this card is permissible to be claimed
		// Look up the token ID based on the index & game state
		uint256 selectedCharacter = getCurrentCardCharacter(_index);
		require(selectedCharacter > NUM_SOLO_CHAR && selectedCharacter <= (NUM_SOLO_CHAR + NUM_PAIR_CHAR), "Can only claim pair cards");

		// Check that the input cards are valid
		(uint256 character1,,,) = f473tokensContract.deconstructCard(_cardId1);
		require(character1 <= NUM_SOLO_CHAR, "Can only trade in solo cards");

		(uint256 character2,,,) = f473tokensContract.deconstructCard(_cardId2);
		require(character2 <= NUM_SOLO_CHAR, "Can only trade in solo cards");

		// Trade in the cards NOTE TO SELF THIS MIGHT BLOW UP IF WE'RE NOT CATCHING REQUIRE FAILURES
		f473tokensContract.burn(_msgSender(), _cardId1, 1);
		f473tokensContract.burn(_msgSender(), _cardId2, 1);

		// If allowed, mint
		mintCardAtIndex(_msgSender(), _index);
	}

	function tradeForHearts(
		address _cardId1Owner,
		uint256 _cardId1,
		address _cardId2Owner,
		uint256 _cardId2
	)
		public
		gameStarted
		onlyAllowedAddress
		gameNotOver
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
	{
		// Require that one of the owners are the sender
		require(_msgSender() == _cardId1Owner || _msgSender() == _cardId2Owner, "Caller must own at least one card");

		// Check that the input cards are valid
		(uint256 character1,,,) = f473tokensContract.deconstructCard(_cardId1);
		require(character1 > NUM_SOLO_CHAR && character1 <= NUM_SOLO_CHAR + NUM_PAIR_CHAR, "Can only trade in paired solo cards");

		(uint256 character2,,,) = f473tokensContract.deconstructCard(_cardId2);
		require(character2 > NUM_SOLO_CHAR && character2 <= NUM_SOLO_CHAR + NUM_PAIR_CHAR, "Can only trade in paired solo cards");

		// Require that the input cards are a pair - starts at an even number (46)
		require(character1 != character2 && character1 / 2 == character2 / 2, "Not a pair");

		// Trade in the cards NOTE TO SELF THIS MIGHT BLOW UP IF WE'RE NOT CATCHING REQUIRE FAILURES
		f473tokensContract.burn(_cardId1Owner, _cardId1, 1);
		f473tokensContract.burn(_cardId2Owner, _cardId2, 1);

		// Mint hearts
		mintHearts(_cardId1Owner, NUM_HEARTS_MINTED);
		mintHearts(_cardId2Owner, NUM_HEARTS_MINTED);

		if (_cardId1Owner != _cardId2Owner) {
			if (_msgSender() != _cardId1Owner) {
				emit PairCardTraded(_cardId1Owner, _cardId1);
			} else {
				emit PairCardTraded(_cardId2Owner, _cardId2);
			}
		}
	}

	function tradeForCoupleCard(
		uint256 _cardId1,
		uint256 _index
	)
		public
		gameStarted
		onlyAllowedAddress
		gameNotOver
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
		decayHeartsBurned
	{
		// Make sure we're at the last level
		uint256 timeSlice = getTimeSlice();

		// Determine whether this card is permissible to be claimed
		// Look up the token ID based on the index & game state
		uint256 selectedCharacter = getCurrentCardCharacter(_index);
		require(selectedCharacter > NUM_SOLO_CHAR + NUM_PAIR_CHAR && selectedCharacter <= (NUM_SOLO_CHAR + NUM_PAIR_CHAR + NUM_COUPLE_CHAR), "Can only claim couple cards");

		// Verify that the card submitted is a character card
		require(f473tokensContract.isCharacter(_cardId1), "Only characters");

		// Trade in the cards
		f473tokensContract.burn(_msgSender(), _cardId1, 1);

		// Mint card
		mintCardAtIndex(_msgSender(), _index);

		// Increase decay rate
		if (getLevel(timeSlice) == 9) {
			loveDecayRate[GAME_VERSION][timeSlice] += ++couplesClaimed[GAME_VERSION][timeSlice];
		}
	}

	function burnHearts(
		uint256 _amount
	)
		public
		gameStarted
		nonReentrant
		onlyAllowedAddress
		gameNotOver
		nextRandomNumber
		returns (bool)
	{
		// Make sure we're at the last level
		uint256 timeSlice = getTimeSlice();
		require(getLevel(timeSlice) == 9, "Only during level nine");

		// Find any available to burn
		address from = _msgSender();
		uint256 amountLeftToBurn = _amount;
		for (uint256 versionIdx = GAME_VERSION; versionIdx >= 1; versionIdx--) {
			for (uint256 idx = 0; idx < NUM_HEARTS_COLORS; idx++) {
				uint256 heartsId = heartsRandom(idx);
				uint256 balance = f473tokensContract.balanceOf(from, (versionIdx << f473tokensContract.VERSION_BITSHIFT()) + f473tokensContract.HEARTS_ID() + heartsId);

				if (balance > 0 && balance < amountLeftToBurn) {
					f473tokensContract.burn(from, (versionIdx << f473tokensContract.VERSION_BITSHIFT()) + f473tokensContract.HEARTS_ID() + heartsId, balance);
					amountLeftToBurn -= balance;
				} else if (balance > 0 && balance >= amountLeftToBurn) {
					f473tokensContract.burn(from, (versionIdx << f473tokensContract.VERSION_BITSHIFT()) + f473tokensContract.HEARTS_ID() + heartsId, amountLeftToBurn);
					amountLeftToBurn = 0;
				}
			}
		}

		require(amountLeftToBurn == 0);

		// Keep track of number burned
		heartsBurned[GAME_VERSION][timeSlice] += _amount;

		// Perform a specific action based on current card
		(uint256 character,,,) = f473tokensContract.deconstructCard(getCurrentCardCharacter(0));

		// Character card is a couple card
		if (getLoveMeterFilled() >= getLoveMeterSize()) {
			// Couples
			if (character > NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
				IGNORE_FINAL_ENDING_SWITCH = false; // Turn this off now
				GAME_OVER = true;
				emit GameOver();
			// Solos & Pairs
			} else {
				heartsBurned[GAME_VERSION][timeSlice] = 0; // Back to original burned number
				loveDecayRate[GAME_VERSION][timeSlice] = 0; // Decay rate goes to 0 (in effect, 1)
				updateRandomNumber(timeSlice); // Change this level's random number, changes the card
				emit RandomNumberUpdated();
			}
		}

		// Emit event
		emit HeartsBurned(getLoveMeterFilled());

		return GAME_OVER;
	}

	function timeIntoSlice()
		public
		view
		returns (uint256)
	{
		return (block.timestamp - GAME_START) % SECONDS_PER_LEVEL;
	}

	function burnHeartLightRegion(
		uint256 _region,
		uint256 _tokenId,
		bool _unlightInstead
	)
		public
		gameStarted
		nonReentrant
		nextRandomNumber
	{
		require(_region >= 0 && _region <= 8, "Invalid region");
		require((f473tokensContract.HEARTS_ID() & _tokenId) > 0, "Only hearts");
		f473tokensContract.burn(_msgSender(), _tokenId, 1);

		if (_unlightInstead) {
			regionHearts[_region] = 0;
		} else {
			regionHearts[_region] = _tokenId;
		}

		emit BurnHeartLightRegion();

		// Check if the game restarts
		checkGameRestarts();

		// Check if the final ending shows
		checkFinalGameEnding();
	}

	function checkGameRestarts()
		internal
	{
		// If the game is over, but not showing final video, players can restart the game with a desired hearts input
		if (GAME_OVER && !showingFinalEnding()) {
			uint256 TOKENID_BITMASK = ~(f473tokensContract.VERSION_BITMASK());
			if (
				(regionHearts[0] & TOKENID_BITMASK) == 0x10003 &&
				(regionHearts[1] & TOKENID_BITMASK) == 0x10001 &&
				(regionHearts[2] & TOKENID_BITMASK) == 0x00000 &&
				(regionHearts[3] & TOKENID_BITMASK) == 0x10005 &&
				(regionHearts[4] & TOKENID_BITMASK) == 0x00000 &&
				(regionHearts[5] & TOKENID_BITMASK) == 0x10006 &&
				(regionHearts[6] & TOKENID_BITMASK) == 0x10007 &&
				(regionHearts[7] & TOKENID_BITMASK) == 0x10002 &&
				(regionHearts[8] & TOKENID_BITMASK) == 0x10004
			) {
				_restartGame();
			}
		}
	}

	function checkFinalGameEnding()
		internal
	{
		// If the game is over, but not showing final video, players can restart the game with a desired hearts input
		if (GAME_OVER && !showingFinalEnding()) {
			uint256 TOKENID_BITMASK = ~(f473tokensContract.VERSION_BITMASK());
			if (
				(regionHearts[0] & TOKENID_BITMASK) == 0x10004 &&
				(regionHearts[1] & TOKENID_BITMASK) == 0x10002 &&
				(regionHearts[2] & TOKENID_BITMASK) == 0x10007 &&
				(regionHearts[3] & TOKENID_BITMASK) == 0x10006 &&
				(regionHearts[4] & TOKENID_BITMASK) == 0x00000 &&
				(regionHearts[5] & TOKENID_BITMASK) == 0x10005 &&
				(regionHearts[6] & TOKENID_BITMASK) == 0x00000 &&
				(regionHearts[7] & TOKENID_BITMASK) == 0x10001 &&
				(regionHearts[8] & TOKENID_BITMASK) == 0x10003
			) {
				SHOW_FINAL_ENDING_TEMPORARY = true;
			}
		} else if (GAME_OVER && SHOW_FINAL_ENDING_TEMPORARY && !SHOW_FINAL_ENDING) {
			uint256 TOKENID_BITMASK = ~(f473tokensContract.VERSION_BITMASK());
			if (
				(regionHearts[0] & TOKENID_BITMASK) == 0x10004 &&
				(regionHearts[1] & TOKENID_BITMASK) == 0x10002 &&
				(regionHearts[2] & TOKENID_BITMASK) == 0x10007 &&
				(regionHearts[3] & TOKENID_BITMASK) == 0x10006 &&
				(regionHearts[4] & TOKENID_BITMASK) == 0x00000 &&
				(regionHearts[5] & TOKENID_BITMASK) == 0x10005 &&
				(regionHearts[6] & TOKENID_BITMASK) == 0x00000 &&
				(regionHearts[7] & TOKENID_BITMASK) == 0x10001 &&
				(regionHearts[8] & TOKENID_BITMASK) == 0x10003
			) {
				// Do nothing
			} else {
				SHOW_FINAL_ENDING_TEMPORARY = false;
			}
		}
	}

	function restartGame()
		public
		gameStarted
		onlyReplayToken
	{
		// If the prize is empty, bypass this check
		if (SHOW_FINAL_ENDING) {
			IGNORE_FINAL_ENDING_SWITCH = true;
		}

		_restartGame();
	}


	/**
	 * Game Information
	 */

	function getLights()
		public
		view
		gameStarted
		returns (uint256[] memory)
	{
		return regionHearts;
	}

	function getLoveDecayRate()
		public
		view
		gameStarted
		returns (uint256)
	{
		uint256 timeSlice = getTimeSlice();
		if (getLevel(timeSlice) != 9) {
			return 0;
		}

		return loveDecayRate[GAME_VERSION][timeSlice] + 1;
	}

	function getLoveMeterSize()
		public
		view
		gameStarted
		returns (uint256)
	{
		uint256 timeSlice = getTimeSlice();
		if (getLevel(timeSlice) != 9) {
			return 0;
		}

		// Perform a specific action based on current card
		(uint256 character,,,) = f473tokensContract.deconstructCard(getCurrentCardCharacter(0));

		// Character card is a couple card
		if (character > NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
			return NUM_HEARTS_LEVEL_NINE_COUPLE;
		}

		return NUM_HEARTS_LEVEL_NINE_OTHER;
	}

	function getLoveMeterFilled()
		public
		view
		gameStarted
		returns (uint256)
	{
		return heartsBurned[GAME_VERSION][getTimeSlice()];
	}

	function getTimeSlice()
		public
		view
		gameStarted
		returns (uint256)
	{
		return (block.timestamp - GAME_START) / SECONDS_PER_LEVEL;
	}

	function getLevelTimeRemaining()
		public
		view
		gameStarted
		returns (uint256)
	{
		if (getCurrentLevel() >= 12) {
			return 0;
		}

		if (getCurrentLevel() == 0) {
			// Handle intermission
			uint256 levelNumber = getTimeSlice() % (NUM_LEVELS + NUM_INTERMISSION_LEVELS) + 1; 
			return (SECONDS_PER_LEVEL * (NUM_LEVELS + NUM_INTERMISSION_LEVELS - (levelNumber - 1))) - timeIntoSlice();
		}

		return SECONDS_PER_LEVEL - timeIntoSlice();
	}

	function getRandomNumber(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		uint256 _localLastRandomTimeSlice = _timeSlice;
		if (_localLastRandomTimeSlice > lastRandomTimeSlice) {
			_localLastRandomTimeSlice = lastRandomTimeSlice;
		}

		while (randomNumbers[GAME_VERSION][_localLastRandomTimeSlice] == 0) {
			_localLastRandomTimeSlice--;
		}

		return uint256(
			keccak256(
				abi.encodePacked(
					_timeSlice,
					randomNumbers[GAME_VERSION][_localLastRandomTimeSlice]
				)
			)
		);
	}

	function getLevel(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		if (GAME_OVER) {
			if (showingFinalEnding()) {
				return 13;
			}

			return 12;
		}

		uint256 level = _timeSlice % (NUM_LEVELS + NUM_INTERMISSION_LEVELS) + 1;
		if (level > 9) {
			return 0;
		}

		return level;
	}

	function getPhase(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		if (GAME_OVER) {
			if (showingFinalEnding()) {
				return 5;
			}

			return 4;
		}

		uint256 level = getLevel(_timeSlice);
		if (level == 0) {
			return 0;
		}

		return (level - 1) / LEVELS_PER_PHASE + 1;
	}

	function getDeckSize(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		uint256 phase = getPhase(_timeSlice);
		uint256 deckSize = NUM_SOLO_CHAR;
		if (phase > 1) {
			deckSize += NUM_PAIR_CHAR;
		}
		if (phase > 2) {
			deckSize += NUM_COUPLE_CHAR;
		}
		return deckSize;
	}

	function getAudioSampleSize(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		uint256 phase = getPhase(_timeSlice);

		if (phase == 1) {
			return NUM_SOLO_AUDIO;
		} else if (phase == 2) {
			return NUM_PAIR_AUDIO;
		} else if (phase == 3) {
			return NUM_COUPLE_AUDIO;
		} else if (phase == 4) {
			return NUM_FINAL_AUDIO;
		}

		return NUM_SOLO_AUDIO;
	}

	function getCardCharacter(
		uint256 _timeSlice,
		uint256 _index
	)
		public
		view
		gameStarted
		validTimeSlice(_timeSlice)
		validIndex(_timeSlice, _index)
		returns (uint256)
	{
		uint256[] memory characters = getCardCharacters(_timeSlice);
		return characters[_index];
	}

	function getCardCharacters(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		validTimeSlice(_timeSlice)
		returns (uint256[] memory)
	{
		// If the level is invalid, exit
		if (getLevel(_timeSlice) == 0) {
			return new uint256[](9);
		}

		// Get the current random number & deck size right now
		uint256 lastIndex = NUM_LEVELS - getLevel(_timeSlice);
		uint256 randomNumber = getRandomNumber(_timeSlice);
		uint256 deckSize = getDeckSize(_timeSlice);

		// Draw unique cards from the batch
		uint256[] memory cardIndices = new uint256[](9);
		uint256 drawnCards;
		for (uint256 iter; iter <= lastIndex; iter++) {
			// Get the index
			uint256 cardIndex = (randomNumber >> (iter * 6)) % deckSize;

			// If already selected, pick the next card, cyclical
			while ((drawnCards >> cardIndex) % 2 == 1) {
				cardIndex = (cardIndex + 1) % deckSize;
			}

			// Mark the drawn card to prevent from being drawn again
			drawnCards += 2 ** cardIndex;

			// Add to the list of cards drawn
			// All card draw indexes must be +1 since token ID must start at 1
			cardIndices[iter] = cardIndex + 1;
		}

		return cardIndices;
	}

	function getCardCharacterPositions(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		validTimeSlice(_timeSlice)
		returns (uint256[] memory)
	{
		// If the level is invalid, exit
		uint256 level = getLevel(_timeSlice);
		if (level == 0) {
			return new uint256[](9);
		}

		// Get the current random number & deck size right now
		uint256 lastIndex = NUM_LEVELS - level;
		uint256 randomNumber = getRandomNumber(_timeSlice);

		// Draw unique cards from the batch
		uint256[] memory cardPositions = new uint256[](9);
		uint256 setPlacements;
		for (uint256 iter; iter <= lastIndex; iter++) {
			// Get the index
			// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices, +2 for audio, +2 hearts (132 bits shifted)
			// Then we go up to 9 indexes further with 4 bits each, for another 36 to cap at 168 bits
			uint256 cardPosition = (randomNumber >> ((NUM_LEVELS + TOTAL_CARD_SLOTS + 4) * 6 + iter * 4)) % TOTAL_CARD_SLOTS;

			// If already selected, pick the next card, cyclical
			while ((setPlacements >> cardPosition) % 2 == 1) {
				cardPosition = (cardPosition + 1) % TOTAL_CARD_SLOTS;
			}

			// Mark the drawn card to prevent from being drawn again
			setPlacements += 2 ** cardPosition;

			// Add to the list of positions
			cardPositions[iter] = cardPosition;
		}

		return cardPositions;
	}

	function getCardBackgrounds(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		validTimeSlice(_timeSlice)
		returns (uint256[] memory)
	{
		// Draw unique cards from the batch
		uint256[] memory cardBackgrounds = new uint256[](9);
		for (uint256 iter; iter <= 8; iter++) {
			cardBackgrounds[iter] = getCardBackground(_timeSlice, iter);
		}

		return cardBackgrounds;
	}

	function getCardBackground(
		uint256 _timeSlice,
		uint256 _index
	)
		public
		view
		gameStarted
		validTimeSlice(_timeSlice)
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices
		uint256 randomNumber = getRandomNumber(_timeSlice) >> ((NUM_LEVELS + _index) * 6);
		return randomNumber % NUM_BACKGROUNDS + 1;
	}

	function getLevelAudio(
		uint256 _timeSlice
	)
		public
		view
		gameStarted
		validTimeSlice(_timeSlice)
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices, +1 for audio (114 bits shifted)
		uint256 randomNumber = getRandomNumber(_timeSlice) >> ((NUM_LEVELS + TOTAL_CARD_SLOTS + 1) * 6);
		uint256 audioIndex = randomNumber % getAudioSampleSize(_timeSlice) + 1;

		uint256 phase = getPhase(_timeSlice);
		if (phase == 1) {
			return audioIndex;
		} else if (phase == 2) {
			return audioIndex + NUM_SOLO_AUDIO;
		} else if (phase == 3) {
			return audioIndex + NUM_SOLO_AUDIO + NUM_PAIR_AUDIO;
		}

		return audioIndex + NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO;
	}


	/**
	 * Current Call Helpers
	 **/

	function getCurrentLevel()
		public
		view
		gameStarted
		returns (uint256)
	{
		return getLevel(
			getTimeSlice()
		);
	}

	function getCurrentPhase()
		public
		view
		gameStarted
		returns (uint256)
	{
		return getPhase(
			getTimeSlice()
		);
	}

	function getCurrentCardCharacter(
		uint256 _index
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		return getCardCharacter(
			getTimeSlice(),
			_index
		);
	}

	function getCurrentCardBackground(
		uint256 _index
	)
		public
		view
		gameStarted
		returns (uint256)
	{
		return getCardBackground(
			getTimeSlice(),
			_index
		);
	}

	function getCurrentCardAudio()
		public
		view
		gameStarted
		returns (uint256)
	{
		return getLevelAudio(
			getTimeSlice()
		);
	}

	function getCurrentCardCharacters()
		public
		view
		gameStarted
		returns (uint256[] memory)
	{
		return getCardCharacters(
			getTimeSlice()
		);
	}

	function getCurrentCardBackgrounds()
		public
		view
		gameStarted
		returns (uint256[] memory)
	{
		return getCardBackgrounds(
			getTimeSlice()
		);
	}

	function getCurrentCardCharacterPositions()
		public
		view
		gameStarted
		returns (uint256[] memory)
	{
		return getCardCharacterPositions(
			getTimeSlice()
		);
	}

	function getGameState()
		public
		view
		gameStarted
		returns (
			uint256 timeSlice,
			uint256 level,
			uint256 phase,
			uint256 timeRemaining,
			uint256[] memory characters,
			uint256[] memory backgrounds,
			uint256 audio,
			uint256[] memory positions
		)
	{
		timeSlice     = getTimeSlice();
		level         = getCurrentLevel();
		phase         = getCurrentPhase();

		if (phase < 4) {
			timeRemaining = getLevelTimeRemaining();
			characters    = getCurrentCardCharacters();
			backgrounds   = getCurrentCardBackgrounds();
			audio         = getCurrentCardAudio();
			positions     = getCurrentCardCharacterPositions();
		} else {
			timeRemaining = 0;
			characters    = new uint256[](9);
			backgrounds   = new uint256[](9);
			audio         = 0;
			positions     = new uint256[](9);
		}
	}

	/**
	 * @dev do not accept value sent directly to contract
	 */
	receive()
		external
		payable
	{
		revert();
	}
}
