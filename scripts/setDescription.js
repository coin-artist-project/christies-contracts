// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

const CONTRACT_ADDRESS = (getContracts()).F473_TOKENS;

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contract = await F473Tokens.attach(CONTRACT_ADDRESS);

  let DESCRIPTION = 'F473 launches on June 3rd at 4 PM GMT, and can be played on IPFS: https://gateway.ipfs.io/ipns/k51qzi5uqu5djyk5kj4d5dvad8ev3g2zfyu0ktrusqpwg3qdewd68772mdthhu/#/\\n\\n\\"F473\\" (FATE) is an NFT experience that highlights cross-chain interoperability. Rather than a static NFT that remains in a wallet on one network, \\"F473\\" comes alive and accessible across both the Ethereum and the Polygon blockchain networks. \\"F473\\" serves as a foundation to spawn thousands of NFTs on Polygon that create a bespoke NFT collecting game that is unlocked only after the initial sale of \\"F473\\". The spawned assets allow for temporarily altering aesthetics of the core artwork, as well as altering the overall gameplay.\\n\\n\\"F473\\" utilizes hundreds of both digital and physical artistic assets, and numerous musical compositions. The core of the experience centers around a physical painting, which contains a hand-painted private key giving access to a cryptocurrency prize that will be revealed upon the auction conclusion. As a signature @coin_artist crypto puzzle trail artwork, expect an interactive story woven together with mystery, intrigue, and surprise. The purchaser of the NFT will, of course, also own and determine the fate of the physical painting.\\n\\nRULES\\n\\nThe Game of F473 plays automatically, on loop endlessly, until the game is over. F473 consists of 9 Levels and an Intermission. Players have actions available to them during all parts of the game, but are limited based on the current Level and Cards available on the screen.\\n\\nAs a player, you can only make one Dedicated Action per Level. Dedicated Actions are the following:\\n\\nClaiming a Character Card - Any of Solo, Pair, or Couple\\n\\nRoll - This action alters the random number used in future levels, and can be used during Intermission\\n\\nYou can also take any of the other following actions at any time the game board is present:\\n\\nGain H34R7S - Tribute two matching Pair Characters (two of yours, or one of yours and someone elses)\\n\\nTribute H34R7S - Tribute H34R7S to the Character to fill up the Love Meter (Level 9 Only)\\n\\nLight Up the City - Send a H34R7 to an empty region of the city to light it up in the color of the H34R7.\\n\\nMedium: Digital-born game with generative elements using HTML, CSS, React.JS, Javascript, dedicated web page, and Ethereum and polygon smart contracts. Dimensions variable.\\n\\nF473 launches on June 3rd at 4 PM GMT, and can be played on IPFS: https://gateway.ipfs.io/ipns/k51qzi5uqu5djyk5kj4d5dvad8ev3g2zfyu0ktrusqpwg3qdewd68772mdthhu/#/';

  let gasLimit = (process.env.HARDHAT_NETWORK == undefined) ? 12450000 : 20000000;

  let tx = await contract.setDescription(DESCRIPTION, {gasLimit});
  let receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
