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
	uint256 public constant NUM_SOLO_CHAR    = 45;
	uint256 public constant NUM_PAIR_CHAR    = 30;
	uint256 public constant NUM_COUPLE_CHAR  = 15;
	uint256 public constant NUM_BACKGROUNDS  = 9;
	uint256 public constant NUM_SOLO_AUDIO   = 3;
	uint256 public constant NUM_PAIR_AUDIO   = 3;
	uint256 public constant NUM_COUPLE_AUDIO = 3;
	uint256 public constant NUM_FINAL_AUDIO  = 1;

	// Bitmasks for NFT IDs
	uint256 constant CHARACTER_BITMASK   = 0x00ff;
	uint256 constant BACKGROUND_BITMASK  = 0x0f00;
	uint256 constant AUDIO_BITMASK       = 0xf000;
	uint256 constant CHARACTER_BITSHIFT  = 0;
	uint256 constant BACKGROUND_BITSHIFT = 8;
	uint256 constant AUDIO_BITSHIFT      = 12;
	uint256 constant HEARTS_BITSHIFT     = 16;

	// Hearts token
	uint256 constant HEARTS_ID              = 0x10000;
	uint256 constant NUM_HEARTS_MINTED_TO   = 25;
	uint256 constant NUM_HEARTS_MINTED_FROM = 25;

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

	// Addtl Ownership Info
	mapping (uint256 => mapping(address => uint256)) _charBalances;

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

		randomNumbers[1] = uint256(
			keccak256(
				abi.encodePacked(
					randomNumbers[0],
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
		// Do everything else first
		_;

		// We pick two ahead because a time slice is effectively ten minutes, which
		// is safely within the length of reorgs that one can expect on Polygon and
		// we don't want a reorg to happen on blocks right before the slice turnover
		lastRandomTimeSlice = getTimeSlice() + 2;

		randomNumbers[lastRandomTimeSlice] = uint256(
			keccak256(
				abi.encodePacked(
					blockhash(block.number - 1),
					_msgSender(),
					randomNumbers[lastRandomTimeSlice]
				)
			)
		);
	}

	modifier oneActionPerAddressPerTimeSlice() {
		// Make sure that this address hasn't already moved this time slice
		uint256 timeSlice = getTimeSlice();
		require(addressLastMove[_msgSender()] < timeSlice, "Already moved this time frame");
		addressLastMove[_msgSender()] = timeSlice;
		_;
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
	function roll()
		public
		nonReentrant
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
		nonReentrant
		onlyAllowedAddress
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
	{
		// Determine whether this card is permissible to be claimed
		// Look up the token ID based on the index & game state
		require(getCurrentCardCharacter(_index) <= NUM_SOLO_CHAR, "Can only claim solo cards");

		// If allowed, mint
		_mintCard(_msgSender(), constructCard(_index), 1, "");
	}

	function tradeForPairCard(
		uint256 _cardId1,
		uint256 _cardId2,
		uint256 _index
	)
		public
		nonReentrant
		onlyAllowedAddress
		oneActionPerAddressPerTimeSlice
		nextRandomNumber
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
		safeTransferFrom(_msgSender(), address(this), _cardId1, 1, "");
		safeTransferFrom(_msgSender(), address(this), _cardId2, 1, "");

		// If allowed, mint
		_mintCard(_msgSender(), constructCard(_index), 1, "");
	}


	function _mintCard(
		address account,
		uint256 id,
		uint256 amount,
		bytes memory data
	)
		internal
		virtual
	{
		_mint(account, id, amount, data);

		// Keep track of character balances too
		(uint256 character,,) = deconstructCard(id);
		_charBalances[character][account] += amount;
	}


	/**
	* @dev See {IERC1155-safeTransferFrom}.
	*/
	function safeTransferFrom(
		address from,
		address to,
		uint256 id,
		uint256 amount,
		bytes memory data
	)
		public
		virtual
		override
	{
		// Keep track of character balances too
		(uint256 character,,) = deconstructCard(id);
		uint256 fromBalance = _charBalances[character][from];
		require(fromBalance >= amount, "ERC1155: insufficient character balance for transfer");
		_charBalances[character][from] = fromBalance - amount;

		// Grant hearts if possible - must be a paired solo card
		if (character > NUM_SOLO_CHAR && character <= NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
			// If this character has a pair, check if the recipient has it
			// Starts at 46 currently, ends at 65
			uint256 pairCharacter = (character % 2 == 0) ? character + 1 : character - 1;

			// If this account owns one of the pairs, then grant hearts
			if (_charBalances[pairCharacter][to] > 0) {
				_mint(to, HEARTS_ID, NUM_HEARTS_MINTED_TO, "");
				_mint(from, HEARTS_ID, NUM_HEARTS_MINTED_FROM, "");
			}

			// We burn the one sent
			_burn(from, id, amount);

			// We find and burn one owned by the other person
			//for (uint256 idx = 0; idx < ) {
//
			//}
		} else {
			// Otherwise just transfer
			super.safeTransferFrom(from, to, id, amount, data);
			_charBalances[character][to] += amount;
		}
	}

	/**
	* @dev See {IERC1155-safeBatchTransferFrom}.
	*/
	function safeBatchTransferFrom(
		address from,
		address to,
		uint256[] memory ids,
		uint256[] memory amounts,
		bytes memory data
	)
		public
		virtual
		override
	{
		super.safeBatchTransferFrom(from, to, ids, amounts, data);

		for (uint256 idx = 0; idx < ids.length; idx++) {
			uint256 id     = ids[idx];
			uint256 amount = amounts[idx];

			// Keep track of character balances too
			(uint256 character,,) = deconstructCard(id);
			uint256 fromBalance = _charBalances[character][from];
			require(fromBalance >= amount, "ERC1155: insufficient character balance for transfer");
			_charBalances[character][from] = fromBalance - amount;
			_charBalances[character][to] += amount;

			// Grant hearts if possible - must be a paired solo card
			if (character > NUM_SOLO_CHAR && character <= NUM_SOLO_CHAR + NUM_PAIR_CHAR) {
				// If this character has a pair, check if the recipient has it
				// Starts at 46 currently, ends at 65
				uint256 pairCharacter = (character % 2 == 0) ? character + 1 : character - 1;

				// If this account owns one of the pairs, then grant hearts
				if (_charBalances[pairCharacter][to] > 0) {

				}
			}
		}
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
		if (_timeSlice > lastRandomTimeSlice) {
			return randomNumbers[lastRandomTimeSlice];
		}

		while (randomNumbers[_timeSlice] == 0) {
			_timeSlice--;
		}

		return randomNumbers[_timeSlice];

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

	// Allow sending ERC1155s to this contract
	function onERC1155Received(
		address, address, uint256, uint256, bytes calldata
	)
		external
		returns (bytes4)
	{
		return 0xf23a6e61;
	}
}
