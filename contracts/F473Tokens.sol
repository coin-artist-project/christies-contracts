//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "erc1155extensions/contracts/ERC1155Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract F473Tokens is ERC1155Enumerable, ReentrancyGuard, Ownable
{
	// NFTs Config
	uint256 public constant NUM_SOLO_CHAR    = 45;
	uint256 public constant NUM_PAIR_CHAR    = 26;
	uint256 public constant NUM_COUPLE_CHAR  = 7;
	uint256 public constant NUM_BACKGROUNDS  = 15;
	uint256 public constant NUM_SOLO_AUDIO   = 1;
	uint256 public constant NUM_PAIR_AUDIO   = 1;
	uint256 public constant NUM_COUPLE_AUDIO = 1;
	uint256 public constant NUM_FINAL_AUDIO  = 1;

	// Bitmasks for NFT IDs
	uint256 constant CHARACTER_BITMASK   = 0x0000ff;
	uint256 constant BACKGROUND_BITMASK  = 0x000f00;
	uint256 constant AUDIO_BITMASK       = 0x00f000;
	//uint256 constant HEARTS_BITMASK    = 0x0f0000;
	uint256 public constant VERSION_BITMASK = 0xf00000;
	//uint256 constant CHARACTER_BITSHIFT  = 0;
	uint256 constant BACKGROUND_BITSHIFT = 8;
	uint256 constant AUDIO_BITSHIFT      = 12;
	uint256 public constant VERSION_BITSHIFT = 20; // Added public

	// Hearts token
	uint256 public constant HEARTS_ID         = 0x10000;
	uint256 public constant NUM_HEARTS_COLORS = 7;
	uint256 public constant NUM_HEARTS_MINTED = 1;

	// Allowlist by heart ownership
	mapping(address => bool) public receivedHeart;

	// Game
	address gameAddress;

	/**
	 * Management
	 */

	constructor()
		ERC1155("ipfs://QmQxbK1ScMqudmFai8t6MmJQZXsqkGfZz1GJfvFUjN65KS")
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
		uint256 audio,
		uint256 version
	)
		external
		onlyGameOrOwner
	{
		_mint(to, constructCardManual(character, background, audio, version), 1, "");
	}

	function mintHearts(
		address to,
		uint256 index,
		uint256 version,
		uint256 amount
	)
		external
		onlyGameOrOwner
	{
		require(index >= 1 && index <= NUM_HEARTS_COLORS, "Invalid hearts index");
		_mint(to, (version << VERSION_BITSHIFT) + HEARTS_ID + index, amount, "");
		receivedHeart[to] = true;
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
	 * Game Information
	 */

	function constructCardManual(
		uint256 character,
		uint256 background,
		uint256 audio,
		uint256 version
	)
		public
		pure
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

		return (version << VERSION_BITSHIFT) + (audio << AUDIO_BITSHIFT) + (background << BACKGROUND_BITSHIFT) + character;
	}

	function deconstructCard(
		uint256 _cardId
	)
		public
		pure
		returns (
			uint256 character,
			uint256 background,
			uint256 audio,
			uint256 version
		)
	{
		character  = _cardId & CHARACTER_BITMASK;
		background = (_cardId & BACKGROUND_BITMASK) >> BACKGROUND_BITSHIFT;
		audio      = (_cardId & AUDIO_BITMASK) >> AUDIO_BITSHIFT;
		version    = (_cardId & VERSION_BITMASK) >> VERSION_BITSHIFT;
	}

	function isHeart(
		uint256 _cardId
	)
		public
		pure
		returns (bool)
	{
		return (_cardId & HEARTS_ID) == HEARTS_ID;
	}

	function isCharacter(
		uint256 _cardId
	)
		public
		pure
		returns (bool)
	{
		return !isHeart(_cardId);
	}

	function getAccountTokensFormatted(
		address account,
		uint256 cursor,
		uint256 perPage
	)
	external
	view
	returns (
		uint256[] memory tokenIds,
		uint256[] memory character,
		uint256[] memory background,
		uint256[] memory audio,
		uint256[] memory version,
		uint256[] memory amounts,
		uint256 nextCursor
	) {
		(tokenIds, amounts, nextCursor) = getAccountTokensPaginated(account, cursor, perPage);

		version = new uint256[](tokenIds.length);
		character = new uint256[](tokenIds.length);
		background = new uint256[](tokenIds.length);
		audio = new uint256[](tokenIds.length);

		for (uint256 i; i < tokenIds.length; i++) {
			(uint256 _character, uint256 _background, uint256 _audio, uint256 _version) = deconstructCard(tokenIds[i]);
			version[i] = _version;
			character[i] = _character;
			background[i] = _background;
			audio[i] = _audio;
		}

		return (tokenIds, character, background, audio, version, amounts, nextCursor);
	}

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
		super.safeTransferFrom(from, to, id, amount, data);

		if (isHeart(id)) {
			receivedHeart[to] = true;
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
