//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract F473Tokens is ERC1155, ReentrancyGuard, Ownable
{
	// NFTs Config
	uint256 public constant NUM_SOLO_CHAR    = 45;
	uint256 public constant NUM_PAIR_CHAR    = 26;
	uint256 public constant NUM_COUPLE_CHAR  = 7;
	uint256 public constant NUM_BACKGROUNDS  = 9;
	uint256 public constant NUM_SOLO_AUDIO   = 1;
	uint256 public constant NUM_PAIR_AUDIO   = 1;
	uint256 public constant NUM_COUPLE_AUDIO = 1;
	uint256 public constant NUM_FINAL_AUDIO  = 1;

	// Bitmasks for NFT IDs
	uint256 constant CHARACTER_BITMASK   = 0x00ff;
	uint256 constant BACKGROUND_BITMASK  = 0x0f00;
	uint256 constant AUDIO_BITMASK       = 0xf000;
	//uint256 constant CHARACTER_BITSHIFT  = 0;
	uint256 constant BACKGROUND_BITSHIFT = 8;
	uint256 constant AUDIO_BITSHIFT      = 12;

	// Hearts token
	uint256 public constant HEARTS_ID         = 0x10000;
	uint256 public constant NUM_HEARTS_COLORS = 7;
	uint256 public constant NUM_HEARTS_MINTED = 1;

	// Winning the game
	uint256 constant NUM_HEARTS_LEVEL_NINE_COUPLE = 100;
	uint256 constant NUM_HEARTS_LEVEL_NINE_OTHER = 10;
	mapping(uint256 => uint256) couplesClaimed;
	//mapping(uint256 => uint256) heartsBurned;
	mapping(uint256 => uint256) loveDecayRate;

	// Game
	address gameAddress;

	/**
	 * Management
	 */

	constructor()
		ERC1155("https://localhost/{uri}.json")
		Ownable()
	{ }

	modifier onlyGameOrOwner() {
		require(gameAddress == _msgSender() || owner() == _msgSender(), "Game or owner caller only");
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

	function setGameAddress(
		address _gameAddress
	)
		external
		onlyOwner
	{
		gameAddress = _gameAddress;
	}

	function mintCard(
		address to,
		uint256 character,
		uint256 background,
		uint256 audio
	)
		external
		onlyGameOrOwner
	{
		_mint(to, constructCardManual(character, background, audio), 1, "");
	}

	function mintHearts(
		address to,
		uint256 index,
		uint256 amount
	)
		external
		onlyGameOrOwner
	{
		require(index >= 1 && index <= NUM_HEARTS_COLORS, "Invalid hearts index");
		_mint(to, HEARTS_ID + index, amount, "");
	}

	function burn(
		address _from,
		uint256 _id,
		uint256 _amount
	)
		public
		onlyGameOrOwner
	{
		_burn(_from, _id, _amount);
	}


	/**
	 * Playing the Game
	 */
	

	/**
	 * Game Information
	 */

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