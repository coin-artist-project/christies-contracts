// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

const CONTRACT_ADDRESS = (getContracts()).F473;
const CONTRACT_ADDRESS_TOKENS = (getContracts()).F473_TOKENS;

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473 = await ethers.getContractFactory('F473');
  const contract = await F473.attach(CONTRACT_ADDRESS);

  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const tokenContract = await F473Tokens.attach(CONTRACT_ADDRESS_TOKENS);

  if ((await contract.getCurrentLevel()).toNumber() == 12) {
    console.log("Game is over");
    return;
  }

  const DESIRED_CARD = 60;

  let level, hasCard;
  do {
    do {
      let SECONDS_PER_LEVEL = await contract.SECONDS_PER_LEVEL();
      ethers.provider.send("evm_increaseTime", [SECONDS_PER_LEVEL.toNumber()]);
      await contract.roll();
      console.log("At level", level);
    }
    while ((level = (await contract.getCurrentLevel()).toNumber()) != 4 && level != 5 && level != 6 && level != 7 && level != 8 && level != 9);

    if (level == 4) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(4)).toNumber() === DESIRED_CARD) ||
        ((await contract.getCurrentCardCharacter(5)).toNumber() === DESIRED_CARD);
    } else if (level == 5) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(4)).toNumber() === DESIRED_CARD);
    } else if (level == 6) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() === DESIRED_CARD);
    } else if (level == 7) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) ||
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD);
    } else if (level == 8) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD);
    } else if (level == 9) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD);
    }

    console.log("Has Card?", hasCard);

  } while (!hasCard);

  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
