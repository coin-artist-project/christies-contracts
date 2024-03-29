//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract F473TestToken is ERC1155, Ownable {

	// Metadata
	string public name = "F473";
	string public symbol = "F473";

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
