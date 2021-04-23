//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

//import "@openzeppelin/contracts/utils/Context.sol"; // Included with Ownable
//import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract F473 is ERC1155, ReentrancyGuard, Ownable/*, Context*/
{
	// NFTs Config
	uint256 constant NUM_SOLO         = 45;
	uint256 constant NUM_PAIR         = 21;
	uint256 constant NUM_COUPLE       = 6;
	uint256 constant NUM_SOLO_AUDIO   = 3;
	uint256 constant NUM_PAIR_AUDIO   = 3;
	uint256 constant NUM_COUPLE_AUDIO = 3;
	uint256 constant NUM_BACKGROUNDS  = 9;

	// Bitmasks for NFT IDs
	uint256 constant AUDIO_BITSHIFT      = 12;
	uint256 constant BACKGROUND_BITSHIFT = 8;

	// Game Config
	uint256 constant NUM_LEVELS = 9;
	uint256 constant LEVELS_PER_PHASE = 3;
	uint256 constant NUM_INTERMISSION_LEVELS = 3;
	uint256 constant SECONDS_PER_LEVEL = 10 minutes;

	// Game Board Config
	uint256 constant TOTAL_CARD_SLOTS = 9;

	// Game State
	uint256 GAME_START;
	bool GAME_OVER = false;

	// Allowlist & Logic
	mapping (address => bool) allowedAddresses;
	mapping (address => uint256) addressLastMove;

	// RNG
	mapping (uint256 => uint256) randomNumbers;
	uint256 lastRandomTimeSlice;

	/**
	 * Management
	 */

	constructor()
		ERC1155("https://localhost/{uri}.json")
		Ownable()
	{
		GAME_START = block.timestamp;
		randomNumbers[0] = uint256(
			keccak256(
				abi.encodePacked(
					blockhash(block.number - 1),
					_msgSender()
				)
			)
		);
	}

	modifier onlyAllowedAddress() {
		require(allowedAddresses[_msgSender()] == true, "Address is not permitted");
		_;
	}

	modifier validTimeSlice(uint256 _timeSlice) {
		require(_timeSlice <= getTimeSlice(), "Invalid time slice");
		_;
	}

	modifier validIndex(uint256 _timeSlice, uint256 _index) {
		require(_index <= TOTAL_CARD_SLOTS - getLevel() && getLevel() > 0 && getLevel() <= 9, "Invalid index");
		_;
	}

	modifier nextRandomNumber() {
		lastRandomTimeSlice = getTimeSlice() + 1;
		randomNumbers[lastRandomTimeSlice] = uint256(
			keccak256(
				abi.encodePacked(
					blockhash(block.number - 1),
					_msgSender(),
					randomNumbers[lastRandomTimeSlice]
				)
			)
		);
		_;
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
		external
		view
		returns (bool)
	{
		return allowedAddresses[_address];
	}


	/**
	 * Playing the Game
	 */
	function claimCard(
		uint256 _index
	)
		public
		onlyAllowedAddress
		nextRandomNumber
	{
		uint256 timeSlice = getTimeSlice();

		// Make sure that this address hasn't already moved this time slice
		require(addressLastMove[_msgSender()] < timeSlice, "Already moved this time frame");
		addressLastMove[_msgSender()] = timeSlice;

		// Determine whether this card is permissible to be claimed
		// Look up the token ID based on the index & game state
		require(getCardDraw(_index) <= NUM_SOLO, "Can only claim solo cards");

		// If allowed, mint
		_mint(_msgSender(), constructCard(timeSlice, _index), 1, "");
	}


	/**
	 * Game Information
	 */

	function getRandomNumber(
		uint256 _timeSlice
	)
		public
		view
		returns (uint256)
	{
		// Need to have randomness for each time slice, but also need to review previous random numbers
		return randomNumbers[_timeSlice] == 0 ? randomNumbers[lastRandomTimeSlice] : randomNumbers[_timeSlice];

		//if (_timeSlice)
//
		//return uint256(
		//	keccak256(
		//		abi.encodePacked(
		//			randomNumbers[_timeSlice > lastRandomTimeSlice ? lastRandomTimeSlice : _timeSlice],
		//			_timeSlice
		//		)
		//	)
		//);
	}

	function getTimeSlice()
		public
		view
		returns (uint256)
	{
		return (block.timestamp - GAME_START) / SECONDS_PER_LEVEL;
	}

	function getLevel()
		public
		view
		returns (uint256)
	{
		if (GAME_OVER) {
			return 12;
		}

		uint256 timeSlice = getTimeSlice();
		uint256 level = timeSlice % (NUM_LEVELS + NUM_INTERMISSION_LEVELS) + 1;
		if (level > 9) {
			return 0;
		}

		return level;
	}

	function getPhase()
		public
		view
		returns (uint256)
	{
		if (GAME_OVER) {
			return 4;
		}

		uint256 level = getLevel();
		if (level == 0) {
			return 0;
		}

		return (level - 1) / LEVELS_PER_PHASE + 1;
	}

	function getCardDraw(
		uint256 _index
	)
		public
		view
		returns (uint256)
	{
		return _getCardDraw(
			getTimeSlice(),
			_index
		);
	}

	function getDeckSize()
		public
		view
		returns (uint256)
	{
		uint256 phase = getPhase();
		uint256 deckSize = NUM_SOLO;
		if (phase > 1) {
			deckSize += NUM_PAIR;
		}
		if (phase > 2) {
			deckSize += NUM_COUPLE;
		}
		return deckSize;
	}

	function getAudioSampleSize(
		uint256 _timeSlice
	)
		public
		view
		returns (uint256)
	{
		uint256 phase = getPhase();
		uint256 audioSampleSize = NUM_SOLO_AUDIO;
		if (phase > 1) {
			audioSampleSize += NUM_PAIR_AUDIO;
		}
		if (phase > 2) {
			audioSampleSize += NUM_COUPLE_AUDIO;
		}
		return audioSampleSize;
	}

	function _getCardDraw(
		uint256 _timeSlice,
		uint256 _index
	)
		public
		view
		validTimeSlice(_timeSlice)
		validIndex(_timeSlice, _index)
		returns (uint256)
	{
		// Get the current random number & deck size right now
		uint256 randomNumber = getRandomNumber(_timeSlice);
		uint256 deckSize = getDeckSize();

		// Draw unique cards from the batch
		uint256 cardIndex;
		uint256 drawnCards;
		for (uint256 iter; iter <= _index; iter++) {
			// Get the index
			cardIndex = (randomNumber >> (iter * 6)) % deckSize;

			// If already selected, pick the next card, cyclical
			while ((drawnCards >> cardIndex) % 2 == 1) {
				cardIndex = (cardIndex + 1) % deckSize;
			}

			// Mark the drawn card to prevent from being drawn again
			drawnCards += 2 ** cardIndex;
		}

		// All card draw indexes must be +1 since token ID must start at 1
		return cardIndex + 1;
	}

	function getCardBackground(
		uint256 _timeSlice,
		uint256 _index
	)
		public
		view
		validTimeSlice(_timeSlice)
		validIndex(_timeSlice, _index)
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices
		uint256 randomNumber = getRandomNumber(_timeSlice) >> ((NUM_LEVELS + _index) * 6);
		return randomNumber % NUM_BACKGROUNDS;
	}

	function getLevelAudio(
		uint256 _timeSlice
	)
		public
		view
		validTimeSlice(_timeSlice)
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices, +1 for audio (114 bits shifted)
		uint256 randomNumber = getRandomNumber(_timeSlice) >> ((NUM_LEVELS + TOTAL_CARD_SLOTS + 1) * 6);
		return randomNumber % getAudioSampleSize(_timeSlice);
	}

	function constructCard(
		uint256 _timeSlice,
		uint256 _index
	)
		public
		view
		returns (uint256)
	{
		uint256 card = _getCardDraw(_timeSlice, _index);
		uint256 background = getCardBackground(_timeSlice, _index);
		uint256 audio = getLevelAudio(_timeSlice);

		return audio << AUDIO_BITSHIFT + background << BACKGROUND_BITSHIFT + card;
	}

	/**
	 * @dev do not accept value sent directly to contract
	 */
	receive()
		external
		payable
	{
		revert("No value accepted");
	}
}
