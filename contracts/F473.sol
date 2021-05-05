//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract F473 is ERC1155, ReentrancyGuard, Ownable
{
	// NFTs Config
	uint256 public constant NUM_SOLO_CHAR    = 45;
	uint256 public constant NUM_PAIR_CHAR    = 22;
	uint256 public constant NUM_COUPLE_CHAR  = 5;
	uint256 public constant NUM_BACKGROUNDS  = 9;
	uint256 public constant NUM_SOLO_AUDIO   = 3;
	uint256 public constant NUM_PAIR_AUDIO   = 3;
	uint256 public constant NUM_COUPLE_AUDIO = 3;
	uint256 public constant NUM_FINAL_AUDIO  = 1;

	// Bitmasks for NFT IDs
	uint256 constant CHARACTER_BITMASK   = 0x00ff;
	uint256 constant BACKGROUND_BITMASK  = 0x0f00;
	uint256 constant AUDIO_BITMASK       = 0xf000;
	//uint256 constant CHARACTER_BITSHIFT  = 0;
	uint256 constant BACKGROUND_BITSHIFT = 8;
	uint256 constant AUDIO_BITSHIFT      = 12;

	// Hearts token
	uint256 constant HEARTS_ID         = 0x10000;
	uint256 constant NUM_HEARTS_COLORS = 7;
	uint256 constant NUM_HEARTS_MINTED = 1;
	uint256 public   heartsMinted;

	// Winning the game
	uint256 constant NUM_HEARTS_LEVEL_NINE_COUPLE = 100;
	uint256 constant NUM_HEARTS_LEVEL_NINE_OTHER = 10;
	mapping(uint256 => uint256) couplesClaimed;
	mapping(uint256 => uint256) heartsBurned;
	mapping(uint256 => uint256) loveDecayRate;

	// Game Config
	uint256 constant NUM_LEVELS = 9;
	uint256 constant LEVELS_PER_PHASE = 3;
	uint256 constant NUM_INTERMISSION_LEVELS = 3;
	uint256 constant SECONDS_PER_LEVEL = 10 minutes;

	// Game Board Config
	uint256 constant TOTAL_CARD_SLOTS = 9;

	// Game State
	uint256 public GAME_START;
	bool public GAME_OVER = false;

	// Addtl Ownership Info
	//mapping (uint256 => mapping(address => uint256)) _charBalances;

	// Allowlist & Logic
	mapping (address => bool) allowedAddresses;
	mapping (address => uint256) addressLastMove;

	// RNG
	mapping (uint256 => uint256) public randomNumbers;
	uint256 lastRandomTimeSlice;

	/**
	 * Management
	 */

	constructor()
		ERC1155("https://localhost/{uri}.json")
		Ownable()
	{
		// Set the game start
		GAME_START = block.timestamp;

		// Set the first two ranom numbers
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

	modifier gameNotOver() {
		require(!GAME_OVER, "Game Over");
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

		if (!GAME_OVER && getLevel() == 9) {
			uint256 timeSlice = getTimeSlice();
			if (heartsBurned[timeSlice] > (loveDecayRate[timeSlice] + 1)) {
				heartsBurned[timeSlice] -= (loveDecayRate[timeSlice] + 1);
			} else {
				heartsBurned[timeSlice] = 0;
			}
		}
	}

	modifier oneActionPerAddressPerTimeSlice() {
		// Make sure that this address hasn't already moved this time slice
		uint256 timeSlice = getTimeSlice();
		require(addressLastMove[_msgSender()] < timeSlice, "Already moved this time frame");
		addressLastMove[_msgSender()] = timeSlice;
		_;
	}

	function updateRandomNumber(
		uint256 _timeSlice
	)
		internal
	{
		randomNumbers[_timeSlice] = uint256(
			keccak256(
				abi.encodePacked(
					blockhash(block.number - 1),
					_msgSender(),
					randomNumbers[_timeSlice]
				)
			)
		);
	}

	function setBaseUri(
		string calldata _uri
	)
		external
		onlyOwner
	{
		_setURI(_uri);
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

	function mintCard(
		address to,
		uint256 character,
		uint256 background,
		uint256 audio
	)
		external
		onlyOwner
	{
		_mint(to, constructCardManual(character, background, audio), 1, "");
	}

	function mintHearts(
		address to,
		uint256 amount
	)
		external
		onlyOwner
	{
		_mintHearts(to, amount);
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

	function _mintHearts(
		address to,
		uint256 amount
	)
		internal
	{
		heartsMinted += amount;
		_mint(to, _heartsRandom(0), amount, "");
	}

	function _heartsRandom(
		uint256 _idxOffset
	)
		internal
		view
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices, +2 for audio + hearts (120 bits shifted)
		uint256 timeSlice = getTimeSlice();
		uint256 randomNumber = getRandomNumber(timeSlice) >> ((NUM_LEVELS + TOTAL_CARD_SLOTS + 2 + heartsMinted % 2 + heartsBurned[timeSlice] % 2) * 6);
		return HEARTS_ID + ((randomNumber + heartsMinted + heartsBurned[timeSlice] + _idxOffset) % NUM_HEARTS_COLORS) + 1;
	}


	/**
	 * Playing the Game
	 */
	function roll()
		public
		onlyAllowedAddress
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
		decayHeartsBurned
	{
		// Doesn't do anything else, forces a random roll change, but acts as a turn
	}

	function claimSoloCard(
		uint256 _index
	)
		public
		nonReentrant
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
		_mint(_msgSender(), constructCard(_index), 1, "");
	}

	function tradeForPairCard(
		uint256 _cardId1,
		uint256 _cardId2,
		uint256 _index
	)
		public
		nonReentrant
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
		(uint256 character1,,) = deconstructCard(_cardId1);
		require(character1 <= NUM_SOLO_CHAR, "Can only trade in solo cards");

		(uint256 character2,,) = deconstructCard(_cardId2);
		require(character2 <= NUM_SOLO_CHAR, "Can only trade in solo cards");

		// Trade in the cards
		_burn(_msgSender(), _cardId1, 1);
		_burn(_msgSender(), _cardId2, 1);

		// If allowed, mint
		_mint(_msgSender(), constructCard(_index), 1, "");
	}

	function tradeForHearts(
		address _cardId1Owner,
		uint256 _cardId1,
		address _cardId2Owner,
		uint256 _cardId2
	)
		public
		nonReentrant
		onlyAllowedAddress
		gameNotOver
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
		decayHeartsBurned
	{
		// Require that one of the owners are the sender
		require(_msgSender() == _cardId1Owner || _msgSender() == _cardId2Owner, "Caller must own at least one card");

		// Check that the input cards are valid
		(uint256 character1,,) = deconstructCard(_cardId1);
		require(character1 > NUM_SOLO_CHAR && character1 <= NUM_SOLO_CHAR + NUM_PAIR_CHAR, "Can only trade in paired solo cards");

		(uint256 character2,,) = deconstructCard(_cardId2);
		require(character2 > NUM_SOLO_CHAR && character2 <= NUM_SOLO_CHAR + NUM_PAIR_CHAR, "Can only trade in paired solo cards");

		// Require that the input cards are a pair - starts at an even number (46)
		require(character1 / 2 == character2 / 2, "Not a pair");

		// Trade in the cards
		_burn(_cardId1Owner, _cardId1, 1);
		_burn(_cardId2Owner, _cardId2, 1);

		// Mint hearts
		_mintHearts(_cardId1Owner, NUM_HEARTS_MINTED);
		_mintHearts(_cardId2Owner, NUM_HEARTS_MINTED);
	}

	function tradeForCoupleCard(
		uint256 _cardId1
	)
		public
		nonReentrant
		onlyAllowedAddress
		gameNotOver
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
		decayHeartsBurned
	{
		// Make sure we're at the last level
		require(getLevel() == 9, "Only during level nine");

		// Determine whether this card is permissible to be claimed
		// Look up the token ID based on the index & game state
		uint256 selectedCharacter = getCurrentCardCharacter(0);
		require(selectedCharacter > NUM_SOLO_CHAR + NUM_PAIR_CHAR && selectedCharacter <= (NUM_SOLO_CHAR + NUM_PAIR_CHAR + NUM_COUPLE_CHAR), "Can only claim couple cards");

		// Trade in the cards
		_burn(_msgSender(), _cardId1, 1);

		// If allowed, mint
		_mint(_msgSender(), constructCard(0), 1, "");

		// Increase decay rate
		uint256 timeSlice = getTimeSlice();
		loveDecayRate[timeSlice] += ++couplesClaimed[timeSlice];
	}

	function burnHearts(
		uint256 _amount
	)
		public
		nonReentrant
		onlyAllowedAddress
		gameNotOver
		nextRandomNumber
		decayHeartsBurned
		returns (bool)
	{
		// Make sure we're at the last level
		require(getLevel() == 9, "Only during level nine");

		// Find any available to burn
		address from = _msgSender();
		uint256 amountLeftToBurn = _amount;
		for (uint256 idx = 0; idx < NUM_HEARTS_COLORS; idx++) {
			uint256 heartsId = _heartsRandom(idx);
			uint256 balance = balanceOf(from, heartsId);

			if (balance > 0 && balance < amountLeftToBurn) {
				_burn(from, heartsId, balance);
				amountLeftToBurn -= balance;
			} else if (balance > 0 && balance >= amountLeftToBurn) {
				_burn(from, heartsId, amountLeftToBurn);
				amountLeftToBurn = 0;
			}
		}

		require(amountLeftToBurn == 0);

		// Keep track of number burned
		uint256 timeSlice = getTimeSlice();
		heartsBurned[timeSlice] += _amount;

		// Perform a specific action based on current card
		(uint256 character,,) = deconstructCard(getCurrentCardCharacter(0));

		// Character card is a couple card
		if (character > NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
			if (heartsBurned[timeSlice] >= NUM_HEARTS_LEVEL_NINE_COUPLE) {
				GAME_OVER = true;
			}
		} else {
			if (heartsBurned[timeSlice] >= NUM_HEARTS_LEVEL_NINE_OTHER) {
				heartsBurned[timeSlice] = 0; // Back to original burned number
				loveDecayRate[timeSlice] = 0; // Decay rate goes to 0 (in effect, 1)
				updateRandomNumber(getTimeSlice()); // Change this level's random number, changes the card
			}
		}

		return GAME_OVER;
	}


	/**
	 * Game Information
	 */

	function getLoveDecayRate()
		public
		view
		returns (uint256)
	{
		if (getLevel() != 9) {
			return 0;
		}

		return loveDecayRate[getTimeSlice()] + 1;
	}

	function getLoveMeterSize()
		public
		view
		returns (uint256)
	{
		if (getLevel() != 9) {
			return 0;
		}

		// Perform a specific action based on current card
		(uint256 character,,) = deconstructCard(getCurrentCardCharacter(0));

		// Character card is a couple card
		if (character > NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
			return NUM_HEARTS_LEVEL_NINE_COUPLE;
		}

		return NUM_HEARTS_LEVEL_NINE_OTHER;
	}

	function getLoveMeterFilled()
		public
		view
		returns (uint256)
	{
		return heartsBurned[getTimeSlice()];
	}

	function getRandomNumber(
		uint256 _timeSlice
	)
		public
		view
		returns (uint256)
	{
		if (_timeSlice > lastRandomTimeSlice) {
			return randomNumbers[lastRandomTimeSlice];
		}

		while (randomNumbers[_timeSlice] == 0) {
			_timeSlice--;
		}

		return randomNumbers[_timeSlice];
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

	function getCurrentCardCharacter(
		uint256 _index
	)
		public
		view
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
		returns (uint256)
	{
		return getLevelAudio(
			getTimeSlice()
		);
	}

	function getDeckSize()
		public
		view
		returns (uint256)
	{
		uint256 phase = getPhase();
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
		returns (uint256)
	{
		uint256 phase = getPhase();

		if (phase == 1) {
			return NUM_SOLO_AUDIO;
		} else if (phase == 2) {
			return NUM_PAIR_AUDIO;
		} else if (phase == 3) {
			return NUM_COUPLE_AUDIO;
		} else if (phase == 4) {
			return NUM_FINAL_AUDIO;
		}

		return 0;
	}

	function getCardCharacter(
		uint256 _timeSlice,
		uint256 _index
	)
		public
		view
		validTimeSlice(_timeSlice)
		validIndex(_timeSlice, _index)
		returns (uint256)
	{
		uint256[] memory characters = getCardCharacters(_timeSlice);
		return characters[_index];
	}

	function getCurrentCardCharacters()
		public
		view
		returns (uint256[] memory)
	{
		return getCardCharacters(getTimeSlice());
	}

	function getCardCharacters(
		uint256 _timeSlice
	)
		public
		view
		validTimeSlice(_timeSlice)
		returns (uint256[] memory)
	{
		// If the level is invalid, exit
		if (getLevel() == 0) {
			return new uint256[](9);
		}

		// Get the current random number & deck size right now
		uint256 lastIndex = NUM_LEVELS - getLevel();
		uint256 randomNumber = getRandomNumber(_timeSlice);
		uint256 deckSize = getDeckSize();

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

	function getCardBackgrounds(
		uint256 _timeSlice
	)
		public
		view
		validTimeSlice(_timeSlice)
		returns (uint256[] memory)
	{
		// Draw unique cards from the batch
		uint256 lastIndex = NUM_LEVELS - getLevel();
		uint256[] memory cardBackgrounds = new uint256[](9);
		for (uint256 iter; iter < lastIndex; iter++) {
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
		validTimeSlice(_timeSlice)
		validIndex(_timeSlice, _index)
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
		validTimeSlice(_timeSlice)
		returns (uint256)
	{
		// Get the current random number & deck size right now
		// Skip the number of levels * 6 -> 2^6 = 64; Max is 108 bits shifted with 9 levels & indices, +1 for audio (114 bits shifted)
		uint256 randomNumber = getRandomNumber(_timeSlice) >> ((NUM_LEVELS + TOTAL_CARD_SLOTS + 1) * 6);
		uint256 audioIndex = randomNumber % getAudioSampleSize(_timeSlice) + 1;

		uint256 phase = getPhase();
		if (phase == 1) {
			return audioIndex;
		} else if (phase == 2) {
			return audioIndex + NUM_SOLO_AUDIO;
		} else if (phase == 3) {
			return audioIndex + NUM_SOLO_AUDIO + NUM_PAIR_AUDIO;
		}

		return audioIndex + NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO;
	}

	function constructCard(
		uint256 _index
	)
		public
		view
		returns (uint256)
	{
		uint256 timeSlice = getTimeSlice();

		uint256 character = getCardCharacter(timeSlice, _index);
		uint256 background = getCardBackground(timeSlice, _index);
		uint256 audio = getLevelAudio(timeSlice);

		return constructCardManual(character, background, audio);
	}

	function constructCardManual(
		uint256 character,
		uint256 background,
		uint256 audio
	)
		public
		view
		returns (uint256)
	{
		require(character >= 1 && character <= NUM_SOLO_CHAR + NUM_PAIR_CHAR + NUM_COUPLE_CHAR);
		require(background >= 1 && background <= NUM_BACKGROUNDS);
		require(audio >= 1 && audio <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO);

		if (character <= NUM_SOLO_CHAR) {
			require(audio >= 1 && audio <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO);
		} else if (character <= NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
			require(audio > NUM_SOLO_AUDIO && audio <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO);
		} else if (character <= NUM_SOLO_CHAR + NUM_PAIR_CHAR + NUM_COUPLE_CHAR) {
			require(audio > NUM_SOLO_AUDIO + NUM_PAIR_AUDIO && audio <= NUM_SOLO_AUDIO + NUM_PAIR_AUDIO + NUM_COUPLE_AUDIO);
		}

		return (audio << AUDIO_BITSHIFT) + (background << BACKGROUND_BITSHIFT) + character;
	}

	function deconstructCard(
		uint256 _cardId
	)
		public
		pure
		returns (
			uint256 character,
			uint256 background,
			uint256 audio
		)
	{
		character  = _cardId & CHARACTER_BITMASK;
		background = (_cardId & BACKGROUND_BITMASK) >> BACKGROUND_BITSHIFT;
		audio      = (_cardId & AUDIO_BITMASK) >> AUDIO_BITSHIFT;
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
