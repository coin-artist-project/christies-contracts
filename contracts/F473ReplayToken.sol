//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./F473.sol";

contract F473ReplayToken is ERC1155, Ownable {

	// Game
	F473 public gameContract;

	constructor(
		string memory _uri
	)
		ERC1155(_uri)
	{ }

	function mint(
		address _addr,
		uint256 _amount
	)
		public
		onlyOwner
	{
		_mint(_addr, 1, _amount, "");
	}

	function setGameAddress(
		address payable _gameAddress
	)
		external
		onlyOwner
	{
		gameContract = F473(_gameAddress);
	}

	function burnAndRestart()
		public
	{
		// Require that the game is over
		require(gameContract.GAME_OVER(), "Game must be over to replay");

		// Burn a token
		_burn(_msgSender(), 1, 1);

		// Restart the game
		gameContract.restartGame();
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