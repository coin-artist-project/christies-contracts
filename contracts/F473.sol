//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract F473 is ERC1155, ReentrancyGuard, Ownable
{
	constructor()
		ERC1155("https://localhost/{uri}.json")
		public
	{

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
