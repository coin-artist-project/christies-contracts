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
	uint256 public constant VERSION_BITMASK = 0xffff00000;
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

	// Metadata
	string public animationBaseUrl = "https://gateway.ipfs.io/ipfs/QmUPXgaLUMt78fZfaRtoCPPcVpKUr2Mcbbeb4xtvXJc45d";
	string public DESCRIPTION = 'F473 launches on June 3rd at 4 PM GMT, and can be played on IPFS: https://gateway.ipfs.io/ipns/k51qzi5uqu5djyk5kj4d5dvad8ev3g2zfyu0ktrusqpwg3qdewd68772mdthhu/#/\\n\\n\"F473\" (FATE) is an NFT experience that highlights cross-chain interoperability. Rather than a static NFT that remains in a wallet on one network, \"F473\" comes alive and accessible across both the Ethereum and the Polygon blockchain networks. \"F473\" serves as a foundation to spawn thousands of NFTs on Polygon that create a bespoke NFT collecting game that is unlocked only after the initial sale of \"F473\". The spawned assets allow for temporarily altering aesthetics of the core artwork, as well as altering the overall gameplay.\\n\\n\"F473\" utilizes hundreds of both digital and physical artistic assets, and numerous musical compositions. The core of the experience centers around a physical painting, which contains a hand-painted private key giving access to a cryptocurrency prize that will be revealed upon the auction conclusion. As a signature @coin_artist crypto puzzle trail artwork, expect an interactive story woven together with mystery, intrigue, and surprise. The purchaser of the NFT will, of course, also own and determine the fate of the physical painting.\\n\\nRULES\\n\\nThe Game of F473 plays automatically, on loop endlessly, until the game is over. F473 consists of 9 Levels and an Intermission. Players have actions available to them during all parts of the game, but are limited based on the current Level and Cards available on the screen.\\n\\nAs a player, you can only make one Dedicated Action per Level. Dedicated Actions are the following:\\n\\nClaiming a Character Card - Any of Solo, Pair, or Couple\\n\\nRoll - This action alters the random number used in future levels, and can be used during Intermission\\n\\nYou can also take any of the other following actions at any time the game board is present:\\n\\nGain H34R7S - Tribute two matching Pair Characters (two of yours, or one of yours and someone elses)\\n\\nTribute H34R7S - Tribute H34R7S to the Character to fill up the Love Meter (Level 9 Only)\\n\\nLight Up the City - Send a H34R7 to an empty region of the city to light it up in the color of the H34R7.\\n\\nMedium: Digital-born game with generative elements using HTML, CSS, React.JS, Javascript, dedicated web page, and Ethereum and polygon smart contracts. Dimensions variable.\\n\\nF473 launches on June 3rd at 4 PM GMT, and can be played on IPFS: https://gateway.ipfs.io/ipns/k51qzi5uqu5djyk5kj4d5dvad8ev3g2zfyu0ktrusqpwg3qdewd68772mdthhu/#/';

	string public name = 'F473 Cards';
	string public symbol = 'F473C4RD';

	/**
	 * Management
	 */

	constructor(
		string memory _animationBaseUrl
	)
		ERC1155(_animationBaseUrl)
		Ownable()
	{
		animationBaseUrl = _animationBaseUrl;
	}

	modifier onlyGameOrOwner() {
		require(gameAddress == _msgSender() || owner() == _msgSender(), "Game or owner caller only");
		_;
	}

	function setAnimationBaseUri(
		string calldata _uri
	)
		external
		onlyOwner
	{
		animationBaseUrl = _uri;
	}

	function setDescription(
		string calldata _desc
	)
		external
		onlyOwner
	{
		DESCRIPTION = _desc;
	}

	function uint2str(
		uint256 _i
	)
		internal
		pure
		returns (
			string memory
		)
	{
		if (_i == 0) {
			return "0";
		}

		uint256 j = _i;
		uint256 length;
		while (j != 0) {
			length++;
			j /= 10;
		}

		bytes memory bstr = new bytes(length);
		uint256 k = length;
		j = _i;

		while (j != 0) {
			bstr[--k] = bytes1(uint8(48 + j % 10));
			j /= 10;
		}

		return string(bstr);
	}

	function uri(
		uint256 _tokenId
	)
		public
		view
		virtual
		override
	returns (
		string memory
	) {
		(uint256 _character, uint256 _background, uint256 _audio, uint256 _version) = deconstructCard(_tokenId);

		require(_character > 0);
		require(_version > 0);

		if (isHeart(_tokenId)) {
			string memory color;
			if (_character == 1) { color = "Red"; }
			else if (_character == 2) { color = "Orange"; }
			else if (_character == 3) { color = "Yellow"; }
			else if (_character == 4) { color = "Green"; }
			else if (_character == 5) { color = "Blue"; }
			else if (_character == 6) { color = "Purple"; }
			else if (_character == 7) { color = "Black"; }

			return string(
				abi.encodePacked(
					abi.encodePacked(
						bytes('{"name":"H34R7 #'),
						uint2str(_character),
						bytes('","description":"A H34R7 from the Game of F473.\\n\\n'),
						bytes(DESCRIPTION),
						bytes('","external_url":"'),
						bytes(animationBaseUrl),
						bytes('","image":"ipfs://QmNcrWuENnoZbvkfSfJ2tBfMw5kLKo37P5h58CQYLJrVbB/')
					),
					abi.encodePacked(
						uint2str(_character),
						bytes('.png","animation_url":"'),
						bytes(animationBaseUrl),
						bytes('/#/nft/card/'),
						uint2str(_tokenId),
						bytes('","attributes":[{"trait_type": "H34R7 Color", "value": "')
					),
					abi.encodePacked(
						bytes(color),
						bytes('"},{"trait_type": "Game Version", "value": "#'),
						uint2str(_version),
						bytes('"}]}')
					)
				)
			);
		}

		require(_background > 0);
		require(_audio > 0);

		return string(
			abi.encodePacked(
				abi.encodePacked(
					bytes('{"name":"Character #'),
					uint2str(_character),
					bytes('","description":"A Character from the Game of F473.\\n\\n'),
					bytes(DESCRIPTION),
					bytes('","external_url":"'),
					bytes(animationBaseUrl),
					bytes('","image":"ipfs://QmNcrWuENnoZbvkfSfJ2tBfMw5kLKo37P5h58CQYLJrVbB/')
				),
				abi.encodePacked(
					uint2str(_character),
					bytes('_'),
					uint2str(_background),
					bytes('.jpg","animation_url":"'),
					bytes(animationBaseUrl)
				),
				abi.encodePacked(
					bytes('/#/nft/card/'),
					uint2str(_tokenId),
					bytes('","attributes":[{"trait_type": "Character", "value": "#'),
					uint2str(_character),
					bytes('"},{"trait_type": "Background", "value": "')
				),
				abi.encodePacked(
					(_background < 9) ? bytes('Glass #') : bytes('Gradient #'),
					uint2str((_background - 1) % 8 + 1),
					bytes('"},{"trait_type": "Audio", "value": "'),
					(_audio == 1) ? bytes('Solo') : (_audio == 2) ? bytes('Pair') : bytes('Love'),
					bytes('"},{"trait_type": "Character Type", "value": "')
				),
				abi.encodePacked(
					(_character <= NUM_SOLO_CHAR ? "Solo" : (_character <= NUM_SOLO_CHAR + NUM_PAIR_CHAR) ? "Pair" : "Couple"),
					bytes('"},{"trait_type": "Game Version", "value": "#'),
					uint2str(_version),
					bytes('"}]}')
				)
			)
		);
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
